const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const axios = require('axios');

let cachedLatestContests = null;
let lastCacheTime = 0;

async function getGlobalLatestContests() {
    if (cachedLatestContests && (Date.now() - lastCacheTime < 3600000)) { // 1 hour cache
        return cachedLatestContests;
    }
    try {
        const response = await axios.post('https://leetcode.com/graphql', {
            query: `query { pastContests(pageNo: 1, numPerPage: 5) { data { title startTime } } }`
        }, { timeout: 8000 });
        const past = response.data?.data?.pastContests?.data || [];
        const weekly = past.find(c => c.title.includes('Weekly') && !c.title.includes('Biweekly'));
        const biweekly = past.find(c => c.title.includes('Biweekly'));
        
        cachedLatestContests = {
            weekly: weekly ? { contest_name: weekly.title, contest_date: new Date(weekly.startTime * 1000).toISOString().split('T')[0] } : null,
            biweekly: biweekly ? { contest_name: biweekly.title, contest_date: new Date(biweekly.startTime * 1000).toISOString().split('T')[0] } : null
        };
        lastCacheTime = Date.now();
        return cachedLatestContests;
    } catch (e) {
        return null;
    }
}

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
        const { date, batch } = req.query;
        let dateCondition = '';
        let queryParams = [];

        if (date) {
            dateCondition = 'AND date(contest_date) <= date(?)';
            queryParams.push(date);
        }

        // Get latest Weekly Contest
        const dbLatestWeekly = await db.get(`
            SELECT contest_name, contest_date 
            FROM contest_stats 
            WHERE contest_date IS NOT NULL 
              AND contest_name LIKE '%Weekly%' 
              AND contest_name NOT LIKE '%Biweekly%'
              ${dateCondition}
            ORDER BY contest_date DESC LIMIT 1
        `, queryParams);

        // Get latest Biweekly Contest
        const dbLatestBiweekly = await db.get(`
            SELECT contest_name, contest_date 
            FROM contest_stats 
            WHERE contest_date IS NOT NULL 
              AND contest_name LIKE '%Biweekly%'
              ${dateCondition}
            ORDER BY contest_date DESC LIMIT 1
        `, queryParams);

        // Function to fetch summary for a contest
        const getSummary = async (contestName) => {
            if (!contestName) return [];
            
            const params = [contestName];
            if (batch) params.push(batch);

            return await db.all(`
              SELECT 
                s.reg_no,
                s.name,
                s.department,
                s.batch,
                cs.problems_solved,
                cs.contest_total,
                cs.contest_rating,
                cs.contest_ranking
              FROM students s
              LEFT JOIN contest_stats cs ON s.id = cs.student_id AND cs.contest_name = ?
              WHERE COALESCE(s.is_banned, 0) = 0
              ${batch ? 'AND s.batch = ?' : ''}
              ORDER BY CASE WHEN cs.problems_solved IS NULL THEN 1 ELSE 0 END, cs.problems_solved DESC, cs.contest_rating DESC
            `, params);
        };

        let globalLatest = await getGlobalLatestContests();

        let resolvedWeekly = dbLatestWeekly;
        if (globalLatest && globalLatest.weekly) {
            if (!date || new Date(globalLatest.weekly.contest_date) <= new Date(date)) {
                resolvedWeekly = globalLatest.weekly;
            }
        }

        let resolvedBiweekly = dbLatestBiweekly;
        if (globalLatest && globalLatest.biweekly) {
            if (!date || new Date(globalLatest.biweekly.contest_date) <= new Date(date)) {
                resolvedBiweekly = globalLatest.biweekly;
            }
        }

        const weeklySummary = resolvedWeekly ? await getSummary(resolvedWeekly.contest_name) : [];
        const biweeklySummary = resolvedBiweekly ? await getSummary(resolvedBiweekly.contest_name) : [];

        res.json({
            success: true,
            weekly: {
                contest: resolvedWeekly,
                data: weeklySummary
            },
            biweekly: {
                contest: resolvedBiweekly,
                data: biweeklySummary
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/upcoming', async (req, res) => {
    try {
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
                { title: 'Weekly Contest', startTime: nextSunday.getTime(), startTimeISO: nextSunday.toISOString() },
                { title: 'Biweekly Contest', startTime: nextBiweekly.getTime(), startTimeISO: nextBiweekly.toISOString() }
            ]
        });
    }
});

module.exports = router;

