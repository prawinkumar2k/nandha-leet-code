const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { importExcel } = require('../services/excelService');
const { getDb } = require('../database/db');
const { extractUsername } = require('../services/leetcodeService');
const refreshRouter = require('./refresh');
const XLSX = require('xlsx');

router.get('/template', (req, res) => {
    try {
        const wb = XLSX.utils.book_new();
        const wsData = [
            ['S.No', 'Reg Num', 'Name', 'Department', 'BATCH', 'leetcode_profile_url'],
            [1, '732224AI001', 'ABINESH T S', 'AIDS', '2028', 'https://leetcode.com/u/Abinesh45/'],
            [2, '732224CS002', 'JOHN DOE', 'CSE', '2028', 'https://leetcode.com/u/johndoe/']
        ];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, 'cons');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Disposition', 'attachment; filename="LEO_Student_Template.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

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
                const username = extractUsername(row.leetcode_profile_url);

                if (existingRegNos.has(row.reg_no)) {
                    // Update instead of skip so any new batch/department data is synced
                    await db.run(`
                      UPDATE students 
                      SET name = ?, department = ?, batch = ?, leetcode_profile_url = ?, leetcode_username = ?, updated_at = CURRENT_TIMESTAMP
                      WHERE reg_no = ?
                    `, [row.name, row.department, row.batch, row.leetcode_profile_url, username, row.reg_no]);
                    skippedStudents++; // Treat as skipped from "new" count, or you could add an updatedStudents counter
                    continue;
                }

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

// Allow CSV uploads too for fix-urls
const uploadAny = multer({
    dest: path.join(__dirname, '..', '..', 'data', 'uploads'),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.xlsx', '.xls', '.csv'].includes(ext)) cb(null, true);
        else cb(new Error('Only Excel or CSV files allowed'));
    }
});

// Bulk URL fix: upload the corrected Excel/CSV and update student URLs
router.post('/fix-urls', uploadAny.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    try {
        const XLSX = require('xlsx');
        const db = getDb();

        const wb = XLSX.readFile(req.file.path);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        // Cleanup temp file
        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);

        // Find header row — first row
        const header = rows[0]?.map(h => String(h).trim().toLowerCase()) || [];
        const regIdx = header.findIndex(h => h.includes('reg'));
        const correctIdx = header.findIndex(h => h.includes('correct'));

        if (regIdx === -1 || correctIdx === -1) {
            return res.status(400).json({ success: false, message: 'Could not find "Reg No" or "Correct URL" columns in the file.' });
        }

        let updated = 0, skipped = 0;
        const errors = [];

        await db.run('BEGIN TRANSACTION');
        try {
            for (let i = 1; i < rows.length; i++) {
                const reg_no = String(rows[i][regIdx] || '').trim();
                const newUrl = String(rows[i][correctIdx] || '').trim();

                if (!reg_no) continue; // blank row
                if (!newUrl) { skipped++; continue; } // user left Correct URL blank — skip

                const username = extractUsername(newUrl);
                if (!username) {
                    errors.push(`Row ${i + 1} (${reg_no}): cannot extract username from "${newUrl}"`);
                    skipped++;
                    continue;
                }

                const result = await db.run(
                    `UPDATE students SET leetcode_profile_url = ?, leetcode_username = ?, updated_at = CURRENT_TIMESTAMP WHERE reg_no = ?`,
                    [newUrl, username, reg_no]
                );

                if (result?.changes > 0) {
                    updated++;
                    // Instantly trigger a refresh for this student so they populate in the Students list
                    const studentRow = await db.get('SELECT id FROM students WHERE reg_no = ?', [reg_no]);
                    if (studentRow) {
                        await refreshRouter.processStudent(studentRow.id, newUrl, db);
                    }

                    // Clear resolved fetch errors for this student
                    await db.run(`DELETE FROM fetch_errors WHERE reg_no = ?`, [reg_no]);
                } else {
                    errors.push(`Row ${i + 1}: student with reg_no "${reg_no}" not found`);
                    skipped++;
                }
            }
            await db.run('COMMIT');
        } catch (err) {
            await db.run('ROLLBACK');
            throw err;
        }

        res.json({ success: true, updated, skipped, errors });
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
