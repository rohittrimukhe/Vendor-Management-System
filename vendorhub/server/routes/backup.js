const express = require('express');
const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const router = express.Router();

router.use(requireAuth);

const backupDir = path.join(__dirname, '../../backups');
const dataDir = path.join(__dirname, '../../data');

function runDbBackup(type) {
  fs.mkdirSync(backupDir, { recursive: true });
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `vendorhub-backup-${stamp}.db`;
  const destPath = path.join(backupDir, fileName);
  const srcPath = path.join(dataDir, 'vendorhub.db');

  try {
    fs.copyFileSync(srcPath, destPath);
    const stats = fs.statSync(destPath);
    const sizeMb = parseFloat((stats.size / (1024 * 1024)).toFixed(2));
    db.prepare('INSERT INTO backup_log (date, type, size_mb, status, destination, file_path) VALUES (?, ?, ?, ?, ?, ?)').run(
      now.toISOString(), type, sizeMb, 'Success', backupDir, destPath
    );
    return { success: true, file: fileName, size_mb: sizeMb };
  } catch (err) {
    db.prepare('INSERT INTO backup_log (date, type, size_mb, status, destination, file_path) VALUES (?, ?, ?, ?, ?, ?)').run(
      now.toISOString(), type, 0, 'Failed', backupDir, ''
    );
    throw err;
  }
}

function runFullBackup(type) {
  fs.mkdirSync(backupDir, { recursive: true });
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);

  try {
    const archiver = require('archiver');
    const zipFileName = `vendorhub-full-${stamp}.zip`;
    const zipPath = path.join(backupDir, zipFileName);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 6 } });

      output.on('close', () => {
        const sizeMb = parseFloat((archive.pointer() / (1024 * 1024)).toFixed(2));
        db.prepare('INSERT INTO backup_log (date, type, size_mb, status, destination, file_path) VALUES (?, ?, ?, ?, ?, ?)').run(
          now.toISOString(), type, sizeMb, 'Success', backupDir, zipPath
        );
        resolve({ success: true, file: zipFileName, size_mb: sizeMb });
      });

      archive.on('error', (err) => {
        db.prepare('INSERT INTO backup_log (date, type, size_mb, status, destination, file_path) VALUES (?, ?, ?, ?, ?, ?)').run(
          now.toISOString(), type, 0, 'Failed', backupDir, ''
        );
        reject(err);
      });

      archive.pipe(output);

      const dbPath = path.join(dataDir, 'vendorhub.db');
      if (fs.existsSync(dbPath)) archive.file(dbPath, { name: 'vendorhub.db' });

      const uploadsDir = path.join(__dirname, '../../uploads');
      if (fs.existsSync(uploadsDir)) archive.directory(uploadsDir, 'uploads');

      archive.finalize();
    });
  } catch (e) {
    return Promise.resolve(runDbBackup(type));
  }
}

function runBackup(type = 'Manual') {
  return Promise.resolve(runDbBackup(type));
}

// History - any authenticated user can view
router.get('/history', (req, res) => {
  const rows = db.prepare('SELECT * FROM backup_log ORDER BY created_at DESC LIMIT 50').all();
  res.json({ data: rows });
});

// Run backup - admin only
router.post('/run', requireAdmin, async (req, res) => {
  try {
    const { backupType } = req.body;
    let result;
    if (backupType === 'full') {
      result = await runFullBackup('Manual-Full');
    } else {
      result = await runDbBackup('Manual-DB');
    }
    res.json({ data: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download - admin only
router.get('/:id/download', requireAdmin, (req, res) => {
  const log = db.prepare('SELECT * FROM backup_log WHERE id = ?').get(req.params.id);
  if (!log || !log.file_path) return res.status(404).json({ error: 'Backup not found' });
  if (!fs.existsSync(log.file_path)) return res.status(404).json({ error: 'Backup file not found on disk' });
  res.download(log.file_path);
});

// Restore - admin only; supports both .db and .zip backups
router.post('/:id/restore', requireAdmin, async (req, res) => {
  const log = db.prepare('SELECT * FROM backup_log WHERE id = ?').get(req.params.id);
  if (!log || !log.file_path) return res.status(404).json({ error: 'Backup not found' });
  if (!fs.existsSync(log.file_path)) return res.status(404).json({ error: 'Backup file not found on disk' });

  const destDbPath = path.join(dataDir, 'vendorhub.db');
  try {
    // Safety backup of current state before any restore
    await runDbBackup('Pre-Restore');

    if (log.file_path.endsWith('.db')) {
      fs.copyFileSync(log.file_path, destDbPath);
    } else if (log.file_path.endsWith('.zip')) {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(log.file_path);
      const entry = zip.getEntry('vendorhub.db');
      if (!entry) return res.status(400).json({ error: 'ZIP backup does not contain vendorhub.db' });
      const extracted = zip.readFile(entry);
      fs.writeFileSync(destDbPath, extracted);
    } else {
      return res.status(400).json({ error: 'Unsupported backup file format' });
    }

    res.json({ data: { success: true, message: 'Restore complete. Server is restarting...' } });
    setTimeout(() => process.exit(0), 800);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/schedule', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key='backup_schedule'").get();
  res.json({ data: { schedule: row ? row.value : 'Daily' } });
});

router.post('/schedule', requireAdmin, (req, res) => {
  const { schedule } = req.body;
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('backup_schedule', ?)").run(schedule);
  res.json({ data: { success: true, schedule } });
});

module.exports = router;
module.exports.runBackup = runBackup;
