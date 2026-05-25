import { spawnSync } from "child_process";

export function isPortListening(port) {
  const r = spawnSync("netstat", ["-ano"], { encoding: "utf8", windowsHide: true });
  for (const line of (r.stdout || "").split(/\r?\n/)) {
    if (!line.includes("LISTENING")) continue;
    if (!line.includes(`:${port}`)) continue;
    return true;
  }
  return false;
}
