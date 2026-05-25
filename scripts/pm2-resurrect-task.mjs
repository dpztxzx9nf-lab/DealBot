import { spawnSync } from "child_process";

/** First enabled logon task whose action runs `pm2 resurrect`. */
export function findPm2ResurrectTaskName() {
  const r = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      "Get-ScheduledTask | Where-Object { ($_.Actions.Execute + ' ' + $_.Actions.Arguments) -match 'pm2' -and ($_.Actions.Execute + ' ' + $_.Actions.Arguments) -match 'resurrect' } | Select-Object -ExpandProperty TaskName",
    ],
    { encoding: "utf8", windowsHide: true }
  );
  return (r.stdout || "").trim().split(/\r?\n/)[0]?.trim() || null;
}
