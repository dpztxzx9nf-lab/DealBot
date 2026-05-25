import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { printMobileBanner } from "./network.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const HTTP_PORT = 3000;
const LOCAL_BASE = `http://127.0.0.1:${HTTP_PORT}`;
const children = [];
let tunnelUrl = null;
let tunnelHost = null;
let nextStarted = false;
let reachabilityDone = false;

const TUNNEL_RE =
  /https:\/\/[a-z0-9-]+\.trycloudflare\.com|https:\/\/[a-z0-9-]+\.cfargotunnel\.com/i;

const PROBE_PATHS = [
  { label: "swipe", path: "/swipe" },
  {
    label: "feed",
    path: "/api/deals/feed?zip=80503&radius=25&debugRaw=1",
  },
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function killAll() {
  for (const c of children) {
    try {
      c.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
}

process.on("SIGINT", () => {
  killAll();
  process.exit(0);
});
process.on("SIGTERM", killAll);

function printOriginConfig(hostname) {
  const line = "─".repeat(56);
  console.log(`\n${line}`);
  console.log("  allowedDevOrigins (for this tunnel)");
  console.log(line);
  console.log(`
  Hostname: ${hostname}

  Set before starting Next (this script does it automatically):

    ALLOWED_DEV_ORIGIN=${hostname}

  next.config.ts also allows:
    *.trycloudflare.com
    *.cfargotunnel.com

  HMR websocket is disabled on tunnel clients — full app still works.
${line}\n`);
}

async function probeUrl(url) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: { Accept: "text/html,application/json" },
    });
    return { ok: res.status === 200, status: res.status, error: null };
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    const cause = err.cause instanceof Error ? err.cause.message : "";
    return {
      ok: false,
      status: null,
      error: cause ? `${err.message} (${cause})` : err.message,
    };
  }
}

/** Check local Next server (tunnel forwards to this). */
async function probeLocalOnce() {
  for (const { label, path: p } of PROBE_PATHS) {
    const url = `${LOCAL_BASE}${p}`;
    const result = await probeUrl(url);
    if (result.status !== null) {
      console.log(`[dev:tunnel] probe GET ${url} → HTTP ${result.status}`);
    } else {
      console.log(`[dev:tunnel] probe GET ${url} → error: ${result.error}`);
    }
    if (result.ok) {
      return { ok: true, url, label };
    }
  }
  return { ok: false, url: null, label: null };
}

async function waitForAppReachable(maxMs = 180_000) {
  if (reachabilityDone) return true;

  console.log(
    `[dev:tunnel] Waiting for app on ${LOCAL_BASE} (/swipe or /api/deals/feed 200)…\n`
  );

  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const hit = await probeLocalOnce();
    if (hit.ok) {
      reachabilityDone = true;
      console.log("\n✓ Tunnel app reachable\n");
      console.log(`  GET ${hit.url} → 200 (${hit.label})`);
      if (tunnelUrl) {
        console.log(`  Public (iPhone): ${tunnelUrl}\n`);
      }
      return true;
    }
    await sleep(2000);
  }

  console.error(
    `\n[dev:tunnel] Timed out — no 200 from ${LOCAL_BASE}/swipe or feed API\n`
  );
  return false;
}

async function localServerUp() {
  const hit = await probeLocalOnce();
  return hit.ok;
}

function startNext(hostname) {
  if (nextStarted) return;
  nextStarted = true;

  const isWin = process.platform === "win32";
  const env = {
    ...process.env,
    ALLOWED_DEV_ORIGIN: hostname,
    DEALBOT_TUNNEL: "1",
  };

  console.log(
    `[dev:tunnel] Starting Next.js with ALLOWED_DEV_ORIGIN=${hostname}\n`
  );

  const nextProc = spawn(isWin ? "npm.cmd" : "npm", ["run", "dev"], {
    cwd: root,
    stdio: "inherit",
    shell: isWin,
    env,
  });
  children.push(nextProc);

  nextProc.on("exit", (code) => {
    if (code) console.error(`[dev:tunnel] Next.js exited ${code}`);
  });
}

async function onTunnelReady(url) {
  if (tunnelUrl === url) return;

  tunnelUrl = url;
  try {
    tunnelHost = new URL(url).hostname;
  } catch {
    return;
  }

  printOriginConfig(tunnelHost);
  printMobileBanner({
    httpsUrl: tunnelUrl,
    mode: "Cloudflare Tunnel (iPhone PWA)",
    extra: [
      `ALLOWED_DEV_ORIGIN=${tunnelHost}`,
      "HMR disabled on phone — swipe/saved/sold work normally",
    ],
  });

  if (await localServerUp()) {
    console.log("[dev:tunnel] Next already responding on port 3000\n");
    nextStarted = true;
  } else {
    startNext(tunnelHost);
  }

  void waitForAppReachable();
}

function onTunnelLine(line) {
  const m = line.match(TUNNEL_RE);
  if (!m) return;
  const url = m[0].replace(/\/$/, "");
  void onTunnelReady(url);
}

console.log("[dev:tunnel] 1) Cloudflare Tunnel → public HTTPS URL");
console.log("[dev:tunnel] 2) Next.js on port 3000 (health check uses localhost)\n");

const isWin = process.platform === "win32";
const tunnel = spawn(
  "npx",
  ["--yes", "cloudflared", "tunnel", "--url", `http://127.0.0.1:${HTTP_PORT}`],
  {
    cwd: root,
    shell: isWin,
    stdio: ["ignore", "pipe", "pipe"],
  }
);
children.push(tunnel);

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
  if (code) console.error(`[dev:tunnel] cloudflared exited ${code}`);
});

setTimeout(() => {
  if (!tunnelUrl) {
    console.log(
      "\n[dev:tunnel] No tunnel URL yet. Is cloudflared installed? Check output above.\n"
    );
  }
}, 30_000);
