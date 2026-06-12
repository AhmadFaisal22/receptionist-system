@echo off
title SEG Solar Visitor Log - rebuild
cd /d "%~dp0"

echo Rebuilding the app with the latest changes...
echo This takes about 30 seconds.
echo.

call npm run build

echo.
echo Done. Start the app again with start-app.bat.
pause
