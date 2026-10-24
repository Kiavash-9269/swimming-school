#!/usr/bin/env bash
set -euo pipefail
cd /var/www/swimming-school
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin:${PATH:-}"

cp -a backend/.env "/root/swimming-backend.env.bak.$(date +%Y%m%d%H%M%S)"
echo "=== before ==="
git status --short | head -40

git fetch origin
git reset --hard HEAD
git clean -fd \
  -e 'backend/.env' \
  -e 'backend/.data' \
  -e 'backend/node_modules' \
  -e 'frontend/node_modules' \
  -e 'frontend/dist' \
  -e 'frontend/.env.production'

git reset --hard origin/main
echo "=== after reset ==="
git log -1 --oneline
git status --short | head -20

if [[ ! -f backend/.env ]]; then
  latest="$(ls -1t /root/swimming-backend.env.bak.* 2>/dev/null | head -1 || true)"
  [[ -n "$latest" ]] && cp -a "$latest" backend/.env
fi
test -f backend/.env
chmod 600 backend/.env

set_env() {
  local k="$1" v="$2"
  if grep -q "^${k}=" backend/.env; then
    sed -i "s|^${k}=.*|${k}=${v}|" backend/.env
  else
    echo "${k}=${v}" >> backend/.env
  fi
}
set_env PAYMENT_PROVIDER mock
set_env SCHEDULER_ENABLED false
set_env LOG_LEVEL warn
grep -q '^PAYMENT_CALLBACK_URL=.' backend/.env || set_env PAYMENT_CALLBACK_URL https://iranaustraliaswimming.ir/api/payments/callback
grep -q '^PAYMENT_CALLBACK_SECRET=.' backend/.env || set_env PAYMENT_CALLBACK_SECRET "$(openssl rand -hex 24)"

find deploy/ubuntu -name '*.sh' -exec sed -i 's/\r$//' {} +
chmod +x deploy/ubuntu/*.sh || true

bash deploy/ubuntu/finish-production.sh --domain iranaustraliaswimming.ir

echo "=== health ==="
curl -fsS -m 15 https://iranaustraliaswimming.ir/api/health
echo
pm2 status | head -20
