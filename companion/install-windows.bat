@echo off
chcp 65001 >nul
title Fortized - Game Detection Setup
echo.
echo  +======================================+
echo  ^|   Fortized Game Detection Setup      ^|
echo  +======================================+
echo.
echo  Setting up automatic game detection...
echo.

:: Find Python (verify it actually runs, not just the Windows Store alias)
set PYTHON=
python --version >nul 2>&1 && set PYTHON=python
if not defined PYTHON (
    python3 --version >nul 2>&1 && set PYTHON=python3
)
if not defined PYTHON (
    py --version >nul 2>&1 && set PYTHON=py
)
if not defined PYTHON (
    echo.
    echo  [ERROR] Python is not installed.
    echo  Please install Python from https://python.org and try again.
    echo  Make sure to check "Add Python to PATH" during installation.
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

echo.
echo  Starting companion service...
%PYTHON% "%COMPANION%" --install
if errorlevel 1 (
    echo.
    echo  [ERROR] Companion service failed to install.
    pause
    exit /b 1
)
echo.
echo  Setup complete!
pause
