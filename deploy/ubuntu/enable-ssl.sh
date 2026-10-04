#!/usr/bin/env bash
# Issue/renew Let's Encrypt cert and switch Nginx to HTTPS config.
#   sudo bash deploy/ubuntu/enable-ssl.sh --domain example.com [--email you@example.com]
set -euo pipefail

APP_ROOT="/var/www/swimming-school"
DEPLOY_DIR="${APP_ROOT}/deploy/ubuntu"
DOMAIN=""
EMAIL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --email) EMAIL="${2:-}"; shift 2 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

[[ "${EUID}" -eq 0 ]] || { echo "Run with sudo."; exit 1; }
[[ -n "${DOMAIN}" ]] || { echo "Usage: sudo bash enable-ssl.sh --domain YOUR_DOMAIN"; exit 1; }
EMAIL="${EMAIL:-admin@${DOMAIN}}"

# Ensure HTTP site is present for ACME
sed "s/__DOMAIN__/${DOMAIN}/g" \
  "${DEPLOY_DIR}/nginx/swimming-school.http.conf" \
  > /etc/nginx/sites-available/swimming-school
ln -sfn /etc/nginx/sites-available/swimming-school /etc/nginx/sites-enabled/swimming-school
mkdir -p /var/www/certbot
nginx -t && systemctl reload nginx

certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" \
  --non-interactive --agree-tos -m "${EMAIL}" --redirect

sed "s/__DOMAIN__/${DOMAIN}/g" \
  "${DEPLOY_DIR}/nginx/swimming-school.https.conf" \
  > /etc/nginx/sites-available/swimming-school
nginx -t && systemctl reload nginx

# Align backend cookie / callback URLs
ENV_FILE="${APP_ROOT}/backend/.env"
if [[ -f "${ENV_FILE}" ]]; then
  sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=https://${DOMAIN}|" "${ENV_FILE}"
  sed -i "s|^PAYMENT_CALLBACK_URL=.*|PAYMENT_CALLBACK_URL=https://${DOMAIN}/api/payments/callback|" "${ENV_FILE}"
  sed -i "s|^COOKIE_SECURE=.*|COOKIE_SECURE=true|" "${ENV_FILE}"
  RUNTIME_USER="${SUDO_USER:-root}"
  if [[ "${RUNTIME_USER}" != "root" ]]; then
    sudo -u "${RUNTIME_USER}" -H pm2 restart swimming-api || true
  else
    pm2 restart swimming-api || true
  fi
fi

echo "SSL enabled for https://${DOMAIN}"
curl -fsSI "https://${DOMAIN}" | head -n 5 || true
