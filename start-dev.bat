@echo off
title SEG Solar Visitor Log - DEVELOPER mode
cd /d "%~dp0"

echo ============================================
echo   SEG Solar Visitor Log - DEVELOPER mode
echo ============================================
echo.
echo   NOTE: This mode is for editing code. It is
echo   SLOWER (pages compile on first open).
echo   For normal use, run start-app.bat instead.
echo.

if not exist "node_modules\" (
  echo First run - installing dependencies, please wait...
  call npm install
  echo.
)

echo Starting the dev server...
echo Your browser will open at http://localhost:3000 shortly.
echo.
echo   * Keep this window OPEN while you use the app.
echo   * Close this window to STOP the server.
echo.

start "" cmd /c "timeout /t 5 >nul & start http://localhost:3000"
call npm run dev

echo.
echo Server stopped. Press any key to close.
pause >nul
