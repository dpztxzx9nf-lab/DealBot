/**
 * Production server — honors PORT (PM2 sets 3002; default 3002).
 * PM2 runs this file with `interpreter: node` (do not wrap in npm.cmd).
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = String(process.env.PORT || "3002");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

console.log(`[dealbot] Starting Next.js on 0.0.0.0:${port}`);

const spawnOpts = {
  cwd: root,
  stdio: ["ignore", "pipe", "pipe"],
  env: process.env,
  shell: false,
  detached: false,
};

if (process.platform === "win32") {
  spawnOpts.windowsHide = true;
}

const child = spawn(
  process.execPath,
  [nextBin, "start", "-H", "0.0.0.0", "-p", port],
  spawnOpts
);

child.stdout?.on("data", (d) => process.stdout.write(d));
child.stderr?.on("data", (d) => process.stderr.write(d));

child.on("exit", (code, signal) => {
  if (signal) console.error(`[dealbot] Next exited signal ${signal}`);
  process.exit(code ?? 1);
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
