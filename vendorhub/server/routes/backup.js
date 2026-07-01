const express = require('express');
const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
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

  // Try to use archiver if available, otherwise fall back to DB-only
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
    // archiver not available, fall back to DB-only
    return Promise.resolve(runDbBackup(type));
  }
}

function runBackup(type = 'Manual') {
  return Promise.resolve(runDbBackup(type));
}

router.get('/history', (req, res) => {
  const rows = db.prepare('SELECT * FROM backup_log ORDER BY created_at DESC LIMIT 50').all();
  res.json({ data: rows });
});

router.post('/run', async (req, res) => {
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

router.get('/:id/download', (req, res) => {
  const log = db.prepare('SELECT * FROM backup_log WHERE id = ?').get(req.params.id);
  if (!log || !log.file_path) return res.status(404).json({ error: 'Backup not found' });
  if (!fs.existsSync(log.file_path)) return res.status(404).json({ error: 'Backup file not found on disk' });
  res.download(log.file_path);
});

router.post('/:id/restore', async (req, res) => {
  const log = db.prepare('SELECT * FROM backup_log WHERE id = ?').get(req.params.id);
  if (!log || !log.file_path) return res.status(404).json({ error: 'Backup not found' });
  if (!fs.existsSync(log.file_path)) return res.status(404).json({ error: 'Backup file not found on disk' });
  const srcPath = path.join(dataDir, 'vendorhub.db');
  try {
    // First make a safety backup of current state
    await runDbBackup('Pre-Restore');
    // Only restore .db files directly; for zip we'd need extraction — for now only allow .db restores
    if (log.file_path.endsWith('.db')) {
      fs.copyFileSync(log.file_path, srcPath);
    } else {
      return res.status(400).json({ error: 'Restore from full zip backup not supported via UI. Please restore manually.' });
    }
    res.json({ data: { success: true, message: 'Restore complete. Restart server to apply.' } });
    setTimeout(() => process.exit(0), 1000); // Server will be restarted by process manager
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/schedule', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key='backup_schedule'").get();
  res.json({ data: { schedule: row ? row.value : 'Daily' } });
});

router.post('/schedule', (req, res) => {
  const { schedule } = req.body;
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('backup_schedule', ?)").run(schedule);
  res.json({ data: { success: true, schedule } });
});

module.exports = router;
module.exports.runBackup = runBackup;
