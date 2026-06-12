@echo off
title SEG Solar Visitor Log
cd /d "%~dp0"

echo ============================================
echo   SEG Solar Visitor Log
echo ============================================
echo.

if not exist "node_modules\" (
  echo First run - installing dependencies, please wait...
  call npm install
  echo.
)

if not exist ".next\BUILD_ID" (
  echo Preparing the app for first use ^(about 30 seconds^)...
  call npm run build
  echo.
)

echo Starting the app...
echo Your browser will open at http://localhost:3000 shortly.
echo.
echo   * Keep this window OPEN while the app is in use.
echo   * Close this window to STOP the app.
echo.

start "" cmd /c "timeout /t 4 >nul & start http://localhost:3000"
call npm start

echo.
echo App stopped. Press any key to close.
pause >nul
