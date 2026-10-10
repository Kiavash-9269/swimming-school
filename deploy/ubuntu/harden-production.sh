#!/usr/bin/env bash
# Production security + resilience for swimming-school (Ubuntu VPS).
#
#   sudo bash deploy/ubuntu/harden-production.sh --domain iranaustraliaswimming.ir
#   sudo bash deploy/ubuntu/harden-production.sh --domain example.com --ssh-pubkey /root/.ssh/id_ed25519.pub
#
# Safe to re-run. Does NOT rotate secrets — back up backend/.env separately.
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin:${PATH:-}"

APP_ROOT="/var/www/swimming-school"
DEPLOY_DIR="${APP_ROOT}/deploy/ubuntu"
DOMAIN=""
SSH_PUBKEY=""
DISABLE_PASSWORD_SSH="0"
SKIP_SSH="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --ssh-pubkey) SSH_PUBKEY="${2:-}"; shift 2 ;;
    --disable-password-ssh) DISABLE_PASSWORD_SSH="1"; shift ;;
    --skip-ssh) SKIP_SSH="1"; shift ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

[[ "${EUID}" -eq 0 ]] || { echo "Run with sudo."; exit 1; }
[[ -d "${APP_ROOT}/backend" ]] || { echo "Missing ${APP_ROOT}"; exit 1; }
DOMAIN="${DOMAIN:-iranaustraliaswimming.ir}"

log() { echo -e "\n==> $*"; }

########################################
# 1) Packages
########################################
log "Security packages (fail2ban, unattended security only optional)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y fail2ban ufw curl ca-certificates mongodb-database-tools 2>/dev/null \
  || apt-get install -y fail2ban ufw curl ca-certificates

########################################
# 2) Kernel / network hardening
########################################
log "Sysctl (SYN cookies, ignore bogus ICMP, no redirects)"
cat > /etc/sysctl.d/99-swimming-hardening.conf <<'EOF'
# Swimming-school VPS — network resilience
net.ipv4.tcp_syncookies = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0
net.ipv4.icmp_ignore_bogus_error_responses = 1
net.ipv4.tcp_max_syn_backlog = 4096
net.core.somaxconn = 4096
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 5
fs.protected_hardlinks = 1
fs.protected_symlinks = 1
EOF
sysctl --system >/dev/null 2>&1 || sysctl -p /etc/sysctl.d/99-swimming-hardening.conf >/dev/null

########################################
# 3) Firewall — only SSH/HTTP/HTTPS in
########################################
log "UFW (default deny, rate-limited SSH)"
ufw --force reset >/dev/null 2>&1 || true
ufw default deny incoming
ufw default allow outgoing
ufw limit OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose || true

########################################
# 4) SSH
########################################
if [[ "${SKIP_SSH}" != "1" ]]; then
  log "SSH hardening"
  mkdir -p /root/.ssh
  chmod 700 /root/.ssh
  if [[ -n "${SSH_PUBKEY}" && -f "${SSH_PUBKEY}" ]]; then
    grep -qF "$(cat "${SSH_PUBKEY}")" /root/.ssh/authorized_keys 2>/dev/null \
      || cat "${SSH_PUBKEY}" >> /root/.ssh/authorized_keys
  fi
  chmod 600 /root/.ssh/authorized_keys 2>/dev/null || true

  HAS_KEY=0
  [[ -s /root/.ssh/authorized_keys ]] && HAS_KEY=1

  mkdir -p /etc/ssh/sshd_config.d
  if [[ "${HAS_KEY}" -eq 1 && ( "${DISABLE_PASSWORD_SSH}" == "1" || -n "${SSH_PUBKEY}" ) ]]; then
    cat > /etc/ssh/sshd_config.d/99-swimming-school.conf <<'EOF'
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowTcpForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
    echo "SSH: key-only login enabled (password disabled)."
  else
    cat > /etc/ssh/sshd_config.d/99-swimming-school.conf <<'EOF'
