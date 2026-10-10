#!/usr/bin/env bash
# One-time (safe to re-run) resource tuning for a small VPS running swimming-school.
#   sudo bash deploy/ubuntu/optimize-server.sh [--domain iranaustraliaswimming.ir] [--mongo-cache-mb 256] [--keep-docker]
#
# What it does:
#   1) 2 GB swap + low swappiness so builds/spikes do not OOM-kill the site
#   2) Backend .env: in-process scheduler OFF; hourly systemd jobs; tiny Mongo pool
#   3) MongoDB WiredTiger cache capped (default 256 MB instead of ~50% of RAM), re-applied on every boot
#   4) PM2 restarted with the memory-capped ecosystem file
#   5) Log rotation for app logs + journald size cap
#   6) Nginx site re-rendered with gzip_static, caching, rate limits and short timeouts
#   7) Docker/containerd stopped if installed but unused (this app does not use Docker)
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin:${PATH:-}"

APP_ROOT="/var/www/swimming-school"
DEPLOY_DIR="${APP_ROOT}/deploy/ubuntu"
ENV_FILE="${APP_ROOT}/backend/.env"
LOG_DIR="/var/log/swimming-school"
DOMAIN="iranaustraliaswimming.ir"
MONGO_CACHE_MB="256"
KEEP_DOCKER="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --mongo-cache-mb) MONGO_CACHE_MB="${2:-256}"; shift 2 ;;
    --keep-docker) KEEP_DOCKER="1"; shift ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

log()  { echo -e "\n==> $*"; }
warn() { echo "WARN: $*" >&2; }
[[ "${EUID}" -eq 0 ]] || { echo "Run with sudo."; exit 1; }
[[ -d "${APP_ROOT}/backend" ]] || { echo "Missing ${APP_ROOT}"; exit 1; }

echo "Before:"; free -h || true

