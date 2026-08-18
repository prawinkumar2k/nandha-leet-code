const { getDb, initDb } = require('./backend/database/db');
initDb().then(async () => {
    const db = getDb();
    const d = await db.all("SELECT date, total_solved, today_solved FROM daily_stats WHERE student_id = 1889 ORDER BY date ASC");
    console.log('ALL ROWS FOR DHARSINI:', d);
    process.exit(0);
});