# Password still allowed — add an SSH key and re-run with --ssh-pubkey to disable passwords.
MaxAuthTries 3
LoginGraceTime 30
X11Forwarding no
AllowTcpForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
    echo "SSH: password login still allowed (use fail2ban + ufw limit). Add --ssh-pubkey to lock down."
  fi
  systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
fi

########################################
# 5) fail2ban
########################################
log "fail2ban"
mkdir -p /etc/fail2ban/jail.d
cp -f "${DEPLOY_DIR}/fail2ban/jail.d/swimming-school.local" /etc/fail2ban/jail.d/swimming-school.local
systemctl enable fail2ban >/dev/null 2>&1 || true
systemctl restart fail2ban

########################################
# 6) MongoDB localhost-only
########################################
if [[ -f /etc/mongod.conf ]]; then
  log "MongoDB bind 127.0.0.1 only"
  if grep -q '^net:' /etc/mongod.conf; then
    python3 - <<'PY' || true
import re
from pathlib import Path
p = Path("/etc/mongod.conf")
t = p.read_text()
if "bindIp:" in t:
    t = re.sub(r"bindIp:\s*[^\n]+", "bindIp: 127.0.0.1", t)
elif "net:\n" in t:
    t = t.replace("net:\n", "net:\n  bindIp: 127.0.0.1\n", 1)
else:
    t = t.rstrip() + "\nnet:\n  bindIp: 127.0.0.1\n"
p.write_text(t)
PY
  fi
  systemctl restart mongod 2>/dev/null || true
fi

########################################
# 6b) MongoDB authorization (root password in /root/.swimming-mongo-pass)
########################################
MONGO_PASS_FILE="/root/.swimming-mongo-pass"
if [[ -f /etc/mongod.conf ]] && ! grep -qE '^\s*authorization:\s*enabled' /etc/mongod.conf; then
  MS="$(command -v mongosh || true)"
  if [[ -n "${MS}" ]] && ! grep -q '^security:' /etc/mongod.conf; then
    log "MongoDB: enable authorization"
    [[ -s "${MONGO_PASS_FILE}" ]] || { openssl rand -hex 24 > "${MONGO_PASS_FILE}"; }
    chmod 600 "${MONGO_PASS_FILE}"
    ROOT_PASS="$(cat "${MONGO_PASS_FILE}")"
    for _ in $(seq 1 30); do
      "${MS}" --quiet --eval 'db.runCommand({ ping: 1 })' >/dev/null 2>&1 && break
      sleep 2
    done
    "${MS}" --quiet admin --eval "
      if (db.getUser('root')) { db.changeUserPassword('root', '${ROOT_PASS}'); }
      else { db.createUser({ user: 'root', pwd: '${ROOT_PASS}', roles: [{ role: 'root', db: 'admin' }] }); }
    " >/dev/null
    printf '\nsecurity:\n  authorization: enabled\n' >> /etc/mongod.conf
    systemctl restart mongod
  else
    echo "WARN: mongosh missing or custom security: block in /etc/mongod.conf — enable authorization manually."
  fi
fi

########################################
# 6c) Self-healing + OOM priority for core services
########################################
log "systemd auto-restart + OOM protection (nginx, mongod)"
mkdir -p /etc/systemd/system/nginx.service.d
cat > /etc/systemd/system/nginx.service.d/10-swimming-resilience.conf <<'EOF'
[Unit]
StartLimitIntervalSec=0

[Service]
Restart=always
RestartSec=3
OOMScoreAdjust=-900
EOF
if [[ -f /etc/mongod.conf ]]; then
  mkdir -p /etc/systemd/system/mongod.service.d
  cat > /etc/systemd/system/mongod.service.d/10-swimming-resilience.conf <<'EOF'
[Unit]
StartLimitIntervalSec=0

[Service]
Restart=always
RestartSec=5
OOMScoreAdjust=-500
EOF
fi
systemctl daemon-reload

