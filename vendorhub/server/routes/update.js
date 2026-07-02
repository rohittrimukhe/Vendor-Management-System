const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const https = require('https');
const fs = require('fs');
const requireAuth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');

const router = express.Router();
router.use(requireAuth);
router.use(requireAdmin);

const ROOT_DIR = path.resolve(__dirname, '..', '..', '..');  // /Vendor-Management-System root
const APP_DIR  = path.resolve(__dirname, '..', '..');        // /vendorhub
const PKG      = require('../../package.json');
const GITHUB_REPO = 'rohittrimukhe/Vendor-Management-System';
const IS_WIN   = process.platform === 'win32';

// ─── Locate git executable (handles Windows services where PATH is stripped) ──

function findGit() {
  // Common Windows Git installation paths
  const WIN_PATHS = [
    'C:\\Program Files\\Git\\cmd\\git.exe',
    'C:\\Program Files\\Git\\bin\\git.exe',
    'C:\\Program Files (x86)\\Git\\cmd\\git.exe',
    'C:\\Program Files (x86)\\Git\\bin\\git.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'cmd', 'git.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Git', 'bin', 'git.exe'),
    path.join(process.env.ProgramFiles || '', 'Git', 'cmd', 'git.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Git', 'cmd', 'git.exe'),
  ];

  if (IS_WIN) {
    // Check PATH entries first
    const pathDirs = (process.env.PATH || '').split(';');
    for (const dir of pathDirs) {
      const candidate = path.join(dir.trim(), 'git.exe');
      try { if (fs.existsSync(candidate)) return `"${candidate}"`; } catch {}
    }
    // Fall back to known locations
    for (const p of WIN_PATHS) {
      try { if (p && fs.existsSync(p)) return `"${p}"`; } catch {}
    }
    return 'git'; // last resort
  }

  return 'git'; // Linux/Mac — always in PATH
}

const GIT = findGit();

// ─── helpers ─────────────────────────────────────────────────────────────────

