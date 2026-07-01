const express = require('express');
const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

const backupDir = path.join(__dirname, '../../backups');
const dataDir = path.join(__dirname, '../../data');

function runBackup(type = 'Manual') {
  fs.mkdirSync(backupDir, { recursive: true });
  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `vendorhub-backup-${stamp}.db`;
  const destPath = path.join(backupDir, fileName);
  const srcPath = path.join(dataDir, 'vendorhub.db');

  try {
    fs.copyFileSync(srcPath, destPath);
    const stats = fs.statSync(destPath);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
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

router.get('/history', (req, res) => {
  const rows = db.prepare('SELECT * FROM backup_log ORDER BY created_at DESC LIMIT 50').all();
  res.json({ data: rows });
});

router.post('/run', (req, res) => {
  try {
    const result = runBackup('Manual');
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

router.post('/:id/restore', (req, res) => {
  const log = db.prepare('SELECT * FROM backup_log WHERE id = ?').get(req.params.id);
  if (!log || !log.file_path) return res.status(404).json({ error: 'Backup not found' });
  if (!fs.existsSync(log.file_path)) return res.status(404).json({ error: 'Backup file not found on disk' });
  const srcPath = path.join(dataDir, 'vendorhub.db');
  try {
    // First make a safety backup of current state
    runBackup('Pre-Restore');
    fs.copyFileSync(log.file_path, srcPath);
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
