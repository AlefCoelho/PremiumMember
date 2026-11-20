#!/usr/bin/env bash
# Liga o e-mail (Resend) no Premium Member. Rodar NA VPS, como root:
#
#   bash /root/ligar-email.sh
#
# Voce so cola a chave de API. O resto o script descobre sozinho:
#
# - Onde gravar: le o EnvironmentFile do proprio servico no systemd, o mesmo
#   arquivo onde ja estao o JWT_SECRET e a senha do admin. Nao grava a chave
#   na linha Environment= do unit, porque `systemctl cat` imprime o unit
#   inteiro e a chave ficaria a vista de quem rodar esse comando.
# - A chave nao aparece na tela ao digitar, nao vai para o historico do shell
#   e nunca e impressa de volta: so os 4 ultimos caracteres, para voce conferir.
# - Antes de mexer, guarda uma copia do arquivo. Se o servico nao subir, devolve
#   a copia e reinicia com a configuracao antiga.
#
# Rodar de novo troca a chave: nao duplica linha.

set -euo pipefail

SERVICO="${SERVICO:-socios-premiums}"
REMETENTE_PADRAO="Premium Member <painel@premiummember.online>"

if [ "${1:-}" = "--ajuda" ] || [ "${1:-}" = "-h" ]; then
  sed -n '2,19p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
fi

# ENV_FILE e SEM_REINICIO existem so para testar o script sem tocar no servico.
if [ -z "${ENV_FILE:-}" ]; then
  ENV_FILE="$(systemctl show "$SERVICO" -p EnvironmentFiles --value | awk '{print $1}')"
fi

if [ -z "$ENV_FILE" ] || [ ! -f "$ENV_FILE" ]; then
  echo "erro: nao achei o arquivo de variaveis do servico $SERVICO." >&2
  echo "rode: systemctl cat $SERVICO | grep -E 'EnvironmentFile|Environment='" >&2
  exit 1
fi

echo "Servico:  $SERVICO"
echo "Arquivo:  $ENV_FILE"
echo

# Cola so a chave. Sem eco na tela.
printf "Cole a chave de API do Resend (comeca com re_) e tecle Enter: "
read -rs CHAVE
echo
CHAVE="$(printf '%s' "$CHAVE" | tr -d '[:space:]\r')"

if [ -z "$CHAVE" ]; then
  echo "erro: nenhuma chave informada. Nada foi alterado." >&2
  exit 1
fi

case "$CHAVE" in
  re_*) ;;
  *)
    echo "erro: a chave do Resend comeca com re_ e a que voce colou nao." >&2
    echo "Confira se copiou a chave e nao o ID dela. Nada foi alterado." >&2
    exit 1
    ;;
esac

if [ "${#CHAVE}" -lt 20 ]; then
  echo "erro: a chave ficou curta demais (${#CHAVE} caracteres). Copiou inteira?" >&2
  echo "Nada foi alterado." >&2
  exit 1
fi

# Remetente: Enter aceita o padrao. O dominio tem de ser o verificado no Resend.
printf "Remetente [%s]: " "$REMETENTE_PADRAO"
read -r REMETENTE
REMETENTE="$(printf '%s' "$REMETENTE" | tr -d '\r')"
REMETENTE="${REMETENTE:-$REMETENTE_PADRAO}"

case "$REMETENTE" in
  *@*) ;;
  *) echo "erro: o remetente precisa ter um e-mail, ex.: Nome <painel@seudominio.com>." >&2; exit 1 ;;
esac

COPIA="${ENV_FILE}.antes-email-$(date +%Y%m%d-%H%M%S)"
cp -p "$ENV_FILE" "$COPIA"

# Tira as linhas antigas (se houver) e acrescenta as novas, sem tocar no resto.
TMP="$(mktemp)"
grep -vE '^(RESEND_API_KEY|MAIL_FROM)=' "$ENV_FILE" > "$TMP" || true
# Garante quebra de linha no fim antes de acrescentar.
[ -s "$TMP" ] && [ -n "$(tail -c1 "$TMP")" ] && echo >> "$TMP"
{
  echo "RESEND_API_KEY=$CHAVE"
  echo "MAIL_FROM=$REMETENTE"
} >> "$TMP"
cat "$TMP" > "$ENV_FILE"   # cat preserva dono e permissao do arquivo original
rm -f "$TMP"

echo
echo "Gravado em $ENV_FILE"
echo "  RESEND_API_KEY = re_...${CHAVE: -4}"
echo "  MAIL_FROM      = $REMETENTE"
echo "Copia do arquivo anterior: $COPIA"

if [ -n "${SEM_REINICIO:-}" ]; then
  echo "(SEM_REINICIO ligado: servico nao reiniciado)"
  exit 0
fi

echo
echo "Reiniciando o servico..."
systemctl restart "$SERVICO"
sleep 4

voltar() {
  echo "ERRO: $1" >&2
  echo "Devolvendo a configuracao anterior..." >&2
  cp -p "$COPIA" "$ENV_FILE"
  systemctl restart "$SERVICO"
  sleep 3
  echo "Servico apos voltar: $(systemctl is-active "$SERVICO")" >&2
  exit 1
}

[ "$(systemctl is-active "$SERVICO")" = "active" ] || voltar "o servico nao subiu."

PID="$(systemctl show "$SERVICO" -p MainPID --value)"
VISTAS="$(tr '\0' '\n' < "/proc/$PID/environ" | grep -cE '^(RESEND_API_KEY|MAIL_FROM)=.+' || true)"
[ "$VISTAS" = "2" ] || voltar "o servico subiu mas nao enxerga as duas variaveis (enxerga $VISTAS)."

CODIGO="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 http://127.0.0.1:3020/login || true)"
[ "$CODIGO" = "200" ] || voltar "o painel respondeu $CODIGO em /login em vez de 200."

echo
echo "PRONTO. Servico ativo, enxerga as duas variaveis e o painel responde 200."
echo
echo "Teste agora: saia do painel, abra https://premiummember.online/login,"
echo "clique em 'Esqueci a senha' e informe o e-mail do administrador."
echo "A tela deve dizer que o link esta a caminho, e o e-mail deve chegar."
echo "Se nao chegar, veja 'Se o e-mail nao chegar' em scripts/EMAIL-RESEND-PASSO-A-PASSO.md."
