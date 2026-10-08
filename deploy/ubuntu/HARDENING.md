# Production hardening (swimming-school)

One command on the server (after `git pull`):

```bash
sudo bash deploy/ubuntu/harden-production.sh --domain iranaustraliaswimming.ir
```

Lock SSH to keys only (recommended after you confirm key login works):

```bash
sudo bash deploy/ubuntu/harden-production.sh --domain iranaustraliaswimming.ir --ssh-pubkey ~/.ssh/id_ed25519.pub --disable-password-ssh
```

## What this gives you

| Layer | Measure |
|--------|---------|
| Network | UFW default deny; SSH rate limit; sysctl SYN cookies |
| SSH | MaxAuthTries, no X11/forwarding; optional key-only root |
| Web | TLS, HSTS, security headers, rate limits, scanner blocks |
| App | Helmet, CORS, auth rate limits, global API cap |
| Process | PM2 autorestart + boot; watchdog every 2 min |
| Data | Mongo localhost + auth; daily `mongodump` backup |
| Abuse | fail2ban (SSH + nginx 429/bots) |

## DDoS and “cannot be taken down”

No single VPS is immune to a large **volumetric** attack (hundreds of thousands of packets/sec). That is normal.

**Required for serious DDoS protection:**

1. Point DNS for `iranaustraliaswimming.ir` through **Cloudflare** (proxy enabled — orange cloud).
2. Enable **“Under Attack”** mode only during an active flood.
3. Use Cloudflare SSL mode **Full (strict)** with your Let’s Encrypt cert on origin (already supported).

Origin hardening (this repo) stops abuse, brute force, and keeps the stack self-healing; Cloudflare absorbs volume.

## Ongoing ops

```bash
sudo bash deploy/ubuntu/security-check.sh | tee /root/security-report.txt
sudo bash deploy/ubuntu/update.sh
sudo bash deploy/ubuntu/optimize-server.sh --domain iranaustraliaswimming.ir
```

Backups: `/var/backups/swimming-school/swimming-*.tar.gz` (7-day retention).

Restore example:

```bash
tar -xzf /var/backups/swimming-school/swimming-YYYYMMDD-HHMMSS.tar.gz -C /tmp
mongorestore --host 127.0.0.1 --drop /tmp/.../dump/swimming-school
```

## Checklist before calling it “100/100”

- [ ] Strong unique `JWT_*`, `PAYMENT_CALLBACK_SECRET`, Mongo password in `backend/.env`
- [ ] Root password changed from default; SSH key added and password SSH disabled
- [ ] Cloudflare proxy on production DNS
- [ ] `ZARINPAL_SANDBOX=false` and real merchant id
- [ ] `SMS_EXPOSE_DEV_OTP=false`
- [ ] Monitor: `pm2 logs swimming-api`, `journalctl -u nginx -f`, `fail2ban-client status`
