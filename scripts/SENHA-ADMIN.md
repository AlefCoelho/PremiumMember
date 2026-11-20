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

Dois comandos na VPS. Nada e apagado e nao precisa reiniciar nada. **Voce digita a senha na
tela, escondida e duas vezes**, entao nao ha aspas nem caracteres especiais para errar, e ela
nao fica no historico do terminal.

### Passo 1

```
ssh premium-vps
```

### Passo 2 — Uma linha, copie inteira

Troque so o e-mail, se o seu for outro:

```
cd /home/user/htdocs/socios-premiums && curl -sL -o scripts/resetar-senha-admin.js https://raw.githubusercontent.com/AlefCoelho/PremiumMember/main/scripts/resetar-senha-admin.js && SOCIOS_DB_PATH=/home/user/htdocs/socios-premiums/data/socios-premiums.sqlite node scripts/resetar-senha-admin.js contatoalefcoelho@gmail.com
```

O terminal pergunta:

```
Digite a senha nova (nao aparece na tela):
Repita a senha nova:
```

Digite, aperte Enter, digite de novo, Enter. **Nada aparece enquanto voce digita. E normal.**

**Deve aparecer:** `pronto: a senha de ... foi trocada e conferida.`

Se as duas digitadas forem diferentes, o comando avisa e **nao altera nada**: repita o passo 2.
Se o e-mail estiver errado, ele lista os e-mails que existem.

A primeira parte da linha (`curl`) baixa a versao mais recente do script, porque o deploy
normal copia so `src/` e nao atualiza `scripts/`.

---

## Para parar de esquecer

A senha de um painel que guarda dados de membros nao deve morar na cabeca nem num bloco de
notas. Guarde num **gerenciador de senhas**: o Chaves do iCloud, que ja vem no iPhone e no
Mac, serve. Quando o navegador perguntar "salvar esta senha?" depois de trocar, aceite.

E se esquecer mesmo assim, o caso 2 resolve em dois minutos.
