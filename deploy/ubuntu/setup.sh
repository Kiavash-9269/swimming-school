#!/usr/bin/env bash
# One-shot production install for swimming-school on Ubuntu 24.04 / 26.04.
# Run ON THE SERVER after the project is at /var/www/swimming-school:
#
#   sudo bash deploy/ubuntu/setup.sh --domain example.com
#
set -euo pipefail

APP_ROOT="/var/www/swimming-school"
DEPLOY_DIR="${APP_ROOT}/deploy/ubuntu"
BACKEND_DIR="${APP_ROOT}/backend"
FRONTEND_DIR="${APP_ROOT}/frontend"
LOG_DIR="/var/log/swimming-school"
DOMAIN=""
EMAIL=""
SKIP_SSL="0"
SKIP_FIREWALL="0"
NIKSMS_USERNAME_ARG=""
NIKSMS_PASSWORD_ARG=""
ZARINPAL_MERCHANT_ARG=""
MONGO_APP_USER="swim_app"
NODE_MAJOR="22"

usage() {
  cat <<'EOF'
Usage: sudo bash deploy/ubuntu/setup.sh --domain YOUR_DOMAIN [options]

Options:
  --domain DOMAIN              Required. Public hostname (A record → this server)
  --email EMAIL                Email for Let's Encrypt (default: admin@DOMAIN)
  --niksms-user USER           Niksms username (or prompt / keep existing .env)
  --niksms-pass PASS           Niksms password
  --zarinpal-merchant ID       Zarinpal merchant id (required for API boot)
  --skip-ssl                   Install HTTP only; run enable-ssl.sh later
  --skip-firewall              Do not change UFW rules
  -h, --help                   Show this help
EOF
}

log()  { echo -e "\n==> $*"; }
die()  { echo "ERROR: $*" >&2; exit 1; }
need_root() { [[ "${EUID}" -eq 0 ]] || die "Run with sudo."; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --email) EMAIL="${2:-}"; shift 2 ;;
    --niksms-user) NIKSMS_USERNAME_ARG="${2:-}"; shift 2 ;;
    --niksms-pass) NIKSMS_PASSWORD_ARG="${2:-}"; shift 2 ;;
    --zarinpal-merchant) ZARINPAL_MERCHANT_ARG="${2:-}"; shift 2 ;;
    --skip-ssl) SKIP_SSL="1"; shift ;;
    --skip-firewall) SKIP_FIREWALL="1"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

need_root
[[ -n "${DOMAIN}" ]] || { usage; die "--domain is required"; }
EMAIL="${EMAIL:-admin@${DOMAIN}}"

[[ -d "${APP_ROOT}/backend" && -d "${APP_ROOT}/frontend" ]] \
  || die "Project not found at ${APP_ROOT}. Upload/clone it there first."

if [[ -f /etc/os-release ]]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  log "OS: ${PRETTY_NAME:-unknown} (${VERSION_CODENAME:-unknown})"
else
  die "Cannot read /etc/os-release — this script targets Ubuntu."
fi

export DEBIAN_FRONTEND=noninteractive

########################################
# 1) Base packages
########################################
log "Updating apt and installing base packages"
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  curl wget git ca-certificates gnupg lsb-release \
  build-essential ufw nginx certbot python3-certbot-nginx \
  openssl jq

########################################
# 2) Firewall
########################################
if [[ "${SKIP_FIREWALL}" != "1" ]]; then
  log "Configuring UFW (SSH + 80 + 443)"
  ufw allow OpenSSH || true
  ufw allow 80/tcp || true
  ufw allow 443/tcp || true
  ufw --force enable || true
  ufw status || true
fi

########################################
# 3) Node.js
########################################
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 20 ]]; then
  log "Installing Node.js ${NODE_MAJOR}.x"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi
log "Node $(node -v) / npm $(npm -v)"

########################################
# 4) MongoDB
########################################
# Non-interactive SSH often lacks /snap/bin in PATH
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin:${PATH:-}"

mongo_shell() {
  if [[ -x /usr/local/bin/mongosh ]]; then
    echo /usr/local/bin/mongosh
  elif command -v mongosh >/dev/null 2>&1; then
    command -v mongosh
  elif [[ -x /snap/bin/mongodb-server-replicaset.mongosh ]]; then
    echo /snap/bin/mongodb-server-replicaset.mongosh
  elif command -v mongodb-server-replicaset.mongosh >/dev/null 2>&1; then
    command -v mongodb-server-replicaset.mongosh
  else
    return 1
  fi
}

