const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { getDashboardSummary, getDepartmentStats, getDailyReport, getTopStudents, getLowActivityStudents, getDailyChartData, generateExcelReport } = require('../services/reportService');
const { exportToCsv } = require('../services/excelService');

router.get('/dashboard', async (req, res) => {
    try {
        const { date, batch } = req.query;
        const summary = await getDashboardSummary(date, batch);
        res.json({ success: true, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/departments', async (req, res) => {
    try {
        const { batch } = req.query;
        const stats = await getDepartmentStats(batch);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/top-students', async (req, res) => {
    try {
        const { limit = 10, batch } = req.query;
        const students = await getTopStudents(parseInt(limit), batch);
        res.json({ success: true, data: students });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/low-activity', async (req, res) => {
    try {
        const db = getDb();
        let dbThreshold = 0;
        try {
            const setting = await db.get("SELECT value FROM app_settings WHERE key = 'low_activity_threshold'");
            if (setting && setting.value) dbThreshold = parseInt(setting.value, 10);
        } catch (e) {
            console.error(e);
        }

        let threshold = parseInt(req.query.threshold, 10);
        if (isNaN(threshold) || req.query.threshold === '0') {
            threshold = dbThreshold || 0; // Use DB setting if query is 0 or missing
        }
        
        const { batch } = req.query;

        const students = await getLowActivityStudents(threshold, batch);
        res.json({ success: true, data: students });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/chart-data', async (req, res) => {
    try {
        const { days = 7, batch } = req.query;
        const data = await getDailyChartData(parseInt(days), batch);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/daily-report', async (req, res) => {
    try {
        const { date, batch } = req.query;
        const data = await getDailyReport(date, batch);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/available-dates', async (req, res) => {
    try {
        const db = getDb();
        const dateResult = await db.all('SELECT DISTINCT date FROM daily_stats ORDER BY date DESC LIMIT 90');
        const batchResult = await db.all('SELECT DISTINCT batch FROM students WHERE batch IS NOT NULL AND batch != "" ORDER BY batch DESC');
        
        res.json({ 
            success: true, 
            dates: dateResult.map(r => r.date),
            batches: batchResult.map(r => r.batch)
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/export/excel', async (req, res) => {
    try {
        const { type = 'daily', date, batch } = req.query;
        const { buffer, filename } = await generateExcelReport(type, date, batch);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/export/csv', async (req, res) => {
    try {
        const { date } = req.query;
        const data = await getDailyReport(date);
        const csv = exportToCsv(data);
        const filename = `LeetCode_Report_${date || new Date().toISOString().split('T')[0]}.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/fetch-errors', async (req, res) => {
    try {
        const db = getDb();
        // Deduplicate: return only the latest error per student (reg_no)
        const errors = await db.all(`
            SELECT fe.*
            FROM fetch_errors fe
            INNER JOIN (
                SELECT reg_no, MAX(error_at) AS latest_at
                FROM fetch_errors
                GROUP BY reg_no
            ) latest ON fe.reg_no = latest.reg_no AND fe.error_at = latest.latest_at
            ORDER BY fe.error_at DESC
            LIMIT 200
        `);
        res.json({ success: true, data: errors });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/fetch-errors', async (req, res) => {
    try {
        const db = getDb();
        await db.run('DELETE FROM fetch_errors');
        res.json({ success: true, message: 'All fetch errors cleared' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


// Export fetch errors as an editable Excel — user fills "Correct URL" column and re-uploads
router.get('/export-errors-excel', async (req, res) => {
    try {
        const db = getDb();
        const XLSX = require('xlsx');

        // Latest error per student
        const errors = await db.all(`
            SELECT fe.*
            FROM fetch_errors fe
            INNER JOIN (
                SELECT reg_no, MAX(error_at) AS latest_at
                FROM fetch_errors GROUP BY reg_no
            ) latest ON fe.reg_no = latest.reg_no AND fe.error_at = latest.latest_at
            ORDER BY fe.error_at DESC
        `);

        const header = ['Reg No', 'Name', 'Current URL (Broken)', 'Correct URL (Fill This)', 'Error Reason'];
        const rows = errors.map(e => [
            e.reg_no,
            e.student_name,
            e.profile_url || '',
            '', // user fills this
            e.error_reason || ''
        ]);

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

        // Column widths
        ws['!cols'] = [{ wch: 18 }, { wch: 22 }, { wch: 40 }, { wch: 40 }, { wch: 50 }];

        XLSX.utils.book_append_sheet(wb, ws, 'Fetch Errors');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="LEO_URL_Fix.xlsx"');
        res.send(buffer);
    } catch (error) {
        console.error('Export Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Department-wise detailed Excel export — one sheet per dept + one "All Departments" sheet
router.get('/export/department', async (req, res) => {
    try {
        const db = getDb();
        const XLSX = require('xlsx');
        const { department } = req.query; // optional: filter to single dept

        // Fetch all students with their latest stats
        const students = await db.all(`
            SELECT 
                s.reg_no, s.name, s.department, s.batch,
                s.leetcode_profile_url, s.leetcode_username,
                ds.total_solved, ds.easy_solved, ds.medium_solved, ds.hard_solved,
                ds.today_solved, ds.yesterday_solved,
                ds.contest_rating, ds.global_ranking,
                ds.contest_solved, ds.contest_total,
                ds.date AS last_updated
            FROM students s
            LEFT JOIN daily_stats ds ON ds.student_id = s.id
                AND ds.date = (SELECT MAX(date) FROM daily_stats WHERE student_id = s.id)
            WHERE s.is_banned = 0
            ${department ? 'AND s.department = ?' : ''}
            ORDER BY s.department, s.reg_no
        `, department ? [department] : []);

        const wb = XLSX.utils.book_new();
        const today = new Date().toISOString().split('T')[0];

        const HEADER = [
            'S.No', 'Reg No', 'Name', 'Department', 'Batch',
            'LeetCode Profile URL', 'LeetCode Username',
            'Total Solved', 'Easy', 'Medium', 'Hard',
            'Today Solved', 'Yesterday Solved',
            'Contest Rating', 'Global Ranking',
            'Contest Solved', 'Contest Total',
            'Last Updated'
        ];

        function buildRows(list) {
            return list.map((s, i) => [
                i + 1,
                s.reg_no || '',
                s.name || '',
                s.department || '',
                s.batch || '',
                s.leetcode_profile_url || '',
                s.leetcode_username || '',
                s.total_solved || 0,
                s.easy_solved || 0,
                s.medium_solved || 0,
                s.hard_solved || 0,
                s.today_solved || 0,
                s.yesterday_solved || 0,
                s.contest_rating || 0,
                s.global_ranking || 0,
                s.contest_solved || 0,
                s.contest_total || 0,
                s.last_updated || ''
            ]);
        }

        function styleSheet(ws, rowCount) {
            ws['!cols'] = [
                { wch: 5 }, { wch: 16 }, { wch: 24 }, { wch: 12 }, { wch: 8 },
                { wch: 40 }, { wch: 22 },
                { wch: 12 }, { wch: 7 }, { wch: 9 }, { wch: 7 },
                { wch: 12 }, { wch: 15 },
                { wch: 14 }, { wch: 14 },
                { wch: 14 }, { wch: 13 },
                { wch: 14 }
            ];
            return ws;
        }

        // "All Departments" sheet
        const allRows = buildRows(students);
        const wsAll = XLSX.utils.aoa_to_sheet([HEADER, ...allRows]);
        styleSheet(wsAll);
        XLSX.utils.book_append_sheet(wb, wsAll, 'All Departments');

        // One sheet per department
        const depts = [...new Set(students.map(s => s.department).filter(Boolean))];
        for (const dept of depts) {
            const deptStudents = students.filter(s => s.department === dept);
            const rows = buildRows(deptStudents);
            const ws = XLSX.utils.aoa_to_sheet([HEADER, ...rows]);
            styleSheet(ws);
            // Sheet name max 31 chars
            const sheetName = dept.substring(0, 31);
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        }

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const filename = department
            ? `LEO_${department}_Report_${today}.xlsx`
            : `LEO_All_Departments_Report_${today}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    } catch (error) {
        console.error('Dept Export Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// -------------- Feature 6: Contest Interval Tracking --------------


router.get('/contest-intervals/list', async (req, res) => {
    try {
        const db = getDb();
        const contests = await db.all(`
            SELECT DISTINCT contest_name, MAX(contest_date) as date 
            FROM contest_stats 
            WHERE contest_name IS NOT NULL AND contest_name != 'Unknown'
            GROUP BY contest_name 
            ORDER BY date DESC
        `);
        res.json({ success: true, data: contests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/contest-intervals/report', async (req, res) => {
    try {
        const db = getDb();
        const { contestName } = req.query;
        if (!contestName) return res.status(400).json({ success: false, message: 'contestName required' });

        // Get all students who participated or at least are in the system and we know about their stats.
        // We will just do a sweeping check. Let's find the `contest_date` first.
        const contestInfo = await db.get(`SELECT MAX(contest_date) as cdate FROM contest_stats WHERE contest_name = ?`, [contestName]);
        if (!contestInfo || !contestInfo.cdate) return res.json({ success: true, data: [] });

        const endDateStr = contestInfo.cdate;
        const eDate = new Date(endDateStr);
        eDate.setDate(eDate.getDate() - 7);
        const startDateStr = eDate.toISOString().split('T')[0];

        // 1. Get End Totals <= endDateStr
        const endStats = await db.all(`SELECT student_id, MAX(total_solved) as total FROM daily_stats WHERE date <= ? GROUP BY student_id`, [endDateStr]);
        const endMap = {}; endStats.forEach(r => endMap[r.student_id] = r.total);

        // 2. Get Start Totals <= startDateStr
        const startStats = await db.all(`SELECT student_id, MAX(total_solved) as total FROM daily_stats WHERE date <= ? GROUP BY student_id`, [startDateStr]);
        const startMap = {}; startStats.forEach(r => startMap[r.student_id] = r.total);

        // 3. Get Contest Stats (how many they solved IN the contest)
        const cStats = await db.all(`SELECT student_id, problems_solved FROM contest_stats WHERE contest_name = ?`, [contestName]);
        const cMap = {}; cStats.forEach(r => cMap[r.student_id] = r.problems_solved);

        // Combine
        const students = await db.all(`SELECT id as student_id, reg_no, name, department, batch FROM students`);

        const report = students.map(s => {
            const startT = startMap[s.student_id] || 0;
            const endT = endMap[s.student_id] || 0;
            const solvedInGap = Math.max(0, endT - startT);
            const solvedInContest = cMap[s.student_id] || 0;

            return {
                student_id: s.student_id,
                reg_no: s.reg_no,
                name: s.name,
                department: s.department,
                batch: s.batch,
                gap_start: startDateStr,
                gap_end: endDateStr,
                solved_in_gap: solvedInGap,
                solved_in_contest: solvedInContest,
                participated: cMap.hasOwnProperty(s.student_id)
            };
        });

        // Sort by highest gap solved first
        report.sort((a, b) => b.solved_in_gap - a.solved_in_gap);

        res.json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
