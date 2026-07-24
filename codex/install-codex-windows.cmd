@echo off
node "%~dp0install.mjs" --app
if errorlevel 1 (
  echo.
  echo Installation failed. See the message above.
)
pause
