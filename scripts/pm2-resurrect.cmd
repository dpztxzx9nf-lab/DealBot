@echo off

REM Silent wrapper — used only if something still invokes this file directly.

wscript.exe //B "%~dp0pm2-resurrect-hidden.vbs"

exit /b %ERRORLEVEL%

