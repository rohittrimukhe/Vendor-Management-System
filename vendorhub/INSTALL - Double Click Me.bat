@echo off
:: VendorHub Installer Launcher
:: LRS Services Pvt Ltd
:: Double-click this file to install VendorHub

title VendorHub Installer

echo.
echo  ============================================
echo   VendorHub Installer - LRS Services Pvt Ltd
echo  ============================================
echo.
echo  This will install VendorHub on your computer.
echo  Please wait...
echo.

:: Check if running as admin, if not re-launch as admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo  Requesting Administrator access...
    echo  (Click YES on the popup that appears)
    echo.
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

:: Run the PowerShell installer with execution policy bypass
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-VendorHub.ps1"

if %errorLevel% neq 0 (
    echo.
    echo  Installation encountered an error.
    echo  Please take a screenshot and contact IT support.
    echo.
    pause
)
