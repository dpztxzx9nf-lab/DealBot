/**
 * Named Cloudflare Tunnel to http://127.0.0.1:3002 (stable hostname).
 * Requires cloudflared/config.yml (copy from cloudflared/config.example.yml).
 */
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { DEALBOT_TUNNEL } from "./tunnel-constants.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const configPath = path.resolve(
  process.env.DEALBOT_TUNNEL_CONFIG ||
    path.join(root, "cloudflared", "config.yml")
);
const port = Number(
  process.env.PORT || process.env.DEALBOT_PROD_PORT || DEALBOT_TUNNEL.port
);
if (!fs.existsSync(configPath)) {
  console.error(`[tunnel:named] Missing config: ${configPath}`);
  console.error("[tunnel:named] Run: npm run deploy:persistent");
  process.exit(1);
}

const configText = fs.readFileSync(configPath, "utf8");
const hostnameMatch = configText.match(/^\s*-\s*hostname:\s*(\S+)/m);
const hostname = hostnameMatch?.[1] ?? "(see config.yml)";

console.log(`[tunnel:named] Config: ${configPath}`);
console.log(`[tunnel:named] Expecting DealBot PM2 on http://127.0.0.1:${port}`);
console.log(`[tunnel:named] Public hostname: https://${hostname}`);
console.log("[tunnel:named] Starting cloudflared tunnel run...\n");

const cloudflaredCmd =
  process.env.CLOUDFLARED_PATH ||
  (process.platform === "win32"
    ? "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe"
    : "cloudflared");

const child = spawn(
  cloudflaredCmd,
  ["tunnel", "--config", configPath, "run"],
  {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    shell: false,
    windowsHide: true,
    env: process.env,
  }
);

child.stdout?.on("data", (d) => process.stdout.write(d));
child.stderr?.on("data", (d) => process.stderr.write(d));

child.on("exit", (code) => {
  if (code) console.error(`[tunnel:named] cloudflared exited ${code}`);
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  child.kill("SIGTERM");
  process.exit(0);
});
