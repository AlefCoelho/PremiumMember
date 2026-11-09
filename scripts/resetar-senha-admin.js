// Define a senha do administrador direto no banco.
//
// Para quando o Alef nao consegue entrar no painel de jeito nenhum. Com acesso,
// o caminho normal e /admin/senhas -> "Minha senha de administrador".
//
// Rodar NA VPS, da pasta do projeto:
//   node scripts/resetar-senha-admin.js <email> <senha-nova>
//
// Nao aceita senha por variavel de ambiente nem a le de arquivo de proposito:
// o comando fica no historico do shell, e e melhor que isso esteja visivel do
// que escondido num arquivo que ninguem lembra de apagar.

const path = require("node:path");
const fs = require("node:fs");

const [, , email, senha] = process.argv;

if (!email || !senha) {
  console.error("uso: node scripts/resetar-senha-admin.js <email> <senha-nova>");
  process.exit(1);
}

if (senha.length < 8) {
  console.error("erro: a senha precisa de pelo menos 8 caracteres.");
  process.exit(1);
}

const dbPath = process.env.SOCIOS_DB_PATH ?? path.join(process.cwd(), "data", "socios-premiums.sqlite");

if (!fs.existsSync(dbPath)) {
  console.error(`erro: banco nao encontrado em ${dbPath}`);
  console.error("defina SOCIOS_DB_PATH apontando para o arquivo .sqlite de producao.");
  process.exit(1);
}

const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");

const db = new Database(dbPath);

const admin = db.prepare("SELECT id, email FROM admins WHERE email = ?").get(email);

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
