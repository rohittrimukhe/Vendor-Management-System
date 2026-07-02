const express = require('express');
const { exec, execSync } = require('child_process');
const path = require('path');
const https = require('https');
const http = require('http');
const fs = require('fs');
const AdmZip = require('adm-zip');
const requireAuth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');

const router = express.Router();
router.use(requireAuth);
router.use(requireAdmin);

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');  // repo root
const APP_DIR  = path.resolve(__dirname, '..', '..');        // vendorhub/
const PKG      = require('../../package.json');
const GITHUB_REPO = 'rohittrimukhe/Vendor-Management-System';
const IS_WIN   = process.platform === 'win32';

// ─── Detect Node / npm paths ──────────────────────────────────────────────────

function findExe(name) {
  // On Windows the service PATH is stripped — search common locations
  if (!IS_WIN) return name;
  const exeName = name + '.exe';
  const cmdName = name + '.cmd';
  const pathDirs = (process.env.PATH || '').split(';').map(s => s.trim()).filter(Boolean);
  for (const dir of pathDirs) {
    for (const n of [name, exeName, cmdName]) {
      try { if (fs.existsSync(path.join(dir, n))) return `"${path.join(dir, n)}"` } catch {}
    }
  }
  // Node.js common Windows locations
  const nodeDirs = [
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'nodejs'),
    'C:\\Program Files\\nodejs',
    'C:\\Program Files (x86)\\nodejs',
    process.env.APPDATA && path.join(process.env.APPDATA, 'npm'),
  ].filter(Boolean);
  for (const dir of nodeDirs) {
    for (const n of [exeName, cmdName]) {
      try { if (fs.existsSync(path.join(dir, n))) return `"${path.join(dir, n)}"` } catch {}
    }
  }
  return name;
}

// Try to find npm — prefer npm.cmd on Windows
function findNpm() {
  if (!IS_WIN) return 'npm';
  const pathDirs = (process.env.PATH || '').split(';').map(s => s.trim()).filter(Boolean);
  for (const dir of pathDirs) {
    const c = path.join(dir, 'npm.cmd');
    try { if (fs.existsSync(c)) return `"${c}"` } catch {}
  }
  const candidates = [
    'C:\\Program Files\\nodejs\\npm.cmd',
    process.env.APPDATA && path.join(process.env.APPDATA, 'npm', 'npm.cmd'),
    process.env.ProgramFiles && path.join(process.env.ProgramFiles, 'nodejs', 'npm.cmd'),
  ].filter(Boolean);
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return `"${c}"` } catch {}
  }
  return 'npm';
}

const NPM = findNpm();

// ─── helpers ─────────────────────────────────────────────────────────────────

function run(cmd, cwd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: cwd || APP_DIR, maxBuffer: 10 * 1024 * 1024, timeout: 180000, env: process.env }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr?.trim() || err.message));
      else resolve(stdout.trim());
    });
  });
}

