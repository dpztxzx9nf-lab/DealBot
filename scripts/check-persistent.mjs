/**
 * PM2 + tunnel health check
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { tunnelConfigYaml } from "./tunnel-constants.mjs";
import {
  LOCAL_URL,
  PUBLIC_URL,
  PM2_DUMP,
  PM2_APP,
  PM2_TUNNEL,
  PORT,
  ROOT,
} from "./persistence-constants.mjs";
import { isPortListening } from "./port-listening.mjs";
import { findPm2ResurrectTaskName } from "./pm2-resurrect-task.mjs";
import { isTaskActionSilent } from "./pm2-resurrect-silent.mjs";

let failed = 0;

function pass(label, detail = "") {
  console.log(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
}

function fail(label, detail = "") {
  console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  failed++;
}

function pm2(line) {
  return spawnSync("cmd.exe", ["/d", "/s", "/c", line], {
    cwd: ROOT,
    encoding: "utf8",
    windowsHide: true,
  });
}

function dumpHasProcess(name) {
  if (!fs.existsSync(PM2_DUMP)) return false;
  try {
    const dump = JSON.parse(fs.readFileSync(PM2_DUMP, "utf8"));
    return Array.isArray(dump) && dump.some((p) => p.name === name);
  } catch {
    return false;
  }
}

function pm2Online(name) {
  const j = pm2("pm2 jlist");
  if (j.status !== 0 || !j.stdout) return { ok: false, detail: "pm2 jlist failed" };
  try {
    const list = JSON.parse(j.stdout);
    const p = list.find((x) => x.name === name);
    if (!p) return { ok: false, detail: "not running" };
    if (p.pm2_env?.status === "online") return { ok: true, detail: `pid ${p.pid}` };
    return { ok: false, detail: `status ${p.pm2_env?.status}` };
  } catch {
    return { ok: false, detail: "parse error" };
  }
}

async function httpOk(url) {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: "text/html" },
    redirect: "follow",
  });
  return res.status >= 200 && res.status < 400;
}

console.log("\nDealBot — check:persistent\n");

const configPath = path.join(ROOT, "cloudflared", "config.yml");
const expected = tunnelConfigYaml().replace(/\r\n/g, "\n").trim();

if (!fs.existsSync(configPath)) {
  fail("cloudflared/config.yml", "npm run deploy:persistent");
} else if (fs.readFileSync(configPath, "utf8").replace(/\r\n/g, "\n").trim() === expected) {
  pass("cloudflared/config.yml");
  const cfg = fs.readFileSync(configPath, "utf8");
  if (cfg.includes("127.0.0.1:3002") || cfg.includes("localhost:3002")) {
    pass("tunnel → 127.0.0.1:3002");
  } else {
    fail("tunnel ingress", "must point to 127.0.0.1:3002");
  }
} else {
  fail("cloudflared/config.yml", "npm run deploy:persistent");
}

if (process.platform === "win32") {
  const task = findPm2ResurrectTaskName();
  if (task) {
    pass("Windows PM2 resurrect task", task);
    if (isTaskActionSilent(task)) pass("logon task runs silently");
    else fail("logon task runs silently", "npm run persist:windows");
  } else fail("Windows PM2 resurrect task", `npm run persist:windows`);
}

if (fs.existsSync(PM2_DUMP)) pass("PM2 dump.pm2", PM2_DUMP);
else fail("PM2 dump.pm2", "npm run deploy:persistent && pm2 save");

if (dumpHasProcess(PM2_APP)) pass("PM2 dump includes dealbot");
else fail("PM2 dump includes dealbot", "npm run deploy:persistent");

if (dumpHasProcess(PM2_TUNNEL)) pass("PM2 dump includes dealbot-tunnel");
else fail("PM2 dump includes dealbot-tunnel", "npm run deploy:persistent");

const app = pm2Online(PM2_APP);
if (app.ok) pass("PM2 dealbot online", app.detail);
else fail("PM2 dealbot online", app.detail);

const tun = pm2Online(PM2_TUNNEL);
if (tun.ok) pass("PM2 dealbot-tunnel online", tun.detail);
else fail("PM2 dealbot-tunnel online", tun.detail);

if (isPortListening(PORT)) pass("port listening", `:${PORT}`);
else fail("port listening", `:${PORT}`);

try {
  if (await httpOk(LOCAL_URL)) pass("local app", LOCAL_URL);
  else fail("local app", `${LOCAL_URL} not OK`);
} catch (e) {
  fail("local app", e instanceof Error ? e.message : String(e));
}

const curl = pm2(`curl.exe -sI -m 25 "${PUBLIC_URL}/"`);
const out = `${curl.stdout || ""}${curl.stderr || ""}`;
if (curl.status === 0 && /HTTP\/[\d.]+\s+(200|30[1278])/.test(out)) {
  pass("public URL", PUBLIC_URL);
} else {
  fail(
    "public URL",
    "thinkcore.io NS must be Cloudflare; run: cloudflared tunnel route dns dealbot dealbot.thinkcore.io — do not use dyna-ns CNAME → *.cfargotunnel.com (see README)"
  );
}

console.log(failed === 0 ? "\n✓ All checks passed.\n" : `\n✗ ${failed} failed.\n`);
process.exit(failed === 0 ? 0 : 1);
