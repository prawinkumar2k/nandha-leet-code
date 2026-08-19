const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');

router.get('/', async (req, res) => {
    try {
        const db = getDb();
        const logs = await db.all(`
            SELECT a.id, a.type, a.details, a.timestamp, s.reg_no, s.name, s.department 
            FROM audit_logs a 
            JOIN students s ON a.student_id = s.id 
            ORDER BY a.timestamp DESC 
            LIMIT 100
        `);
        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const db = getDb();
        await db.run('DELETE FROM audit_logs WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/', async (req, res) => {
    try {
        const db = getDb();
        await db.run('DELETE FROM audit_logs');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
