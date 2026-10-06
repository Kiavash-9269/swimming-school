#!/usr/bin/env bash
# Continue deploy after Mongo/Node base packages are already on the server.
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin"

APP_ROOT="/var/www/swimming-school"
BACKEND_DIR="${APP_ROOT}/backend"
FRONTEND_DIR="${APP_ROOT}/frontend"
DEPLOY_DIR="${APP_ROOT}/deploy/ubuntu"
LOG_DIR="/var/log/swimming-school"
DOMAIN="${1:-94.184.47.22}"
MONGO_APP_USER="swim_app"

echo "==> Mongo ping"
/snap/bin/mongodb-server-replicaset.mongosh --eval 'db.runCommand({ping:1})' >/dev/null
ln -sfn /snap/bin/mongodb-server-replicaset.mongosh /usr/local/bin/mongosh

DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)"
JWT_ACCESS="$(openssl rand -hex 32)"
JWT_REFRESH="$(openssl rand -hex 32)"
PAY_CB_SECRET="$(openssl rand -hex 24)"

echo "==> Ensure DB user (auth may be off; URI without auth is also written as fallback)"
/snap/bin/mongodb-server-replicaset.mongosh <<EOF || true
use swimming-school
try {
  db.createUser({
    user: "${MONGO_APP_USER}",
    pwd: "${DB_PASSWORD}",
    roles: [{ role: "readWrite", db: "swimming-school" }]
  });
} catch (e) {
  if (/already exists/i.test(String(e)) || e.codeName === "DuplicateKey") {
    try { db.changeUserPassword("${MONGO_APP_USER}", "${DB_PASSWORD}"); } catch (e2) {}
  }
}
EOF

# Snap Mongo often runs without authorization; prefer no-auth URI for reliability.
MONGODB_URI="mongodb://127.0.0.1:27017/swimming-school"

mkdir -p "${LOG_DIR}" "${BACKEND_DIR}/.data/documents" /var/www/certbot
chmod 750 "${BACKEND_DIR}/.data"
chmod 700 "${BACKEND_DIR}/.data/documents"

ENV_FILE="${BACKEND_DIR}/.env"
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

FRONTEND_URL=http://${DOMAIN}
COOKIE_SECURE=true
LOG_LEVEL=info

OTP_TTL_SECONDS=120
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_ATTEMPTS=5
OTP_CODE_LENGTH=5
OTP_RATE_LIMIT_PER_PHONE=5
OTP_RATE_LIMIT_WINDOW_SEC=600

SMS_PROVIDER=niksms
SMS_TIMEOUT_MS=20000
NIKSMS_USERNAME=pending
NIKSMS_PASSWORD=pending
NIKSMS_SENDER=985000403011
NIKSMS_ENDPOINT=http://94.182.154.28:1370/NiksmsWebservice.svc
NIKSMS_REST_URL=https://niksms.com/api/v2/send/one
SMS_EXPOSE_DEV_OTP=false

APP_TIMEZONE=Asia/Tehran
RESERVATION_HOLD_SECONDS=900
WAITLIST_OFFER_SECONDS=900

PAYMENT_PROVIDER=zarinpal
PAYMENT_CALLBACK_URL=http://${DOMAIN}/api/payments/callback
PAYMENT_CALLBACK_SECRET=${PAY_CB_SECRET}
PAYMENT_TIMEOUT_MS=15000
ZARINPAL_MERCHANT_ID=REPLACE_ME_ZARINPAL
ZARINPAL_SANDBOX=false

SCHEDULER_ENABLED=true
SCHEDULER_INTERVAL_MS=60000
MONGO_MAX_POOL_SIZE=10
JOB_BATCH_SIZE=50
NOTIFICATION_MAX_ATTEMPTS=3
NOTIFICATION_LEASE_SECONDS=60
NOTIFICATION_DEFAULT_LOCALE=fa
CLASS_REMINDER_HOURS=24
SESSION_REMINDER_HOURS=1
EMAIL_PROVIDER=mock

EXPORT_MAX_ROWS=5000

DOCUMENT_STORAGE_PROVIDER=local
DOCUMENT_STORAGE_ROOT=${BACKEND_DIR}/.data/documents
DOCUMENT_MAX_BYTES=5242880

APP_VERSION=1.0.0
EOF
chmod 600 "${ENV_FILE}"

cat > "${DEPLOY_DIR}/.generated-secrets.txt" <<EOF
Generated $(date -Is)
DOMAIN=${DOMAIN}
MONGODB_URI=${MONGODB_URI}
JWT_ACCESS_SECRET=${JWT_ACCESS}
JWT_REFRESH_SECRET=${JWT_REFRESH}
PAYMENT_CALLBACK_SECRET=${PAY_CB_SECRET}
EOF
chmod 600 "${DEPLOY_DIR}/.generated-secrets.txt"

echo "==> Backend npm"
cd "${BACKEND_DIR}"
if [[ -f package-lock.json ]]; then npm ci --omit=dev; else npm install --omit=dev; fi

echo "==> Frontend build"
cd "${FRONTEND_DIR}"
cat > .env.production <<'EOF'
VITE_API_BASE_URL=/api
EOF
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
npm run build
test -f dist/index.html

echo "==> PM2"
npm install -g pm2
cd "${APP_ROOT}"
pm2 delete swimming-api >/dev/null 2>&1 || true
pm2 start "${DEPLOY_DIR}/pm2.ecosystem.config.cjs"
pm2 save
pm2 startup systemd -u root --hp /root | tail -n 1 | bash || true

echo "==> Nginx HTTP"
sed "s/__DOMAIN__/${DOMAIN}/g" \
  "${DEPLOY_DIR}/nginx/swimming-school.http.conf" \
  > /etc/nginx/sites-available/swimming-school
ln -sfn /etc/nginx/sites-available/swimming-school /etc/nginx/sites-enabled/swimming-school
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

echo "==> Health"
sleep 2
curl -fsS http://127.0.0.1:4000/api/health || {
  echo "API not healthy yet — logs:"
  pm2 logs swimming-api --lines 60 --nostream || true
  exit 1
}
echo
echo "DONE. Open http://${DOMAIN}"
echo "Edit secrets: nano ${ENV_FILE}"
echo "Then: pm2 restart swimming-api"