mongo_ping() {
  local sh
  sh="$(mongo_shell)" || return 1
  # snap mongosh wrapper rejects --quiet; discard stdout/stderr instead
  "$sh" --eval 'db.runCommand({ ping: 1 })' >/dev/null 2>&1
}

run_mongosh() {
  local sh
  sh="$(mongo_shell)" || die "mongosh not found"
  "$sh" "$@"
}

install_mongodb() {
  if mongo_ping; then
    log "MongoDB already responding on localhost"
    return 0
  fi

  if snap list mongodb-server-replicaset >/dev/null 2>&1; then
    log "Starting snap mongodb-server-replicaset"
    snap start --enable mongodb-server-replicaset.mongod || true
    ln -sfn /snap/bin/mongodb-server-replicaset.mongosh /usr/local/bin/mongosh
    return 0
  fi

  log "Installing MongoDB (apt → snap fallback for blocked mirrors)"
  local codename="${VERSION_CODENAME:-noble}"
  case "${codename}" in
    jammy|noble) ;;
    *)
      echo "Note: MongoDB repo for '${codename}' may be missing; trying 'noble' packages."
      codename="noble"
      ;;
  esac

  install -d -m 0755 /etc/apt/keyrings
  if curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc \
    | gpg --dearmor -o /etc/apt/keyrings/mongodb-server-8.0.gpg 2>/dev/null; then
    echo "deb [ signed-by=/etc/apt/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu ${codename}/mongodb-org/8.0 multiverse" \
      > /etc/apt/sources.list.d/mongodb-org-8.0.list
    if apt-get update -y && apt-get install -y mongodb-org; then
      # Ubuntu 26.04 / kernel 6.19–7.0.13: MongoDB refuses to start without this (SERVER-121912).
      mkdir -p /etc/systemd/system/mongod.service.d
      cat > /etc/systemd/system/mongod.service.d/rseq.conf <<'RSEQ'
[Service]
Environment=GLIBC_TUNABLES=glibc.pthread.rseq=1
RSEQ
      # Cap WiredTiger cache (~256 MB) so Mongo does not take half of a 4 GB VPS.
      cat > /etc/mongod.conf <<'MONGOCONF'
storage:
  dbPath: /var/lib/mongodb
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.25

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
  verbosity: 0

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo
MONGOCONF
      systemctl daemon-reload
      systemctl enable --now mongod
      systemctl restart mongod || true
      return 0
    fi
    rm -f /etc/apt/sources.list.d/mongodb-org-8.0.list
    apt-get update -y || true
  fi

  log "apt MongoDB unavailable — installing snap mongodb-server-replicaset"
  snap install mongodb-server-replicaset --channel=8/stable || \
    snap install mongodb-server-replicaset --channel=8/edge
  snap start --enable mongodb-server-replicaset.mongod
  ln -sfn /snap/bin/mongodb-server-replicaset.mongosh /usr/local/bin/mongosh
}

install_mongodb

# Wait for mongod
for i in $(seq 1 60); do
  if mongo_ping; then
    break
  fi
  sleep 1
  [[ "$i" -eq 60 ]] && die "mongod did not become ready"
done
# Convenience symlink when using the snap package
if ! command -v mongosh >/dev/null 2>&1 && command -v mongodb-server-replicaset.mongosh >/dev/null 2>&1; then
  ln -sfn /snap/bin/mongodb-server-replicaset.mongosh /usr/local/bin/mongosh
fi

########################################
# 5) App user / dirs / secrets
########################################
log "Preparing app directories and secrets"
mkdir -p "${LOG_DIR}" "${BACKEND_DIR}/.data/documents" /var/www/certbot
chown -R root:root "${APP_ROOT}"
# Allow the deploy user (if any) — PM2 will run as root via systemd startup by default;
# prefer a dedicated non-login runtime owner if SWIM_RUNTIME_USER exists.
RUNTIME_USER="${SUDO_USER:-root}"
chown -R "${RUNTIME_USER}:${RUNTIME_USER}" "${APP_ROOT}" "${LOG_DIR}"
chmod 750 "${BACKEND_DIR}/.data"
chmod 700 "${BACKEND_DIR}/.data/documents"

DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)"
JWT_ACCESS="$(openssl rand -hex 32)"
JWT_REFRESH="$(openssl rand -hex 32)"
PAY_CB_SECRET="$(openssl rand -hex 24)"

# Create / upsert Mongo app user (works with or without auth already enabled)
run_mongosh <<EOF
use swimming-school
try {
  db.createUser({
    user: "${MONGO_APP_USER}",
    pwd: "${DB_PASSWORD}",
    roles: [{ role: "readWrite", db: "swimming-school" }]
  });
} catch (e) {
  if (e.codeName === "DuplicateKey" || /already exists/i.test(String(e))) {
    db.changeUserPassword("${MONGO_APP_USER}", "${DB_PASSWORD}");
  } else {
    throw e;
  }
}
EOF

ENV_FILE="${BACKEND_DIR}/.env"
ENV_BACKUP=""
if [[ -f "${ENV_FILE}" ]]; then
  log "backend/.env exists — backing up, then rewriting with preserved credentials"
  ENV_BACKUP="${ENV_FILE}.bak.$(date +%Y%m%d%H%M%S)"
  cp -a "${ENV_FILE}" "${ENV_BACKUP}"
fi

read_env_val() {
  local key="$1"
  local src="$2"
  [[ -n "${src}" && -f "${src}" ]] || { echo ""; return; }
  grep -E "^${key}=" "${src}" 2>/dev/null | tail -n1 | cut -d= -f2- || true
}

PRESERVE_NIK_USER="$(read_env_val NIKSMS_USERNAME "${ENV_BACKUP}")"
PRESERVE_NIK_PASS="$(read_env_val NIKSMS_PASSWORD "${ENV_BACKUP}")"
PRESERVE_NIK_SENDER="$(read_env_val NIKSMS_SENDER "${ENV_BACKUP}")"
PRESERVE_ZARIN="$(read_env_val ZARINPAL_MERCHANT_ID "${ENV_BACKUP}")"
PRESERVE_JWT_A="$(read_env_val JWT_ACCESS_SECRET "${ENV_BACKUP}")"
PRESERVE_JWT_R="$(read_env_val JWT_REFRESH_SECRET "${ENV_BACKUP}")"
PRESERVE_PAY_CB="$(read_env_val PAYMENT_CALLBACK_SECRET "${ENV_BACKUP}")"

