# VendorHub Installer - LRS Services Pvt Ltd
# PowerShell 5+ compatible

$ErrorActionPreference = "Stop"
$Port = 8080
$InstallDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# ── Helper functions ──────────────────────────────────────────────────────────

function Show-Banner {
    Write-Host ""
    Write-Host "  =================================================" -ForegroundColor Cyan
    Write-Host "   VendorHub v1.0 - Installer" -ForegroundColor Cyan
    Write-Host "   LRS Services Pvt Ltd" -ForegroundColor Cyan
    Write-Host "  =================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Install folder: $InstallDir" -ForegroundColor Gray
    Write-Host ""
}

function Step($number, $total, $text) {
    Write-Host ""
    Write-Host "  ─────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host "  STEP $number of $total : $text" -ForegroundColor Yellow
    Write-Host "  ─────────────────────────────────────────────────" -ForegroundColor DarkGray
}

function OK($text)   { Write-Host "  [DONE] $text" -ForegroundColor Green }
function INFO($text) { Write-Host "  [....] $text" -ForegroundColor Gray }
function FAIL($text) {
    Write-Host ""
    Write-Host "  [FAIL] $text" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Press Enter to close..."
    Read-Host
    exit 1
}

# ── START ─────────────────────────────────────────────────────────────────────

Show-Banner

# ── STEP 1: Verify folder ─────────────────────────────────────────────────────
Step 1 6 "Checking files"

if (-not (Test-Path "$InstallDir\server\index.js")) {
    FAIL "Cannot find server\index.js. Make sure you extracted the ZIP correctly and are running the installer from inside the 'vendorhub' folder."
}
if (-not (Test-Path "$InstallDir\client\package.json")) {
    FAIL "Cannot find client\package.json. The download may be incomplete."
}
OK "All required files found"

# ── STEP 2: Check / Install Node.js ──────────────────────────────────────────
Step 2 6 "Checking Node.js version"

$needNodeInstall = $false
$nodePath = ""

try {
    $nodeVer = (& node --version 2>&1).ToString().Trim()
    if ($nodeVer -match "^v(\d+)\.") {
        $major = [int]$Matches[1]
        if ($major -eq 18 -or $major -eq 20 -or $major -eq 22) {
            OK "Node.js $nodeVer is installed and compatible"
        } else {
            INFO "Node.js $nodeVer found but wrong version (need v18, v20 or v22)"
            $needNodeInstall = $true
        }
    } else {
        INFO "Could not detect Node.js version"
        $needNodeInstall = $true
    }
} catch {
    INFO "Node.js not found on this computer"
    $needNodeInstall = $true
}

