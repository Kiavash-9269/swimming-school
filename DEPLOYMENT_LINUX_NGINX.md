<div dir="rtl" lang="fa" markdown="1">

# راهنمای کامل استقرار پروژه مدرسه شنا روی سرور لینوکس + Nginx

این سند مخصوص همین ریپازیتوری است: **بک‌اند Express (Node.js)** + **فرانت‌اند Vite/React** + **MongoDB** + **Nginx** به‌عنوان ریورس‌پراکسی و سرو فایل‌های استاتیک.

---

## ۱) معماری پیشنهادی (یک دامنه)

| بخش | نقش | مسیر روی سرور |
|-----|-----|----------------|
| Nginx | SSL، فرانت استاتیک، پراکسی `/api` | پورت `80` / `443` |
| Backend | API روی `127.0.0.1:4000` | `/var/www/swimming-school/backend` |
| Frontend build | فایل‌های `dist` | `/var/www/swimming-school/frontend/dist` |
| MongoDB | دیتابیس محلی | سرویس `mongod` |
| PM2 | نگه‌داشتن پروسه Node | سرویس systemd از طریق PM2 |

جریان درخواست:

1. کاربر به `https://YOUR_DOMAIN` می‌رود.
2. Nginx فایل‌های React را می‌دهد.
3. درخواست‌های `https://YOUR_DOMAIN/api/...` به `http://127.0.0.1:4000` پراکسی می‌شوند.
4. کوکی رفرش‌توکن روی مسیر `/api/auth` تنظیم می‌شود؛ با همین دامنه مشترک، لاگین پایدار می‌ماند.

> **نکته مهم:** در فرانت، پیش‌فرض `VITE_API_BASE_URL=/api` است. در پروداکشن همین مقدار را نگه دارید تا همه‌چیز از همان دامنه برود.

---

## ۲) پیش‌نیازها

### سخت‌افزار پیشنهادی
- حداقل: ۱ تا ۲ vCPU، ۲GB RAM، ۲۰GB دیسک
- پیشنهادی: ۲ vCPU، ۴GB RAM

### نرم‌افزار
- Ubuntu 22.04 LTS یا Debian 12 (دستورات زیر برای Ubuntu است)
- دامنه که به IP سرور اشاره کند (A Record)
- دسترسی SSH با کاربر دارای `sudo`
- پورت‌های خروجی برای SMS نیک‌اس‌ام‌اس: `94.182.154.28:1370` (اگر فایروال خروجی محدود است)

### نسخه‌ها
- Node.js **20 LTS** یا **22 LTS**
- MongoDB **7.x** یا **8.x**
- Nginx آخرین نسخه پایدار
- PM2 برای اجرای بک‌اند

---

## ۳) آماده‌سازی سرور

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw build-essential
```

### فایروال

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

> پورت `4000` را به اینترنت باز نکنید؛ فقط از localhost پشت Nginx در دسترس باشد.

---

## ۴) نصب Node.js (از NodeSource)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

---

## ۵) نصب MongoDB

مستندات رسمی MongoDB را برای نسخه سیستم‌عامل خود دنبال کنید. نمونه برای Ubuntu 22.04:

```bash
# کلید و ریپو را طبق docs.mongodb.com اضافه کنید، سپس:
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
sudo systemctl status mongod
```

تست اتصال:

```bash
mongosh --eval 'db.runCommand({ ping: 1 })'
```

برای پروداکشن توصیه می‌شود:
- احراز هویت MongoDB را فعال کنید
- فقط روی `127.0.0.1` گوش دهد
- بکاپ دوره‌ای بگیرید

نمونه ساخت کاربر دیتابیس:

```javascript
// داخل mongosh
use swimming-school
db.createUser({
  user: "swim_app",
  pwd: "REPLACE_STRONG_PASSWORD",
  roles: [{ role: "readWrite", db: "swimming-school" }]
})
```

سپس در `.env` بک‌اند:

```env
MONGODB_URI=mongodb://swim_app:REPLACE_STRONG_PASSWORD@127.0.0.1:27017/swimming-school?authSource=swimming-school
```

---

## ۶) نصب Nginx و Certbot

```bash
sudo apt install -y nginx
sudo systemctl enable --now nginx

sudo apt install -y certbot python3-certbot-nginx
```

---

## ۷) انتقال پروژه به سرور

### روش A — Git (پیشنهادی)

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone YOUR_REPO_URL swimming-school
cd swimming-school
```

### روش B — آپلود ZIP / SCP

```bash
# از ماشین محلی:
# scp -r ./swimming-school user@SERVER_IP:/var/www/
```

ساختار نهایی باید شبیه این باشد:

```text
/var/www/swimming-school/
  backend/
  frontend/
  DEPLOYMENT_LINUX_NGINX.md
```

---

## ۸) پیکربندی بک‌اند (production)

