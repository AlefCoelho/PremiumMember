#!/usr/bin/env bash
#
# Traz os backups da VPS para esta maquina. Backup que mora so no servidor nao e
# backup: se a VPS morrer, morre com ela.
#
# Rode AQUI, na maquina local, nao na VPS:
#   bash scripts/puxar-backups.sh
#
# Para rodar sozinho todo dia, agende no Agendador de Tarefas do Windows
# apontando para este script, depois das 3h30 (horario em que o cron da VPS
# termina de gerar os arquivos do dia).

set -euo pipefail

VPS=premium-vps
ORIGEM=/root/backups
DESTINO="$(cd "$(dirname "$0")/../.." && pwd)/backups-producao"

mkdir -p "$DESTINO"

echo "== Puxando de $VPS:$ORIGEM"
echo "   para $DESTINO"

# -a preserva data, -z comprime, --ignore-existing nao rebaixa o que ja veio.
# Se rsync nao existir de um dos lados, cai para scp dos arquivos do dia.
if command -v rsync >/dev/null && ssh -o BatchMode=yes "$VPS" 'command -v rsync >/dev/null'; then
  rsync -az --ignore-existing "$VPS:$ORIGEM/" "$DESTINO/"
else
  echo "   (rsync indisponivel, usando scp dos arquivos de hoje)"
  scp -o BatchMode=yes "$VPS:$ORIGEM/*$(date +%F)*" "$DESTINO/" 2>/dev/null || true
fi

echo
echo "== Backups locais mais recentes"
ls -lt "$DESTINO" | head -6

# Conferencia real: um arquivo que nao abre nao e backup.
ULTIMO="$(ls -t "$DESTINO"/socios-*.sqlite 2>/dev/null | head -1 || true)"
if [[ -n "$ULTIMO" ]] && command -v sqlite3 >/dev/null; then
  echo
  echo "== Conferindo $ULTIMO"
  echo "   afiliados: $(sqlite3 "$ULTIMO" 'SELECT COUNT(*) FROM affiliates;')"
  echo "   admins:    $(sqlite3 "$ULTIMO" 'SELECT COUNT(*) FROM admins;')"
fi
