# Ligar o envio de e-mail (Resend) — passo a passo

O botao **Esqueci a senha** do painel manda o link por e-mail. Enquanto o e-mail nao estiver
ligado, a tela avisa "o envio de e-mail ainda nao esta configurado" e nao envia nada.

Ligar o e-mail tambem faz o link de redefinicao dos **membros** passar a ser enviado sozinho.
Hoje voce gera o link em `/admin/senhas` e entrega na mao.

Tempo: uns 30 minutos, a maior parte esperando o DNS.

**Regra geral:** se o que aparecer nao for o que esta em "deve aparecer", **pare** e mande o
que apareceu. A chave de API e uma senha: **nunca cole ela na conversa com o Claude**.

---

## Parte 1 — Conta e dominio no Resend

### Passo 1
Crie uma conta em https://resend.com (use o seu e-mail).

### Passo 2 — Adicionar o dominio
No painel do Resend: **Domains -> Add Domain**. Informe `premiummember.online`.

O Resend mostra uma lista de registros DNS (tipo, nome e valor). **Copie exatamente o que
ele mostrar**: os valores sao unicos da sua conta.

### Passo 3 — Criar os registros na Hostinger
Na Hostinger: **Dominios -> premiummember.online -> DNS / Servidores de nomes -> Registros
DNS**. Para cada linha da lista do Resend, crie um registro com o mesmo tipo, nome e valor.

**Nao apague nem edite registros que ja existem.** Os do Resend sao adicionais.

### Passo 4 — Esperar a verificacao
Volte ao Resend e clique em **Verify**. Pode levar de poucos minutos a algumas horas.

**Deve aparecer:** o dominio com status **Verified**. Enquanto nao estiver verificado, o
Resend recusa todo envio.

### Passo 5 — Criar a chave de API
**API Keys -> Create API Key**, permissao **Sending access**, e o dominio acima. Copie a chave
(comeca com `re_`). Ela so aparece uma vez.

---

## Parte 2 — Colocar a chave na VPS

A chave nao vai para o GitHub nem para a conversa: ela fica so na VPS.

### Passo 6 — Entrar
```
ssh premium-vps
```

### Passo 7 — Descobrir onde o servico le as variaveis
```
systemctl cat socios-premiums | grep -E 'Environment|ExecStart|WorkingDirectory'
```

**Deve aparecer:** linhas `Environment=...` e/ou `EnvironmentFile=...`. Procure onde esta o
`JWT_SECRET` ou o `SOCIOS_DB_PATH`: **as duas variaveis novas vao no mesmo lugar**.

**Se nao estiver claro onde, pare e pergunte** — colocar no lugar errado nao quebra nada, mas
o e-mail continua "nao configurado".

### Passo 8 — Acrescentar as duas variaveis
No mesmo arquivo ou bloco do passo 7:

```
RESEND_API_KEY=re_COLE_SUA_CHAVE_AQUI
MAIL_FROM=Premium Member <painel@premiummember.online>
```

O endereco do `MAIL_FROM` precisa ser do dominio verificado no passo 4. O nome antes do `<>`
e o que aparece como remetente.

### Passo 9 — Reiniciar
```
systemctl daemon-reload && systemctl restart socios-premiums && sleep 3 && systemctl is-active socios-premiums
```

**Deve aparecer:** `active`

---

## Parte 3 — Testar

### Passo 10
Saia do painel, va em https://premiummember.online/login e clique em **Esqueci a senha**.
Informe o e-mail do administrador.

**Deve aparecer:** "Se esse e-mail for de um administrador, o link ja esta a caminho."

### Passo 11
Abra o e-mail (olhe tambem o spam). Clique no link, escolha a senha nova.

**Deve aparecer:** voce volta ao login com "Senha alterada" e entra com a nova.

### Se o e-mail nao chegar
A tela diz a mesma coisa nos dois casos, por seguranca. O motivo fica no journal:

```
journalctl -u socios-premiums -n 30 --no-pager | grep admin-reset
```

- `o provedor de e-mail recusou o envio`: a chave esta errada ou o dominio ainda nao esta
  verificado. Confira o passo 4 e o `MAIL_FROM`.
- nada aparece: confira se o e-mail digitado e exatamente o do administrador
  (`sqlite3 /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite "SELECT email FROM admins;"`).

---

## Cuidados

- O link vale **30 minutos** e so serve **uma vez**.
- Pedidos repetidos dentro de 2 minutos nao geram outro e-mail.
- Trocar a senha **nao encerra** uma sessao de painel que ja esteja aberta em outro aparelho;
  ela expira sozinha em ate 7 dias.
- Se perder o acesso ao e-mail do administrador, o caminho de resgate pela VPS continua em
  `scripts/SENHA-ADMIN.md`.