```bash
cd /var/www/swimming-school/backend
cp .env.example .env
nano .env
```

### نمونه `.env` پروداکشن (با دامنه واقعی خودتان)

```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb://swim_app:REPLACE_STRONG_PASSWORD@127.0.0.1:27017/swimming-school?authSource=swimming-school

JWT_ACCESS_SECRET=حداقل_۳۲_کاراکتر_تصادفی_قوی
JWT_REFRESH_SECRET=حداقل_۳۲_کاراکتر_تصادفی_قوی_دیگر
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_REGISTRATION_EXPIRES_IN=15m
JWT_PASSWORD_RESET_EXPIRES_IN=15m

FRONTEND_URL=https://YOUR_DOMAIN
COOKIE_SECURE=true
LOG_LEVEL=info

OTP_TTL_SECONDS=120
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_ATTEMPTS=5
OTP_CODE_LENGTH=5
OTP_RATE_LIMIT_PER_PHONE=5
OTP_RATE_LIMIT_WINDOW_SEC=600

SMS_PROVIDER=niksms
SMS_TIMEOUT_MS=20000
NIKSMS_USERNAME=YOUR_NIKSMS_USERNAME
NIKSMS_PASSWORD=YOUR_NIKSMS_PASSWORD
NIKSMS_SENDER=
NIKSMS_ENDPOINT=http://94.182.154.28:1370/NiksmsWebservice.svc

APP_TIMEZONE=Asia/Tehran
RESERVATION_HOLD_SECONDS=900
WAITLIST_OFFER_SECONDS=900

# در production مقدار mock ممنوع است و سرور بالا نمی‌آید
PAYMENT_PROVIDER=zarinpal
PAYMENT_CALLBACK_URL=https://YOUR_DOMAIN/api/payments/callback
PAYMENT_CALLBACK_SECRET=یک_رمز_قوی_برای_کال‌بک
PAYMENT_TIMEOUT_MS=15000
ZARINPAL_MERCHANT_ID=YOUR_MERCHANT_ID
ZARINPAL_SANDBOX=false

SCHEDULER_ENABLED=true
SCHEDULER_INTERVAL_MS=15000
JOB_BATCH_SIZE=50
NOTIFICATION_MAX_ATTEMPTS=3
NOTIFICATION_LEASE_SECONDS=60
NOTIFICATION_DEFAULT_LOCALE=fa
CLASS_REMINDER_HOURS=24
SESSION_REMINDER_HOURS=1
EMAIL_PROVIDER=mock

EXPORT_MAX_ROWS=5000

DOCUMENT_STORAGE_PROVIDER=local
DOCUMENT_STORAGE_ROOT=/var/www/swimming-school/backend/.data/documents
DOCUMENT_MAX_BYTES=5242880

APP_VERSION=1.0.0
```

### قوانین اجباری کد پروژه (اگر رعایت نشود، بک‌اند استارت نمی‌شود)

| شرط | مقدار لازم |
|-----|------------|
| `NODE_ENV=production` | `COOKIE_SECURE=true` |
| SMS | `SMS_PROVIDER` یکی از `niksms` / `sms-webservice` / `kavenegar` (نه `development`) |
| پرداخت | `PAYMENT_PROVIDER` نباید `mock` باشد |
| زرین‌پال | `ZARINPAL_SANDBOX=false` + `ZARINPAL_MERCHANT_ID` + `PAYMENT_CALLBACK_URL` + `PAYMENT_CALLBACK_SECRET` |

ساخت پوشه اسناد و قفل دسترسی `.env`:

```bash
mkdir -p /var/www/swimming-school/backend/.data/documents
chmod 700 /var/www/swimming-school/backend/.env
chmod 750 /var/www/swimming-school/backend/.data
```

نصب وابستگی‌ها:

```bash
cd /var/www/swimming-school/backend
npm ci --omit=dev
```

اگر `npm ci` به‌خاطر نبودن `package-lock` خطا داد:

```bash
npm install --omit=dev
```

تست سریع هلث (بعد از بالا آمدن سرویس):

```bash
curl -s http://127.0.0.1:4000/api/health
```

---

## ۹) بیلد فرانت‌اند

```bash
cd /var/www/swimming-school/frontend
npm ci
# یا: npm install
```

فایل محیطی فرانت (اختیاری؛ پیش‌فرض کافی است):

```bash
cat > .env.production << 'EOF'
VITE_API_BASE_URL=/api
EOF
```

بیلد:

```bash
npm run build
ls -la dist
```

خروجی باید در `frontend/dist` باشد. Nginx همین پوشه را سرو می‌کند.

---

## ۱۰) اجرای بک‌اند با PM2

```bash
sudo npm install -g pm2

cd /var/www/swimming-school/backend
pm2 start index.js --name swimming-api
pm2 save
pm2 startup
# دستوری که PM2 چاپ می‌کند را عیناً با sudo اجرا کنید
```

