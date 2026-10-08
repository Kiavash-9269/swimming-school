# Go-live checklist — iranaustraliaswimming.ir

## وضعیت فعلی (تکمیل استقرار)

- HTTPS + Let's Encrypt
- Nginx (rate limit، headers، static cache)
- PM2 + watchdog + hourly jobs + daily Mongo backup
- UFW + fail2ban
- SMS: Niksms
- پرداخت: **mock** تا فعال‌سازی زرین‌پال

## بعد از هر `git push`

```bash
cd /var/www/swimming-school
sudo bash deploy/ubuntu/update.sh
sudo bash deploy/ubuntu/optimize-server.sh --domain iranaustraliaswimming.ir
```

(یک بار بعد از pull جدید hardening: `sudo bash deploy/ubuntu/harden-production.sh --domain iranaustraliaswimming.ir`)

## تست سریع

```bash
curl -sS https://iranaustraliaswimming.ir/api/health
pm2 status
sudo systemctl status nginx mongod
sudo bash deploy/ubuntu/security-check.sh | tee /root/security-report.txt
```

## ادمین‌ها

شماره‌های ادمین با OTP/رمز = همان شماره (طبق `finish-admins.sh` / اسکریپت fix-mongo).

## فعال‌سازی زرین‌پال (بعداً)

در `backend/.env` روی سرور:

```env
PAYMENT_PROVIDER=zarinpal
ZARINPAL_MERCHANT_ID=...
ZARINPAL_SANDBOX=false
```

سپس: `pm2 restart swimming-api --update-env`

## DDoS حجیم

DNS را از Cloudflare با پروکسی نارنجی عبور بده — `deploy/ubuntu/HARDENING.md`
