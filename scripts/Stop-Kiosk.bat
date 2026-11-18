@echo off
rem Shuts the Renata Quiz kiosk down (closes the browser and stops the server).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Stop-Kiosk.ps1"