دستورات مفید:

```bash
pm2 status
pm2 logs swimming-api --lines 100
pm2 restart swimming-api
pm2 stop swimming-api
```

---

## ۱۱) فایل کامل Nginx

دامنه را جایگزین کنید: `YOUR_DOMAIN`

```bash
sudo nano /etc/nginx/sites-available/swimming-school
```

محتوای کامل فایل:

```nginx
# Upstream بک‌اند Node (فقط localhost)
upstream swimming_api {
    server 127.0.0.1:4000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name YOUR_DOMAIN www.YOUR_DOMAIN;

    # برای صدور گواهی Let's Encrypt
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # قبل از SSL می‌توانید موقتاً به فرانت/API سرویس دهید؛
    # بعد از certbot معمولاً به HTTPS ریدایرکت می‌شود.
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name YOUR_DOMAIN www.YOUR_DOMAIN;

    # مسیرهای گواهی بعد از certbot پر می‌شوند
    ssl_certificate     /etc/letsencrypt/live/YOUR_DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/YOUR_DOMAIN/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # امنیت پایه هدرها
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # ریشه فرانت بیلدشده
    root /var/www/swimming-school/frontend/dist;
    index index.html;

    client_max_body_size 6m;

    # لاگ‌ها
    access_log /var/log/nginx/swimming-access.log;
    error_log  /var/log/nginx/swimming-error.log warn;

    # —— API به Node ——
    location /api/ {
        proxy_pass http://swimming_api;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection        "";

        # برای آپلود مدارک / JSON
        proxy_connect_timeout 60s;
        proxy_send_timeout    60s;
        proxy_read_timeout    60s;

        # کوکی‌ها و CORS با credentials از همین دامنه عبور می‌کنند
        proxy_cookie_path / /;
    }

    # فایل‌های استاتیک با کش بلندمدت (هش در نام فایل Vite)
    location /assets/ {
        try_files $uri =404;
        access_log off;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA: همه مسیرهای فرانت → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # مخفی‌سازی فایل‌های حساس
    location ~ /\. {
        deny all;
    }
}
```

فعال‌سازی:

```bash
sudo mkdir -p /var/www/certbot
sudo ln -sf /etc/nginx/sites-available/swimming-school /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### نکته درباره SSL قبل از وجود گواهی

اگر هنوز گواهی ندارید، موقتاً فقط بلوک `listen 80` را با سرو فرانت + پراکسی API بدون ریدایرکت HTTPS استفاده کنید، گواهی بگیرید، بعد فایل کامل بالا را بگذارید.

نمونه موقت فقط HTTP (برای اولین بار):

```nginx
upstream swimming_api {
    server 127.0.0.1:4000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name YOUR_DOMAIN www.YOUR_DOMAIN;

    root /var/www/swimming-school/frontend/dist;
    index index.html;
    client_max_body_size 6m;

    location /api/ {
        proxy_pass http://swimming_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## ۱۲) گرفتن SSL با Let's Encrypt

```bash
sudo certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN
```

تمدید خودکار معمولاً با timer سیستم نصب می‌شود. تست:

```bash
sudo certbot renew --dry-run
```

بعد از SSL، در `.env` بک‌اند حتماً:

```env
FRONTEND_URL=https://YOUR_DOMAIN
COOKIE_SECURE=true
```

سپس:

```bash
pm2 restart swimming-api
```

---

## ۱۳) چک‌لیست بعد از استقرار

```bash
# هلث API از داخل سرور
curl -s http://127.0.0.1:4000/api/health | jq .

# هلث از بیرون / دامنه
curl -s https://YOUR_DOMAIN/api/health

# فرانت
curl -I https://YOUR_DOMAIN

# وضعیت سرویس‌ها
pm2 status
sudo systemctl status nginx mongod --no-pager
```

در مرورگر:
1. باز شدن صفحه اصلی
2. ثبت‌نام / ارسال OTP (پیامک نیک‌اس‌ام‌اس)
3. لاگین و ماندگاری نشست (کوکی)
4. آپلود مدرک (حداکثر حدود ۵MB طبق `DOCUMENT_MAX_BYTES`)

---

## ۱۴) به‌روزرسانی نسخه جدید (Deploy مجدد)

```bash
cd /var/www/swimming-school
git pull

# بک‌اند
cd backend
npm ci --omit=dev
# در صورت تغییر .env.example، متغیرهای جدید را دستی به .env اضافه کنید
pm2 restart swimming-api

# فرانت
cd ../frontend
npm ci
npm run build

sudo nginx -t && sudo systemctl reload nginx
```

---

## ۱۵) بکاپ

### MongoDB

```bash
mkdir -p /var/backups/swimming-school
mongodump --uri="$MONGODB_URI" --out=/var/backups/swimming-school/$(date +%F)
```

### مدارک آپلودشده

```bash
tar -czf /var/backups/swimming-school/documents-$(date +%F).tar.gz \
  /var/www/swimming-school/backend/.data/documents
```

`.env` را جداگانه در جای امن نگه دارید (هرگز داخل گیت نگذارید).

---

## ۱۶) پیامک نیک‌اس‌ام‌اس روی سرور

- احراز هویت: `NIKSMS_USERNAME` و `NIKSMS_PASSWORD` (نه ApiKey مربوط به sms-webservice)
- Endpoint پیش‌فرض: `http://94.182.154.28:1370/NiksmsWebservice.svc`
- سرور باید بتواند به IP/پورت بالا **خروجی** بزند
- در پروداکشن `SMS_PROVIDER=development` ممنوع است

تست اعتبار از روی سرور (بدون ارسال پیامک واقعی به کاربر نهایی، با GetCredit از پنل یا با یک شماره تست خودتان):

```bash
# بعد از استارت API، از UI ثبت‌نام یک OTP تست بگیرید
pm2 logs swimming-api --lines 50
```

---

## ۱۷) عیب‌یابی رایج

| مشکل | علت محتمل | راه‌حل |
|------|-----------|--------|
| بک‌اند بالا نمی‌آید | `COOKIE_SECURE` یا `PAYMENT_PROVIDER=mock` یا SMS اشتباه | لاگ `pm2 logs` و `.env` را با جدول بخش ۸ چک کنید |
| CORS / کوکی لاگین نمی‌ماند | `FRONTEND_URL` با دامنه واقعی یکی نیست یا HTTP بدون Secure | دامنه HTTPS و `COOKIE_SECURE=true` |
| `502 Bad Gateway` | Node خاموش است | `pm2 restart swimming-api` |
| فرانت سفید / رفرش ۴۰۴ | `try_files` برای SPA نیست | بلوک `location /` بخش Nginx |
| OTP نمی‌رود | فایروال خروجی یا اعتبار نیک‌اس‌ام‌اس | دسترسی به `94.182.154.28:1370` و لاگ SMS |
| آپلود مدرک خطا | محدودیت حجم Nginx | `client_max_body_size 6m` |

لاگ‌ها:

```bash
pm2 logs swimming-api
sudo tail -f /var/log/nginx/swimming-error.log
sudo journalctl -u mongod -n 100 --no-pager
```

---

## ۱۸) امنیت عملیاتی (خلاصه)

1. هرگز `.env` را commit نکنید (`backend/.env` در `.gitignore` است).
2. پورت `4000` و MongoDB را روی اینترنت باز نگذارید.
3. JWT و رمزهای پنل SMS را قوی و یکتا بگذارید.
4. بعد از تست، رمزهایی که در چت/پیام رد و بدل شده‌اند را در پنل عوض کنید.
5. به‌روزرسانی امنیتی OS را فعال نگه دارید: `unattended-upgrades`.
6. در صورت امکان Fail2ban برای SSH نصب کنید.

---

## ۱۹) خلاصه مسیر سریع (Cheat Sheet)

```bash
# 1) وابستگی‌های سیستم
sudo apt update && sudo apt install -y nginx git curl ufw
# Node 22 + MongoDB + Certbot را طبق بخش‌های ۴ تا ۶ نصب کنید

# 2) کد
cd /var/www && git clone YOUR_REPO_URL swimming-school

# 3) بک‌اند
cd /var/www/swimming-school/backend
cp .env.example .env   # سپس ویرایش پروداکشن
npm ci --omit=dev
pm2 start index.js --name swimming-api && pm2 save && pm2 startup

# 4) فرانت
cd /var/www/swimming-school/frontend
npm ci && npm run build

# 5) Nginx + SSL
sudo nano /etc/nginx/sites-available/swimming-school
sudo ln -sf /etc/nginx/sites-available/swimming-school /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN

# 6) تست
curl -s https://YOUR_DOMAIN/api/health
```

---

## ۲۰) فایل‌های مرتبط در پروژه

| فایل | کاربرد |
|------|--------|
| `backend/.env.example` | الگوی متغیرهای محیطی بک‌اند |
| `backend/src/config/env.js` | اعتبارسنجی اجباری پروداکشن |
| `frontend/.env.example` | `VITE_API_BASE_URL` |
| `frontend/vite.config.js` | پراکسی توسعه `/api` → `:4000` |
| `backend/src/app.js` | CORS، Helmet، `trust proxy`، `/api/health` |

---

**پایان راهنما.** در صورت تغییر دامنه، فقط `FRONTEND_URL`، بلاک `server_name` در Nginx، و گواهی SSL را هم‌راستا کنید و `pm2 restart swimming-api` بزنید.

</div>