function httpsGet(urlStr, followRedirects = 5) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const mod = parsed.protocol === 'https:' ? https : http;
    const opts = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      headers: { 'User-Agent': 'VendorHub-UpdateChecker/1.0', 'Accept': 'application/vnd.github.v3+json' },
    };
    const req = mod.get(opts, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && followRedirects > 0) {
        return resolve(httpsGet(res.headers.location, followRedirects - 1));
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, buffer: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

async function httpsJSON(urlStr) {
  const { status, buffer } = await httpsGet(urlStr);
  try { return { status, body: JSON.parse(buffer.toString()) }; }
  catch { return { status, body: buffer.toString() }; }
}

// ─── GET /api/update/current ──────────────────────────────────────────────────
router.get('/current', async (req, res) => {
  let gitInfo = null;
  try {
    // Try git if available
    const sha = await run('git rev-parse HEAD', ROOT_DIR);
    const logLine = await run('git log -1 --format=%s|||%ai|||%an HEAD', ROOT_DIR);
    const [message, date, author] = logLine.split('|||');
    const branch = await run('git rev-parse --abbrev-ref HEAD', ROOT_DIR);
    gitInfo = { sha: sha.slice(0, 7), fullSha: sha, message: message?.trim(), date: date?.trim(), author: author?.trim(), branch: branch?.trim() };
  } catch {
    // git not installed — that's OK, we use ZIP method
  }

  res.json({ data: {
    version: PKG.version,
    ...(gitInfo || {}),
    hasGit: !!gitInfo,
    npm: NPM,
    platform: process.platform,
  }});
});

// ─── GET /api/update/check ────────────────────────────────────────────────────
router.get('/check', async (req, res) => {
  try {
    // Check GitHub releases
    const r = await httpsJSON(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
    let latestRelease = null;
    if (r.status === 200 && r.body?.tag_name) {
      latestRelease = {
        tag: r.body.tag_name,
        name: r.body.name,
        body: r.body.body,
        publishedAt: r.body.published_at,
        url: r.body.html_url,
        zipUrl: r.body.zipball_url,
      };
    }

    // Check latest commit on default branch via API
    const branchR = await httpsJSON(`https://api.github.com/repos/${GITHUB_REPO}/commits/HEAD`).catch(() => null);
    const latestCommit = branchR?.body?.sha ? {
      sha: branchR.body.sha.slice(0, 7),
      message: branchR.body.commit?.message?.split('\n')[0],
      author: branchR.body.commit?.author?.name,
      date: branchR.body.commit?.author?.date,
    } : null;

    // Get recent commits list
    const commitsR = await httpsJSON(`https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=10`).catch(() => null);
    const recentCommits = (commitsR?.body || []).slice(0, 10).map(c => ({
      sha: c.sha?.slice(0, 7),
      message: c.commit?.message?.split('\n')[0],
      date: c.commit?.author?.date,
      author: c.commit?.author?.name,
    }));

    // Determine if update is available
    let upToDate = false;
    let localSha = null;
    try {
      localSha = (await run('git rev-parse --short HEAD', ROOT_DIR));
      const remoteSha = latestCommit?.sha;
      upToDate = remoteSha && localSha === remoteSha;
    } catch {
      // No git — can't compare SHAs; show latest available
      upToDate = false;
    }

    res.json({ data: {
      localSha,
      hasGit: !!localSha,
      upToDate,
      latestCommit,
      recentCommits,
      release: latestRelease,
      currentVersion: PKG.version,
    }});
  } catch (e) {
    res.status(500).json({ error: 'Cannot reach GitHub: ' + e.message });
  }
});

// ─── Update log state ─────────────────────────────────────────────────────────
let updateInProgress = false;
const updateLog = [];

router.get('/log', (req, res) => {
  res.json({ data: { log: [...updateLog], inProgress: updateInProgress } });
});

// ─── POST /api/update/apply ───────────────────────────────────────────────────
router.post('/apply', async (req, res) => {
  if (updateInProgress) return res.status(409).json({ error: 'Update already in progress' });

  updateInProgress = true;
  updateLog.length = 0;

  const log = (msg, type = 'info') => {
    updateLog.push({ ts: new Date().toISOString(), msg, type });
    console.log(`[VendorHub Update] [${type}] ${msg}`);
  };

  res.json({ data: { started: true } });

  try {
    log('Starting update via GitHub ZIP download...');
    log(`Platform: ${process.platform} | npm: ${NPM}`);

    // 1. Download ZIP from GitHub
    log('Fetching latest release info from GitHub...');
    let zipUrl;
    const relR = await httpsJSON(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`).catch(() => null);
    if (relR?.body?.zipball_url) {
      zipUrl = relR.body.zipball_url;
      log(`Found release: ${relR.body.tag_name}`);
    } else {
      zipUrl = `https://api.github.com/repos/${GITHUB_REPO}/zipball/main`;
      log('No release found — using latest main branch ZIP');
    }

    log('Downloading update package from GitHub...');
    const { status, buffer } = await httpsGet(zipUrl);
    if (status !== 200) throw new Error(`GitHub returned HTTP ${status}`);
    const zipSizeMB = (buffer.length / 1024 / 1024).toFixed(1);
    log(`Downloaded ${zipSizeMB} MB`, 'success');

    // 2. Extract ZIP to temp directory
    const tmpDir = path.join(APP_DIR, '..', '_update_tmp_' + Date.now());
    log('Extracting update package...');
    fs.mkdirSync(tmpDir, { recursive: true });
    const zip = new AdmZip(buffer);
    zip.extractAllTo(tmpDir, true);

    // GitHub ZIP has a top-level folder like "owner-repo-SHA/"
    const entries = fs.readdirSync(tmpDir);
    const topFolder = entries.find(e => fs.statSync(path.join(tmpDir, e)).isDirectory());
    if (!topFolder) throw new Error('ZIP structure unexpected — no top-level folder');
    const extractedRoot = path.join(tmpDir, topFolder);
    log(`Extracted to: ${topFolder}`, 'success');

    // The vendorhub app folder inside the extracted ZIP
    const extractedApp = path.join(extractedRoot, 'vendorhub');
    if (!fs.existsSync(extractedApp)) throw new Error('vendorhub/ folder not found inside ZIP');

    // 3. Smart copy — preserve data/, uploads/, backups/, node_modules/, client/node_modules/
    const SKIP_DIRS = new Set(['data', 'uploads', 'backups', 'node_modules', '.git', '_update_tmp']);
    const SKIP_FILES = new Set(['.env']);

    log('Applying update files (preserving your data and uploads)...');
    let copied = 0;

    function copyDir(src, dest) {
      fs.mkdirSync(dest, { recursive: true });
      for (const entry of fs.readdirSync(src)) {
        if (SKIP_FILES.has(entry)) continue;
        const srcPath = path.join(src, entry);
        const destPath = path.join(dest, entry);
        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
          if (SKIP_DIRS.has(entry)) continue;
          copyDir(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
          copied++;
        }
      }
    }

    copyDir(extractedApp, APP_DIR);
    log(`Copied ${copied} files`, 'success');

    // 4. Clean up temp dir
    log('Cleaning up temporary files...');
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

    // 5. Install server dependencies
    log('Installing server packages...');
    await run(`${NPM} install --no-audit --no-fund`, APP_DIR);
    log('Server packages updated', 'success');

    // 6. Install client deps + rebuild
    const clientDir = path.join(APP_DIR, 'client');
    log('Installing client packages...');
    await run(`${NPM} install --no-audit --no-fund`, clientDir);
    log('Building web interface...');
    await run(`${NPM} run build`, clientDir);
    log('Web interface rebuilt', 'success');

    log('Update complete! Restarting server...', 'success');
    log('RESTART_REQUIRED', 'restart');

    setTimeout(() => {
      updateInProgress = false;
      process.exit(0);
    }, 2000);

  } catch (e) {
    log('ERROR: ' + e.message, 'error');
    updateInProgress = false;
  }
});

module.exports = router;
