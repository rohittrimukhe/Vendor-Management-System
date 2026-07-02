# VendorHub Installer - LRS Services Pvt Ltd
# Compatible with Windows PowerShell 5 on Windows 11

$ErrorActionPreference = "Continue"
$Port = 8080
$InstallDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Force ASCII-safe output
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Show-Banner {
    Write-Host ""
    Write-Host "  =================================================" -ForegroundColor Cyan
    Write-Host "   VendorHub v1.0 Installer" -ForegroundColor Cyan
    Write-Host "   LRS Services Pvt Ltd" -ForegroundColor Cyan
    Write-Host "  =================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Install folder: $InstallDir" -ForegroundColor Gray
    Write-Host ""
}

function Step($number, $total, $text) {
    Write-Host ""
    Write-Host "  -------------------------------------------------" -ForegroundColor DarkGray
    Write-Host "  STEP $number of $total : $text" -ForegroundColor Yellow
    Write-Host "  -------------------------------------------------" -ForegroundColor DarkGray
}

function OK($text)   { Write-Host "  [DONE] $text" -ForegroundColor Green }
function INFO($text) { Write-Host "  [....] $text" -ForegroundColor Gray }
function WARN($text) { Write-Host "  [WARN] $text" -ForegroundColor DarkYellow }

function FAIL($text) {
    Write-Host ""
    Write-Host "  [FAIL] $text" -ForegroundColor Red
    Write-Host ""
    Write-Host "  Press Enter to close this window..."
    Read-Host | Out-Null
    exit 1
}

function Run-Command($label, $cmd, $args) {
    INFO $label
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = $cmd
    $psi.Arguments = $args
    $psi.WorkingDirectory = (Get-Location).Path
    $psi.UseShellExecute = $false
    $psi.RedirectStandardOutput = $true
    $psi.RedirectStandardError = $true
    $psi.CreateNoWindow = $true

    $proc = [System.Diagnostics.Process]::Start($psi)

    # Stream stdout live
    $stdout = $proc.StandardOutput.ReadToEnd()
    $stderr = $proc.StandardError.ReadToEnd()
    $proc.WaitForExit()

    # Show any real errors (not just warnings)
    if ($proc.ExitCode -ne 0) {
        Write-Host ""
        Write-Host "--- Output ---" -ForegroundColor DarkGray
        if ($stdout) { Write-Host $stdout -ForegroundColor Gray }
        if ($stderr)  { Write-Host $stderr  -ForegroundColor Red }
        Write-Host "--------------" -ForegroundColor DarkGray
        return $false
    }
    return $true
}

# =============================================================================
Show-Banner

# STEP 1 - Check files
# =============================================================================
Step 1 6 "Checking files"

if (-not (Test-Path "$InstallDir\server\index.js")) {
    FAIL "Cannot find server\index.js. Make sure you extracted the ZIP and are running the installer from inside the 'vendorhub' folder."
}
if (-not (Test-Path "$InstallDir\client\package.json")) {
    FAIL "Cannot find client\package.json. The download may be incomplete."
}
OK "All required files found"

# STEP 2 - Check / Install Node.js
# =============================================================================
Step 2 6 "Checking Node.js"

$needNode = $false

try {
    # Refresh PATH first in case Node was just installed
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    $nodeRaw = cmd /c "node --version" 2>&1
    $nodeVer = ($nodeRaw | Select-Object -First 1).ToString().Trim()

    if ($nodeVer -match "^v(\d+)\.") {
        $major = [int]$Matches[1]
        if ($major -ge 18 -and $major -le 22) {
            OK "Node.js $nodeVer is installed and compatible"
        } else {
            WARN "Node.js $nodeVer found but not compatible (need v18, v20 or v22)"
            $needNode = $true
        }
    } else {
        INFO "Node.js not detected"
        $needNode = $true
    }
} catch {
    INFO "Node.js not found on this computer"
    $needNode = $true
}