########################################
# 7) App secrets file permissions
########################################
log "File permissions"
chmod 600 "${APP_ROOT}/backend/.env" 2>/dev/null || true
chmod 700 "${APP_ROOT}/backend/.data" 2>/dev/null || true
find "${APP_ROOT}/backend/.data" -type f -exec chmod 600 {} \; 2>/dev/null || true

########################################
# 8) Nginx site (security headers + blocks + limits)
########################################
log "Nginx site for ${DOMAIN}"
if [[ -f /etc/nginx/nginx.conf ]]; then
  sed -i 's/^worker_processes.*/worker_processes 1;/' /etc/nginx/nginx.conf || true
  grep -qE '^\s*access_log\s+off;' /etc/nginx/nginx.conf || sed -i '/http {/a\    access_log off;' /etc/nginx/nginx.conf || true
fi
SITE="/etc/nginx/sites-available/swimming-school"
if [[ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  sed "s/__DOMAIN__/${DOMAIN}/g" "${DEPLOY_DIR}/nginx/swimming-school.https.conf" > "${SITE}"
else
  sed "s/__DOMAIN__/${DOMAIN}/g" "${DEPLOY_DIR}/nginx/swimming-school.http.conf" > "${SITE}"
fi
ln -sfn "${SITE}" /etc/nginx/sites-enabled/swimming-school
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl restart nginx

########################################
# 9) PM2 boot + resilience
########################################
log "PM2 startup on boot"
if command -v pm2 >/dev/null 2>&1; then
  cd "${APP_ROOT}"
  pm2 startOrReload "${DEPLOY_DIR}/pm2.ecosystem.config.cjs" --update-env || pm2 start "${DEPLOY_DIR}/pm2.ecosystem.config.cjs"
  pm2 save
  pm2 startup systemd -u root --hp /root 2>/dev/null | tail -n 1 | bash || true
fi

########################################
# 10) Watchdog + backup timers
########################################
log "Watchdog + daily backup timers"
chmod +x "${DEPLOY_DIR}/watchdog.sh" "${DEPLOY_DIR}/backup.sh"
cp -f "${DEPLOY_DIR}/swimming-watchdog.service" /etc/systemd/system/
cp -f "${DEPLOY_DIR}/swimming-watchdog.timer" /etc/systemd/system/
cp -f "${DEPLOY_DIR}/swimming-backup.service" /etc/systemd/system/
cp -f "${DEPLOY_DIR}/swimming-backup.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now swimming-watchdog.timer swimming-backup.timer swimming-jobs.timer 2>/dev/null || \
  systemctl enable --now swimming-watchdog.timer swimming-backup.timer || true

########################################
# 11) TLS auto-renew
########################################
log "Certbot renew timer"
systemctl enable certbot.timer 2>/dev/null || true
systemctl start certbot.timer 2>/dev/null || true

########################################
# 12) Hide version tokens
########################################
if [[ -f /etc/nginx/nginx.conf ]]; then
  sed -i -E '/^\s*server_tokens\s/d' /etc/nginx/nginx.conf
  sed -i '/http {/a\    server_tokens off;' /etc/nginx/nginx.conf
  nginx -t && systemctl reload nginx
fi

########################################
# Summary
########################################
log "Health"
curl -fsS -m 10 http://127.0.0.1:4000/api/health && echo || echo "WARN: API health failed"
echo
echo "Hardening applied for ${DOMAIN}."
echo "  - UFW: deny all except 22 (rate limit), 80, 443"
echo "  - fail2ban: ssh + nginx abuse"
echo "  - Watchdog every 2m, backup daily 03:15, jobs hourly"
echo "  - For volumetric DDoS: put Cloudflare (orange cloud) in front — see deploy/ubuntu/HARDENING.md"
echo "Re-run security audit: sudo bash ${DEPLOY_DIR}/security-check.sh"
