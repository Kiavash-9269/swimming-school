#!/usr/bin/env bash
# Update production from GitHub:
#   sudo bash deploy/ubuntu/update.sh
#   sudo bash deploy/ubuntu/update.sh --branch main
#   sudo bash deploy/ubuntu/update.sh --skip-pull
set -euo pipefail

APP_ROOT="/var/www/swimming-school"
BACKEND_DIR="${APP_ROOT}/backend"
FRONTEND_DIR="${APP_ROOT}/frontend"
RUNTIME_USER="${SUDO_USER:-root}"
BRANCH="main"
SKIP_PULL="0"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --branch) BRANCH="${2:-main}"; shift 2 ;;
    --skip-pull) SKIP_PULL="1"; shift ;;
    -h|--help)
      echo "Usage: sudo bash deploy/ubuntu/update.sh [--branch main] [--skip-pull]"
      exit 0
      ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

[[ "${EUID}" -eq 0 ]] || { echo "Run with sudo."; exit 1; }
[[ -d "${BACKEND_DIR}" ]] || { echo "Missing ${BACKEND_DIR}"; exit 1; }
[[ -d "${APP_ROOT}/.git" ]] || { echo "Not a git repo: ${APP_ROOT}. Clone from GitHub first."; exit 1; }

# git as the non-root owner so credentials/permissions stay correct
run_as_app() {
  if [[ "${RUNTIME_USER}" != "root" ]]; then
    sudo -u "${RUNTIME_USER}" -H bash -lc "$*"
  else
    bash -lc "$*"
  fi
}

if [[ "${SKIP_PULL}" != "1" ]]; then
  echo "==> git fetch + pull (${BRANCH})"
  run_as_app "cd '${APP_ROOT}' && git fetch origin && git checkout '${BRANCH}' && git pull --ff-only origin '${BRANCH}'"
  run_as_app "cd '${APP_ROOT}' && git rev-parse --short HEAD && git log -1 --oneline"
fi

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin:${PATH:-}"

# Reinstall dependencies only when package-lock.json changed (npm ci is heavy on a small VPS).
install_deps() {
  local dir="$1" flags="$2" stamp hash
  cd "${dir}"
  stamp="node_modules/.lock-hash"
  hash="$(sha256sum package-lock.json 2>/dev/null | cut -d' ' -f1 || echo none)"
  if [[ -d node_modules && -f "${stamp}" && "$(cat "${stamp}")" == "${hash}" ]]; then
    echo "    dependencies unchanged in ${dir}"
    return
  fi
  if [[ -f package-lock.json ]]; then npm ci ${flags} --no-audit --no-fund; else npm install ${flags} --no-audit --no-fund; fi
  echo "${hash}" > "${stamp}"
}

# Vite needs ~1.5 GB; make sure swap exists so the build is not OOM-killed.
if ! swapon --show --noheadings | grep -q .; then
  echo "==> Creating 2G swap for the build"
  [[ -f /swapfile ]] || { fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048; chmod 600 /swapfile; mkswap /swapfile; }
  swapon /swapfile || true
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Backend deps"
install_deps "${BACKEND_DIR}" "--omit=dev"

echo "==> Frontend build"
cd "${FRONTEND_DIR}"
cat > .env.production <<'EOF'
VITE_API_BASE_URL=/api
EOF
chown "${RUNTIME_USER}:${RUNTIME_USER}" .env.production 2>/dev/null || true
install_deps "${FRONTEND_DIR}" ""
cd "${FRONTEND_DIR}"
# Build into a side directory and swap it in, so the live site never serves a half-empty dist/.
rm -rf dist-next
NODE_OPTIONS="--max-old-space-size=1536" npx vite build --outDir dist-next --emptyOutDir
[[ -f dist-next/index.html ]] || { echo "Frontend build failed"; exit 1; }
node scripts/precompress.mjs dist-next
rm -rf dist-prev
[[ -d dist ]] && mv dist dist-prev
mv dist-next dist
rm -rf dist-prev

echo "==> Restart API"
DEPLOY_DIR="${APP_ROOT}/deploy/ubuntu"
PM2_CMD="cd '${APP_ROOT}' && (pm2 delete swimming-api >/dev/null 2>&1 || true) && pm2 start '${DEPLOY_DIR}/pm2.ecosystem.config.cjs' && pm2 save"
if [[ "${RUNTIME_USER}" != "root" ]]; then
  sudo -u "${RUNTIME_USER}" -H bash -lc "${PM2_CMD}"
else
  bash -lc "${PM2_CMD}"
fi

nginx -t && systemctl reload nginx

echo "==> Health"
sleep 1
curl -fsS http://127.0.0.1:4000/api/health || echo "Health check failed — see: pm2 logs swimming-api"
echo
echo "Update complete."
