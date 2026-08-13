const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { importExcel } = require('../services/excelService');
const { getDb } = require('../database/db');
const { extractUsername } = require('../services/leetcodeService');

const upload = multer({
    dest: path.join(__dirname, '..', '..', 'data', 'uploads'),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.xlsx', '.xls'].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files are allowed'));
        }
    }
});

router.post('/excel', upload.single('excel'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
        const { validRows, invalidRows, totalRows, sheetName } = importExcel(req.file.path);

        const db = getDb();
        let newStudents = 0;
        let skippedStudents = 0; // already in DB — ignored
        let duplicates = 0;

        // Bulk-fetch all existing reg_nos for fast O(1) lookup
        const existingRows = await db.all('SELECT reg_no FROM students');
        const existingRegNos = new Set(existingRows.map(r => r.reg_no));

        await db.run('BEGIN TRANSACTION');

        try {
            for (const row of validRows) {
                // If already in DB → skip completely, no update
                if (existingRegNos.has(row.reg_no)) {
                    skippedStudents++;
                    continue;
                }

                const username = extractUsername(row.leetcode_profile_url);
                try {
                    await db.run(`
              INSERT INTO students (sno, reg_no, name, department, batch, leetcode_profile_url, leetcode_username, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [row.sno, row.reg_no, row.name, row.department, row.batch, row.leetcode_profile_url, username]);
                    newStudents++;
                } catch (e) {
                    if (e.message.includes('UNIQUE constraint failed')) {
                        skippedStudents++;
                    } else {
                        throw e;
                    }
                }
            }
            await db.run('COMMIT');
        } catch (err) {
            await db.run('ROLLBACK');
            throw err;
        }

        // Cleanup uploaded file
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            summary: {
                sheetName,
                totalRows,
                validRows: validRows.length,
                newStudents,
                skippedStudents,
                duplicates,
                invalidRows: invalidRows.length
            },
            invalidReport: invalidRows.slice(0, 100)
        });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        console.error('Import error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
