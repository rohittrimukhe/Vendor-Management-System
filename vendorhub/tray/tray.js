/**
 * VendorHub System Tray Manager
 * LRS Services (West) Mumbai
 *
 * Manages the VendorHub server process from the Windows system tray.
 * Compile with: npm run build  →  produces VendorHub.exe
 */

'use strict';

const path    = require('path');
const fs      = require('fs');
const http    = require('http');
const https   = require('https');
const { spawn, exec } = require('child_process');
const { execSync } = require('child_process');
const os      = require('os');

// ── Paths ────────────────────────────────────────────────────────────────────
// When compiled with pkg, __dirname is the snapshot root.
// The real exe lives next to the vendorhub/ folder structure.
const EXE_DIR   = path.dirname(process.execPath);          // folder containing VendorHub.exe
const APP_DIR   = path.join(EXE_DIR, 'vendorhub');         // vendorhub/ sibling
const SERVER_JS = path.join(APP_DIR, 'server', 'index.js');
const DATA_DIR  = path.join(APP_DIR, 'data');
const LOG_FILE  = path.join(DATA_DIR, 'tray.log');
const PID_FILE  = path.join(DATA_DIR, 'server.pid');
const PKG_FILE  = path.join(APP_DIR, 'package.json');

const PORT      = 8080;
const APP_URL   = `http://localhost:${PORT}`;
const GITHUB_REPO = 'rohittrimukhe/Vendor-Management-System';

// ── State ────────────────────────────────────────────────────────────────────
let serverProc   = null;
let trayInstance = null;
let status       = 'stopped';   // stopped | starting | running | restarting | crashed
let crashCount   = 0;
let updateAvailable = false;
let latestSha    = null;

// ── Logging ──────────────────────────────────────────────────────────────────
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, line + '\n');
    // Keep log under 2 MB
    const stat = fs.statSync(LOG_FILE);
    if (stat.size > 2 * 1024 * 1024) {
      const content = fs.readFileSync(LOG_FILE, 'utf8');
      fs.writeFileSync(LOG_FILE, content.slice(-1024 * 1024));
    }
  } catch {}
}

// ── Node / npm detection ─────────────────────────────────────────────────────
function findExe(name) {
  const candidates = [
    name,
    name + '.cmd',
    name + '.exe',
    ...((process.env.PATH || '').split(';').map(d => path.join(d.trim(), name))),
    ...((process.env.PATH || '').split(';').map(d => path.join(d.trim(), name + '.cmd'))),
    'C:\\Program Files\\nodejs\\' + name + '.exe',
    'C:\\Program Files\\nodejs\\' + name + '.cmd',
    process.env.APPDATA && path.join(process.env.APPDATA, 'npm', name + '.cmd'),
  ].filter(Boolean);
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch {}
  }
  return name;
}

const NODE_EXE = findExe('node');
const NPM_EXE  = findExe('npm');

