@echo off
node "%~dp0uninstall.mjs"
if errorlevel 1 (
  echo.
  echo Uninstall failed. See the message above.
)
pause
