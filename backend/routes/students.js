const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');

router.get('/', async (req, res) => {
    try {
        const db = getDb();
        const { search, department, batch, sortBy = 'total_solved', sortDir = 'DESC', date } = req.query;

        let query = `
      SELECT 
        s.id,
        s.sno,
        s.reg_no,
        s.name,
        s.department,
        s.batch,
        s.leetcode_profile_url,
        s.leetcode_username,
        s.badges,
        s.top_language,
        s.language_stats,
        s.admin_tags,
        s.created_at,
        s.updated_at,
        COALESCE(s.is_banned, 0) as is_banned,
        COALESCE(ds.date, '') as stat_date,
        COALESCE(ds.total_solved, 0) as total_solved,
        COALESCE(ds.easy_solved, 0) as easy_solved,
        COALESCE(ds.medium_solved, 0) as medium_solved,
        COALESCE(ds.hard_solved, 0) as hard_solved,
        COALESCE(ds.yesterday_solved, 0) as yesterday_solved,
        COALESCE(ds.today_solved, 0) as today_solved,
        COALESCE(ds.contest_solved, 0) as contest_solved,
        COALESCE(ds.contest_total, 4) as contest_total,
        COALESCE(ds.acceptance_rate, 0) as acceptance_rate,
        COALESCE(ds.total_submissions, 0) as total_submissions,
        COALESCE(ds.contest_rating, 0) as contest_rating,
        COALESCE(ds.global_ranking, 0) as global_ranking,
        ds.fetched_at,
        ds.data_source
      FROM students s
      LEFT JOIN daily_stats ds ON s.id = ds.student_id 
        AND ds.date = ${date ? "'" + date + "'" : "(SELECT MAX(date) FROM daily_stats WHERE student_id = s.id)"}
    `;

        const conditions = [];
        const params = [];

        // Filter banned status
        if (req.query.banned === 'true') {
            conditions.push(`COALESCE(s.is_banned, 0) = 1`);
        } else if (req.query.banned !== 'all') {
            conditions.push(`COALESCE(s.is_banned, 0) = 0`);
        }

        if (search) {
            conditions.push(`(s.reg_no LIKE ? OR s.name LIKE ? OR s.leetcode_username LIKE ?)`);
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        let filterDept = department;
        if (!filterDept) {
            try {
                const setting = await db.get("SELECT value FROM app_settings WHERE key = 'default_department'");
                if (setting && setting.value) filterDept = setting.value;
            } catch (e) { console.error(e); }
        }

        if (filterDept && filterDept !== 'all') {
            conditions.push(`s.department = ?`);
            params.push(filterDept);
        }

        if (batch && batch !== 'all') {
            conditions.push(`s.batch = ?`);
            params.push(batch);
        }

        if (conditions.length > 0) {
            query += ` WHERE ` + conditions.join(' AND ');
        }

        const validSortFields = {
            'total_solved': 'ds.total_solved',
            'easy_solved': 'ds.easy_solved',
            'medium_solved': 'ds.medium_solved',
            'hard_solved': 'ds.hard_solved',
            'yesterday_solved': 'ds.yesterday_solved',
            'today_solved': 'ds.today_solved',
            'contest_solved': 'ds.contest_solved',
            'contest_rating': 'ds.contest_rating',
            'global_ranking': 'ds.global_ranking',
            'name': 's.name',
            'reg_no': 's.reg_no'
        };

        const sortField = validSortFields[sortBy] || 'ds.total_solved';
        const direction = sortDir === 'ASC' ? 'ASC' : 'DESC';

        if (sortBy === 'global_ranking') {
            query += ` ORDER BY CASE WHEN COALESCE(ds.global_ranking, 0) = 0 THEN 1 ELSE 0 END, ds.global_ranking ASC`;
        } else {
            query += ` ORDER BY COALESCE(${sortField}, 0) ${direction}, s.name ASC`;
        }

        const students = await db.all(query, params);

        const result = students.map((s, i) => ({ ...s, rank: i + 1 }));
        res.json({ success: true, students: result, total: result.length });
    } catch (error) {
        console.error('Get students error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/departments', async (req, res) => {
    try {
        const db = getDb();
        const result = await db.all('SELECT DISTINCT department FROM students WHERE department IS NOT NULL AND department != "" ORDER BY department');
        res.json({ success: true, departments: result.map(r => r.department) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const db = getDb();
        const { reg_no, name, department, batch, leetcode_profile_url } = req.body;

        if (!reg_no || !name) {
            return res.status(400).json({ success: false, message: 'Register Number and Name are required' });
        }

        const username = leetcode_profile_url ? (leetcode_profile_url.split('/u/')[1] || leetcode_profile_url.split('.com/')[1] || '').replace('/', '') : null;

        await db.run(`
            INSERT INTO students (sno, reg_no, name, department, batch, leetcode_profile_url, leetcode_username)
            VALUES ((SELECT COALESCE(MAX(sno), 0) + 1 FROM students), ?, ?, ?, ?, ?, ?)
        `, [reg_no, name, department || '', batch || null, leetcode_profile_url || '', username]);

        res.json({ success: true, message: 'Student created successfully' });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            res.status(400).json({ success: false, message: 'Register Number already exists' });
        } else {
            res.status(500).json({ success: false, message: error.message });
        }
    }
});

router.get('/:id', async (req, res) => {
    try {
        const db = getDb();
        const student = await db.get('SELECT * FROM students WHERE id = ?', [req.params.id]);

        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

        const history = await db.all(`
      SELECT * FROM daily_stats 
      WHERE student_id = ? 
      ORDER BY date DESC
      LIMIT 90
    `, [req.params.id]);

        const contests = await db.all(`
      SELECT * FROM contest_stats 
      WHERE student_id = ? 
      ORDER BY contest_date DESC
      LIMIT 20
    `, [req.params.id]);

        const latest = history[0] || null;

        res.json({ success: true, student, history, contests, latest });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/:id/manual', async (req, res) => {
    try {
        const db = getDb();
        const { total_solved, easy_solved, medium_solved, hard_solved, today_solved,
            contest_solved, contest_rating, global_ranking } = req.body;

        const student = await db.get('SELECT * FROM students WHERE id = ?', [req.params.id]);
        if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

        const today = new Date().toISOString().split('T')[0];

        await db.run(`
      INSERT INTO daily_stats (student_id, date, total_solved, easy_solved, medium_solved, hard_solved,
        today_solved, contest_solved, contest_rating, global_ranking, data_source, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', CURRENT_TIMESTAMP)
      ON CONFLICT(student_id, date) DO UPDATE SET
        total_solved = excluded.total_solved,
        easy_solved = excluded.easy_solved,
        medium_solved = excluded.medium_solved,
        hard_solved = excluded.hard_solved,
        today_solved = excluded.today_solved,
        contest_solved = excluded.contest_solved,
        contest_rating = excluded.contest_rating,
        global_ranking = excluded.global_ranking,
        data_source = 'manual',
        fetched_at = CURRENT_TIMESTAMP
    `, [
            req.params.id, today,
            total_solved || 0, easy_solved || 0, medium_solved || 0, hard_solved || 0,
            today_solved || 0, contest_solved || 0, contest_rating || 0, global_ranking || 0
        ]);

        res.json({ success: true, message: 'Student data updated manually' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/:id/ban', async (req, res) => {
    try {
        const db = getDb();
        const { is_banned } = req.body;

        await db.run('UPDATE students SET is_banned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [is_banned ? 1 : 0, req.params.id]);
        res.json({ success: true, message: `Student ${is_banned ? 'banned' : 'unbanned'} successfully` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/all', async (req, res) => {
    try {
        const db = getDb();
        await db.run('DELETE FROM daily_stats');
        await db.run('DELETE FROM contest_stats');
        await db.run('DELETE FROM fetch_errors');
        await db.run('DELETE FROM students');
        res.json({ success: true, message: 'All student data cleared.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const db = getDb();
        await db.run('DELETE FROM students WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Student deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.patch('/:id', async (req, res) => {
    try {
        const db = getDb();
        const { reg_no, name, department, batch, leetcode_profile_url, admin_tags } = req.body;

        const username = leetcode_profile_url ? (leetcode_profile_url.split('/u/')[1] || leetcode_profile_url.split('.com/')[1] || '').replace('/', '') : null;

        await db.run(`
      UPDATE students SET reg_no = ?, name = ?, department = ?, batch = ?, leetcode_profile_url = ?, leetcode_username = ?, admin_tags = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [reg_no, name, department, batch || null, leetcode_profile_url, username, admin_tags || null, req.params.id]);
        res.json({ success: true, message: 'Student updated successfully' });
    } catch (error) {
        if (error.message.includes('UNIQUE')) {
            res.status(400).json({ success: false, message: 'Register Number already exists' });
        } else {
            res.status(500).json({ success: false, message: error.message });
        }
    }
});

router.get('/sample/insert', async (req, res) => {
    try {
        const db = getDb();
        const samples = [
            { sno: 1, reg_no: 'SAMPLE001', name: 'Alice Johnson', department: 'CSE', url: 'https://leetcode.com/u/alice_lc' },
            { sno: 2, reg_no: 'SAMPLE002', name: 'Bob Martinez', department: 'AI&DS', url: 'https://leetcode.com/u/bob_codes' },
            { sno: 3, reg_no: 'SAMPLE003', name: 'Carol Williams', department: 'IT', url: 'https://leetcode.com/u/carol_dev' },
            { sno: 4, reg_no: 'SAMPLE004', name: 'David Brown', department: 'ECE', url: 'https://leetcode.com/u/david_b' },
            { sno: 5, reg_no: 'SAMPLE005', name: 'Eve Davis', department: 'CSE', url: 'https://leetcode.com/u/eve_codes' }
        ];

        const today = new Date().toISOString().split('T')[0];

        await db.run('BEGIN TRANSACTION');
        try {
            for (const s of samples) {
                await db.run(`
          INSERT OR IGNORE INTO students (sno, reg_no, name, department, leetcode_profile_url, leetcode_username)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [s.sno, s.reg_no, s.name, s.department, s.url, s.url.split('/u/')[1] || s.reg_no]);

                const student = await db.get('SELECT id FROM students WHERE reg_no = ?', [s.reg_no]);
                if (student) {
                    const total = Math.floor(Math.random() * 200) + 50;
                    const easy = Math.floor(total * 0.45);
                    const medium = Math.floor(total * 0.4);
                    const hard = total - easy - medium;
                    await db.run(`
            INSERT OR REPLACE INTO daily_stats 
              (student_id, date, total_solved, easy_solved, medium_solved, hard_solved, 
               yesterday_solved, today_solved, contest_solved, contest_total, contest_rating, global_ranking, data_source, language_stats, recent_submissions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sample', '[]', '[]')
          `, [
                        student.id, today, total, easy, medium, hard,
                        Math.floor(Math.random() * 5),
                        Math.floor(Math.random() * 8),
                        Math.floor(Math.random() * 4),
                        4,
                        Math.floor(Math.random() * 500) + 1200,
                        Math.floor(Math.random() * 100000) + 10000
                    ]);
                }
            }
            await db.run('COMMIT');
        } catch (err) {
            await db.run('ROLLBACK');
            throw err;
        }

        res.json({ success: true, message: 'Sample data inserted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/historic-stats/:id', async (req, res) => {
    try {
        const db = getDb();
        const historic = await db.all(`
            SELECT date, today_solved 
            FROM daily_stats 
            WHERE student_id = ? AND date >= date('now', '-365 days') 
            ORDER BY date ASC
        `, [req.params.id]);
        res.json({ success: true, data: historic });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
