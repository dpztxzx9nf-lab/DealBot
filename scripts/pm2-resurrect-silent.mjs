/**
 * Patch PM2 logon Scheduled Tasks to run resurrect without a visible console.
 */
import path from "path";
import { spawnSync } from "child_process";
import { ROOT } from "./persistence-constants.mjs";

export const PM2_RESURRECT_VBS = path.join(ROOT, "scripts", "pm2-resurrect-hidden.vbs");

/** Task action runs pm2.cmd / .cmd / bare wscript without hidden resurrect → needs patch. */
export function taskNeedsSilentPatch(taskName) {
  const r = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-Command",
      `$t = Get-ScheduledTask -TaskName '${taskName.replace(/'/g, "''")}'; ($t.Actions | ForEach-Object { $_.Execute + ' ' + $_.Arguments }) -join ' '`,
    ],
    { encoding: "utf8", windowsHide: true }
  );
  const action = (r.stdout || "").trim().toLowerCase();
  if (!action) return true;

  const usesHiddenVbs =
    action.includes("pm2-resurrect-hidden.vbs") &&
    action.includes("wscript") &&
    action.includes("//b");

  if (usesHiddenVbs) return false;

  return (
    action.includes("pm2.cmd") ||
    action.endsWith(".cmd") ||
    action.includes("powershell") ||
    (action.includes("pm2") && action.includes("resurrect") && !usesHiddenVbs)
  );
}

export function patchPm2ResurrectTaskSilent(taskName) {
  const vbs = PM2_RESURRECT_VBS.replace(/\\/g, "\\\\").replace(/'/g, "''");
  const ps = `
$task = Get-ScheduledTask -TaskName '${taskName.replace(/'/g, "''")}'
$action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument '//B ""${vbs}""'
Register-ScheduledTask -TaskName $task.TaskName -Action $action -Trigger $task.Triggers -Principal $task.Principal -Settings $task.Settings -Force | Out-Null
`.trim();

  return spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
    { encoding: "utf8", windowsHide: true }
  );
}

export function isTaskActionSilent(taskName) {
  return !taskNeedsSilentPatch(taskName);
}