if ($needNodeInstall) {
    Write-Host ""
    INFO "Downloading Node.js 20 LTS from nodejs.org..."
    INFO "This file is about 30 MB - please wait..."
    Write-Host ""

    $nodeUrl = "https://nodejs.org/dist/v20.19.2/node-v20.19.2-x64.msi"
    $nodeMsi = "$env:TEMP\node-v20-lts.msi"

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $ProgressPreference = "SilentlyContinue"
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeMsi -UseBasicParsing
        OK "Download complete"

        INFO "Installing Node.js silently (this takes about 1 minute)..."
        $proc = Start-Process "msiexec.exe" -ArgumentList "/i `"$nodeMsi`" /quiet /norestart" -Wait -PassThru -NoNewWindow
        if ($proc.ExitCode -ne 0) {
            FAIL "Node.js installer returned error code $($proc.ExitCode). Try installing Node.js 20 manually from https://nodejs.org then run this installer again."
        }

        # Refresh environment PATH so node command works in this session
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

        $nodeVer = (& node --version 2>&1).ToString().Trim()
        OK "Node.js $nodeVer installed successfully"
    } catch {
        FAIL "Could not download Node.js automatically. Please install Node.js 20 LTS manually from https://nodejs.org/en/download then run this installer again."
    }
}

# ── STEP 3: Install server packages ──────────────────────────────────────────
Step 3 6 "Installing server packages"
INFO "This step takes 2-4 minutes - please wait..."
Write-Host ""

Set-Location $InstallDir

if (Test-Path "node_modules") {
    INFO "Removing old packages..."
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}

INFO "Running npm install..."
$out = & npm install 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ($out | Out-String) -ForegroundColor Red
    FAIL "Server package installation failed. See error above."
}
OK "Server packages installed"

# ── STEP 4: Build web interface ───────────────────────────────────────────────
Step 4 6 "Building web interface"
INFO "This step takes 1-2 minutes - please wait..."
Write-Host ""

Set-Location "$InstallDir\client"

if (Test-Path "node_modules") {
    INFO "Removing old client packages..."
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}

INFO "Running npm install for client..."
$out = & npm install 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ($out | Out-String) -ForegroundColor Red
    FAIL "Client package installation failed."
}

INFO "Building web interface..."
$out = & npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host ($out | Out-String) -ForegroundColor Red
    FAIL "Web interface build failed."
}
OK "Web interface built successfully"

Set-Location $InstallDir

# ── STEP 5: Create start/stop scripts ────────────────────────────────────────
Step 5 6 "Creating shortcuts and startup scripts"

# Start VendorHub batch file
$startBat = "$InstallDir\Start-VendorHub.bat"
Set-Content -Path $startBat -Encoding ASCII -Value @"
@echo off
title VendorHub Server - LRS Services Pvt Ltd
color 1F
echo.
echo  VendorHub is starting...
echo  Once you see "Server running" open your browser to:
echo.
echo      http://localhost:$Port
echo.
echo  DO NOT CLOSE THIS WINDOW while using VendorHub.
echo  To stop: close this window.
echo.
cd /d "$InstallDir"
node server\index.js
echo.
echo Server stopped. Press any key to close.
pause > nul
"@

# Stop VendorHub batch file
$stopBat = "$InstallDir\Stop-VendorHub.bat"
Set-Content -Path $stopBat -Encoding ASCII -Value @"
@echo off
echo Stopping VendorHub...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":$Port " ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo VendorHub stopped.
timeout /t 2 >nul
"@

OK "Start-VendorHub.bat created"

# Desktop shortcuts
$desktop = [System.Environment]::GetFolderPath("Desktop")
$WshShell = New-Object -ComObject WScript.Shell

# Shortcut 1: Open app in browser
$sc1 = $WshShell.CreateShortcut("$desktop\VendorHub.lnk")
$sc1.TargetPath   = "http://localhost:$Port"
$sc1.Description  = "Open VendorHub in browser"
$sc1.Save()

# Shortcut 2: Start the server
$sc2 = $WshShell.CreateShortcut("$desktop\Start VendorHub Server.lnk")
$sc2.TargetPath   = $startBat
$sc2.Description  = "Start VendorHub server"
$sc2.WindowStyle  = 1
$sc2.Save()

OK "Desktop shortcuts created"

# ── STEP 6: Auto-start with Windows ──────────────────────────────────────────
Step 6 6 "Setting up auto-start with Windows"

$taskName = "VendorHub_AutoStart"

# Remove existing task if any
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

try {
    $action   = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$startBat`"" -WorkingDirectory $InstallDir
    $trigger  = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -ExecutionTimeLimit (New-TimeSpan -Hours 0)
    $principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

    Register-ScheduledTask `
        -TaskName $taskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "Auto-start VendorHub on Windows login" `
        -Force | Out-Null

    OK "Auto-start configured - VendorHub will start every time you log in"
} catch {
    Write-Host "  [WARN] Could not set up auto-start: $_" -ForegroundColor DarkYellow
    Write-Host "         You can still start manually using Start-VendorHub.bat" -ForegroundColor DarkYellow
}

# ── DONE ─────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  =================================================" -ForegroundColor Green
Write-Host "   INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "  =================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  What was installed:" -ForegroundColor White
Write-Host "   * VendorHub app files in: $InstallDir" -ForegroundColor Gray
Write-Host "   * Desktop shortcut: 'Start VendorHub Server'" -ForegroundColor Gray
Write-Host "   * Desktop shortcut: 'VendorHub' (opens browser)" -ForegroundColor Gray
Write-Host "   * Auto-start on Windows login: ON" -ForegroundColor Gray
Write-Host ""
Write-Host "  HOW TO USE EVERY DAY:" -ForegroundColor Yellow
Write-Host "   1. Double-click 'Start VendorHub Server' on Desktop" -ForegroundColor White
Write-Host "   2. Wait for: 'Server running on http://localhost:$Port'" -ForegroundColor White
Write-Host "   3. Double-click 'VendorHub' on Desktop" -ForegroundColor White
Write-Host "   4. First time only: fill in the Setup Wizard" -ForegroundColor White
Write-Host ""

# Ask to start now
Write-Host "  ─────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""
$answer = Read-Host "  Do you want to START VendorHub right now? (type Y and press Enter)"

if ($answer -match "^[Yy]") {
    Write-Host ""
    INFO "Starting VendorHub server..."

    Start-Process "cmd.exe" -ArgumentList "/c `"$startBat`""

    INFO "Waiting for server to be ready..."
    $ready = $false
    for ($i = 1; $i -le 30; $i++) {
        Start-Sleep -Seconds 1
        Write-Host "  Checking... ($i/30)" -ForegroundColor DarkGray -NoNewline
        Write-Host "`r" -NoNewline
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$Port/api/setup/status" -UseBasicParsing -TimeoutSec 1 -ErrorAction Stop
            if ($r.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
    }

    Write-Host "                              `r" -NoNewline

    if ($ready) {
        OK "Server is running!"
        Write-Host ""
        INFO "Opening VendorHub in your browser..."
        Start-Sleep -Milliseconds 500
        Start-Process "http://localhost:$Port"
        Write-Host ""
        Write-Host "  Browser is opening. Complete the Setup Wizard to get started!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  Server is starting up. Please open your browser and go to:" -ForegroundColor Yellow
        Write-Host "  http://localhost:$Port" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "  ─────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host "  Press Enter to close this installer..." -ForegroundColor DarkGray
Read-Host
