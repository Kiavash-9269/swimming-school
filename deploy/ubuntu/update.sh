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

echo "==> Backend deps"
cd "${BACKEND_DIR}"
if [[ -f package-lock.json ]]; then npm ci --omit=dev; else npm install --omit=dev; fi

echo "==> Frontend build"
cd "${FRONTEND_DIR}"
cat > .env.production <<'EOF'
VITE_API_BASE_URL=/api
EOF
chown "${RUNTIME_USER}:${RUNTIME_USER}" .env.production 2>/dev/null || true
if [[ -f package-lock.json ]]; then npm ci; else npm install; fi
npm run build
[[ -f dist/index.html ]] || { echo "Frontend build failed"; exit 1; }

echo "==> Restart API"
if [[ "${RUNTIME_USER}" != "root" ]]; then
  sudo -u "${RUNTIME_USER}" -H pm2 restart swimming-api
else
  pm2 restart swimming-api
fi

nginx -t && systemctl reload nginx

echo "==> Health"
sleep 1
curl -fsS http://127.0.0.1:4000/api/health || echo "Health check failed — see: pm2 logs swimming-api"
echo
echo "Update complete."
