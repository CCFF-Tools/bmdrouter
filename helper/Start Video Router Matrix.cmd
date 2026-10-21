@echo off
setlocal
cd /d "%~dp0"
if not exist "runtime\node.exe" (
  echo Please extract the entire ZIP before starting Video Router Matrix.
  pause
  exit /b 1
)
"runtime\node.exe" "helper\main.js" --open
if errorlevel 1 pause
