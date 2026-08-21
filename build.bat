@echo off
title Build Go Audio Player
echo ========================================================
echo   Dang bien dich Go Audio ^& Video Player (Windows 11)
echo ========================================================
echo.

echo [1/2] Building Frontend (React + Vite + Tailwind)...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [2/2] Building Go Desktop Binary (.exe)...
go build -tags desktop,production -ldflags "-H windowsgui" -o go-audio-player.exe .
if %errorlevel% neq 0 (
    echo [ERROR] Go build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================================
echo   BIEN DICH THANH CONG! File tao ra: go-audio-player.exe
echo ========================================================
pause
