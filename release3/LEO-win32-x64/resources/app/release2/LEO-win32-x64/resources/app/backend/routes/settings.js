const express = require('express');
const router = express.Router();
const { getDb, getDbPath } = require('../database/db');
const fs = require('fs');
const path = require('path');

router.get('/', async (req, res) => {
    try {
        const db = getDb();
        const settings = await db.all('SELECT key, value FROM app_settings');
        const result = {};
        settings.forEach(s => result[s.key] = s.value);

        res.json({
            success: true,
            settings: result,
            dbPath: getDbPath()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/', async (req, res) => {
    try {
        const db = getDb();
        const { settings } = req.body;

        await db.run('BEGIN TRANSACTION');
        try {
            for (const [key, value] of Object.entries(settings)) {
                await db.run(`
          INSERT INTO app_settings (key, value, updated_at) 
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `, [key, String(value)]);
            }
            await db.run('COMMIT');
        } catch (err) {
            await db.run('ROLLBACK');
            throw err;
        }

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/backup', (req, res) => {
    try {
        const dbPath = getDbPath();
        const today = new Date().toISOString().split('T')[0];
        const backupDir = path.join(path.dirname(dbPath), 'backups');

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const backupPath = path.join(backupDir, `leetcode_backup_${today}.db`);
        fs.copyFileSync(dbPath, backupPath);

        res.json({
            success: true,
            message: `Database backed up successfully`,
            backupPath,
            filename: `leetcode_backup_${today}.db`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/backups', (req, res) => {
    try {
        const dbPath = getDbPath();
        const backupDir = path.join(path.dirname(dbPath), 'backups');

        if (!fs.existsSync(backupDir)) {
            return res.json({ success: true, backups: [] });
        }

        const files = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.db'))
            .map(f => ({
                filename: f,
                path: path.join(backupDir, f),
                size: fs.statSync(path.join(backupDir, f)).size,
                created: fs.statSync(path.join(backupDir, f)).mtime
            }))
            .sort((a, b) => b.created - a.created);

        res.json({ success: true, backups: files });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
