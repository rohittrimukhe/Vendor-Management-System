#Requires -RunAsAdministrator
<#
.SYNOPSIS
    VendorHub Installer for Windows 11
    LRS Services Pvt Ltd

.DESCRIPTION
    Automatically installs VendorHub, sets up the Windows service,
    creates desktop shortcut, and opens the app in your browser.
#>

# ─── Config ───────────────────────────────────────────────────────────────────
$AppName     = "VendorHub"
$AppVersion  = "1.0.0"
$NodeVersion = "20"          # LTS version required
$Port        = 8080
$InstallDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$TaskName    = "VendorHub_AutoStart"

# ─── Colors ───────────────────────────────────────────────────────────────────
function Write-Header {
    Clear-Host
    Write-Host ""
    Write-Host "  ██╗   ██╗███████╗███╗   ██╗██████╗  ██████╗ ██████╗ ██╗  ██╗██╗   ██╗██████╗ " -ForegroundColor Cyan
    Write-Host "  ██║   ██║██╔════╝████╗  ██║██╔══██╗██╔═══██╗██╔══██╗██║  ██║██║   ██║██╔══██╗" -ForegroundColor Cyan
    Write-Host "  ██║   ██║█████╗  ██╔██╗ ██║██║  ██║██║   ██║██████╔╝███████║██║   ██║██████╔╝" -ForegroundColor Cyan
    Write-Host "  ╚██╗ ██╔╝██╔══╝  ██║╚██╗██║██║  ██║██║   ██║██╔══██╗██╔══██║██║   ██║██╔══██╗" -ForegroundColor Cyan
    Write-Host "   ╚████╔╝ ███████╗██║ ╚████║██████╔╝╚██████╔╝██║  ██║██║  ██║╚██████╔╝██████╔╝" -ForegroundColor Cyan
    Write-Host "    ╚═══╝  ╚══════╝╚═╝  ╚═══╝╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ " -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Vendor Management System v$AppVersion — LRS Services Pvt Ltd" -ForegroundColor White
    Write-Host "  ─────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
    Write-Host ""
}

function Write-Step($num, $text) {
    Write-Host "  [$num] $text" -ForegroundColor Yellow
}

function Write-OK($text) {
    Write-Host "  ✓  $text" -ForegroundColor Green
}

function Write-Fail($text) {
    Write-Host "  ✗  $text" -ForegroundColor Red
}

function Write-Info($text) {
    Write-Host "      $text" -ForegroundColor Gray
}

