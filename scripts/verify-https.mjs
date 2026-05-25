import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { HTTP_PORT, SSL_PORT, lanIp } from "./network.mjs";

const ip = lanIp();
const targets = [
  `https://127.0.0.1:${SSL_PORT}`,
  `https://localhost:${SSL_PORT}`,
];
if (ip) targets.push(`https://${ip}:${SSL_PORT}`);

const curl = process.platform === "win32" ? "curl.exe" : "curl";
let ok = 0;
let fail = 0;

console.log("\n[verify:https] Probing HTTPS endpoints...\n");

for (const base of targets) {
  const url = `${base}/swipe`;
  try {
    const code = execSync(
      `${curl} -sS -o NUL -w "%{http_code}" --max-time 8 "${url}"`,
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    ).trim();
    if (code === "200" || code === "307" || code === "308") {
      console.log(`  OK   ${url}  (HTTP ${code})`);
      ok++;
    } else {
      console.log(`  FAIL ${url}  (HTTP ${code})`);
      fail++;
    }
  } catch (e) {
    const msg = e.stderr?.toString() || e.message || "connection failed";
    console.log(`  FAIL ${url}`);
    console.log(`       ${msg.split("\n")[0]}`);
    fail++;
  }
}

try {
  const httpCode = execSync(
    `${curl} -sS -o NUL -w "%{http_code}" --max-time 5 "http://127.0.0.1:${HTTP_PORT}/swipe"`,
    { encoding: "utf8" }
  ).trim();
  console.log(`  ${httpCode === "200" ? "OK" : "WARN"} http://127.0.0.1:${HTTP_PORT}/swipe (HTTP ${httpCode}) — backend`);
} catch {
  console.log(`  FAIL http://127.0.0.1:${HTTP_PORT}/swipe — is npm run dev running?`);
  fail++;
}

const certDir = path.join(process.cwd(), ".certs");
if (!fs.existsSync(path.join(certDir, "cert.pem"))) {
  console.log("\n  Missing .certs/ — run: npm run setup:https\n");
  process.exit(1);
}

console.log(`\n[verify:https] ${ok} HTTPS OK, ${fail} failed\n`);
process.exit(fail > 0 ? 1 : 0);
