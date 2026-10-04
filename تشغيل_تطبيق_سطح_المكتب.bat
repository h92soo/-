@echo off
chcp 65001 > nul
title المنهج الرقمي للإدارة الحكومية - تشغيل تطبيق سطح المكتب
color 0b

echo ===============================================================================
echo            الجمهورية العراقية - المنظومة الإدارية الموحدة
echo            المنهج الرقمي للإدارة الحكومية - إصدار حواسيب سطح المكتب 2026
echo ===============================================================================
echo.
echo  [1/2] جاري إنشاء اختصار رسمي على سطح مكتب حاسوبك (Desktop Shortcut)...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $desktop = [System.Environment]::GetFolderPath('Desktop'); $s = $ws.CreateShortcut([System.IO.Path]::Combine($desktop, 'المنهج الرقمي للإدارة الحكومية.lnk')); $s.TargetPath = 'msedge.exe'; $s.Arguments = '--app=https://ais-dev-4geoa3rrxp3yn3ckysjhkj-615803937025.europe-west2.run.app --window-size=1400,900'; $s.Description = 'المنهج الرقمي للإدارة الحكومية - نظام إدارة شؤون الموظفين'; $s.Save()" > nul 2>&1

echo  [+] تم إنشاء اختصار التطبيق على سطح المكتب بنجاح!
echo.
echo  [2/2] جاري إطلاق التطبيق كنافذة سطح مكتب مستقلة (Edge/Chrome App Window)...

start msedge.exe --app="https://ais-dev-4geoa3rrxp3yn3ckysjhkj-615803937025.europe-west2.run.app" --window-size=1400,900
if %ERRORLEVEL% NEQ 0 (
    start chrome.exe --app="https://ais-dev-4geoa3rrxp3yn3ckysjhkj-615803937025.europe-west2.run.app" --window-size=1400,900
)
if %ERRORLEVEL% NEQ 0 (
    start "" "https://ais-dev-4geoa3rrxp3yn3ckysjhkj-615803937025.europe-west2.run.app"
)

echo.
echo  ===============================================================================
echo   [✓] تم تشغيل التطبيق بنجاح! يعمل الآن كنافذة سطح مكتب منفصلة.
echo   [★] البيانات تُحفظ تلقائياً في قاعدة بيانات جهازك المحلي (IndexedDB).
echo  ===============================================================================
echo.
echo  لتثبيت التطبيق بشكل دائم:
echo  - انقر على أيقونة التثبيت (Install App) في أعلى نافذة البرنامج.
echo.
timeout /t 5 > nul
exit
