#!/usr/bin/env bash
# Read-only report of common signs of a compromised VPS (miners, DDoS bots, backdoors).
# It changes nothing. Run: sudo bash deploy/ubuntu/security-check.sh | tee /root/security-report.txt
set -uo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin:${PATH:-}"

[[ "${EUID}" -eq 0 ]] || { echo "Run with sudo."; exit 1; }

section() { echo; echo "================ $* ================"; }
FLAGS=0
flag() { echo "  [!] $*"; FLAGS=$((FLAGS + 1)); }

section "Load / memory"
uptime
free -h

section "Top CPU processes"
ps -eo pid,ppid,user,%cpu,%mem,etime,cmd --sort=-%cpu | head -n 15

section "Top memory processes"
ps -eo pid,user,%mem,rss,cmd --sort=-rss | head -n 10

section "/etc/ld.so.preload (should normally not exist)"
if [[ -s /etc/ld.so.preload ]]; then
  flag "/etc/ld.so.preload is set — a classic rootkit/miner hiding technique:"
  cat /etc/ld.so.preload
fi
for f in /etc/ld.so.preload*; do
  [[ -e "$f" ]] && ls -la "$f"
done
ls -la /usr/local/lib/*.so 2>/dev/null && flag "Shared libraries in /usr/local/lib (check if you installed them)"

section "Processes running from temp dirs or deleted binaries"
for p in /proc/[0-9]*; do
  exe="$(readlink "$p/exe" 2>/dev/null || true)"
  [[ -z "$exe" ]] && continue
  case "$exe" in
    /tmp/*|/var/tmp/*|/dev/shm/*|*"(deleted)"*)
      flag "PID ${p#/proc/} -> $exe  ($(tr '\0' ' ' < "$p/cmdline" 2>/dev/null | head -c 150))"
      ;;
  esac
done

section "Known miner / bot names"
ps -eo pid,user,cmd | grep -Ei 'xmrig|minerd|kdevtmpfsi|kinsing|c3pool|nanopool|stratum|\.x86_64|kthreaddi|watchbog|sysupdate|networkservice' \
  | grep -v grep && flag "Suspicious process names found (above)"

section "Outbound connections (excluding local/SSH/web)"
ss -tnp state established 2>/dev/null \
  | awk 'NR==1 || ($4 !~ /:(22|80|443|4000|27017)$/ && $5 !~ /^(127\.|\[::1\])/)'

section "Listening ports"
ss -tulpn 2>/dev/null

section "Cron jobs"
for f in /etc/crontab /etc/cron.d/* /var/spool/cron/crontabs/*; do
  [[ -f "$f" ]] || continue
  echo "--- $f"
  grep -v '^\s*#' "$f" | grep -v '^\s*$'
done
grep -RhoEi '(curl|wget)[^|;]*\|\s*(ba)?sh' /etc/cron* /var/spool/cron 2>/dev/null \
  && flag "A cron job downloads and runs a script (above)"

section "Systemd units created in the last 60 days"
find /etc/systemd/system /lib/systemd/system -maxdepth 2 -name '*.service' -mtime -60 -printf '%TY-%Tm-%Td %p\n' 2>/dev/null | sort

section "Recently changed files in system binary dirs (60 days)"
find /usr/local/bin /usr/local/sbin /usr/local/lib /usr/bin /usr/sbin -maxdepth 1 -type f -mtime -60 \
  -printf '%TY-%Tm-%Td %p\n' 2>/dev/null | sort | tail -n 40

section "Accounts with UID 0 / login shells"
awk -F: '$3 == 0 {print "uid0: " $1}' /etc/passwd
awk -F: '$7 !~ /(nologin|false)$/ {print "shell: " $1 " -> " $7}' /etc/passwd

section "SSH authorized keys"
for d in /root /home/*; do
  [[ -f "$d/.ssh/authorized_keys" ]] && { echo "--- $d/.ssh/authorized_keys"; cut -c1-80 "$d/.ssh/authorized_keys"; }
done

section "SSH password login"
sshd -T 2>/dev/null | grep -Ei '^(permitrootlogin|passwordauthentication)'

section "Recent failed SSH logins (last 20)"
journalctl -u ssh -u sshd --since "-2 days" 2>/dev/null | grep -Ei 'failed password|invalid user' | tail -n 20

section "Summary"
if [[ "${FLAGS}" -gt 0 ]]; then
  echo "${FLAGS} warning(s) found. This server is likely compromised."
  echo "Safest fix: back up the database (mongodump) and backend/.env, reinstall the OS, then"
  echo "redeploy from GitHub with a strong root password or SSH keys only."
else
  echo "No obvious indicators found. Still use a strong root password or SSH keys."
fi
