/**
 * PM2 ecosystem for swimming-school API (Ubuntu production).
 * Usage: pm2 startOrReload deploy/ubuntu/pm2.ecosystem.config.cjs --update-env
 */
module.exports = {
  apps: [
    {
      name: "swimming-api",
      cwd: "/var/www/swimming-school/backend",
      script: "index.js",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      min_uptime: "30s",
      max_restarts: 100,
      restart_delay: 2000,
      // Keep Node small on 4 GB VPSes — GC early, restart before it eats the box.
      node_args: "--max-old-space-size=192",
      max_memory_restart: "280M",
      exp_backoff_restart_delay: 500,
      kill_timeout: 10000,
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        UV_THREADPOOL_SIZE: "2",
        LOG_LEVEL: "warn",
      },
      error_file: "/var/log/swimming-school/pm2-error.log",
      out_file: "/var/log/swimming-school/pm2-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
