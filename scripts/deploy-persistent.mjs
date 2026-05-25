/**
 * Build + PM2 dealbot + dealbot-tunnel + pm2 save
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { tunnelConfigYaml } from "./tunnel-constants.mjs";
import { ROOT, PORT } from "./persistence-constants.mjs";
import { freePort } from "./free-port.mjs";

const configPath = path.join(ROOT, "cloudflared", "config.yml");

function run(line) {
  const r = spawnSync("cmd.exe", ["/d", "/s", "/c", line], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("DealBot — deploy:persistent\n");

fs.mkdirSync(path.join(ROOT, "cloudflared"), { recursive: true });
fs.writeFileSync(configPath, tunnelConfigYaml() + "\n", "utf8");
console.log(`✓ ${configPath}\n`);

for (const t of ["DealBot-App", "DealBot-Tunnel"]) {
  spawnSync("schtasks", ["/End", "/TN", t], { windowsHide: true });
  spawnSync("schtasks", ["/Delete", "/TN", t, "/F"], { windowsHide: true });
}

run("npm run build");
run("pm2 stop dealbot dealbot-tunnel 2>nul");
freePort(PORT);
run("pm2 delete dealbot 2>nul & pm2 start ecosystem.config.cjs");
run("pm2 delete dealbot-tunnel 2>nul & pm2 start ecosystem.tunnel.config.cjs");
run("pm2 save");
run("pm2 status");

console.log(`
✓ Deployed
  Local:  http://127.0.0.1:3002
  Public: https://dealbot.thinkcore.io

  Verify: npm run check:persistent
  Logon:  npm run persist:windows  (once, if PM2 resurrect task not set up yet)
`);