function run(cmd, cwd) {
  // Replace bare 'git' with the resolved path
  const resolved = cmd.replace(/^git\b/, GIT);
  return new Promise((resolve, reject) => {
    exec(resolved, { cwd: cwd || ROOT_DIR, maxBuffer: 5 * 1024 * 1024, timeout: 120000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const opts = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: { 'User-Agent': 'VendorHub-UpdateChecker/1.0', 'Accept': 'application/vnd.github.v3+json' },
    };
    const req = https.get(opts, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

// ─── GET /api/update/current ──────────────────────────────────────────────────
router.get('/current', async (req, res) => {
  try {
    const sha = await run('git rev-parse HEAD');
    const shortSha = sha.slice(0, 7);
    const logLine = await run('git log -1 --format=%s|||%ai|||%an HEAD');
    const [message, date, author] = logLine.split('|||');
    const branch = await run('git rev-parse --abbrev-ref HEAD');
    const remote = await run('git remote get-url origin').catch(() => '');

    res.json({ data: {
      version: PKG.version,
      sha: shortSha,
      fullSha: sha,
      message: message?.trim(),
      date: date?.trim(),
      author: author?.trim(),
      branch: branch?.trim(),
      remote: remote?.trim(),
      gitPath: GIT,
      platform: process.platform,
    }});
  } catch (e) {
    // Git not found or not a git repo
    res.json({ data: {
      version: PKG.version,
      sha: null,
      gitPath: GIT,
      platform: process.platform,
      gitError: e.message,
    }});
  }
});

// ─── GET /api/update/check ────────────────────────────────────────────────────
router.get('/check', async (req, res) => {
  try {
    // 1. Get current local SHA
    const localSha = await run('git rev-parse HEAD');

    // 2. Fetch from remote quietly
    await run('git fetch origin').catch(() => {});

    // 3. Determine default/target branch (main or master)
    const remoteBranch = await run('git remote show origin').then(out => {
      const m = out.match(/HEAD branch:\s*(\S+)/);
      return m ? m[1] : 'main';
    }).catch(async () => {
      // Fallback: check if main or master exists on remote
      const refs = await run('git branch -r').catch(() => '');
      if (refs.includes('origin/main')) return 'main';
      if (refs.includes('origin/master')) return 'master';
      return 'main';
    });

    // 4. Get remote HEAD SHA
    const remoteSha = await run(`git rev-parse origin/${remoteBranch}`).catch(() => null);
    const upToDate = remoteSha && localSha === remoteSha;

    // 5. Count commits ahead on remote
    let newCommits = [];
    if (!upToDate && remoteSha) {
      const log = await run(`git log ${localSha}..origin/${remoteBranch} --oneline --no-merges`).catch(() => '');
      newCommits = log.split('\n').filter(Boolean).map(line => {
        const [sha, ...rest] = line.split(' ');
        return { sha, message: rest.join(' ') };
      });
    }

    // 6. Try GitHub releases API for changelog/version info
    let releaseInfo = null;
    try {
      const r = await httpsGet(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
      if (r.status === 200 && r.body?.tag_name) {
        releaseInfo = {
          tag: r.body.tag_name,
          name: r.body.name,
          body: r.body.body,
          publishedAt: r.body.published_at,
          url: r.body.html_url,
        };
      }
    } catch {} // OK if GitHub is unreachable

    res.json({ data: {
      localSha: localSha.slice(0, 7),
      remoteSha: remoteSha?.slice(0, 7) || null,
      remoteBranch,
      upToDate,
      newCommitsCount: newCommits.length,
      newCommits: newCommits.slice(0, 20),
      release: releaseInfo,
    }});
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/update/apply ───────────────────────────────────────────────────
// Runs: git pull → npm install → npm run build → notifies client to reload
let updateInProgress = false;
const updateLog = [];

router.get('/log', (req, res) => {
  res.json({ data: { log: updateLog, inProgress: updateInProgress } });
});

router.post('/apply', async (req, res) => {
  if (updateInProgress) return res.status(409).json({ error: 'Update already in progress' });

  updateInProgress = true;
  updateLog.length = 0;

  const log = (msg, type = 'info') => {
    const entry = { ts: new Date().toISOString(), msg, type };
    updateLog.push(entry);
    console.log(`[VendorHub Update] ${msg}`);
  };

  // Respond immediately — client will poll /log
  res.json({ data: { started: true, message: 'Update started — poll /api/update/log for progress' } });

  try {
    // 1. Determine default branch
    log('Detecting default branch...');
    const remoteBranch = await run('git remote show origin').then(out => {
      const m = out.match(/HEAD branch:\s*(\S+)/);
      return m ? m[1] : 'main';
    }).catch(() => 'main');
    log(`Target branch: origin/${remoteBranch}`);

    // 2. Stash any local changes (safety net — data/ and uploads/ are gitignored so safe)
    log('Stashing any local uncommitted changes...');
    await run('git stash').catch(() => {});

    // 3. Pull latest code
    log(`Pulling latest code from origin/${remoteBranch}...`);
    const pullOut = await run(`git pull origin ${remoteBranch}`);
    log(pullOut || 'Already up to date.', 'success');

    // 4. Install server dependencies
    log('Installing server dependencies (npm install)...');
    const npmOut = await run('npm install', APP_DIR);
    log('Server dependencies updated.', 'success');

    // 5. Install client deps + build
    log('Installing client dependencies...');
    const clientDir = path.join(APP_DIR, 'client');
    await run('npm install', clientDir);
    log('Building client bundle...');
    const buildOut = await run('npm run build', clientDir);
    log('Client build complete.', 'success');

    // 6. Record update time
    const newSha = await run('git rev-parse --short HEAD');
    log(`Update complete! Now at commit ${newSha}`, 'success');
    log('RESTART_REQUIRED', 'restart');

    // 7. Graceful restart after short delay (allows final log poll)
    setTimeout(() => {
      updateInProgress = false;
      log('Restarting server...', 'restart');
      process.exit(0); // process manager (PM2 / node-windows service) will restart
    }, 2000);

  } catch (e) {
    log(`ERROR: ${e.message}`, 'error');
    updateInProgress = false;
  }
});

module.exports = router;
