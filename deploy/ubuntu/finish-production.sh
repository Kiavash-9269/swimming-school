#!/usr/bin/env bash
# One command after git pull on the server to align prod with repo defaults.
#   sudo bash deploy/ubuntu/finish-production.sh --domain iranaustraliaswimming.ir
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin:${PATH:-}"

APP_ROOT="/var/www/swimming-school"
DOMAIN="iranaustraliaswimming.ir"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    -h|--help)
      echo "Usage: sudo bash deploy/ubuntu/finish-production.sh --domain YOUR_DOMAIN"
      exit 0
      ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

[[ "${EUID}" -eq 0 ]] || { echo "Run with sudo."; exit 1; }
[[ -d "${APP_ROOT}/backend" ]] || { echo "Missing ${APP_ROOT}"; exit 1; }

find "${APP_ROOT}/deploy/ubuntu" -name '*.sh' -exec sed -i 's/\r$//' {} +

bash "${APP_ROOT}/deploy/ubuntu/update.sh" --skip-pull
bash "${APP_ROOT}/deploy/ubuntu/optimize-server.sh" --domain "${DOMAIN}"
bash "${APP_ROOT}/deploy/ubuntu/harden-production.sh" --domain "${DOMAIN}" --skip-ssh

echo
echo "==> Smoke tests"
curl -fsS "https://${DOMAIN}/api/health" | head -c 200
echo
pm2 status
systemctl is-active nginx mongod fail2ban
echo
echo "Done. See deploy/ubuntu/GO-LIVE.md"
