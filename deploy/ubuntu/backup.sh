#!/usr/bin/env bash
# Daily MongoDB dump (local only). Requires mongod running and auth in MONGODB_URI.
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin:${PATH:-}"

APP_ROOT="/var/www/swimming-school"
BACKUP_ROOT="/var/backups/swimming-school"
KEEP_DAYS=7
STAMP="$(date +%Y%m%d-%H%M%S)"
DEST="${BACKUP_ROOT}/${STAMP}"

mkdir -p "${DEST}"
chmod 700 "${BACKUP_ROOT}"

if ! systemctl is-active --quiet mongod 2>/dev/null; then
  echo "mongod not active" >&2
  exit 1
fi

MONGO_PASS=""
if [[ -f /root/.swimming-mongo-pass ]]; then
  MONGO_PASS="$(cat /root/.swimming-mongo-pass)"
fi

dump_ok=0
if command -v mongodump >/dev/null 2>&1; then
  if [[ -n "${MONGO_PASS}" ]]; then
    mongodump --host 127.0.0.1 --username root --password "${MONGO_PASS}" \
      --authenticationDatabase admin --db swimming-school --out "${DEST}/dump" && dump_ok=1
  else
    mongodump --host 127.0.0.1 --db swimming-school --out "${DEST}/dump" && dump_ok=1
  fi
fi

if [[ "${dump_ok}" -eq 1 ]]; then
  cp -a "${APP_ROOT}/backend/.env" "${DEST}/backend.env" 2>/dev/null || true
  chmod 600 "${DEST}/backend.env" 2>/dev/null || true
  tar -czf "${BACKUP_ROOT}/swimming-${STAMP}.tar.gz" -C "${BACKUP_ROOT}" "${STAMP}"
  rm -rf "${DEST}"
  find "${BACKUP_ROOT}" -name 'swimming-*.tar.gz' -mtime +"${KEEP_DAYS}" -delete 2>/dev/null || true
  echo "backup ok: ${BACKUP_ROOT}/swimming-${STAMP}.tar.gz"
else
  echo "mongodump failed" >&2
  exit 1
fi
