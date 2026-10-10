#!/usr/bin/env bash
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin"

DOMAIN="${1:-iranaustraliaswimming.ir}"
APP="/var/www/swimming-school"
ENV_FILE="${APP}/backend/.env"
SERVER_IP="$(hostname -I | awk '{print $1}')"
DNS_IP="$(dig +short "${DOMAIN}" A | head -n1 || true)"

echo "Domain:    ${DOMAIN}"
echo "Server IP: ${SERVER_IP}"
echo "DNS A:     ${DNS_IP:-unknown}"

sed "s/__DOMAIN__/${DOMAIN}/g" \
  "${APP}/deploy/ubuntu/nginx/swimming-school.http.conf" \
  > /etc/nginx/sites-available/swimming-school
ln -sfn /etc/nginx/sites-available/swimming-school /etc/nginx/sites-enabled/swimming-school
rm -f /etc/nginx/sites-enabled/default
mkdir -p /var/www/certbot
nginx -t
systemctl reload nginx

cp -a "${ENV_FILE}" "${ENV_FILE}.bak.domain.$(date +%Y%m%d%H%M%S)"
sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=https://${DOMAIN}|" "${ENV_FILE}"
sed -i "s|^PAYMENT_CALLBACK_URL=.*|PAYMENT_CALLBACK_URL=https://${DOMAIN}/api/payments/callback|" "${ENV_FILE}"
sed -i "s|^COOKIE_SECURE=.*|COOKIE_SECURE=true|" "${ENV_FILE}"
grep -E '^(FRONTEND_URL|PAYMENT_CALLBACK_URL|COOKIE_SECURE)=' "${ENV_FILE}"

pm2 restart swimming-api
sleep 2
curl -fsS http://127.0.0.1:4000/api/health
echo

if [[ -n "${DNS_IP}" && "${DNS_IP}" != "${SERVER_IP}" ]]; then
  echo "WARNING: DNS points to ${DNS_IP}, server is ${SERVER_IP}."
  echo "Update A records for ${DOMAIN} and www.${DOMAIN} to ${SERVER_IP}, then re-run:"
  echo "  bash ${APP}/deploy/ubuntu/enable-domain.sh ${DOMAIN}"
  exit 2
fi

if certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" \
  --non-interactive --agree-tos -m "admin@${DOMAIN}" --redirect; then
  sed "s/__DOMAIN__/${DOMAIN}/g" \
    "${APP}/deploy/ubuntu/nginx/swimming-school.https.conf" \
    > /etc/nginx/sites-available/swimming-school
  nginx -t && systemctl reload nginx
  echo "SSL enabled: https://${DOMAIN}"
  curl -fsSI "https://${DOMAIN}" | head -n 10 || true
else
  echo "certbot failed"
  exit 1
fi
