# Senha do painel do administrador

## Por que a senha "nao mudava"

A conta de admin e criada na primeira vez que o app sobe, a partir de `ADMIN_EMAIL` e
`ADMIN_PASSWORD`. Depois disso o app **nunca mais le** `ADMIN_PASSWORD`: a criacao usa
`INSERT OR IGNORE`, que nao mexe numa conta que ja existe.

Entao editar o `.env.local` e reiniciar o servico nao troca a senha. Parece que deveria, e
nao troca.

---

## Caso 0 — Voce esqueceu e quer receber um link por e-mail

Na tela de login, clique em **Esqueci a senha**, informe o e-mail do administrador e abra o
link que chegar. Ele vale 30 minutos e serve uma vez.

**So funciona depois de ligar o envio de e-mail**, o que e feito uma vez:
`scripts/EMAIL-RESEND-PASSO-A-PASSO.md`. Enquanto nao estiver ligado, a tela avisa e nao envia.

## Caso 1 — Voce consegue entrar e quer trocar

1. Entre em https://premiummember.online/login
2. Menu lateral -> **Senhas**
3. No bloco **Minha senha de administrador**: senha atual, senha nova, repetir
4. **Trocar minha senha**

Vale a partir do proximo login. Minimo de 8 caracteres.

---

## Caso 2 — Voce esqueceu e nao consegue entrar

Tres comandos na VPS. Nada e apagado, e nao precisa reiniciar nada.

### Passo 1

```
ssh premium-vps
```

### Passo 2 — Ver qual e o e-mail do admin

```
sqlite3 /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite "SELECT email FROM admins;"
```

**Deve aparecer:** um ou dois e-mails. Copie o seu.

### Passo 3 — Definir a senha nova

Troque `SEU-EMAIL` e `SUA-SENHA-NOVA`:

```
cd /home/user/htdocs/socios-premiums && SOCIOS_DB_PATH=/home/user/htdocs/socios-premiums/data/socios-premiums.sqlite node scripts/resetar-senha-admin.js SEU-EMAIL SUA-SENHA-NOVA
```

**Deve aparecer:** `pronto: a senha de ... foi trocada e conferida.`

Se o e-mail estiver errado, o proprio comando lista os e-mails que existem.

**Se disser `Cannot find module ... resetar-senha-admin.js`:** o arquivo ainda nao esta na
VPS. O deploy copia so a pasta `src/`, e este script mora em `scripts/`. Baixe-o uma vez:

```
mkdir -p /home/user/htdocs/socios-premiums/scripts && curl -sL -o /home/user/htdocs/socios-premiums/scripts/resetar-senha-admin.js https://raw.githubusercontent.com/AlefCoelho/PremiumMember/main/scripts/resetar-senha-admin.js
```

e repita o passo 3.

### Passo 4 — Limpar a senha do historico do terminal

A senha ficou escrita no comando. Apague:

```
history -c && history -w
```

---

## Para parar de esquecer

A senha de um painel que guarda dados de membros nao deve morar na cabeca nem num bloco de
notas. Guarde num **gerenciador de senhas**: o Chaves do iCloud, que ja vem no iPhone e no
Mac, serve. Quando o navegador perguntar "salvar esta senha?" depois de trocar, aceite.

E se esquecer mesmo assim, o caso 2 resolve em dois minutos.
