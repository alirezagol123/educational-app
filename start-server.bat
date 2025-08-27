@echo off
echo ========================================
echo    MENO EDUCATIONAL APP SERVER
echo ========================================
echo.

echo 🧹 Cleaning up any existing processes...
powershell -ExecutionPolicy Bypass -File kill-port.ps1

echo.
echo 🚀 Starting server with automatic port assignment...
echo.

npm run dev

pause
