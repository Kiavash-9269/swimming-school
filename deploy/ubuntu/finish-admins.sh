#!/usr/bin/env bash
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin"

APP="/var/www/swimming-school"
ENV_FILE="${APP}/backend/.env"

# Ensure patched source files are in place
cp -f /tmp/env.js "${APP}/backend/src/config/env.js"
cp -f /tmp/auth.controller.js "${APP}/backend/src/modules/auth/auth.controller.js"
cp -f /tmp/fix-mongo-and-admins.js "${APP}/deploy/ubuntu/fix-mongo-and-admins.js"

# HTTP access via server IP (until DNS/SSL ready)
sed -i 's|^FRONTEND_URL=.*|FRONTEND_URL=http://94.184.47.22|' "${ENV_FILE}"
sed -i 's|^COOKIE_SECURE=.*|COOKIE_SECURE=false|' "${ENV_FILE}"
sed -i 's|^PAYMENT_CALLBACK_URL=.*|PAYMENT_CALLBACK_URL=http://94.184.47.22/api/payments/callback|' "${ENV_FILE}"

grep -E '^(FRONTEND_URL|COOKIE_SECURE|MONGODB_URI|PAYMENT_CALLBACK_URL)=' "${ENV_FILE}" | sed 's#\(MONGODB_URI=mongodb://[^:]*\):[^@]*@#\1:***@#'

pm2 restart swimming-api --update-env
sleep 2
curl -fsS http://127.0.0.1:4000/api/health
echo

cd "${APP}/backend"
node ../deploy/ubuntu/fix-mongo-and-admins.js

echo "==> check-phone"
curl -fsS -X POST http://127.0.0.1:4000/api/auth/check-phone \
  -H 'Content-Type: application/json' \
  -d '{"phone":"09301905219"}'
echo

echo "==> login"
curl -fsS -X POST http://127.0.0.1:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phone":"09301905219","password":"09301905219"}'
echo
