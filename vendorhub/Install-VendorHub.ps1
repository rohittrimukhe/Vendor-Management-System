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
Step 1 7 "Checking files"

if (-not (Test-Path "$InstallDir\server\index.js")) {
    FAIL "Cannot find server\index.js. Make sure you extracted the ZIP and are running the installer from inside the 'vendorhub' folder."
}
if (-not (Test-Path "$InstallDir\client\package.json")) {
    FAIL "Cannot find client\package.json. The download may be incomplete."
}
OK "All required files found"

# STEP 2 - Check / Install Node.js
# =============================================================================
Step 2 7 "Checking Node.js"

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
Step 3 7 "Installing server packages"
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
Step 4 7 "Building web interface"
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

# STEP 5 - Build VendorHub.exe tray application
# =============================================================================
Step 5 7 "Building VendorHub tray application"

$trayDir = "$InstallDir\tray"
$exeDest = "$InstallDir\VendorHub.exe"

if (Test-Path $trayDir) {
    INFO "Installing tray dependencies (systray2, pkg)..."
    $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm install 2>&1" -WorkingDirectory $trayDir -Wait -PassThru -NoNewWindow
    if ($proc.ExitCode -ne 0) {
        WARN "Tray npm install failed - VendorHub.exe will not be built. You can still use Start-VendorHub.bat."
    } else {
        INFO "Building VendorHub.exe (compiling to single executable)..."
        $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run build 2>&1" -WorkingDirectory $trayDir -Wait -PassThru -NoNewWindow
        $builtExe = "$InstallDir\dist\VendorHub.exe"
        if ($proc.ExitCode -eq 0 -and (Test-Path $builtExe)) {
            # Stop any running VendorHub.exe before overwriting
            Get-Process -Name "VendorHub" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
            Start-Sleep -Milliseconds 800
            Copy-Item $builtExe $exeDest -Force -ErrorAction SilentlyContinue
            OK "VendorHub.exe built and placed at $exeDest"
        } else {
            WARN "Build step failed. VendorHub.exe not available - will use bat fallback."
        }
    }
} else {
    WARN "tray\ folder not found - skipping VendorHub.exe build."
}

# Record installed SHA so update checker knows this is the current version
INFO "Recording installed version SHA..."
try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $shaResp = Invoke-WebRequest -Uri "https://api.github.com/repos/rohittrimukhe/Vendor-Management-System/commits/HEAD" `
        -UseBasicParsing -Headers @{'User-Agent'='VendorHub-Installer'} -TimeoutSec 10 -ErrorAction Stop
    $shaJson = $shaResp.Content | ConvertFrom-Json
    $installedSha = $shaJson.sha.Substring(0, 7)
    $dataDir = "$InstallDir\data"
    if (-not (Test-Path $dataDir)) { New-Item -ItemType Directory -Path $dataDir -Force | Out-Null }
    [System.IO.File]::WriteAllText("$dataDir\installed_sha.txt", $installedSha, [System.Text.Encoding]::ASCII)
    OK "Installed SHA saved: $installedSha (update checker will show 'up to date' correctly)"
} catch {
    WARN "Could not fetch SHA from GitHub - update checker may show false 'update available' on first run."
}

# STEP 6 - Create shortcuts
# =============================================================================
Step 6 7 "Creating shortcuts"

# Keep bat as fallback for users without tray exe
$startBat = "$InstallDir\Start-VendorHub.bat"
Set-Content -Path $startBat -Encoding ASCII -Value @"
@echo off
title VendorHub Server - LRS Services Pvt Ltd
color 1F
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

# Desktop shortcuts - prefer VendorHub.exe
try {
    $desktop = [System.Environment]::GetFolderPath("CommonDesktopDirectory")
    $WshShell = New-Object -ComObject WScript.Shell

    # Main shortcut: VendorHub.exe if built, else browser link
    $sc1 = $WshShell.CreateShortcut("$desktop\VendorHub.lnk")
    if (Test-Path $exeDest) {
        $sc1.TargetPath  = $exeDest
        $sc1.Description = "Run VendorHub (manages server + opens browser)"
    } else {
        $sc1.TargetPath  = "http://localhost:$Port"
        $sc1.Description = "Open VendorHub in browser"
    }
    $sc1.Save()

    OK "Desktop shortcut 'VendorHub' created"
} catch {
    WARN "Could not create desktop shortcuts: $_"
}

# STEP 7 - Auto-start with Windows
# =============================================================================
Step 7 7 "Setting up auto-start with Windows"

try {
    # Prefer VendorHub.exe for auto-start; fall back to bat
    if (Test-Path $exeDest) {
        $autoStartTarget = $exeDest
        $autoStartArgs   = ""
        INFO "Auto-start will use VendorHub.exe (tray app)"
    } else {
        $autoStartTarget = "cmd.exe"
        $autoStartArgs   = "/c `"$startBat`""
        INFO "Auto-start will use Start-VendorHub.bat"
    }

    $taskName = "VendorHub_AutoStart"
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

    # New-ScheduledTaskAction rejects empty -Argument; omit it when not needed
    if ($autoStartArgs -ne "") {
        $action = New-ScheduledTaskAction -Execute $autoStartTarget -Argument $autoStartArgs -WorkingDirectory $InstallDir
    } else {
        $action = New-ScheduledTaskAction -Execute $autoStartTarget -WorkingDirectory $InstallDir
    }
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
    WARN "You can still launch manually from the Desktop shortcut"
}

# ALL DONE
# =============================================================================
Write-Host ""
Write-Host "  =================================================" -ForegroundColor Green
Write-Host "   INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "  =================================================" -ForegroundColor Green
Write-Host ""

if (Test-Path $exeDest) {
    Write-Host "  HOW TO USE:" -ForegroundColor Yellow
    Write-Host "   * Double-click 'VendorHub' on your Desktop" -ForegroundColor White
    Write-Host "   * The VendorHub icon will appear in the system tray (bottom-right clock area)" -ForegroundColor White
    Write-Host "   * Right-click the tray icon to Open, Restart, Stop, or Check for Updates" -ForegroundColor White
    Write-Host "   * VendorHub starts automatically with Windows - no CMD window needed!" -ForegroundColor White
} else {
    Write-Host "  HOW TO USE EVERY DAY:" -ForegroundColor Yellow
    Write-Host "   1. Double-click 'VendorHub' on your Desktop" -ForegroundColor White
    Write-Host "   2. Wait for the message: 'Server running on http://localhost:$Port'" -ForegroundColor White
    Write-Host "   3. Open your browser to http://localhost:$Port" -ForegroundColor White
}
Write-Host ""
Write-Host "  -------------------------------------------------" -ForegroundColor DarkGray
Write-Host ""

$answer = Read-Host "  Start VendorHub right now? (Y = Yes, N = No)"

if ($answer -match "^[Yy]") {
    Write-Host ""
    if (Test-Path $exeDest) {
        INFO "Launching VendorHub tray app..."
        Start-Process $exeDest
        Write-Host ""
        Write-Host "  VendorHub is starting in the background." -ForegroundColor Green
        Write-Host "  Look for the VH icon in the system tray (bottom-right of taskbar)." -ForegroundColor Green
        Write-Host "  Double-click the tray icon or right-click > Open VendorHub to open in browser." -ForegroundColor Green
    } else {
        INFO "Starting VendorHub server..."
        Start-Process "cmd.exe" -ArgumentList "/c `"$startBat`""

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
}

Write-Host ""
Write-Host "  Press Enter to close this installer..."
Read-Host | Out-Null
