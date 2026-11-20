// Define a senha do administrador direto no banco.
//
// Para quando o Alef nao consegue entrar no painel de jeito nenhum. Com acesso,
// o caminho normal e /admin/senhas -> "Minha senha de administrador".
//
// Rodar NA VPS, da pasta do projeto:
//   node scripts/resetar-senha-admin.js <email>
//
// Sem a senha na linha de comando, o script PERGUNTA na tela, com a digitacao
// escondida e pedindo duas vezes. E o modo recomendado: a senha nao fica no
// historico do terminal e nao sofre com aspas nem com caracteres como $ e !,
// que o terminal interpreta antes de o script ver.
//
// Ainda aceita a senha como segundo argumento (uso em scripts), mas nesse modo
// os caracteres especiais exigem aspas simples e a senha fica no historico.

const path = require("node:path");
const fs = require("node:fs");

const MINIMO = 8;

// Le uma linha sem mostrar o que e digitado. Precisa de terminal interativo.
function lerEscondido(pergunta) {
  return new Promise((resolve, reject) => {
    const entrada = process.stdin;
    if (!entrada.isTTY) {
      reject(new Error("sem terminal interativo: passe a senha como segundo argumento."));
      return;
    }

    process.stdout.write(pergunta);
    let texto = "";
    entrada.setRawMode(true);
    entrada.resume();
    entrada.setEncoding("utf8");

    const fim = () => {
      entrada.setRawMode(false);
      entrada.pause();
      entrada.removeListener("data", aoReceber);
      process.stdout.write("\n");
    };

    const aoReceber = (caractere) => {
      for (const c of caractere) {
        if (c === "\r" || c === "\n") {
          fim();
          resolve(texto);
          return;
        }
        if (c === "\u0003") {
          fim();
          reject(new Error("cancelado."));
          return;
        }
        if (c === "\u007f" || c === "\b") {
          texto = texto.slice(0, -1);
          continue;
        }
        if (c >= " ") texto += c;
      }
    };

    entrada.on("data", aoReceber);
  });
}

async function obterSenha(argumento) {
  if (argumento) return argumento;

  const primeira = await lerEscondido("Digite a senha nova (nao aparece na tela): ");
  if (primeira.length < MINIMO) {
    throw new Error(`a senha precisa de pelo menos ${MINIMO} caracteres.`);
  }
  const segunda = await lerEscondido("Repita a senha nova: ");
  if (primeira !== segunda) {
    throw new Error("as duas senhas digitadas sao diferentes. Nada foi alterado.");
  }
  return primeira;
}

function falhar(mensagem) {
  console.error(`erro: ${mensagem}`);
  process.exit(1);
}

async function main() {
const [, , email, senhaArgumento] = process.argv;

if (!email) {
  console.error("uso: node scripts/resetar-senha-admin.js <email>");
  process.exit(1);
}

const senha = await obterSenha(senhaArgumento).catch((e) => falhar(e.message));

if (senha.length < MINIMO) falhar(`a senha precisa de pelo menos ${MINIMO} caracteres.`);

const dbPath = process.env.SOCIOS_DB_PATH ?? path.join(process.cwd(), "data", "socios-premiums.sqlite");

if (!fs.existsSync(dbPath)) {
  console.error(`erro: banco nao encontrado em ${dbPath}`);
  console.error("defina SOCIOS_DB_PATH apontando para o arquivo .sqlite de producao.");
  process.exit(1);
}

const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const db = new Database(dbPath);

const admin = db.prepare("SELECT id, email FROM admins WHERE email = ?").get(email.trim().toLowerCase());

if (!admin) {
  const existentes = db.prepare("SELECT email FROM admins ORDER BY id").all();
  console.error(`erro: nenhum administrador com o e-mail ${email}.`);
  console.error("administradores cadastrados:");
  for (const linha of existentes) console.error(`  ${linha.email}`);
  process.exit(1);
}

db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(bcrypt.hashSync(senha, 10), admin.id);

// Confere de verdade em vez de so confiar no UPDATE.
const depois = db.prepare("SELECT password_hash FROM admins WHERE id = ?").get(admin.id);
if (!bcrypt.compareSync(senha, depois.password_hash)) {
  console.error("erro: a senha nova nao confere depois de gravar. Nada garantido, chame ajuda.");
  process.exit(1);
}

console.log(`pronto: a senha de ${admin.email} foi trocada e conferida.`);
console.log("entre em https://premiummember.online/login");
console.log("nao e preciso reiniciar o servico: a senha e lida do banco a cada login.");
}

main();
