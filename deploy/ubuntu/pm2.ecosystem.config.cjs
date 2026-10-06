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
      // Cap the V8 heap well below the restart threshold so GC runs before PM2 kills the process.
      node_args: "--max-old-space-size=256",
      max_memory_restart: "350M",
      exp_backoff_restart_delay: 200,
      kill_timeout: 10000,
      env: {
        NODE_ENV: "production",
        UV_THREADPOOL_SIZE: "2",
      },
      error_file: "/var/log/swimming-school/pm2-error.log",
      out_file: "/var/log/swimming-school/pm2-out.log",
      merge_logs: true,
      time: true,
    },
  ],
};
