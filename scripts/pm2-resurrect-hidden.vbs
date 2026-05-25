' Windowless pm2 resurrect for Windows logon Scheduled Tasks.
' Invokes node + pm2 directly (never pm2.cmd — that spawns a visible console).
Option Explicit

Dim sh, fso, nodeExe, pm2Js, npmDir, cmd, exitCode

Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

npmDir = sh.ExpandEnvironmentStrings("%APPDATA%") & "\npm"
nodeExe = npmDir & "\node.exe"
pm2Js = npmDir & "\node_modules\pm2\bin\pm2"

If Not fso.FileExists(nodeExe) Then nodeExe = "node.exe"
If Not fso.FileExists(pm2Js) Then
  WScript.Echo "pm2 not found at " & pm2Js
  WScript.Quit 1
End If

cmd = Chr(34) & nodeExe & Chr(34) & " " & Chr(34) & pm2Js & Chr(34) & " resurrect"
' 0 = hidden window; True = wait so the task records pm2 exit code
exitCode = sh.Run(cmd, 0, True)
WScript.Quit exitCode