########################################
# 1) Swap + kernel memory behaviour
########################################
log "Swap"
if ! swapon --show --noheadings | grep -q .; then
  if [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
  fi
  swapon /swapfile
fi
if [[ -f /swapfile ]] && ! grep -q '^/swapfile ' /etc/fstab; then
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
cat > /etc/sysctl.d/99-swimming-school.conf <<'EOF'
vm.swappiness=10
vm.vfs_cache_pressure=50
EOF
sysctl -p /etc/sysctl.d/99-swimming-school.conf >/dev/null
swapon --show || true

########################################
# 2) Backend env
########################################
set_env() {
  local key="$1" value="$2"
  if grep -q "^${key}=" "${ENV_FILE}"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "${ENV_FILE}"
  else
    echo "${key}=${value}" >> "${ENV_FILE}"
  fi
}
if [[ -f "${ENV_FILE}" ]]; then
  log "Backend .env tuning (extreme low idle CPU)"
  cp -a "${ENV_FILE}" "${ENV_FILE}.bak.optimize.$(date +%Y%m%d%H%M%S)"
  # No in-process setInterval — jobs run via swimming-jobs.timer (hourly).
  set_env SCHEDULER_ENABLED false
  set_env SCHEDULER_INTERVAL_MS 1800000
  set_env MONGO_MAX_POOL_SIZE 3
  set_env JOB_BATCH_SIZE 10
  set_env JOB_REMINDER_EVERY_N_TICKS 100
  set_env JOB_REMINDERS_ENABLED false
  set_env LOG_LEVEL warn
  chmod 600 "${ENV_FILE}"
else
  warn "${ENV_FILE} not found; skipping env tuning"
fi

########################################
# 2b) Hourly out-of-process jobs (replaces Node setInterval)
########################################
log "Install swimming-jobs.timer (hourly)"
cp -f "${DEPLOY_DIR}/swimming-jobs.service" /etc/systemd/system/swimming-jobs.service
cp -f "${DEPLOY_DIR}/swimming-jobs.timer" /etc/systemd/system/swimming-jobs.timer
systemctl daemon-reload
systemctl enable --now swimming-jobs.timer >/dev/null 2>&1 || true

########################################
# 3) MongoDB cache cap (persisted via a boot-time oneshot unit)
########################################
# Ubuntu 26.04 / kernel 6.19–7.0.13: MongoDB hard-exits without this (SERVER-121912).
if systemctl list-unit-files mongod.service >/dev/null 2>&1; then
  mkdir -p /etc/systemd/system/mongod.service.d
  cat > /etc/systemd/system/mongod.service.d/rseq.conf <<'RSEQ'
[Service]
Environment=GLIBC_TUNABLES=glibc.pthread.rseq=1
Nice=10
CPUSchedulingPolicy=batch
RSEQ
  if [[ -f /etc/mongod.conf ]] && ! grep -q 'cacheSizeGB' /etc/mongod.conf; then
    # Inject under storage: without rewriting the whole file if possible
    if grep -q '^storage:' /etc/mongod.conf; then
      python3 - <<'PY' || true
from pathlib import Path
p = Path("/etc/mongod.conf")
t = p.read_text()
if "cacheSizeGB" not in t:
    needle = "storage:\n"
    insert = "storage:\n  wiredTiger:\n    engineConfig:\n      cacheSizeGB: 0.25\n"
    if needle in t and "wiredTiger:" not in t:
        t = t.replace(needle, insert, 1)
        p.write_text(t)
PY
    fi
  fi
  systemctl daemon-reload
  systemctl restart mongod 2>/dev/null || true
fi

log "MongoDB WiredTiger cache -> ${MONGO_CACHE_MB} MB"
cat > /usr/local/sbin/swimming-mongo-tune.sh <<EOF
#!/usr/bin/env bash
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin"
CACHE="${MONGO_CACHE_MB}M"
SH=""
for c in /usr/local/bin/mongosh mongosh /snap/bin/mongodb-server-replicaset.mongosh; do
  if command -v "\$c" >/dev/null 2>&1; then SH="\$(command -v "\$c")"; break; fi
done
[[ -n "\$SH" ]] || { echo "mongosh not found"; exit 0; }
CMD="db.adminCommand({ setParameter: 1, wiredTigerEngineRuntimeConfig: 'cache_size=\${CACHE}' })"
for i in \$(seq 1 60); do
  "\$SH" --eval 'db.runCommand({ ping: 1 })' >/dev/null 2>&1 && break
  sleep 2
done
if [[ -f /root/.swimming-mongo-pass ]]; then
  "\$SH" -u root -p "\$(cat /root/.swimming-mongo-pass)" --authenticationDatabase admin --eval "\$CMD" 2>/dev/null \\
    | grep -q 'ok: 1' && { echo "mongo cache set to \${CACHE} (root)"; exit 0; }
fi
"\$SH" --eval "\$CMD" 2>/dev/null | grep -q 'ok: 1' && { echo "mongo cache set to \${CACHE}"; exit 0; }
echo "could not set mongo cache size (auth?)"
exit 0
EOF
chmod 700 /usr/local/sbin/swimming-mongo-tune.sh

cat > /etc/systemd/system/swimming-mongo-tune.service <<'EOF'
[Unit]
Description=Cap MongoDB WiredTiger cache for swimming-school
After=network-online.target snap.mongodb-server-replicaset.mongod.service mongod.service
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/swimming-mongo-tune.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable swimming-mongo-tune.service >/dev/null 2>&1 || true
/usr/local/sbin/swimming-mongo-tune.sh || true

########################################
# 4) PM2 with memory caps
########################################
log "PM2 (memory-capped ecosystem)"
mkdir -p "${LOG_DIR}"
if command -v pm2 >/dev/null 2>&1; then
  cd "${APP_ROOT}"
  pm2 delete swimming-api >/dev/null 2>&1 || true
  pm2 start "${DEPLOY_DIR}/pm2.ecosystem.config.cjs"
  pm2 save >/dev/null
  # pm2-logrotate is not needed; system logrotate below handles PM2 logs.
else
  warn "pm2 not installed"
fi

########################################
# 5) Log rotation + journald cap
########################################
log "Log rotation"
cat > /etc/logrotate.d/swimming-school <<EOF
${LOG_DIR}/*.log /root/.pm2/logs/*.log {
    daily
    rotate 7
    maxsize 50M
    compress
    delaycompress
    missingok
    notifempty
    copytruncate
}
EOF
logrotate -f /etc/logrotate.d/swimming-school 2>/dev/null || true

mkdir -p /etc/systemd/journald.conf.d
cat > /etc/systemd/journald.conf.d/swimming-school.conf <<'EOF'
[Journal]
SystemMaxUse=80M
RuntimeMaxUse=30M
EOF
systemctl restart systemd-journald || true
journalctl --vacuum-size=80M >/dev/null 2>&1 || true

# Security patches outweigh the once-a-day apt wake-up; keep unattended security upgrades on.
if systemctl list-unit-files unattended-upgrades.service >/dev/null 2>&1; then
  log "Keep unattended security upgrades enabled"
  systemctl enable --now unattended-upgrades.service >/dev/null 2>&1 || true
fi

########################################
# 6) Nginx
########################################
# One nginx worker + quiet access logs = less idle wakeups.
if [[ -f /etc/nginx/nginx.conf ]]; then
  sed -i 's/^worker_processes.*/worker_processes 1;/' /etc/nginx/nginx.conf || true
  if ! grep -q 'worker_connections 256' /etc/nginx/nginx.conf; then
    sed -i 's/worker_connections [0-9]\+/worker_connections 256/' /etc/nginx/nginx.conf || true
  fi
  # Prefer warn-level error log; access logs off globally if not already set in http{}
  if ! grep -qE '^\s*access_log\s+off;' /etc/nginx/nginx.conf; then
    sed -i '/http {/a\    access_log off;' /etc/nginx/nginx.conf || true
  fi
  sed -i 's/error_log [^;]*;/error_log \/var\/log\/nginx\/error.log warn;/' /etc/nginx/nginx.conf || true
fi

log "Nginx site for ${DOMAIN}"
SITE="/etc/nginx/sites-available/swimming-school"
if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  TEMPLATE="${DEPLOY_DIR}/nginx/swimming-school.https.conf"
else
  warn "No certificate for ${DOMAIN}; using HTTP template"
  TEMPLATE="${DEPLOY_DIR}/nginx/swimming-school.http.conf"
fi
BACKUP=""
if [[ -f "${SITE}" ]]; then
  BACKUP="${SITE}.bak.$(date +%Y%m%d%H%M%S)"
  cp -a "${SITE}" "${BACKUP}"
fi
sed "s/__DOMAIN__/${DOMAIN}/g" "${TEMPLATE}" > "${SITE}"
ln -sfn "${SITE}" /etc/nginx/sites-enabled/swimming-school
rm -f /etc/nginx/sites-enabled/default
if nginx -t; then
  systemctl reload nginx
else
  warn "nginx config test failed; restoring previous site file"
  [[ -n "${BACKUP}" ]] && cp -a "${BACKUP}" "${SITE}"
  nginx -t && systemctl reload nginx
fi

########################################
# 7) Unused Docker
########################################
if [[ "${KEEP_DOCKER}" != "1" ]] && systemctl is-active --quiet docker 2>/dev/null; then
  RUNNING="$(docker ps -q 2>/dev/null | wc -l || echo 0)"
  if [[ "${RUNNING}" -eq 0 ]]; then
    log "Docker is running with no containers; stopping it (use --keep-docker to skip)"
    systemctl disable --now docker.socket docker.service containerd.service >/dev/null 2>&1 || true
  else
    log "Docker has ${RUNNING} running container(s); leaving it alone"
  fi
fi

########################################
# Summary
########################################
sleep 3
log "Health"
curl -fsS -m 10 http://127.0.0.1:4000/api/health || warn "API health check failed: pm2 logs swimming-api"
echo
log "After"
free -h || true
echo
echo "Top memory users:"
ps -eo pid,user,%cpu,%mem,rss,comm --sort=-rss | head -n 10
echo
echo "Top CPU users:"
ps -eo pid,user,%cpu,%mem,comm --sort=-%cpu | head -n 10
echo
echo "Done. If an unknown process is near the top of these lists, run:"
echo "  sudo bash ${DEPLOY_DIR}/security-check.sh"
