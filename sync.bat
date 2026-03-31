@echo off
title Moler Pro Auto-Sync
echo 🔄 Starting auto-sync...

:loop
echo 📋 Checking for changes...
cd /d "c:\Users\lbeta\Desktop\moler"

REM Provjeri da li ima promjena
git status --porcelain >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ No changes detected
) else (
    echo ✅ Changes detected, committing...
    
    REM Dodaj sve promjene
    git add .
    
    REM Commit sa timestamp-om
    for /f "tokens=*" %%i in ('date /t') do set TIMESTAMP=%%i
    git commit -m "Auto-sync: %TIMESTAMP%"
    
    REM Push na GitHub
    echo 📤 Pushing to GitHub...
    git push origin master
    
    echo ✅ Sync completed!
)

timeout /t 30 >nul
goto loop