if ($needNode) {
    Write-Host ""
    INFO "Downloading Node.js 20 LTS (~30 MB) from nodejs.org..."
    INFO "Please wait, do not close this window..."
    Write-Host ""

    $nodeUrl = "https://nodejs.org/dist/v20.19.2/node-v20.19.2-x64.msi"
    $nodeMsi = "$env:TEMP\node-v20-lts.msi"

    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $ProgressPreference = "SilentlyContinue"
        Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeMsi -UseBasicParsing
        OK "Download complete"
    } catch {
        FAIL "Could not download Node.js. Check your internet connection, then try again. Or install Node.js 20 manually from https://nodejs.org and re-run this installer."
    }

    INFO "Installing Node.js silently (about 1 minute)..."
    $msiProc = Start-Process "msiexec.exe" -ArgumentList "/i `"$nodeMsi`" /quiet /norestart ADDLOCAL=ALL" -Wait -PassThru
    if ($msiProc.ExitCode -ne 0 -and $msiProc.ExitCode -ne 1641 -and $msiProc.ExitCode -ne 3010) {
        FAIL "Node.js installer failed with code $($msiProc.ExitCode). Please install Node.js 20 manually from https://nodejs.org and re-run."
    }

    # Refresh PATH so node/npm are available now
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

    $nodeVer = (cmd /c "node --version" 2>&1 | Select-Object -First 1).ToString().Trim()
    OK "Node.js $nodeVer installed successfully"
}

# Locate npm (PowerShell 5 compatible - no ?. operator)
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
$npmPath = if ($npmCmd) { $npmCmd.Source } else { $null }
if (-not $npmPath) {
    $npmPath = (cmd /c "where npm" 2>&1 | Select-Object -First 1).ToString().Trim()
}
INFO "Using npm at: $npmPath"

# STEP 3 - Install server packages
# =============================================================================
Step 3 6 "Installing server packages"
INFO "This takes 2-4 minutes - please wait..."
Write-Host ""

Set-Location $InstallDir

if (Test-Path "node_modules") {
    INFO "Removing old packages first..."
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

INFO "Running npm install (warnings are normal, ignore them)..."
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm install 2>&1" -WorkingDirectory $InstallDir -Wait -PassThru -NoNewWindow
if ($proc.ExitCode -ne 0) {
    FAIL "npm install failed with exit code $($proc.ExitCode). Make sure you have internet access and try again."
}
OK "Server packages installed"

# STEP 4 - Build web interface
# =============================================================================
Step 4 6 "Building web interface"
INFO "This takes 1-2 minutes - please wait..."
Write-Host ""

$clientDir = "$InstallDir\client"
Set-Location $clientDir

if (Test-Path "node_modules") {
    INFO "Removing old client packages..."
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

INFO "Installing client packages..."
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm install 2>&1" -WorkingDirectory $clientDir -Wait -PassThru -NoNewWindow
if ($proc.ExitCode -ne 0) {
    FAIL "Client npm install failed."
}

INFO "Building web interface (compiling React app)..."
$proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run build 2>&1" -WorkingDirectory $clientDir -Wait -PassThru -NoNewWindow
if ($proc.ExitCode -ne 0) {
    FAIL "Build failed. Please share this error with IT support."
}

if (-not (Test-Path "$clientDir\dist\index.html")) {
    FAIL "Build appeared to succeed but dist\index.html not found. Please try again."
}
OK "Web interface built successfully"

Set-Location $InstallDir

# STEP 5 - Create start/stop scripts and shortcuts
# =============================================================================
Step 5 6 "Creating shortcuts"

$startBat = "$InstallDir\Start-VendorHub.bat"

Set-Content -Path $startBat -Encoding ASCII -Value @"
@echo off
title VendorHub Server - LRS Services Pvt Ltd
color 1F
echo.

:: Check if port $Port is already in use
netstat -aon 2>nul | findstr ":$Port " | findstr LISTENING >nul 2>&1
if not errorlevel 1 (
    echo  [!] Port $Port is already in use. VendorHub may already be running.
    echo.
    echo  If you see VendorHub in your browser at http://localhost:$Port
    echo  then it is already running - no need to start it again.
    echo.
    echo  To stop the existing instance first, run Stop-VendorHub.bat
    echo  then try starting again.
    echo.
    pause
    exit /b 1
)

echo  VendorHub is starting up...
echo  When you see "Server running" below, open your browser to:
echo.
echo       http://localhost:$Port
echo.
echo  Keep this window open while using VendorHub.
echo  Close this window to stop the server.
echo.
cd /d "$InstallDir"
node server\index.js
echo.
echo  Server has stopped.
pause
"@

Set-Content -Path "$InstallDir\Stop-VendorHub.bat" -Encoding ASCII -Value @"
@echo off
echo Stopping VendorHub...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":$Port " ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
echo Done. VendorHub stopped.
timeout /t 2 >nul
"@

OK "Start-VendorHub.bat created"

# Desktop shortcuts
try {
    $desktop = [System.Environment]::GetFolderPath("CommonDesktopDirectory")
    $WshShell = New-Object -ComObject WScript.Shell

    $sc1 = $WshShell.CreateShortcut("$desktop\VendorHub.lnk")
    $sc1.TargetPath  = "http://localhost:$Port"
    $sc1.Description = "Open VendorHub in browser"
    $sc1.Save()

    $sc2 = $WshShell.CreateShortcut("$desktop\Start VendorHub Server.lnk")
    $sc2.TargetPath  = $startBat
    $sc2.Description = "Start VendorHub server"
    $sc2.WindowStyle = 1
    $sc2.Save()

    OK "Desktop shortcuts created (check your Desktop)"
} catch {
    WARN "Could not create desktop shortcuts: $_"
}

# STEP 6 - Auto-start with Windows
# =============================================================================
Step 6 6 "Setting up auto-start with Windows"

try {
    $taskName = "VendorHub_AutoStart"
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

    $action    = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$startBat`"" -WorkingDirectory $InstallDir
    $trigger   = New-ScheduledTaskTrigger -AtLogOn
    $settings  = New-ScheduledTaskSettingsSet `
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
        -Description "Auto-start VendorHub on login" `
        -Force | Out-Null

    OK "VendorHub will auto-start every time you log in to Windows"
} catch {
    WARN "Auto-start setup failed: $_"
    WARN "You can still start manually using Start-VendorHub.bat"
}

