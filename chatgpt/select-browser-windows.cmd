@echo off
node "%~dp0configure-browser.mjs"
if errorlevel 1 (
  echo.
  echo Browser configuration failed. See the message above.
)
pause
