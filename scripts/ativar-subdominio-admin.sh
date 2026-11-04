#!/usr/bin/env bash
#
# Liga o HTTPS de admin.premiummember.online depois que o DNS propagar.
#
# Rode NA VPS, como root:
#   bash ativar-subdominio-admin.sh            # so confere, nao muda nada
#   bash ativar-subdominio-admin.sh --aplicar  # emite o certificado e aplica
#
# O bloco HTTP ja existe desde 2026-11-04. Este script so acrescenta o HTTPS.

set -euo pipefail

DOMINIO=admin.premiummember.online
IP_ESPERADO=2.24.65.26
CONF=/etc/nginx/sites-available/admin.premiummember.online.conf
APLICAR=0
[[ "${1:-}" == "--aplicar" ]] && APLICAR=1

info()  { printf '  %s\n' "$*"; }
titulo(){ printf '\n== %s\n' "$*"; }
erro()  { printf '\nERRO: %s\n' "$*" >&2; exit 1; }

titulo "1. O DNS ja aponta para ca?"

IP="$(getent hosts "$DOMINIO" | awk '{print $1}' | head -1 || true)"
if [[ -z "$IP" ]]; then
  erro "$DOMINIO ainda nao resolve.
       Crie no painel da Hostinger um registro A:
         nome: admin      tipo: A      valor: $IP_ESPERADO
       A propagacao costuma levar de minutos a algumas horas. Rode de novo depois."
fi
info "resolve para $IP"
[[ "$IP" == "$IP_ESPERADO" ]] || erro "esperava $IP_ESPERADO. Confira o registro A antes de seguir."

titulo "2. O nginx ja responde em HTTP?"
CODIGO="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "http://$DOMINIO/" || true)"
info "http://$DOMINIO -> $CODIGO"
[[ "$CODIGO" == "000" ]] && erro "o nginx nao respondeu. Confira se $CONF esta ligado em sites-enabled."

titulo "3. Certificado"
if [[ -d "/etc/letsencrypt/live/$DOMINIO" ]]; then
  info "ja existe em /etc/letsencrypt/live/$DOMINIO"
  TEM_CERT=1
else
  info "ainda nao existe; sera emitido pelo Lets Encrypt"
  TEM_CERT=0
fi

if [[ "$APLICAR" -eq 0 ]]; then
  titulo "Nada foi alterado"
  info "rode de novo com --aplicar para emitir o certificado e ligar o HTTPS"
  exit 0
fi

titulo "4. Aplicando"

cp /etc/nginx/sites-available/*.conf "/root/backups/" 2>/dev/null || true
info "backup das configs em /root/backups/"

if [[ "$TEM_CERT" -eq 0 ]]; then
  # --nginx edita a config e recarrega sozinho. Se falhar, nada foi trocado:
  # o bloco HTTP continua de pe e o site principal nem e tocado.
  certbot --nginx -d "$DOMINIO" --non-interactive --agree-tos \
    --register-unsafely-without-email --redirect
  info "certificado emitido"
fi

titulo "5. Conferindo"
nginx -t
systemctl reload nginx

for alvo in "https://$DOMINIO/login" "https://premiummember.online/socio/login"; do
  printf '  %s -> %s\n' "$alvo" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$alvo" || echo falhou)"
done

titulo "Pronto"
info "painel de administracao: https://$DOMINIO/login"
info "o site principal segue respondendo normalmente"
