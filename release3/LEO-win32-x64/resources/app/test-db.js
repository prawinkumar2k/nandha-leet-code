const { getDb, initDb } = require('./backend/database/db');
initDb().then(async () => {
    const db = getDb();
    const d = await db.all("SELECT s.name, s.leetcode_profile_url, ds.* FROM daily_stats ds JOIN students s ON s.id = ds.student_id WHERE s.leetcode_profile_url LIKE '%Dharsini_2411%' ORDER BY ds.date ASC");
    console.log(d);
    process.exit(0);
});