# ALL DONE
# =============================================================================
Write-Host ""
Write-Host "  =================================================" -ForegroundColor Green
Write-Host "   INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "  =================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  HOW TO USE EVERY DAY:" -ForegroundColor Yellow
Write-Host "   1. Double-click 'Start VendorHub Server' on your Desktop" -ForegroundColor White
Write-Host "   2. Wait for the message: 'Server running on http://localhost:$Port'" -ForegroundColor White
Write-Host "   3. Double-click 'VendorHub' on your Desktop (opens browser)" -ForegroundColor White
Write-Host "   4. First time only: complete the Setup Wizard" -ForegroundColor White
Write-Host ""
Write-Host "  -------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

$answer = Read-Host "  Start VendorHub right now? (Y = Yes, N = No)"

if ($answer -match "^[Yy]") {
    Write-Host ""
    INFO "Starting VendorHub..."
    Start-Process "cmd.exe" -ArgumentList "/c `"$startBat`""

    Write-Host ""
    INFO "Waiting for server to be ready (up to 30 seconds)..."
    $ready = $false
    for ($i = 1; $i -le 30; $i++) {
        Start-Sleep -Seconds 1
        Write-Host "  Checking... $i/30`r" -NoNewline -ForegroundColor DarkGray
        try {
            $r = Invoke-WebRequest -Uri "http://localhost:$Port/api/setup/status" `
                -UseBasicParsing -TimeoutSec 1 -ErrorAction SilentlyContinue
            if ($r -and $r.StatusCode -eq 200) { $ready = $true; break }
        } catch {}
    }
    Write-Host "                                        `r" -NoNewline

    if ($ready) {
        Write-Host ""
        OK "Server is running!"
        INFO "Opening browser..."
        Start-Sleep -Milliseconds 800
        Start-Process "http://localhost:$Port"
        Write-Host ""
        Write-Host "  Browser opened! Complete the Setup Wizard to get started." -ForegroundColor Green
    } else {
        Write-Host ""
        WARN "Server is still starting. Please open your browser manually and go to:"
        Write-Host "       http://localhost:$Port" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "  Press Enter to close this installer..."
Read-Host | Out-Null
