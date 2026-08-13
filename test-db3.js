const { getDb, initDb } = require('./backend/database/db');
initDb().then(async () => {
    const db = getDb();
    const rows = await db.all("SELECT * FROM daily_stats JOIN students s ON s.id = daily_stats.student_id WHERE s.leetcode_profile_url LIKE '%Dharsini_2411%'");
    console.log('Dharsini:', rows);
});
