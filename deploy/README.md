# استقرار روی Ubuntu با GitHub (clone + git pull)

پروژه: Express + React(Vite) + MongoDB + Nginx + PM2  
مسیر روی سرور: `/var/www/swimming-school`  
ریپو: `https://github.com/Kiavash-9269/swimming-school.git`

---

## قبل از شروع

1. سرور Ubuntu با SSH و `sudo`
2. دامنه با A Record به IP سرور
3. کد دیپلوی (`deploy/`) روی برنچ `main` در GitHub پوش شده باشد
4. اگر ریپو **خصوصی** است: روی سرور Deploy Key یا Personal Access Token بگذارید

---

## مرحله ۱ — کلون از GitHub روی سرور

```bash
ssh USER@SERVER_IP

sudo apt update && sudo apt install -y git
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www

# عمومی:
git clone https://github.com/Kiavash-9269/swimming-school.git swimming-school

# یا با SSH (اگر Deploy Key گذاشتی):
# git clone git@github.com:Kiavash-9269/swimming-school.git swimming-school

cd swimming-school
git checkout main
```

ریپوی خصوصی با HTTPS و توکن:

```bash
git clone https://YOUR_GITHUB_USERNAME:YOUR_TOKEN@github.com/Kiavash-9269/swimming-school.git swimming-school
```

---

## مرحله ۲ — یک فرمان نصب کامل

```bash
cd /var/www/swimming-school
sudo bash deploy/ubuntu/setup.sh --domain YOUR_DOMAIN.com
```

با اعتبارها یکجا:

```bash
sudo bash deploy/ubuntu/setup.sh \
  --domain YOUR_DOMAIN.com \
  --email you@example.com \
  --niksms-user YOUR_NIK_USER \
  --niksms-pass YOUR_NIK_PASS \
  --zarinpal-merchant YOUR_MERCHANT_ID
```

اگر DNS آماده نیست: `--skip-ssl` بزن؛ بعداً:

```bash
sudo bash deploy/ubuntu/enable-ssl.sh --domain YOUR_DOMAIN.com
```

اسکریپت: Node، MongoDB، Nginx، PM2، `.env` پروداکشن، بیلد فرانت، SSL.

---

## مرحله ۳ — تست

```bash
curl -s https://YOUR_DOMAIN.com/api/health
pm2 status
```

---

## آپدیت بعدی (همان چیزی که می‌خواستی)

روی لپ‌تاپ کد را push کن، بعد روی سرور:

```bash
cd /var/www/swimming-school
sudo bash deploy/ubuntu/update.sh
```

`update.sh` خودش:

1. `git pull origin main`
2. نصب وابستگی‌های بک‌اند
3. بیلد فرانت
4. `pm2 restart`
5. reload Nginx

`.env` و مدارک آپلودشده روی سرور می‌مانند (داخل گیت نیستند).

دستی هم می‌توانی:

```bash
cd /var/www/swimming-school
git pull origin main
sudo bash deploy/ubuntu/update.sh --skip-pull
```

---

## فایل‌ها

| فایل | کار |
|------|-----|
| `ubuntu/setup.sh` | نصب اولین بار |
| `ubuntu/update.sh` | `git pull` + بیلد + ریستارت |
| `ubuntu/enable-ssl.sh` | SSL |
| `ubuntu/nginx/*.conf` | Nginx |
| `ubuntu/pm2.ecosystem.config.cjs` | PM2 |
| `ubuntu/env.production.example` | نمونه env |

رمزهای تولیدشده فقط روی سرور: `deploy/ubuntu/.generated-secrets.txt` (در گیت ignore است).

---

## نکات

- اول تغییرات دیپلوی را از ویندوز `git push` کن، بعد روی سرور `git pull` / `update.sh`
- پورت `4000` و MongoDB را به اینترنت باز نکن
- راهنمای بلند: `DEPLOYMENT_LINUX_NGINX.md`
