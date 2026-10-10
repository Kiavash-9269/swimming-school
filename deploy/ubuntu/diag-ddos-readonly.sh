#!/usr/bin/env bash
# READ-ONLY diagnostics for inbound packet flood (RX_PPS high / TX_PPS near 0).
# Run from ParsPack / hosting panel CONSOLE (KVM/VNC), NOT over public SSH if SSH is dying.
# Does not restart, reboot, kill, change firewall, or install packages.
#
#   bash /var/www/swimming-school/deploy/ubuntu/diag-ddos-readonly.sh | tee /root/diag-$(date +%Y%m%d-%H%M%S).txt
# Or paste the whole script into the console.
#
set -u
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin:${PATH:-}"
export LANG=C LC_ALL=C

section() {
  echo
  echo "================================================================================"
  echo "### $1"
  echo "================================================================================"
}

run() {
  section "$1"
  echo "\$ $2"
  # shellcheck disable=SC2086
  eval "$2" 2>&1 || echo "(exit $?)"
}

echo "READ-ONLY DIAG started $(date -Is)"
echo "HOSTNAME=$(hostname)  KERNEL=$(uname -r)"

run "uptime_mem_disk" "uptime; free -h; df -h / | head -5"
run "ip_br_addr" "ip -br addr"
run "ip_s_link" "ip -s link"
run "proc_net_dev" "cat /proc/net/dev"
run "ss_summary" "ss -s"
run "listening_ports" "ss -lntup"
run "connections_sample" "ss -tunap | head -100"
run "tcp_sample" "ss -tanp | head -100"
run "udp_sample" "ss -uanp | head -100"
run "top_cpu" "ps aux --sort=-%cpu | head -30"
run "top_mem" "ps aux --sort=-%mem | head -30"
run "top_snapshot" "top -b -n 1 | head -40"
run "docker_ps" "docker ps 2>&1 || echo NO_DOCKER"
run "docker_stats" "docker stats --no-stream 2>&1 || echo NO_DOCKER"
run "docker_format" 'docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Ports}}" 2>&1 || echo NO_DOCKER'
run "docker_networks" "docker network ls 2>&1 || echo NO_DOCKER"
run "which_tcpdump" "which tcpdump || echo NO_TCPDUMP"

if command -v tcpdump >/dev/null 2>&1; then
  run "tcpdump_sample_200" "timeout 20 tcpdump -nn -i any -c 200 2>&1"
  run "tcpdump_top_src_ip" "timeout 30 tcpdump -nn -i any -c 2000 2>/dev/null | awk '{print \$3}' | sed 's/\\.[0-9]*\$//' | sort | uniq -c | sort -nr | head -30"
  run "tcpdump_top_dst" "timeout 30 tcpdump -nn -i any -c 2000 2>/dev/null | awk '{print \$5}' | sort | uniq -c | sort -nr | head -30"
  run "tcpdump_proto_hint" "timeout 20 tcpdump -nn -i any -c 500 2>/dev/null | awk '{print \$1}' | sort | uniq -c | sort -nr | head -20"
else
  section "tcpdump"
  echo "tcpdump not installed — ask ParsPack console support to install tcpdump, or use panel packet capture if available."
  echo "Do NOT install packages yourself unless ParsPack/support asks you to (ChatGPT also said skip installs for now)."
fi

run "ufw" "ufw status verbose 2>&1 || true"
run "iptables_filter" "iptables -L -n -v 2>&1 | head -120"
run "iptables_nat" "iptables -t nat -L -n -v 2>&1 | head -80"
run "nft" "nft list ruleset 2>&1 | head -80"
run "last_logins" "last -a | head -30"
run "ssh_journal" "journalctl -u ssh -u ssh.service --since '24 hours ago' --no-pager 2>&1 | tail -100"
run "auth_failures" "grep -Ei 'Failed password|Accepted|Invalid user' /var/log/auth.log 2>/dev/null | tail -100 || true"
run "crontab_root" "crontab -l 2>&1; echo ---; crontab -u root -l 2>&1 || true"
run "cron_files" "find /etc/cron.d /etc/cron.daily /etc/cron.hourly /etc/cron.weekly -type f -maxdepth 2 -ls 2>/dev/null | head -80"
run "running_services" "systemctl list-units --type=service --state=running --no-pager 2>&1 | head -80"
run "ld_preload" "ls -la /etc/ld.so.preload* 2>&1; echo ---; cat /etc/ld.so.preload 2>&1; echo ---; ls -la /usr/local/lib/*.so 2>&1"
run "pm2" "pm2 list 2>&1 | head -40; echo ---; pm2 jlist 2>&1 | head -c 2000"

echo
echo "READ-ONLY DIAG finished $(date -Is)"
echo "Send this whole file to your engineer / paste key sections back into chat."
