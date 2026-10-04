/**
 * PM2 ecosystem for swimming-school API (Ubuntu production).
 * Usage: pm2 start deploy/ubuntu/pm2.ecosystem.config.cjs
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
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "/var/log/swimming-school/pm2-error.log",
      out_file: "/var/log/swimming-school/pm2-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
