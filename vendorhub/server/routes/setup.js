const express = require('express');
const bcrypt = require('bcrypt');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const router = express.Router();

router.get('/status', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key='initialized'").get();
  res.json({ data: { initialized: !!row } });
});

router.post('/check', (req, res) => {
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.replace('v', '').split('.')[0]);

  const freeBytes = (() => {
    try {
      const stat = fs.statfsSync ? fs.statfsSync('/') : null;
      if (stat) return stat.bfree * stat.bsize;
      return os.freemem();
    } catch { return os.freemem(); }
  })();
  const freeGB = (freeBytes / (1024 ** 3)).toFixed(1);

  res.json({
    data: {
      node: { version: nodeVersion, ok: major >= 16, label: `Node.js ${nodeVersion}` },
      port: { value: process.env.PORT || 8080, ok: true, label: `Port ${process.env.PORT || 8080} available` },
      disk: { value: `${freeGB} GB free`, ok: parseFloat(freeGB) > 0.5, label: `Disk Space: ${freeGB} GB free` }
    }
  });
});

router.post('/init', async (req, res) => {
  try {
    // C-2: Prevent re-initialization once system is already set up
    const already = db.prepare("SELECT value FROM settings WHERE key='initialized'").get();
    if (already) return res.status(403).json({ error: 'System already initialized' });

    const { org_name, timezone, currency, primary_domain, admin_name, admin_email, admin_username, admin_password } = req.body;

    if (!admin_username || !admin_password) return res.status(400).json({ error: 'Admin credentials required' });

    // Save org settings
    const saveSettings = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    saveSettings.run('org_name', org_name || 'My Organization');
    saveSettings.run('timezone', timezone || 'Asia/Kolkata');
    saveSettings.run('currency', currency || 'INR');
    saveSettings.run('primary_domain', primary_domain || '');

    // Create default groups
    const defaultGroups = [
      { name: 'System Administrator', description: 'Full system access', access_level: 'Full', color: '#1C3C6E' },
      { name: 'Vendor Manager', description: 'Full access to vendor management', access_level: 'Full', color: '#29ABE2' },
      { name: 'Procurement Team', description: 'Read and edit vendors', access_level: 'Edit', color: '#27AE60' },
      { name: 'Finance Team', description: 'Read vendors and contracts', access_level: 'Read', color: '#F39C12' },
      { name: 'Viewer', description: 'Read only access', access_level: 'Read', color: '#8E44AD' },
    ];

    const insertGroup = db.prepare("INSERT OR IGNORE INTO groups (name, description, access_level, color) VALUES (?, ?, ?, ?)");
    for (const g of defaultGroups) {
      insertGroup.run(g.name, g.description, g.access_level, g.color);
    }

    // Create admin user
    const adminGroup = db.prepare("SELECT id FROM groups WHERE name = 'System Administrator'").get();
    const hash = await bcrypt.hash(admin_password, 12);
    db.prepare(`
      INSERT INTO users (name, email, username, password_hash, group_id, status)
      VALUES (?, ?, ?, ?, ?, 'active')
      ON CONFLICT(username) DO UPDATE SET password_hash=excluded.password_hash
    `).run(admin_name || 'Administrator', admin_email || '', admin_username, hash, adminGroup ? adminGroup.id : 1);

    // Set up default permissions
    const modules = ['Vendor Directory', 'Vendor Details', 'Documents', 'Contracts', 'Performance', 'Users', 'Groups', 'Permissions', 'Backup', 'Dashboard'];
    const groups = db.prepare('SELECT id, access_level FROM groups').all();
    const insertPerm = db.prepare("INSERT OR IGNORE INTO permissions (group_id, module, access_level) VALUES (?, ?, ?)");
    for (const group of groups) {
      for (const module of modules) {
        insertPerm.run(group.id, module, group.access_level);
      }
    }

    // Mark as initialized
    saveSettings.run('initialized', 'true');

    res.json({ data: { success: true } });
  } catch (err) {
    console.error('[setup/init]', err);
    res.status(500).json({ error: 'Initialization failed' });
  }
});

module.exports = router;
