/** Kill Windows process(es) listening on a TCP port (orphans from old startups). */
import { spawnSync } from "child_process";

export function freePort(port) {
  if (process.platform !== "win32") return;

  const r = spawnSync("netstat", ["-ano"], { encoding: "utf8", windowsHide: true });
  const pids = new Set();

  for (const line of (r.stdout || "").split(/\r?\n/)) {
    if (!line.includes("LISTENING")) continue;
    if (!line.includes(`:${port}`)) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (/^\d+$/.test(pid)) pids.add(pid);
  }

  for (const pid of pids) {
    const k = spawnSync("taskkill", ["/F", "/PID", pid], {
      encoding: "utf8",
      windowsHide: true,
    });
    if (k.status === 0) console.log(`Freed port ${port} (PID ${pid})`);
  }
}
