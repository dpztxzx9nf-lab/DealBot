/**
 * TEMPORARY fallback — Cloudflare *quick* tunnel (random trycloudflare.com URL each run).
 * For a stable URL after reboot, use named tunnel: npm run tunnel:named
 */
import { spawn } from "child_process";
import { printMobileBanner } from "./network.mjs";

const PORT = Number(process.env.PORT || process.env.DEALBOT_PROD_PORT || 3002);
const LOCAL_BASE = `http://127.0.0.1:${PORT}`;

const TUNNEL_RE =
  /https:\/\/[a-z0-9-]+\.trycloudflare\.com|https:\/\/[a-z0-9-]+\.cfargotunnel\.com/i;

let tunnelUrl = null;
const isWin = process.platform === "win32";

function onTunnelLine(line) {
  const m = line.match(TUNNEL_RE);
  if (!m || tunnelUrl) return;
  tunnelUrl = m[0].replace(/\/$/, "");
  printMobileBanner({
    httpsUrl: tunnelUrl,
    mode: `Production tunnel (PM2 / next start on :${PORT})`,
    extra: [
      `Forwards to ${LOCAL_BASE}`,
      "URL changes each run — update iPhone bookmark if needed",
    ],
  });
}

console.log(`[tunnel:prod] Expecting production server on port ${PORT}`);
console.log("[tunnel:prod] Start first: npm run deploy:persistent\n");

const tunnel = spawn(
  "npx",
  ["--yes", "cloudflared", "tunnel", "--url", LOCAL_BASE],
  { stdio: ["ignore", "pipe", "pipe"], shell: isWin }
);

const handle = (chunk) => {
  const text = chunk.toString();
  process.stderr.write(text);
  for (const line of text.split(/\r?\n/)) {
    if (line.trim()) onTunnelLine(line);
  }
};

tunnel.stdout.on("data", handle);
tunnel.stderr.on("data", handle);

tunnel.on("exit", (code) => {
  if (code) console.error(`[tunnel:prod] cloudflared exited ${code}`);
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  tunnel.kill("SIGTERM");
  process.exit(0);
});

setTimeout(() => {
  if (!tunnelUrl) {
    console.log(
      `\n[tunnel:prod] No tunnel URL yet. Is cloudflared available? Is :${PORT} up?\n`
    );
  }
}, 30_000);
