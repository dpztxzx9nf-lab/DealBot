/**
 * Ensures Windows logon runs `pm2 resurrect` - uses your existing PM2 task if present.
 * Does NOT create DealBot-App / DealBot-Tunnel tasks.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import {
  PM2_RESURRECT_TASK,
  ROOT,
} from "./persistence-constants.mjs";
import { findPm2ResurrectTaskName } from "./pm2-resurrect-task.mjs";
import {
  PM2_RESURRECT_VBS,
  patchPm2ResurrectTaskSilent,
  taskNeedsSilentPatch,
} from "./pm2-resurrect-silent.mjs";

/** Remove obsolete per-app tasks from earlier experiments. */
const OBSOLETE_TASKS = ["DealBot-App", "DealBot-Tunnel"];

function runPm2(line) {
  return spawnSync("cmd.exe", ["/d", "/s", "/c", line], {
    cwd: ROOT,
    stdio: "inherit",
    env: process.env,
  });
}

function registerResurrectTask() {
  const vbs = PM2_RESURRECT_VBS.replace(/\\/g, "\\\\").replace(/'/g, "''");
  const ps = `
$Action = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument '//B ""${vbs}""'
$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName '${PM2_RESURRECT_TASK}' -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force
`.trim();

  const r = spawnSync(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
    { encoding: "utf8", windowsHide: true }
  );
  if (r.status === 0) return true;

  const s = spawnSync(
    "schtasks",
    [
      "/Create",
      "/TN",
      PM2_RESURRECT_TASK,
      "/TR",
      `wscript.exe //B "${PM2_RESURRECT_VBS}"`,
      "/SC",
      "ONLOGON",
      "/RL",
      "LIMITED",
      "/F",
    ],
    { encoding: "utf8", windowsHide: true }
  );
  return s.status === 0;
}

function ensureSilentLogonTask(taskName) {
  if (!fs.existsSync(PM2_RESURRECT_VBS)) {
    console.error(`Missing ${PM2_RESURRECT_VBS}`);
    process.exit(1);
  }
  if (!taskNeedsSilentPatch(taskName)) return true;
  const r = patchPm2ResurrectTaskSilent(taskName);
  if (r.status !== 0) {
    console.error((r.stderr || r.stdout || "").trim());
    return false;
  }
  console.log(`[ok] Patched logon task for silent resurrect: ${taskName}`);
  console.log(`  wscript.exe //B ${PM2_RESURRECT_VBS}\n`);
  return true;
}

if (process.platform !== "win32") {
  console.log("Windows only. On Linux/macOS: pm2 startup && pm2 save");
  process.exit(0);
}

console.log("DealBot - persist:windows\n");

for (const t of OBSOLETE_TASKS) {
  spawnSync("schtasks", ["/Delete", "/TN", t, "/F"], { windowsHide: true });
}

console.log("[run] pm2 save\n");
const save = runPm2("pm2 save");
if (save.status !== 0) {
  console.error("Run npm run deploy:persistent first.\n");
  process.exit(1);
}

const existingName = findPm2ResurrectTaskName();

if (existingName) {
  if (existingName !== PM2_RESURRECT_TASK) {
    spawnSync("schtasks", ["/Delete", "/TN", PM2_RESURRECT_TASK, "/F"], {
      windowsHide: true,
    });
  }
  console.log(`[ok] Using existing PM2 resurrect task: ${existingName}\n`);
  if (!ensureSilentLogonTask(existingName)) {
    console.error("Could not patch task for silent startup.\n");
    process.exit(1);
  }
  console.log("No duplicate task created.\n");
  process.exit(0);
}

console.log("No existing pm2 resurrect task found - creating one.\n");

if (!fs.existsSync(PM2_RESURRECT_VBS)) {
  console.error(`Missing ${PM2_RESURRECT_VBS}`);
  process.exit(1);
}

if (!registerResurrectTask()) {
  console.error("Could not register scheduled task. Run this script in your user PowerShell.\n");
  process.exit(1);
}

console.log(`[ok] Registered ${PM2_RESURRECT_TASK}`);
console.log(`  wscript.exe //B ${PM2_RESURRECT_VBS}\n`);
console.log("After login/reboot: pm2 resurrect restores dealbot + dealbot-tunnel\n");
