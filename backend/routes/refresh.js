const express = require('express');
const router = express.Router();
const { fetchStudentData, sleep } = require('../services/leetcodeService');
const { getDb } = require('../database/db');

let refreshState = {
    isRunning: false,
    total: 0,
    current: 0,
    successful: 0,
    failed: 0,
    errors: [],
    startTime: null,
    endTime: null,
    currentStudent: null
};

function getToday() {
    return new Date().toISOString().split('T')[0];
}

function getYesterdayDate() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}

async function processStudent(studentId, profileUrl, db) {
    const today = getToday();
    const yesterday = getYesterdayDate();

    try {
        const data = await fetchStudentData(profileUrl);

        const existingToday = await db.get(
            `SELECT total_solved, today_solved FROM daily_stats WHERE student_id = ? AND date = ?`,
            [studentId, today]
        );

        const prevStats = await db.get(
            `SELECT total_solved, date FROM daily_stats WHERE student_id = ? AND date < ? ORDER BY date DESC LIMIT 1`,
            [studentId, today]
        );

        let todaySolved = 0;
        let yesterdaySolved = 0;

        if (prevStats) {
            // Normal daily differential past the first day
            todaySolved = Math.max(0, data.total_solved - prevStats.total_solved);

            // Audit Log: Data Shrink (Total solved dropped)
            if (data.total_solved < prevStats.total_solved) {
                await db.run(
                    `INSERT INTO audit_logs (student_id, type, details) VALUES (?, ?, ?)`,
                    [studentId, 'SHRINK', `Total solved decreased from ${prevStats.total_solved} to ${data.total_solved}`]
                );
            }

            // Audit Log: Massive Spike (Cheating suspicion)
            if (todaySolved >= 30) {
                await db.run(
                    `INSERT INTO audit_logs (student_id, type, details) VALUES (?, ?, ?)`,
                    [studentId, 'SPIKE', `Abnormal spike detected: ${todaySolved} problems solved in a single day`]
                );
            }

            // Check yesterday
            const yesterdayStats = await db.get(
                `SELECT today_solved FROM daily_stats WHERE student_id = ? AND date = ?`,
                [studentId, yesterday]
            );
            yesterdaySolved = yesterdayStats ? (yesterdayStats.today_solved || 0) : 0;

        } else {
            // Absolute first tracking day (no previous day stats)
            todaySolved = data.recent_today || 0;
            yesterdaySolved = data.recent_yesterday || 0;
        }

        // Audit Log: Global Ranking dropped to 0 (Potential LeetCode Ban)
        if (data.global_ranking === 0 && prevStats) {
            const prevRank = await db.get(`SELECT global_ranking FROM daily_stats WHERE student_id = ? AND global_ranking > 0 ORDER BY date DESC LIMIT 1`, [studentId]);
            if (prevRank && prevRank.global_ranking > 0) {
                await db.run(
                    `INSERT INTO audit_logs (student_id, type, details) VALUES (?, ?, ?)`,
                    [studentId, 'BANNED', `Global ranking vanished (was ${prevRank.global_ranking}). Account might be banned by LeetCode.`]
                );
            }
        }

        // Upsert daily stats
        await db.run(`
      INSERT INTO daily_stats 
        (student_id, date, total_solved, easy_solved, medium_solved, hard_solved,
         yesterday_solved, today_solved, contest_solved, contest_total, 
         contest_rating, global_ranking, data_source, fetched_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'automatic', CURRENT_TIMESTAMP)
      ON CONFLICT(student_id, date) DO UPDATE SET
        total_solved = excluded.total_solved,
        easy_solved = excluded.easy_solved,
        medium_solved = excluded.medium_solved,
        hard_solved = excluded.hard_solved,
        today_solved = excluded.today_solved,
        yesterday_solved = excluded.yesterday_solved,
        contest_solved = excluded.contest_solved,
        contest_total = excluded.contest_total,
        contest_rating = excluded.contest_rating,
        global_ranking = excluded.global_ranking,
        data_source = 'automatic',
        fetched_at = CURRENT_TIMESTAMP
    `, [
            studentId, today,
            data.total_solved, data.easy_solved, data.medium_solved, data.hard_solved,
            yesterdaySolved, todaySolved,
            data.contest_solved, data.contest_total,
            data.contest_rating, data.global_ranking
        ]);

        // Update contest stats if we have contest data
        if (data.latest_contest && data.latest_contest.name !== 'N/A') {
            await db.run(`
        INSERT INTO contest_stats 
          (student_id, contest_date, contest_name, problems_solved, contest_total, 
           contest_rating, global_ranking, fetched_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(student_id, contest_name) DO UPDATE SET
          problems_solved = excluded.problems_solved,
          contest_rating = excluded.contest_rating,
          global_ranking = excluded.global_ranking,
          fetched_at = CURRENT_TIMESTAMP
      `, [
                studentId,
                data.latest_contest.date,
                data.latest_contest.name,
                data.latest_contest.solved,
                data.latest_contest.total,
                data.contest_rating,
                data.global_ranking
            ]);
        }

        // Update the student's leetcode username and language stats
        if (data.username || data.language_stats) {
            await db.run(
                `UPDATE students SET leetcode_username = coalesce(?, leetcode_username), language_stats = coalesce(?, language_stats), updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [data.username || null, data.language_stats || null, studentId]
            );
        }

        return { success: true };
    } catch (error) {
        console.error("DEBUG Refresh Error:", error);
        return { success: false, error: error.message };
    }
}

router.processStudent = processStudent;

router.get('/status', (req, res) => {
    const elapsed = refreshState.startTime
        ? Math.round((Date.now() - refreshState.startTime) / 1000)
        : 0;

    res.json({
        ...refreshState,
        elapsed,
        percentage: refreshState.total > 0
            ? Math.round((refreshState.current / refreshState.total) * 100)
            : 0
    });
});

router.post('/all', async (req, res) => {
    if (refreshState.isRunning) {
        return res.json({
            success: true,
            message: 'Refresh already in progress, attaching to existing session',
            total: refreshState.total
        });
    }

    const db = getDb();
    const students = await db.all('SELECT id, reg_no, name, leetcode_profile_url FROM students WHERE leetcode_profile_url IS NOT NULL');

    if (students.length === 0) {
        return res.json({ success: false, message: 'No students found. Please import Excel first.' });
    }

    refreshState = {
        isRunning: true,
        total: students.length,
        current: 0,
        successful: 0,
        failed: 0,
        errors: [],
        startTime: Date.now(),
        endTime: null,
        currentStudent: null
    };

    res.json({ success: true, message: `Starting refresh for ${students.length} students`, total: students.length });

    (async () => {
        // Fetch dynamic settings from DB
        let concurrencySetting = 3;
        let delaySetting = 2500;
        try {
            const settingsRows = await db.all('SELECT key, value FROM app_settings');
            const settingsMap = {};
            settingsRows.forEach(row => settingsMap[row.key] = row.value);
            
            if (settingsMap['refresh_concurrency']) {
                concurrencySetting = parseInt(settingsMap['refresh_concurrency'], 10) || 3;
            }
            if (settingsMap['refresh_delay_ms']) {
                delaySetting = parseInt(settingsMap['refresh_delay_ms'], 10) || 2500;
            }
        } catch (err) {
            console.error("Failed to load settings for refresh, using defaults.");
        }

        const CONCURRENCY = concurrencySetting;
        const DELAY_BETWEEN_REQUESTS = delaySetting;

        for (let i = 0; i < students.length; i += CONCURRENCY) {
            if (!refreshState.isRunning) break;

            const batch = students.slice(i, i + CONCURRENCY);

            const batchPromises = batch.map(async (student) => {
                refreshState.currentStudent = `${student.reg_no} - ${student.name}`;

                const result = await processStudent(student.id, student.leetcode_profile_url, db);
                refreshState.current++;

                if (result.success) {
                    refreshState.successful++;
                } else {
                    refreshState.failed++;
                    refreshState.errors.push({
                        reg_no: student.reg_no,
                        name: student.name,
                        url: student.leetcode_profile_url,
                        error: result.error,
                        at: new Date().toISOString()
                    });

                    // Remove any previous error for this student today before inserting a fresh one
                    await db.run(`DELETE FROM fetch_errors WHERE reg_no = ? AND DATE(error_at) = DATE('now', 'localtime')`, [student.reg_no]);
                    await db.run(`
            INSERT INTO fetch_errors (reg_no, student_name, profile_url, error_reason)
            VALUES (?, ?, ?, ?)
          `, [student.reg_no, student.name, student.leetcode_profile_url, result.error]);
                }
            });

            await Promise.all(batchPromises);

            if (i + CONCURRENCY < students.length) {
                await sleep(DELAY_BETWEEN_REQUESTS);
            }
        }

        refreshState.isRunning = false;
        refreshState.endTime = Date.now();
        const duration = Math.round((refreshState.endTime - refreshState.startTime) / 1000);
        console.log(`Refresh complete: ${refreshState.successful} success, ${refreshState.failed} failed in ${duration}s`);
    })();
});

router.post('/student/:id', async (req, res) => {
    const db = getDb();
    const student = await db.get('SELECT * FROM students WHERE id = ?', [req.params.id]);

    if (!student) {
        return res.status(404).json({ success: false, message: 'Student not found' });
    }

    if (!student.leetcode_profile_url) {
        return res.status(400).json({ success: false, message: 'Student has no LeetCode profile URL' });
    }

    try {
        const result = await processStudent(student.id, student.leetcode_profile_url, db);

        if (result.success) {
            const updatedStats = await db.get(
                'SELECT * FROM daily_stats WHERE student_id = ? ORDER BY date DESC LIMIT 1',
                [student.id]
            );

            res.json({ success: true, message: 'Student data refreshed', stats: updatedStats });
        } else {
            res.status(500).json({ success: false, message: result.error });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/verify/:id', async (req, res) => {
    const db = getDb();
    const student = await db.get('SELECT * FROM students WHERE id = ?', [req.params.id]);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (!student.leetcode_profile_url) return res.status(400).json({ success: false, message: 'No LeetCode URL set' });

    try {
        const live = await fetchStudentData(student.leetcode_profile_url);
        const stored = await db.get(
            'SELECT * FROM daily_stats WHERE student_id = ? ORDER BY date DESC LIMIT 1',
            [student.id]
        );
        res.json({ success: true, live, stored: stored || null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/stop', (req, res) => {
    if (refreshState.isRunning) {
        refreshState.isRunning = false;
        refreshState.endTime = Date.now();
    }
    res.json({ success: true, message: 'Refresh stopped' });
});

module.exports = router;
