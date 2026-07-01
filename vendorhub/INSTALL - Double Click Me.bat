@echo off
title VendorHub Installer - LRS Services Pvt Ltd
color 1F

echo.
echo  ============================================
echo   VendorHub Installer - LRS Services Pvt Ltd
echo  ============================================
echo.

:: ── Check Admin ──────────────────────────────────────────────────────────────
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo  ERROR: This installer needs Administrator rights.
    echo.
    echo  Please close this window and try again:
    echo    1. Right-click on "INSTALL - Double Click Me.bat"
    echo    2. Select "Run as administrator"
    echo    3. Click YES on the popup
    echo.
    pause
    exit /b 1
)

echo  [OK] Running as Administrator
echo.
echo  Starting installation...
echo  (A blue PowerShell window will open - do not close it)
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-VendorHub.ps1"

echo.
if %errorLevel% neq 0 (
    echo  Something went wrong. Please share the error above with IT support.
) else (
    echo  Done! You can close this window.
)
echo.
pause
