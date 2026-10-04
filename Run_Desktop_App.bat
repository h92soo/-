@echo off
chcp 65001 > nul
title Iraqi Government Administration System - Desktop Launcher
color 0b

echo ===============================================================================
echo            Republic of Iraq - Unified Administrative System
echo            Digital Government Methodology - Desktop Edition 2026
echo ===============================================================================
echo.
echo  [1/2] Creating Desktop Shortcut...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [System.Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'المنهج الرقمي للإدارة الحكومية.lnk')); $s.TargetPath = 'msedge.exe'; $s.Arguments = '--app=https://ais-dev-4geoa3rrxp3yn3ckysjhkj-615803937025.europe-west2.run.app --window-size=1400,900'; $s.Description = 'المنهج الرقمي للإدارة الحكومية'; $s.Save()" > nul 2>&1

echo  [+] Desktop Shortcut Created Successfully!
echo.
echo  [2/2] Launching Standalone Desktop Application Window...

start msedge.exe --app="https://ais-dev-4geoa3rrxp3yn3ckysjhkj-615803937025.europe-west2.run.app" --window-size=1400,900
if %ERRORLEVEL% NEQ 0 (
    start chrome.exe --app="https://ais-dev-4geoa3rrxp3yn3ckysjhkj-615803937025.europe-west2.run.app" --window-size=1400,900
)
if %ERRORLEVEL% NEQ 0 (
    start "" "https://ais-dev-4geoa3rrxp3yn3ckysjhkj-615803937025.europe-west2.run.app"
)

echo.
echo  [✓] App started in Standalone Desktop Window mode!
timeout /t 5 > nul
exit
