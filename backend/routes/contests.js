const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');

router.get('/', async (req, res) => {
    try {
        const db = getDb();
        const { student_id } = req.query;

        let query = `
      SELECT 
        cs.*,
        s.reg_no,
        s.name,
        s.department
      FROM contest_stats cs
      JOIN students s ON cs.student_id = s.id
    `;

        const params = [];
        if (student_id) {
            query += ' WHERE cs.student_id = ?';
            params.push(student_id);
        }

        query += ' ORDER BY cs.contest_date DESC, s.name ASC';

        const contests = await db.all(query, params);
        res.json({ success: true, data: contests });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/latest', async (req, res) => {
    try {
        const db = getDb();
        const axios = require('axios');

        // Fetch the absolute most recent globally completed contest from LeetCode
        const pastQuery = `query{ pastContests(pageNo: 1, numPerPage: 5) { data { title startTime } } }`;
        const response = await axios.post('https://leetcode.com/graphql', { query: pastQuery }, {
            headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
            timeout: 8000
        });

        const allPast = response.data?.data?.pastContests?.data || [];
        // weekly only or allow biweekly too? Let's just take the first one
        const realLatest = allPast[0];

        let targetContestName = realLatest?.title || null;
        let targetContestDate = realLatest?.startTime
            ? new Date(realLatest.startTime * 1000).toISOString().split('T')[0]
            : null;

        // Verify if LeetCode has actually published stats for this global latest contest yet
        if (targetContestName) {
            const hasData = await db.get(`SELECT 1 FROM contest_stats WHERE contest_name = ? LIMIT 1`, [targetContestName]);
            if (!hasData) {
                targetContestName = null; // Force fallback to latest published in our DB
            }
        }

        // Fallback to database if network fails or LeetCode hasn't published the stats to user profiles yet
        if (!targetContestName) {
            const dbLatest = await db.get(`
                SELECT contest_name, contest_date 
                FROM contest_stats WHERE contest_date IS NOT NULL 
                ORDER BY contest_date DESC LIMIT 1
            `);
            if (!dbLatest) return res.json({ success: true, data: null, summary: [] });
            targetContestName = dbLatest.contest_name;
            targetContestDate = dbLatest.contest_date;
        }

        const summary = await db.all(`
          SELECT 
            s.reg_no,
            s.name,
            s.department,
            cs.problems_solved,
            cs.contest_total,
            cs.contest_rating,
            cs.contest_ranking
          FROM students s
          LEFT JOIN contest_stats cs ON s.id = cs.student_id AND cs.contest_name = ?
          ORDER BY CASE WHEN cs.problems_solved IS NULL THEN 1 ELSE 0 END, cs.problems_solved DESC, cs.contest_rating DESC
        `, [targetContestName]);

        res.json({
            success: true,
            contest: { contest_name: targetContestName, contest_date: targetContestDate },
            data: summary
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/upcoming', async (req, res) => {
    try {
        const axios = require('axios');
        const query = `
        query upcomingContests {
          upcomingContests {
            title
            titleSlug
            startTime
            duration
          }
        }`;

        const response = await axios.post('https://leetcode.com/graphql', {
            query
        }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0',
                'Referer': 'https://leetcode.com'
            },
            timeout: 8000
        });

        const contests = response.data?.data?.upcomingContests || [];
        const upcoming = contests.map(c => ({
            title: c.title,
            slug: c.titleSlug,
            startTime: c.startTime * 1000, // convert to ms
            duration: c.duration,
            startTimeISO: new Date(c.startTime * 1000).toISOString()
        }));

        res.json({ success: true, contests: upcoming });
    } catch (error) {
        // Fallback: compute next Sunday 8 AM UTC manually
        const now = new Date();
        const nextSunday = new Date(now);
        const day = now.getUTCDay(); // 0=Sun
        const daysUntilSunday = day === 0 ? 7 : 7 - day;
        nextSunday.setUTCDate(now.getUTCDate() + daysUntilSunday);
        nextSunday.setUTCHours(2, 30, 0, 0); // 8 AM IST = 2:30 AM UTC

        const nextBiweekly = new Date(nextSunday);
        nextBiweekly.setUTCDate(nextBiweekly.getUTCDate() - 1); // Saturday
        nextBiweekly.setUTCHours(14, 30, 0, 0); // biweekly time

        res.json({
            success: true,
            fallback: true,
            contests: [
                { title: 'Weekly Contest', startTime: nextSunday.getTime(), startTimeISO: nextSunday.toISOString() }
            ]
        });
    }
});

module.exports = router;

