#!/usr/bin/env bash
# Self-heal: restart stack if health checks fail. Safe to run every 2 minutes.
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin:${PATH:-}"

LOG="/var/log/swimming-school/watchdog.log"
mkdir -p /var/log/swimming-school
touch "${LOG}"

log() { echo "$(date -Is) $*" >> "${LOG}"; }

health_ok() {
  curl -fsS -m 8 -o /dev/null "http://127.0.0.1:4000/api/health" 2>/dev/null
}

if ! systemctl is-active --quiet mongod 2>/dev/null; then
  log "mongod down — restarting"
  systemctl restart mongod || true
  sleep 3
fi

if ! systemctl is-active --quiet nginx 2>/dev/null; then
  log "nginx down — restarting"
  systemctl reset-failed nginx 2>/dev/null || true
  systemctl restart nginx || true
fi

if ! health_ok; then
  log "API health failed — restarting PM2 swimming-api"
  if command -v pm2 >/dev/null 2>&1; then
    pm2 restart swimming-api --update-env >/dev/null 2>&1 || \
      pm2 start /var/www/swimming-school/deploy/ubuntu/pm2.ecosystem.config.cjs --update-env >/dev/null 2>&1 || true
    sleep 4
  fi
fi

if ! health_ok; then
  log "API still unhealthy — reloading nginx"
  nginx -t >/dev/null 2>&1 && systemctl reload nginx || true
fi

if ! curl -fsS -m 5 -o /dev/null -k "https://127.0.0.1/api/health" -H "Host: iranaustraliaswimming.ir" 2>/dev/null; then
  log "HTTPS proxy health failed (may be cert/host) — nginx restart"
  systemctl restart nginx >/dev/null 2>&1 || true
fi

# Trim watchdog log
if [[ "$(wc -c < "${LOG}" 2>/dev/null || echo 0)" -gt 500000 ]]; then
  tail -n 2000 "${LOG}" > "${LOG}.tmp" && mv "${LOG}.tmp" "${LOG}"
fi

exit 0