// ── Health check ─────────────────────────────────────────────────────────────
function checkHealth() {
  return new Promise(resolve => {
    const req = http.get({ hostname: 'localhost', port: PORT, path: '/api/auth/me', timeout: 3000 }, res => {
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

// ── PID tracking ─────────────────────────────────────────────────────────────
function savePid(pid) {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(PID_FILE, String(pid)); } catch {}
}
function clearPid() { try { fs.unlinkSync(PID_FILE); } catch {} }

// ── Server lifecycle ──────────────────────────────────────────────────────────
function startServer(reason = 'manual') {
  if (serverProc) return;

  if (!fs.existsSync(SERVER_JS)) {
    log(`ERROR: Cannot find server at ${SERVER_JS}`);
    setStatus('crashed');
    showNotification('VendorHub Error', `Server file not found:\n${SERVER_JS}`, 'error');
    return;
  }

  log(`Starting server (reason: ${reason})`);
  setStatus('starting');

  serverProc = spawn(NODE_EXE, [SERVER_JS], {
    cwd: APP_DIR,
    detached: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'production' },
  });

  savePid(serverProc.pid);
  log(`Server started with PID ${serverProc.pid}`);

  serverProc.stdout?.on('data', d => log('[server] ' + d.toString().trim()));
  serverProc.stderr?.on('data', d => log('[server ERR] ' + d.toString().trim()));

  // Wait for health check before marking running
  let attempts = 0;
  const waitForReady = setInterval(async () => {
    attempts++;
    const healthy = await checkHealth();
    if (healthy) {
      clearInterval(waitForReady);
      crashCount = 0;
      setStatus('running');
      if (reason !== 'autostart') {
        showNotification('VendorHub Running', `Server started on port ${PORT}.\nDouble-click the tray icon to open.`, 'info');
      }
      log('Server is healthy and ready');
    } else if (attempts >= 30) {
      clearInterval(waitForReady);
      log('Server did not become healthy in 30 seconds');
      setStatus('crashed');
    }
  }, 1000);

  serverProc.on('exit', (code, signal) => {
    clearInterval(waitForReady);
    clearPid();
    const wasProc = serverProc;
    serverProc = null;

    if (status === 'stopped') {
      log('Server stopped cleanly');
      return;
    }

    crashCount++;
    log(`Server exited (code=${code}, signal=${signal}, crashCount=${crashCount})`);

    if (crashCount <= 5) {
      const delay = Math.min(2000 * crashCount, 30000);
      log(`Auto-restarting in ${delay / 1000}s...`);
      setStatus('restarting');
      if (crashCount === 1) showNotification('VendorHub Restarting', 'Server stopped unexpectedly — restarting automatically.', 'warn');
      setTimeout(() => startServer('auto-restart'), delay);
    } else {
      log('Too many crashes — giving up auto-restart');
      setStatus('crashed');
      showNotification('VendorHub Crashed', 'Server crashed too many times. Click tray → Restart to try again.', 'error');
    }
  });
}

function stopServer() {
  if (!serverProc) { setStatus('stopped'); return; }
  log('Stopping server...');
  setStatus('stopped');
  try {
    serverProc.kill('SIGTERM');
    setTimeout(() => { try { serverProc?.kill('SIGKILL'); } catch {} }, 3000);
  } catch (e) { log('kill error: ' + e.message); }
  serverProc = null;
  clearPid();
}

async function restartServer() {
  log('Restarting server...');
  setStatus('restarting');
  stopServer();
  await new Promise(r => setTimeout(r, 1500));
  crashCount = 0;
  startServer('restart');
}

// ── Tray icon (VH letters in blue, encoded as PNG base64) ────────────────────
// A simple 32x32 PNG with "VH" on navy blue background
const ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAACXBIWXMAAAsTAAALEwEAmpwYAAAA' +
  'AAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAALSSURBVHgB7VZNSBRRGHxv3t+uu9oKuqGH' +
  'QhCEQlAHoQ6BHYMKD0J46NBBiKBDEEGHDh0KoUMnT0EQQYcOHTp4KCiIiCAIIiJChkIiIiIi' +
  'IiIiIiIiIiIi4t/33vP8vW/fzLy3+5LFwsLCG3gz8/2+me/NzCMiIiIiIiIiIiIiIiIiIiIi' +
  'IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi' +
  'IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi' +
  'IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi' +
  'IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi' +
  'IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi' +
  'IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi' +
  'IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi' +
  'IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi' +
  'IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi' +
  'IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi' +
  'IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi' +
  'IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi' +
  'IiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIiIi';

// ── Tray menu builder ─────────────────────────────────────────────────────────
const SEP = { title: '<SEPARATOR>', tooltip: '', checked: false, enabled: true };

function buildMenu() {
  const statusLabel = {
    stopped:    '⚫  Status: Stopped',
    starting:   '🟡  Status: Starting...',
    running:    '🟢  Status: Running',
    restarting: '🔄  Status: Restarting...',
    crashed:    '🔴  Status: Crashed',
  }[status] || '⚫  Status: Unknown';

  const items = [
    { title: '🌐  Open VendorHub',   tooltip: `Open in browser (${APP_URL})`, checked: false, enabled: true },
    SEP,
    { title: statusLabel,            tooltip: '', checked: false, enabled: false },
    SEP,
    { title: '▶  Start Server',      tooltip: 'Start the VendorHub server', checked: false, enabled: status === 'stopped' || status === 'crashed' },
    { title: '🔄  Restart Server',   tooltip: 'Restart the VendorHub server', checked: false, enabled: status === 'running' || status === 'crashed' },
    { title: '⏹  Stop Server',      tooltip: 'Stop the VendorHub server', checked: false, enabled: status === 'running' || status === 'starting' },
    SEP,
    { title: updateAvailable ? '🆕  Update Available — Apply Now' : '🔍  Check for Update', tooltip: 'Check GitHub for a new version', checked: false, enabled: true },
    SEP,
    { title: '📋  Open Log File',    tooltip: 'View the server log', checked: false, enabled: true },
    { title: '🚀  Open at Login',    tooltip: 'Toggle auto-start when Windows starts', checked: false, enabled: true },
    SEP,
    { title: '✖  Exit',             tooltip: 'Stop server and exit VendorHub tray', checked: false, enabled: true },
  ];

  return items;
}

// ── Status update ─────────────────────────────────────────────────────────────
function setStatus(s) {
  status = s;
  refreshTray();
}

function refreshTray() {
  if (!trayInstance) return;
  try {
    trayInstance.kill();
  } catch {}
  // Reinit (systray2 doesn't support live menu update — restart it)
  initTray();
}

// ── Notifications (via PowerShell / BurntToast on Windows) ───────────────────
function showNotification(title, body, level = 'info') {
  try {
    const icon = level === 'error' ? 'Error' : level === 'warn' ? 'Warning' : 'Information';
    const script = `
      Add-Type -AssemblyName System.Windows.Forms;
      $n = New-Object System.Windows.Forms.NotifyIcon;
      $n.Icon = [System.Drawing.SystemIcons]::Application;
      $n.Visible = $true;
      $n.ShowBalloonTip(4000, '${title.replace(/'/g, "''")}', '${body.replace(/'/g, "''").replace(/\n/g, ' ')}', [System.Windows.Forms.ToolTipIcon]::${icon});
      Start-Sleep -Milliseconds 4500;
      $n.Dispose();
    `.trim().replace(/\n\s+/g, ' ');
    exec(`powershell -NoProfile -WindowStyle Hidden -Command "${script}"`, { windowsHide: true });
  } catch {}
}

// ── Auto-start at Windows login ───────────────────────────────────────────────
function isAutoStart() {
  try {
    const out = execSync(
      `reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v VendorHub`,
      { encoding: 'utf8', stdio: ['pipe','pipe','pipe'] }
    );
    return out.includes('VendorHub');
  } catch { return false; }
}

function toggleAutoStart() {
  const exePath = process.execPath;
  if (isAutoStart()) {
    exec(`reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v VendorHub /f`, { windowsHide: true });
    showNotification('VendorHub', 'Auto-start at login disabled.', 'info');
    log('Auto-start disabled');
  } else {
    exec(`reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v VendorHub /t REG_SZ /d "${exePath}" /f`, { windowsHide: true });
    showNotification('VendorHub', 'Auto-start at login enabled.\nVendorHub will start automatically with Windows.', 'info');
    log('Auto-start enabled');
  }
}

// ── Update check ──────────────────────────────────────────────────────────────
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = https.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: { 'User-Agent': 'VendorHub-Tray/1.0' },
    }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(Buffer.concat(chunks).toString()) }); }
        catch { resolve({ status: res.statusCode, body: null }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function getInstalledSha() {
  try { return fs.readFileSync(path.join(DATA_DIR, 'installed_sha.txt'), 'utf8').trim().slice(0, 7); } catch { return null; }
}

function getPkgVersion() {
  try { return JSON.parse(fs.readFileSync(PKG_FILE, 'utf8')).version || '1.0.0'; } catch { return '1.0.0'; }
}

async function checkForUpdate(silent = false) {
  log('Checking for updates...');
  try {
    const r = await httpsGet(`https://api.github.com/repos/${GITHUB_REPO}/commits/HEAD`);
    if (r.status !== 200 || !r.body?.sha) {
      if (!silent) showNotification('Update Check Failed', 'Could not reach GitHub. Check your internet connection.', 'warn');
      return;
    }
    latestSha = r.body.sha.slice(0, 7);
    const localSha = getInstalledSha();
    const localVer = getPkgVersion();

    if (localSha && latestSha === localSha) {
      updateAvailable = false;
      log(`Up to date: v${localVer} (${localSha})`);
      if (!silent) showNotification('VendorHub is Up to Date', `Version v${localVer} — you have the latest.`, 'info');
    } else {
      updateAvailable = true;
      log(`Update available: local=${localSha || 'unknown'} remote=${latestSha}`);
      showNotification(
        '🆕 VendorHub Update Available',
        `A new version is available (${latestSha}).\nCurrent: v${localVer}\nClick tray → "Apply Now" to update.`,
        'info'
      );
    }
    refreshTray();
  } catch (e) {
    log('Update check error: ' + e.message);
    if (!silent) showNotification('Update Check Failed', e.message, 'error');
  }
}

async function applyUpdate() {
  log('Applying update via web interface...');
  // Open the System Update page in the browser — the web UI handles the update
  openBrowser(`${APP_URL}/admin/update`);
  showNotification('VendorHub Update', 'Opening System Update page...\nThe server will restart automatically after the update.\nVendorHub tray will auto-reconnect.', 'info');

  // After update, the server process will exit and auto-restart handles it
}

// ── Open browser ─────────────────────────────────────────────────────────────
function openBrowser(url = APP_URL) {
  exec(`start "" "${url}"`, { windowsHide: true });
}

// ── Open log file ─────────────────────────────────────────────────────────────
function openLog() {
  try { exec(`notepad "${LOG_FILE}"`, { windowsHide: true }); }
  catch { exec(`start "" "${LOG_FILE}"`, { windowsHide: true }); }
}

// ── Menu item indices (must match buildMenu order exactly) ───────────────────
const IDX = {
  OPEN:        0,
  // sep         1
  STATUS:      2,
  // sep         3
  START:       4,
  RESTART:     5,
  STOP:        6,
  // sep         7
  UPDATE:      8,
  // sep         9
  LOG:         10,
  AUTOSTART:   11,
  // sep         12
  EXIT:        13,
};

// ── Init tray ─────────────────────────────────────────────────────────────────
function initTray() {
  let SysTray;
  try { SysTray = require('systray2').default; }
  catch { SysTray = require('systray2'); }

  trayInstance = new SysTray({
    menu: {
      icon:    ICON_BASE64,
      title:   '',
      tooltip: `VendorHub — ${status}`,
      items:   buildMenu(),
    },
    debug:   false,
    copyDir: true,
  });

  trayInstance.onClick(action => {
    const idx = action.seq_id;
    log(`Tray click: item ${idx}`);

    switch (idx) {
      case IDX.OPEN:
        if (status === 'running') openBrowser();
        else showNotification('VendorHub', 'Server is not running. Start it first.', 'warn');
        break;

      case IDX.START:
        if (status === 'stopped' || status === 'crashed') startServer('manual');
        break;

      case IDX.RESTART:
        restartServer();
        break;

      case IDX.STOP:
        stopServer();
        showNotification('VendorHub', 'Server stopped.', 'info');
        break;

      case IDX.UPDATE:
        if (updateAvailable) applyUpdate();
        else checkForUpdate(false);
        break;

      case IDX.LOG:
        openLog();
        break;

      case IDX.AUTOSTART:
        toggleAutoStart();
        break;

      case IDX.EXIT:
        log('Exit requested from tray');
        stopServer();
        setTimeout(() => {
          try { trayInstance.kill(); } catch {}
          process.exit(0);
        }, 1000);
        break;
    }
  });

  trayInstance.onError(err => {
    log('Tray error: ' + err);
  });

  log('Tray initialized');
}

// ── Periodic health monitor ───────────────────────────────────────────────────
setInterval(async () => {
  if (status === 'running') {
    const healthy = await checkHealth();
    if (!healthy) {
      log('Health check failed — server may have crashed');
      // The exit handler on serverProc will trigger auto-restart
    }
  }
}, 30 * 1000);

// ── Periodic silent update check (every 6 hours) ─────────────────────────────
setInterval(() => checkForUpdate(true), 6 * 60 * 60 * 1000);

// ── Graceful shutdown on process signals ──────────────────────────────────────
['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(sig => {
  process.on(sig, () => {
    log(`Received ${sig} — shutting down`);
    stopServer();
    setTimeout(() => process.exit(0), 2000);
  });
});

process.on('uncaughtException', err => {
  log('Uncaught exception: ' + err.message + '\n' + err.stack);
});

// ── Main ──────────────────────────────────────────────────────────────────────
log('=== VendorHub Tray Starting ===');
log(`EXE: ${process.execPath}`);
log(`App dir: ${APP_DIR}`);
log(`Node: ${NODE_EXE}`);

// Check if another instance is already running
try {
  const pidStr = fs.readFileSync(PID_FILE, 'utf8').trim();
  const pid = parseInt(pidStr);
  if (pid) {
    try {
      process.kill(pid, 0); // check if PID exists
      log(`Server already running with PID ${pid}`);
      status = 'running';
    } catch {
      log('Stale PID file — server not running');
      clearPid();
    }
  }
} catch {}

// Start tray icon
initTray();

// Auto-start server
startServer('autostart');

// Initial update check after 10s
setTimeout(() => checkForUpdate(true), 10000);

log('VendorHub Tray ready');
