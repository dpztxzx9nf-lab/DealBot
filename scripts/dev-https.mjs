import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { HTTP_PORT, SSL_PORT, lanIp, printMobileBanner } from "./network.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const CERT_DIR = path.join(root, ".certs");
const CERT_FILE = path.join(CERT_DIR, "cert.pem");
const KEY_FILE = path.join(CERT_DIR, "key.pem");
const IP_FILE = path.join(CERT_DIR, "lan-ip.txt");

const children = [];
let verifyTimer;

function killAll() {
  clearTimeout(verifyTimer);
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

function spawnProc(name, command, args, env = {}) {
  const isWin = process.platform === "win32";
  const proc = spawn(isWin ? command : command, isWin ? args : args, {
    cwd: root,
    stdio: "inherit",
    shell: isWin,
    env: { ...process.env, ...env },
  });
  proc.on("exit", (code) => {
    if (code && code !== 0) console.error(`[${name}] exited ${code}`);
  });
  children.push(proc);
  return proc;
}

if (!fs.existsSync(CERT_FILE) || !fs.existsSync(KEY_FILE)) {
  console.log("[dev:https] No mkcert files — running setup:https first...\n");
  const setup = spawn(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "setup:https"],
    { cwd: root, stdio: "inherit", shell: true }
  );
  setup.on("exit", (code) => {
    if (code !== 0) process.exit(code ?? 1);
    start();
  });
} else {
  start();
}

function start() {
  const ip = lanIp();
  const savedIp = fs.existsSync(IP_FILE)
    ? fs.readFileSync(IP_FILE, "utf8").trim()
    : null;

  if (ip && savedIp && ip !== savedIp) {
    console.warn(
      `\n[WARN] LAN IP changed (${savedIp} → ${ip}). Re-run: npm run setup:https\n`
    );
  }

  console.log("[dev:https] Starting Next.js on 0.0.0.0:" + HTTP_PORT);
  spawnProc(
    "next",
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["run", "dev"],
    {}
  );

  setTimeout(() => {
    console.log(
      `[dev:https] Starting HTTPS proxy 0.0.0.0:${SSL_PORT} → 127.0.0.1:${HTTP_PORT} (mkcert)`
    );
    spawnProc("ssl", "npx", [
      "local-ssl-proxy",
      "-n",
      "0.0.0.0",
      "-s",
      String(SSL_PORT),
      "-t",
      String(HTTP_PORT),
      "-c",
      CERT_FILE,
      "-k",
      KEY_FILE,
    ]);

    verifyTimer = setTimeout(() => {
      const verify = spawn(
        process.platform === "win32" ? "npm.cmd" : "npm",
        ["run", "verify:https"],
        { cwd: root, stdio: "inherit", shell: true }
      );
      verify.on("exit", () => {
        if (ip) {
          printMobileBanner({
            httpsUrl: `https://${ip}:${SSL_PORT}`,
            mode: "mkcert LAN HTTPS",
            extra: [
              `Also: https://localhost:${SSL_PORT}`,
              "iPhone must trust rootCA.pem (see setup:https output)",
              "If this fails, use: npm run dev:tunnel",
            ],
          });
        }
      });
    }, 5000);
  }, 2500);
}
