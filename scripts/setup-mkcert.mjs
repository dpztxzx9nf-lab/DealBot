import { execSync, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { lanIp } from "./network.mjs";

const CERT_DIR = path.join(process.cwd(), ".certs");
const CERT_FILE = path.join(CERT_DIR, "cert.pem");
const KEY_FILE = path.join(CERT_DIR, "key.pem");
const ROOT_COPY = path.join(CERT_DIR, "rootCA.pem");
const IP_FILE = path.join(CERT_DIR, "lan-ip.txt");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function mkcertInstalled() {
  try {
    execSync("mkcert -version", { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

const ip = lanIp();
if (!ip) {
  console.error(
    "\nNo LAN IP found. Set DEALBOT_LAN_IP=192.168.1.9 and re-run npm run setup:https\n"
  );
  process.exit(1);
}

if (!mkcertInstalled()) {
  console.error(`
mkcert is not installed.

  Windows (winget):  winget install FiloSottile.mkcert
  Windows (choco):   choco install mkcert
  macOS (brew):      brew install mkcert

Then open a NEW terminal and run:  npm run setup:https
`);
  process.exit(1);
}

fs.mkdirSync(CERT_DIR, { recursive: true });

console.log("\n[setup:https] Installing mkcert local CA on this computer...");
run("mkcert", ["-install"]);

const hosts = ["localhost", "127.0.0.1", "::1", ip];
console.log(`[setup:https] Generating cert for: ${hosts.join(", ")}`);

run("mkcert", [
  "-cert-file",
  CERT_FILE,
  "-key-file",
  KEY_FILE,
  ...hosts,
]);

const caroot = execSync("mkcert -CAROOT", { encoding: "utf8" }).trim();
const rootSrc = path.join(caroot, "rootCA.pem");
if (fs.existsSync(rootSrc)) {
  fs.copyFileSync(rootSrc, ROOT_COPY);
}

fs.writeFileSync(IP_FILE, ip, "utf8");

console.log(`
[setup:https] Done.

  Cert:  ${CERT_FILE}
  Key:   ${KEY_FILE}
  LAN:   ${ip}
  Root:  ${ROOT_COPY}

── Trust on iPhone (one-time) ──

  1. AirDrop/email ${ROOT_COPY} to your iPhone (or host via tunnel).
  2. Open the file → Install Profile → Settings → Profile Installed.
  3. Settings → General → About → Certificate Trust Settings
     → enable full trust for the mkcert root CA.
  4. On Mac/PC this machine is already trusted via mkcert -install.

Re-run setup:https if your LAN IP changes.
`);
