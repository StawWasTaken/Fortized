@echo off
title Fortized — Game Detection Setup
echo.
echo  ╔══════════════════════════════════════╗
echo  ║   Fortized Game Detection Setup      ║
echo  ╚══════════════════════════════════════╝
echo.
echo  Setting up automatic game detection...
echo.

where python >nul 2>&1
if %errorlevel% equ 0 (
    python "%~dp0fortized-companion.py" --install
) else (
    where python3 >nul 2>&1
    if %errorlevel% equ 0 (
        python3 "%~dp0fortized-companion.py" --install
    ) else (
        echo  [ERROR] Python is not installed.
        echo  Please install Python from https://python.org and try again.
        pause
        exit /b 1
    )
)
