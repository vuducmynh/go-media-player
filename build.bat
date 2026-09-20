@echo off
title Build Go Audio Player (Fast Build)
echo ========================================================
echo   Bien dich Go Audio ^& Video Player (Windows 11)
echo ========================================================
echo.

echo [1/3] Kiem tra va dong tien trinh cu neu dang chay...
taskkill /F /IM go-audio-player.exe /IM go-audio-play.exe 2>nul

echo.
echo [2/3] Bien dich Frontend (React + Vite + Tailwind)...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b %errorlevel%
)
cd ..

echo.
echo [3/3] Bien dich Wails Desktop Binary (.exe)...
if exist "%USERPROFILE%\go\bin\wails.exe" (
    "%USERPROFILE%\go\bin\wails.exe" build -s -clean=false
) else (
    wails build -s -clean=false
)

if %errorlevel% neq 0 (
    echo [ERROR] Wails build failed!
    pause
    exit /b %errorlevel%
)

if exist "build\bin\go-audio-play.exe" (
    copy /Y "build\bin\go-audio-play.exe" "go-audio-player.exe" >nul
    copy /Y "build\bin\go-audio-play.exe" "go-audio-play.exe" >nul
)

echo.
echo ========================================================
echo   BIEN DICH THANH CONG! File tao ra: go-audio-player.exe
echo ========================================================
pause
