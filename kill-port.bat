@echo off
echo Killing any processes using common development ports...
echo.

REM Kill processes on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    echo Killing process on port 3000: PID %%a
    taskkill /PID %%a /F >nul 2>&1
)

REM Kill processes on port 3001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
    echo Killing process on port 3001: PID %%a
    taskkill /PID %%a /F >nul 2>&1
)

REM Kill processes on port 3002
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3002') do (
    echo Killing process on port 3002: PID %%a
    taskkill /PID %%a /F >nul 2>&1
)

REM Kill any remaining Node.js processes
echo Killing any remaining Node.js processes...
taskkill /f /im node.exe >nul 2>&1

echo.
echo Port cleanup completed! You can now start the server.
pause
