/** PM2 - DealBot app on port 3002 (node interpreter, not npm.cmd). */
module.exports = {
  apps: [
    {
      name: "dealbot",
      script: "node_modules/next/dist/bin/next",
      args: ["start", "-H", "0.0.0.0", "-p", "3002"],
      cwd: "C:/Projects/dealbot",
      interpreter: "node",
      windowsHide: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: 3002,
        DEALBOT_PUBLIC_HOSTNAME: "dealbot.thinkcore.io",
      },
    },
  ],
};
