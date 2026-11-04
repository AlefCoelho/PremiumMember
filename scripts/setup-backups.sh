#!/usr/bin/env bash
#
# Instala o backup diario do Premium Member na VPS: banco e imagens.
#
# Rode NA VPS, como root:
#   bash setup-backups.sh            # mostra o que faria, sem mudar nada
#   bash setup-backups.sh --aplicar  # aplica
#
# E idempotente: rodar duas vezes nao duplica linha no crontab.

set -euo pipefail

APLICAR=0
[[ "${1:-}" == "--aplicar" ]] && APLICAR=1

BACKUP_DIR=/root/backups
RETENCAO_DIAS=14
UNIT=socios-premiums

info()  { printf '  %s\n' "$*"; }
titulo(){ printf '\n== %s\n' "$*"; }
erro()  { printf '\nERRO: %s\n' "$*" >&2; exit 1; }

titulo "1. Onde estao os dados"

command -v systemctl >/dev/null || erro "systemctl nao existe nesta maquina. Este script e
       para rodar NA VPS, onde o app roda como servico. Veja o DEPLOY.md."

# O caminho do banco vem do unit do systemd, que e a fonte da verdade em producao.
# O `|| true` e necessario: com `set -euo pipefail`, um pipeline que falha aqui (systemctl
# ausente, unit inexistente) encerraria o script sem chegar nas mensagens de erro abaixo.
DB_PATH="$(systemctl show "$UNIT" -p Environment --value 2>/dev/null \
  | tr ' ' '\n' | sed -n 's/^SOCIOS_DB_PATH=//p' | head -1 || true)"

if [[ -z "$DB_PATH" ]]; then
  erro "SOCIOS_DB_PATH nao esta no unit $UNIT. Sem isso o app pode estar usando um banco
       dentro de .next/, que o build apaga. Veja o passo 1 do DEPLOY.md antes de seguir."
fi
[[ -f "$DB_PATH" ]] || erro "SOCIOS_DB_PATH aponta para $DB_PATH, que nao existe."

UPLOADS_DIR="$(systemctl show "$UNIT" -p Environment --value 2>/dev/null \
  | tr ' ' '\n' | sed -n 's/^SOCIOS_UPLOADS_DIR=//p' | head -1 || true)"
DATA_DIR="$(dirname "$DB_PATH")"
[[ -n "$UPLOADS_DIR" ]] || UPLOADS_DIR="$DATA_DIR/uploads"

case "$DB_PATH" in
  *".next"*) erro "O banco esta dentro de .next ($DB_PATH). O proximo build apaga. Pare e
       mova para fora antes de configurar backup." ;;
esac

info "banco:   $DB_PATH"
info "uploads: $UPLOADS_DIR"
info "destino: $BACKUP_DIR (retencao de $RETENCAO_DIAS dias)"

if [[ ! -d "$UPLOADS_DIR" ]]; then
  info "a pasta de uploads ainda nao existe — sera criada no primeiro envio de imagem"
fi

titulo "2. Disco"
df -h "$DATA_DIR" | tail -1 | awk '{print "  usado " $5 ", livre " $4 " em " $6}'

titulo "3. Checagens"
command -v sqlite3 >/dev/null || erro "sqlite3 nao esta instalado. Sem ele o backup WAL-safe
       nao funciona: apt install sqlite3"
info "sqlite3: $(command -v sqlite3)"
info "afiliados hoje: $(sqlite3 "$DB_PATH" 'SELECT COUNT(*) FROM affiliates;')"
info "admins hoje:    $(sqlite3 "$DB_PATH" 'SELECT COUNT(*) FROM admins;')"

# \%F no crontab: sem a barra, o cron corta a linha no % e todo dia grava no mesmo arquivo.
LINHA_DB="0 3 * * * sqlite3 $DB_PATH \".backup '$BACKUP_DIR/socios-\$(date +\\%F).sqlite'\" && find $BACKUP_DIR -name 'socios-*.sqlite' -mtime +$RETENCAO_DIAS -delete"
LINHA_UP="30 3 * * * tar czf $BACKUP_DIR/uploads-\$(date +\\%F).tar.gz -C $DATA_DIR $(basename "$UPLOADS_DIR") && find $BACKUP_DIR -name 'uploads-*.tar.gz' -mtime +$RETENCAO_DIAS -delete"

titulo "4. Linhas de crontab"
printf '  %s\n\n  %s\n' "$LINHA_DB" "$LINHA_UP"

if [[ $APLICAR -eq 0 ]]; then
  titulo "Nada foi alterado"
  info "rode de novo com --aplicar para instalar"
  exit 0
fi

titulo "5. Aplicando"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

ATUAL="$(crontab -l 2>/dev/null || true)"
NOVO="$ATUAL"
for linha in "$LINHA_DB" "$LINHA_UP"; do
  if printf '%s\n' "$ATUAL" | grep -qF -- "$linha"; then
    info "ja existia, nao duplicado: $(printf '%s' "$linha" | cut -c1-40)..."
  else
    NOVO="$(printf '%s\n%s' "$NOVO" "$linha")"
    info "adicionada: $(printf '%s' "$linha" | cut -c1-40)..."
  fi
done

if [[ "$NOVO" != "$ATUAL" ]]; then
  printf '%s\n' "$ATUAL" > "$BACKUP_DIR/crontab-antes-$(date +%F-%H%M).txt"
  printf '%s\n' "$NOVO" | crontab -
  info "crontab anterior guardado em $BACKUP_DIR/crontab-antes-*.txt"
fi

titulo "6. Provando que o backup funciona agora"
# Nao espera as 3h da manha para descobrir que o comando esta errado.
AGORA_DB="$BACKUP_DIR/socios-$(date +%F-%H%M)-teste.sqlite"
sqlite3 "$DB_PATH" ".backup '$AGORA_DB'"
info "banco:   $AGORA_DB ($(du -h "$AGORA_DB" | cut -f1))"
info "conferido: $(sqlite3 "$AGORA_DB" 'SELECT COUNT(*) FROM affiliates;') afiliados na copia"

if [[ -d "$UPLOADS_DIR" ]]; then
  AGORA_UP="$BACKUP_DIR/uploads-$(date +%F-%H%M)-teste.tar.gz"
  tar czf "$AGORA_UP" -C "$DATA_DIR" "$(basename "$UPLOADS_DIR")"
  info "uploads: $AGORA_UP ($(du -h "$AGORA_UP" | cut -f1), $(tar tzf "$AGORA_UP" | wc -l) entradas)"
fi

titulo "Pronto"
info "O backup roda as 3h (banco) e 3h30 (imagens)."
info "FALTA O MAIS IMPORTANTE: tirar copia de $BACKUP_DIR para fora da VPS."
info "Backup que mora so no servidor nao e backup."
