#!/usr/bin/env bash
# Enable usable MongoDB access for the swimming-school app on snap mongodb.
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin"

MS="/snap/bin/mongodb-server-replicaset.mongosh"
APP_ENV="/var/www/swimming-school/backend/.env"
DB_USER="swim_app"
DB_PASS="$(openssl rand -base64 24 | tr -d '/+=' | head -c 28)"

echo "==> Creating MongoDB root + app users (localhost exception)"
"$MS" <<EOF
use admin
try {
  db.createUser({
    user: "root",
    pwd: "${DB_PASS}",
    roles: [ { role: "root", db: "admin" } ]
  });
  print("created root");
} catch (e) {
  if (/already exists/i.test(String(e)) || e.code === 51003 || e.codeName === "DuplicateKey") {
    db.changeUserPassword("root", "${DB_PASS}");
    print("updated root password");
  } else {
    throw e;
  }
}
EOF

"$MS" -u root -p "${DB_PASS}" --authenticationDatabase admin <<EOF
use swimming-school
try {
  db.createUser({
    user: "${DB_USER}",
    pwd: "${DB_PASS}",
    roles: [ { role: "readWrite", db: "swimming-school" } ]
  });
  print("created ${DB_USER}");
} catch (e) {
  if (/already exists/i.test(String(e)) || e.code === 51003 || e.codeName === "DuplicateKey") {
    db.changeUserPassword("${DB_USER}", "${DB_PASS}");
    print("updated ${DB_USER} password");
  } else {
    throw e;
  }
}
db.runCommand({ ping: 1 })
EOF

URI="mongodb://${DB_USER}:${DB_PASS}@127.0.0.1:27017/swimming-school?authSource=swimming-school"
# Also allow admin authSource fallback URI if needed
cp -a "${APP_ENV}" "${APP_ENV}.bak.mongo.$(date +%Y%m%d%H%M%S)"
if grep -q '^MONGODB_URI=' "${APP_ENV}"; then
  sed -i "s|^MONGODB_URI=.*|MONGODB_URI=${URI}|" "${APP_ENV}"
else
  echo "MONGODB_URI=${URI}" >> "${APP_ENV}"
fi

# CORS / cookies while site is reached via IP over HTTP
# Keep domain for later SSL, but allow IP origin by setting FRONTEND_URL to the IP the browser uses.
# User currently opens http://94.184.47.22
sed -i 's|^FRONTEND_URL=.*|FRONTEND_URL=http://94.184.47.22|' "${APP_ENV}"
# Production still requires COOKIE_SECURE=true; cookies will not stick on plain HTTP.
# Temporary workaround: set COOKIE_SECURE=false is blocked by env.js in production.
# So we also patch allowed origins via an extra env if supported — otherwise leave and rely on same-host /api.

chmod 600 "${APP_ENV}"
echo "MONGODB_URI updated (credentials written to .env)"
echo "${DB_PASS}" > /root/.swimming-mongo-pass
chmod 600 /root/.swimming-mongo-pass

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin"
pm2 restart swimming-api --update-env
sleep 2
curl -fsS http://127.0.0.1:4000/api/health
echo
echo "Mongo auth fixed."
