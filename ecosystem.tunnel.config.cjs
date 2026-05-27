/** PM2 - named Cloudflare tunnel to 127.0.0.1:3002 */
module.exports = {
  apps: [
    {
      name: "dealbot-tunnel",
      script: "scripts/tunnel-named.mjs",
      cwd: "C:/Projects/DealBot",
      interpreter: "node",
      windowsHide: true,
      autorestart: true,
      watch: false,
      env: {
        PORT: 3002,
      },
    },
  ],
};
