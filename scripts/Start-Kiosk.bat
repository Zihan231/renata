@echo off
rem Renata Quiz kiosk launcher. Starts everything hidden (no extra windows). Stop with Stop-Kiosk.bat.
rem Test in a normal window:  Start-Kiosk.bat windowed
start "" /min powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0Start-Kiosk.ps1" %*
exit /b 0