function Pause-AndExit($msg) {
    Write-Host ""
    Write-Fail $msg
    Write-Host ""
    Write-Host "  Press any key to exit..." -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# ─── MAIN ─────────────────────────────────────────────────────────────────────
Write-Header

# ── Step 1: Check we are in the right folder ──────────────────────────────────
Write-Step "1/7" "Checking installation folder..."

$serverJs = Join-Path $InstallDir "server\index.js"
if (-not (Test-Path $serverJs)) {
    Pause-AndExit "Cannot find server\index.js. Please run this script from inside the 'vendorhub' folder."
}
Write-OK "Installation folder: $InstallDir"

# ── Step 2: Check / Install Node.js ───────────────────────────────────────────
Write-Host ""
Write-Step "2/7" "Checking Node.js..."

$nodeOk = $false
try {
    $nodeVer = & node --version 2>$null
    if ($nodeVer -match "v(\d+)\.") {
        $major = [int]$Matches[1]
        if ($major -eq 20 -or $major -eq 18) {
            Write-OK "Node.js $nodeVer found — compatible"
            $nodeOk = $true
        } elseif ($major -lt 18) {
            Write-Fail "Node.js $nodeVer is too old. Need version 18 or 20."
        } else {
            Write-Fail "Node.js $nodeVer is too new. Need version 20 LTS."
        }
    }
} catch {
    Write-Info "Node.js not found."
}

if (-not $nodeOk) {
    Write-Host ""
    Write-Host "  → Downloading Node.js 20 LTS (this may take a minute)..." -ForegroundColor Yellow

    $nodeUrl  = "https://nodejs.org/dist/v20.19.2/node-v20.19.2-x64.msi"
    $nodeMsi  = "$env:TEMP\node-v20-lts.msi"

    try {
        Write-Info "Downloading from nodejs.org..."
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $ProgressPreference = 'SilentlyContinue'
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeMsi -UseBasicParsing
        Write-Info "Installing Node.js silently..."
        Start-Process msiexec.exe -ArgumentList "/i `"$nodeMsi`" /quiet /norestart ADDLOCAL=ALL" -Wait -NoNewWindow

        # Refresh PATH
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

        $nodeVer = & node --version 2>$null
        Write-OK "Node.js $nodeVer installed successfully"
    } catch {
        Pause-AndExit "Failed to download/install Node.js automatically. Please install Node.js 20 LTS manually from https://nodejs.org and re-run this installer."
    }
}

# ── Step 3: Install server dependencies ───────────────────────────────────────
Write-Host ""
Write-Step "3/7" "Installing server packages (this takes 2-3 minutes)..."

Set-Location $InstallDir

# Remove broken node_modules if present
if (Test-Path "node_modules") {
    Write-Info "Removing old node_modules..."
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}

$npmOut = & npm install 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host $npmOut
    Pause-AndExit "npm install failed. See error above."
}
Write-OK "Server packages installed"

# ── Step 4: Build the React frontend ──────────────────────────────────────────
Write-Host ""
Write-Step "4/7" "Building the web interface..."

Set-Location (Join-Path $InstallDir "client")

if (Test-Path "node_modules") {
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}

$npmOut = & npm install 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host $npmOut
    Pause-AndExit "Client npm install failed."
}

$buildOut = & npm run build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host $buildOut
    Pause-AndExit "Client build failed."
}
Write-OK "Web interface built successfully"

Set-Location $InstallDir

# ── Step 5: Create Start / Stop scripts ───────────────────────────────────────
Write-Host ""
Write-Step "5/7" "Creating start/stop scripts..."

# Start script
$startContent = @"
@echo off
title VendorHub - LRS Services Pvt Ltd
echo.
echo  Starting VendorHub on http://localhost:$Port
echo  Close this window to stop the server.
echo.
cd /d "$InstallDir"
node server\index.js
pause
"@
Set-Content -Path (Join-Path $InstallDir "Start-VendorHub.bat") -Value $startContent -Encoding ASCII

# Stop script
$stopContent = @"
@echo off
echo Stopping VendorHub...
taskkill /F /FI "WINDOWTITLE eq VendorHub*" /T >nul 2>&1
taskkill /F /IM "node.exe" /FI "CommandLine eq *vendorhub*server*" >nul 2>&1
echo VendorHub stopped.
timeout /t 2 >nul
"@
Set-Content -Path (Join-Path $InstallDir "Stop-VendorHub.bat") -Value $stopContent -Encoding ASCII

Write-OK "Start-VendorHub.bat and Stop-VendorHub.bat created"

# ── Step 6: Create Desktop Shortcut ───────────────────────────────────────────
Write-Host ""
Write-Step "6/7" "Creating desktop shortcut..."

$WshShell  = New-Object -comObject WScript.Shell
$desktopPath = [System.Environment]::GetFolderPath("Desktop")

# App shortcut (opens browser)
$shortcut       = $WshShell.CreateShortcut("$desktopPath\VendorHub.lnk")
$shortcut.TargetPath      = "http://localhost:$Port"
$shortcut.Description     = "VendorHub - Vendor Management System"
$shortcut.Save()

# Start Server shortcut
$startShortcut  = $WshShell.CreateShortcut("$desktopPath\Start VendorHub Server.lnk")
$startShortcut.TargetPath = Join-Path $InstallDir "Start-VendorHub.bat"
$startShortcut.Description = "Start the VendorHub server"
$startShortcut.WindowStyle = 1
$startShortcut.Save()

Write-OK "Desktop shortcuts created"

# ── Step 7: Auto-start with Windows (Task Scheduler) ─────────────────────────
Write-Host ""
Write-Step "7/7" "Setting up auto-start with Windows..."

# Remove old task if exists
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

$startBat = Join-Path $InstallDir "Start-VendorHub.bat"

$action  = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$startBat`"" -WorkingDirectory $InstallDir
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 0)  # No time limit

$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Highest

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Auto-start VendorHub on login" `
    -Force | Out-Null

Write-OK "VendorHub will now start automatically when you log in to Windows"

# ── Done! ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ─────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  🎉  Installation Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "  What was set up:" -ForegroundColor White
Write-Host "    ✓  VendorHub installed in: $InstallDir" -ForegroundColor Green
Write-Host "    ✓  Desktop shortcut: 'VendorHub' and 'Start VendorHub Server'" -ForegroundColor Green
Write-Host "    ✓  Auto-starts when you log in to Windows" -ForegroundColor Green
Write-Host ""
Write-Host "  HOW TO USE:" -ForegroundColor White
Write-Host "    1. Double-click 'Start VendorHub Server' on your Desktop" -ForegroundColor Cyan
Write-Host "    2. Wait for the black window to say 'Server running on port $Port'" -ForegroundColor Cyan
Write-Host "    3. Double-click 'VendorHub' on your Desktop — browser opens automatically" -ForegroundColor Cyan
Write-Host "    4. First time: complete the Setup Wizard (takes 2 minutes)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  ─────────────────────────────────────────────────────────────" -ForegroundColor DarkGray
Write-Host ""

# Ask to launch now
$launch = Read-Host "  Start VendorHub now and open in browser? (Y/N)"
if ($launch -match "^[Yy]") {
    Write-Host ""
    Write-Info "Starting server..."
    Start-Process "cmd.exe" -ArgumentList "/c `"$startBat`"" -WorkingDirectory $InstallDir

    Write-Info "Waiting for server to be ready..."
    $ready = $false
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 1
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:$Port/api/setup/status" -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if ($resp.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
    Write-Host ""

    if ($ready) {
        Write-OK "Server is running!"
        Start-Process "http://localhost:$Port"
        Write-Host ""
        Write-Host "  Browser opened to http://localhost:$Port" -ForegroundColor Green
        Write-Host "  Complete the Setup Wizard to get started." -ForegroundColor White
    } else {
        Write-Info "Server is starting. Please wait 10 seconds then open:"
        Write-Host "  http://localhost:$Port" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "  Press any key to close this installer..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
