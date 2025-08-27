@echo off
echo Installing Meno Educational App Backend...
echo.

cd .
echo Installing Node.js dependencies...
npm install

if %errorlevel% neq 0 (
    echo Error installing dependencies!
    pause
    exit /b 1
)

echo.
echo Installing nodemon globally...
npm install -g nodemon

if %errorlevel% neq 0 (
    echo Warning: Could not install nodemon globally, trying local installation...
    npm install nodemon --save-dev
)

echo.
echo Dependencies installed successfully!
echo.
echo Starting the server...
echo.
npm run dev
