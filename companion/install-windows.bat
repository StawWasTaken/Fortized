@echo off
title Fortized — Game Detection Setup
echo.
echo  ╔══════════════════════════════════════╗
echo  ║   Fortized Game Detection Setup      ║
echo  ╚══════════════════════════════════════╝
echo.
echo  Setting up automatic game detection...
echo.

:: Find Python
set PYTHON=
where python >nul 2>&1 && set PYTHON=python
if not defined PYTHON (
    where python3 >nul 2>&1 && set PYTHON=python3
)
if not defined PYTHON (
    echo  [ERROR] Python is not installed.
    echo  Please install Python from https://python.org and try again.
    pause
    exit /b 1
)

:: Determine install directory
set "INSTALL_DIR=%APPDATA%\Fortized"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

set "COMPANION=%INSTALL_DIR%\fortized-companion.py"

:: Check if companion exists next to this script (local dev)
if exist "%~dp0fortized-companion.py" (
    copy /Y "%~dp0fortized-companion.py" "%COMPANION%" >nul
) else (
    echo  Downloading companion service...
    powershell -Command "try { Invoke-WebRequest -Uri 'https://fortized.com/companion/fortized-companion.py' -OutFile '%COMPANION%' -UseBasicParsing } catch { exit 1 }"
    if not exist "%COMPANION%" (
        echo  [ERROR] Download failed.
        pause
        exit /b 1
    )
)

%PYTHON% "%COMPANION%" --install
