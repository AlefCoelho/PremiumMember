# Deploy rapido — 6 comandos

Rota curta, para quando os dados de producao nao precisam ser preservados.

O Alef definiu em 2026-11-04 que os 17 membros em producao sao de um projeto antigo, sem
valor real, e podem ser recadastrados. Por isso esta rota **nao faz backup do banco nem das
imagens** — o que ela guarda e o **codigo**, para dar rollback se o deploy quebrar o site.

Para a rota completa, com backup de dados e verificacao passo a passo, use
`DEPLOY-PASSO-A-PASSO.md`.

---

## 1. Entrar

```
ssh premium-vps
```

## 2. Guardar o codigo atual, liberar disco e baixar o novo

```
cd /home/user/htdocs/socios-premiums && mkdir -p /root/backups && tar czf /root/backups/src-$(date +%F-%H%M).tar.gz src && npm cache clean --force >/dev/null 2>&1; cd /root && rm -rf PremiumMember-memoria-operacional && curl -sL -o pm.tar.gz https://github.com/AlefCoelho/PremiumMember/archive/refs/heads/memoria-operacional.tar.gz && tar xzf pm.tar.gz && ls PremiumMember-memoria-operacional/src/lib/notifications.ts
```

**Deve aparecer:** `PremiumMember-memoria-operacional/src/lib/notifications.ts`

Essa linha final e a prova de que o download veio certo. Se nao aparecer, pare.

## 3. Trocar o codigo e buildar

```
cd /home/user/htdocs/socios-premiums && rm -rf src && cp -r /root/PremiumMember-memoria-operacional/src ./src && npm run build
```

**Deve aparecer:** a lista de rotas, com `/socio/comunidade/notificacoes` entre elas.

**Se o build falhar:** o app antigo continua no ar, nada foi publicado. Va para o rollback.

> O `cd` e o `rm -rf` estao na mesma linha de proposito: o `&&` so deixa o `rm` rodar se o
> `cd` deu certo, entao nao ha como apagar o `src` de outra pasta.

## 4. Publicar e reiniciar

```
cd /home/user/htdocs/socios-premiums && cp -r .next/static .next/standalone/.next/ && cp -r public .next/standalone/ 2>/dev/null; systemctl restart socios-premiums && sleep 3 && systemctl is-active socios-premiums
```

**Deve aparecer:** `active`

## 5. Conferir que o site respondeu

```
curl -s -o /dev/null -w 'login: %{http_code}\n' https://premiummember.online/socio/login
```

**Deve aparecer:** `login: 200`

## 6. Conferir que o app achou o banco certo

```
sqlite3 /home/user/htdocs/socios-premiums/data/socios-premiums.sqlite "SELECT COUNT(*) FROM affiliates;"
```

**Deve aparecer:** o mesmo numero de antes do deploy (hoje, `17`).

Este passo continua valendo mesmo sem ligar para os dados. Ele nao protege os 17 registros:
ele detecta se o app subiu apontando para **outro banco**. Se vier `0` ou `1`, o
`SOCIOS_DB_PATH` se perdeu e o app criou um banco dentro de `.next/standalone/data` — pasta
que o proximo build apaga. Quem sumiria nao e o passado: sao os cadastros **futuros**.

Se vier numero inesperado, confira a variavel antes de seguir:

```
systemctl show socios-premiums -p Environment --value | tr ' ' '\n' | grep SOCIOS_
```

---

## Testar no navegador

Entre em https://premiummember.online/socio/login com um membro:

1. Cai em `/socio/comunidade`
2. No menu lateral aparece **Notificacoes**, entre Feed e Favoritos
3. A pagina abre
4. `/socio/ganhos` continua mostrando indicacoes e saldo

---

## Rollback — um comando

```
cd /home/user/htdocs/socios-premiums && rm -rf src && tar xzf $(ls -t /root/backups/src-*.tar.gz | head -1) && npm run build && cp -r .next/static .next/standalone/.next/ && systemctl restart socios-premiums && systemctl is-active socios-premiums
```

Pega sozinho o backup de codigo mais recente. **Deve aparecer:** `active`.

A tabela nova (`community_notifications`) continua no banco depois do rollback, parada, sem
atrapalhar nada. Nenhuma tabela existente foi alterada em momento algum.
