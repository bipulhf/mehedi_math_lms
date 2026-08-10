module.exports = {
  apps: [
    {
      name: "mma-api",
      script: "bun",
      args: "src/index.ts",
      cwd: "/root/mehedi_math_lms/apps/api", // path to your project
      interpreter: "none",
      watch: false, // disable in production
      env: {
        NODE_ENV: "production",
        PORT: 8100
      },
      max_restarts: 10,
      autorestart: true,
      restart_delay: 5000,
      log_date_format: "YYYY-MM-DD HH:mm Z",
      error_file: "/root/mehedi_math_lms/logs/api-err.log",
      out_file: "/root/mehedi_math_lms/logs/api-out.log",
      merge_logs: true
    },
    {
      name: "mma-web",
      script: "bun",
      args: "server.ts",
      cwd: "/root/mehedi_math_lms/apps/web", // path to your project
      interpreter: "none",
      watch: false, // disable in production
      wait_ready: false,
      // pm2 starts apps in array order and api has no readiness signal to
      // wait on, so this just needs to come after api above -- web's own
      // proxy/SSR calls retry on the client side if api isn't up yet.
      env: {
        NODE_ENV: "production",
        PORT: 8101
      },
      max_restarts: 10,
      autorestart: true,
      restart_delay: 5000,
      log_date_format: "YYYY-MM-DD HH:mm Z",
      error_file: "/root/mehedi_math_lms/logs/web-err.log",
      out_file: "/root/mehedi_math_lms/logs/web-out.log",
      merge_logs: true
    }
  ]
};
