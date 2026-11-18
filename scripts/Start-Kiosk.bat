@echo off
rem Renata Quiz kiosk launcher: starts the server, opens Chrome/Edge full-screen, reopens it if closed.
rem Stop with Stop-Kiosk.bat.  Test in a normal window:  Start-Kiosk.bat windowed
setlocal
cd /d "%~dp0"
if not defined PORT set "PORT=3000"
set "HOSTNAME=127.0.0.1"
set "NODE_ENV=production"
set "NEXT_TELEMETRY_DISABLED=1"
set "XLSX_PATH=%~dp0data\participants.xlsx"
if not exist data mkdir data
del /q data\stop.flag >nul 2>&1

set "BROWSER="
for %%P in ("%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe") do (
  if not defined BROWSER if exist %%P set "BROWSER=%%~P"
)
if not defined BROWSER (echo Chrome or Edge not found. & pause & exit /b 1)

start "RenataQuizServer" /min /D "%~dp0app" "%~dp0runtime\node.exe" server.js

set /a tries=0
:wait
curl -s -o nul http://127.0.0.1:%PORT%/ && goto up
set /a tries+=1
if %tries% gtr 60 (echo Server did not start. & pause & goto stopserver)
timeout /t 1 /nobreak >nul
goto wait

:up
set "MODE=--kiosk"
if /i "%~1"=="windowed" set "MODE=--new-window"
:loop
start "" /wait "%BROWSER%" %MODE% --user-data-dir="%~dp0data\browser-profile" --no-first-run --no-default-browser-check --disable-infobars --disable-session-crashed-bubble --noerrdialogs --disable-pinch --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required --disable-features=Translate,TranslateUI --check-for-update-interval=31536000 "http://localhost:%PORT%/"
if exist data\stop.flag goto stopserver
if /i "%~1"=="windowed" goto stopserver
timeout /t 1 /nobreak >nul
goto loop

:stopserver
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Stop-Kiosk.ps1"
exit /b 0