[[ ${#PRESERVE_JWT_A} -ge 32 && "${PRESERVE_JWT_A}" != CHANGE_ME* ]] && JWT_ACCESS="${PRESERVE_JWT_A}"
[[ ${#PRESERVE_JWT_R} -ge 32 && "${PRESERVE_JWT_R}" != CHANGE_ME* ]] && JWT_REFRESH="${PRESERVE_JWT_R}"
[[ ${#PRESERVE_PAY_CB} -ge 16 && "${PRESERVE_PAY_CB}" != CHANGE_ME* ]] && PAY_CB_SECRET="${PRESERVE_PAY_CB}"

MONGODB_URI="mongodb://${MONGO_APP_USER}:${DB_PASSWORD}@127.0.0.1:27017/swimming-school?authSource=swimming-school"

NIK_USER="${NIKSMS_USERNAME_ARG:-${PRESERVE_NIK_USER}}"
NIK_PASS="${NIKSMS_PASSWORD_ARG:-${PRESERVE_NIK_PASS}}"
ZARIN_ID="${ZARINPAL_MERCHANT_ARG:-${PRESERVE_ZARIN}}"
NIK_SENDER="${PRESERVE_NIK_SENDER:-985000403011}"
[[ -z "${NIK_SENDER}" ]] && NIK_SENDER="985000403011"

# Interactive fill for credentials required to boot in production
prompt_secret() {
  local label="$1"
  local current="$2"
  local out=""
  if [[ -n "${current}" ]]; then
    echo "${current}"
    return
  fi
  if [[ ! -t 0 ]]; then
    echo ""
    return
  fi
  # Read from the real terminal even when script is piped
  read -r -p "${label}: " out </dev/tty || true
  echo "${out}"
}

log "Collecting production credentials (Niksms + Zarinpal)"
NIK_USER="$(prompt_secret "NIKSMS_USERNAME" "${NIK_USER}")"
NIK_PASS="$(prompt_secret "NIKSMS_PASSWORD" "${NIK_PASS}")"
ZARIN_ID="$(prompt_secret "ZARINPAL_MERCHANT_ID" "${ZARIN_ID}")"

if [[ -z "${NIK_USER}" || -z "${NIK_PASS}" || -z "${ZARIN_ID}" ]]; then
  echo "WARN: NIKSMS_USERNAME / NIKSMS_PASSWORD / ZARINPAL_MERCHANT_ID are incomplete."
  echo "      API will refuse to start until you set them in backend/.env and run: pm2 restart swimming-api"
fi

cat > "${ENV_FILE}" <<EOF
NODE_ENV=production
PORT=4000
MONGODB_URI=${MONGODB_URI}

JWT_ACCESS_SECRET=${JWT_ACCESS}
JWT_REFRESH_SECRET=${JWT_REFRESH}
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_REGISTRATION_EXPIRES_IN=15m
JWT_PASSWORD_RESET_EXPIRES_IN=15m

FRONTEND_URL=https://${DOMAIN}
COOKIE_SECURE=true
LOG_LEVEL=warn

OTP_TTL_SECONDS=120
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_ATTEMPTS=5
OTP_CODE_LENGTH=5
OTP_RATE_LIMIT_PER_PHONE=5
OTP_RATE_LIMIT_WINDOW_SEC=600

SMS_PROVIDER=niksms
SMS_TIMEOUT_MS=20000
NIKSMS_USERNAME=${NIK_USER}
NIKSMS_PASSWORD=${NIK_PASS}
NIKSMS_SENDER=${NIK_SENDER}
NIKSMS_ENDPOINT=http://94.182.154.28:1370/NiksmsWebservice.svc
NIKSMS_REST_URL=https://niksms.com/api/v2/send/one
SMS_EXPOSE_DEV_OTP=false

APP_TIMEZONE=Asia/Tehran
RESERVATION_HOLD_SECONDS=900
WAITLIST_OFFER_SECONDS=900

PAYMENT_PROVIDER=zarinpal
PAYMENT_CALLBACK_URL=https://${DOMAIN}/api/payments/callback
PAYMENT_CALLBACK_SECRET=${PAY_CB_SECRET}
PAYMENT_TIMEOUT_MS=15000
ZARINPAL_MERCHANT_ID=${ZARIN_ID}
ZARINPAL_SANDBOX=false

SCHEDULER_ENABLED=true
SCHEDULER_INTERVAL_MS=180000
MONGO_MAX_POOL_SIZE=5
JOB_BATCH_SIZE=20
NOTIFICATION_MAX_ATTEMPTS=3
NOTIFICATION_LEASE_SECONDS=60
NOTIFICATION_DEFAULT_LOCALE=fa
CLASS_REMINDER_HOURS=24
SESSION_REMINDER_HOURS=1
EMAIL_PROVIDER=mock

EXPORT_MAX_ROWS=3000

DOCUMENT_STORAGE_PROVIDER=local
DOCUMENT_STORAGE_ROOT=${BACKEND_DIR}/.data/documents
DOCUMENT_MAX_BYTES=5242880

APP_VERSION=1.0.0
EOF

chmod 600 "${ENV_FILE}"
chown "${RUNTIME_USER}:${RUNTIME_USER}" "${ENV_FILE}"

# Save DB password for the operator (once)
SECRETS_NOTE="${APP_ROOT}/deploy/ubuntu/.generated-secrets.txt"
cat > "${SECRETS_NOTE}" <<EOF
Generated $(date -Is)
DOMAIN=${DOMAIN}
MONGODB_URI=${MONGODB_URI}
MONGO_USER=${MONGO_APP_USER}
MONGO_PASSWORD=${DB_PASSWORD}
JWT_ACCESS_SECRET=${JWT_ACCESS}
JWT_REFRESH_SECRET=${JWT_REFRESH}
PAYMENT_CALLBACK_SECRET=${PAY_CB_SECRET}
EOF
chmod 600 "${SECRETS_NOTE}"
chown "${RUNTIME_USER}:${RUNTIME_USER}" "${SECRETS_NOTE}"

########################################
# 6) npm install + frontend build
########################################
log "Installing backend dependencies"
cd "${BACKEND_DIR}"
if [[ -f package-lock.json ]]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

log "Installing frontend dependencies + building"
cd "${FRONTEND_DIR}"
cat > .env.production <<'EOF'
VITE_API_BASE_URL=/api
EOF
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi
npm run build
[[ -f dist/index.html ]] || die "Frontend build failed (dist/index.html missing)"

########################################
# 7) PM2
########################################
log "Installing / configuring PM2"
npm install -g pm2
mkdir -p "${LOG_DIR}"
# Run PM2 as the runtime user so files stay owned correctly
if [[ "${RUNTIME_USER}" != "root" ]]; then
  sudo -u "${RUNTIME_USER}" -H bash -lc "
    cd '${APP_ROOT}'
    pm2 delete swimming-api >/dev/null 2>&1 || true
    pm2 start '${DEPLOY_DIR}/pm2.ecosystem.config.cjs'
    pm2 save
  "
  # systemd startup for that user
  env PATH="$PATH" pm2 startup systemd -u "${RUNTIME_USER}" --hp "$(getent passwd "${RUNTIME_USER}" | cut -d: -f6)" \
    | tail -n 1 | bash || true
else
  cd "${APP_ROOT}"
  pm2 delete swimming-api >/dev/null 2>&1 || true
  pm2 start "${DEPLOY_DIR}/pm2.ecosystem.config.cjs"
  pm2 save
  pm2 startup systemd -u root --hp /root | tail -n 1 | bash || true
fi

########################################
# 8) Nginx (HTTP first)
########################################
log "Configuring Nginx (HTTP)"
sed "s/__DOMAIN__/${DOMAIN}/g" \
  "${DEPLOY_DIR}/nginx/swimming-school.http.conf" \
  > /etc/nginx/sites-available/swimming-school
ln -sfn /etc/nginx/sites-available/swimming-school /etc/nginx/sites-enabled/swimming-school
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

########################################
# 9) SSL (optional)
########################################
if [[ "${SKIP_SSL}" != "1" ]]; then
  log "Requesting Let's Encrypt certificate for ${DOMAIN}"
  if certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" \
      --non-interactive --agree-tos -m "${EMAIL}" --redirect; then
    sed "s/__DOMAIN__/${DOMAIN}/g" \
      "${DEPLOY_DIR}/nginx/swimming-school.https.conf" \
      > /etc/nginx/sites-available/swimming-school
    nginx -t && systemctl reload nginx
  else
    echo "WARN: certbot failed (DNS not ready?). Site is available on HTTP."
    echo "      Later run: sudo bash ${DEPLOY_DIR}/enable-ssl.sh --domain ${DOMAIN}"
  fi
else
  log "Skipping SSL (--skip-ssl)"
fi

########################################
# 10) Health checks + final hints
########################################
sleep 2
log "Health check"
if curl -fsS "http://127.0.0.1:4000/api/health" >/tmp/swim-health.json 2>/dev/null; then
  cat /tmp/swim-health.json
  echo
else
  echo "WARN: API health check failed. Likely missing NIKSMS / ZARINPAL_MERCHANT_ID in backend/.env"
  if [[ "${RUNTIME_USER}" != "root" ]]; then
    sudo -u "${RUNTIME_USER}" -H pm2 logs swimming-api --lines 40 --nostream || true
  else
    pm2 logs swimming-api --lines 40 --nostream || true
  fi
fi

cat <<EOF

============================================================
 Deploy finished for: ${DOMAIN}
 Project path:        ${APP_ROOT}
 Secrets note:        ${SECRETS_NOTE}
============================================================

REQUIRED before production traffic works fully:

  1) Edit secrets:
       nano ${ENV_FILE}
     Fill at least:
       - NIKSMS_USERNAME
       - NIKSMS_PASSWORD
       - ZARINPAL_MERCHANT_ID

  2) Restart API:
       pm2 restart swimming-api

  3) Test:
       curl -s https://${DOMAIN}/api/health
       # or http:// if SSL was skipped

Useful:
  pm2 status
  pm2 logs swimming-api
  sudo bash ${DEPLOY_DIR}/update.sh
  sudo bash ${DEPLOY_DIR}/enable-ssl.sh --domain ${DOMAIN}

============================================================
EOF
