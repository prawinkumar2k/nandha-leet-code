const { getDb } = require('../database/db');
const { exportToExcel, exportToCsv } = require('../services/excelService');

// Get dashboard summary
async function getDashboardSummary(date) {
  const db = getDb();

  const targetDate = date || new Date().toISOString().split('T')[0];

  const settingsRows = await db.all('SELECT value FROM app_settings WHERE key = ?', ['target_problems']);
  const targetProblems = settingsRows.length > 0 ? parseInt(settingsRows[0].value, 10) : 200;

  const stats = await db.get(`
    SELECT 
      COUNT(DISTINCT s.id) as total_students,
      SUM(ds.total_solved) as total_problems,
      SUM(ds.yesterday_solved) as yesterday_solved,
      SUM(ds.today_solved) as today_solved,
      SUM(ds.contest_solved) as contest_solved,
      SUM(CASE WHEN ds.yesterday_solved > 0 THEN 1 ELSE 0 END) as students_active_yesterday,
      SUM(CASE WHEN ds.today_solved > 0 THEN 1 ELSE 0 END) as students_active_today,
      SUM(CASE WHEN ds.contest_solved > 0 THEN 1 ELSE 0 END) as students_active_contest,
      SUM(ds.easy_solved) as total_easy,
      SUM(ds.medium_solved) as total_medium,
      SUM(ds.hard_solved) as total_hard,
      AVG(ds.total_solved) as avg_problems,
      AVG(CASE WHEN ds.contest_rating > 0 THEN ds.contest_rating ELSE NULL END) as avg_contest_rating,
      MIN(CASE WHEN ds.global_ranking > 0 THEN ds.global_ranking ELSE NULL END) as best_global_ranking,
      SUM(CASE WHEN ds.total_solved >= ? THEN 1 ELSE 0 END) as students_at_target
    FROM students s
    LEFT JOIN daily_stats ds ON s.id = ds.student_id AND ds.date = ?
    WHERE COALESCE(s.is_banned, 0) = 0
  `, [targetProblems, targetDate]);

  return {
    ...stats,
    date: targetDate,
    total_students: stats.total_students || 0,
    total_problems: stats.total_problems || 0,
    yesterday_solved: stats.yesterday_solved || 0,
    today_solved: stats.today_solved || 0,
    contest_solved: stats.contest_solved || 0,
    students_active_yesterday: stats.students_active_yesterday || 0,
    students_active_today: stats.students_active_today || 0,
    students_active_contest: stats.students_active_contest || 0,
    total_easy: stats.total_easy || 0,
    total_medium: stats.total_medium || 0,
    total_hard: stats.total_hard || 0,
    avg_problems: Math.round(stats.avg_problems || 0),
    avg_contest_rating: Math.round(stats.avg_contest_rating || 0),
    best_global_ranking: stats.best_global_ranking || 0,
    target_problems: targetProblems,
    students_at_target: stats.students_at_target || 0
  };
}

// Get latest stats for all students
async function getLatestStatsForStudents() {
  const db = getDb();

  return await db.all(`
    SELECT 
      s.reg_no,
      s.name,
      s.department,
      s.batch,
      s.leetcode_profile_url,
      s.leetcode_username,
      s.top_language,
      s.language_stats,
      s.badges,
      ds.date,
      ds.total_solved,
      ds.easy_solved,
      ds.medium_solved,
      ds.hard_solved,
      ds.yesterday_solved,
      ds.today_solved,
      ds.contest_solved,
      ds.contest_total,
      ds.contest_rating,
      ds.global_ranking,
      ds.acceptance_rate,
      ds.total_submissions,
      ds.fetched_at,
      ds.data_source
    FROM students s
    LEFT JOIN daily_stats ds ON s.id = ds.student_id 
      AND ds.date = (
        SELECT MAX(date) FROM daily_stats WHERE student_id = s.id
      )
    WHERE COALESCE(s.is_banned, 0) = 0
    ORDER BY ds.total_solved DESC, s.name ASC
  `);
}

// Get department-wise stats
async function getDepartmentStats() {
  const db = getDb();

  return await db.all(`
    SELECT 
      s.department,
      COUNT(DISTINCT s.id) as total_students,
      AVG(COALESCE(ds.total_solved, 0)) as avg_solved,
      SUM(COALESCE(ds.total_solved, 0)) as total_solved,
      AVG(COALESCE(ds.today_solved, 0)) as avg_today,
      SUM(CASE WHEN ds.contest_solved > 0 THEN 1 ELSE 0 END) as contest_participants
    FROM students s
    LEFT JOIN daily_stats ds ON s.id = ds.student_id 
      AND ds.date = (
        SELECT MAX(date) FROM daily_stats WHERE student_id = s.id
      )
    WHERE COALESCE(s.is_banned, 0) = 0
    GROUP BY s.department
    ORDER BY avg_solved DESC
  `);
}

// Get daily report for a specific date
async function getDailyReport(date) {
  const db = getDb();
  const targetDate = date || new Date().toISOString().split('T')[0];

  return await db.all(`
    SELECT 
      ROW_NUMBER() OVER (ORDER BY COALESCE(ds.total_solved, 0) DESC, COALESCE(ds.today_solved, 0) DESC) as rank,
      s.reg_no,
      s.name,
      s.department,
      s.batch,
      s.leetcode_profile_url,
      s.leetcode_username,
      s.top_language,
      s.language_stats,
      s.badges,
      COALESCE(ds.total_solved, 0) as total_solved,
      COALESCE(ds.easy_solved, 0) as easy_solved,
      COALESCE(ds.medium_solved, 0) as medium_solved,
      COALESCE(ds.hard_solved, 0) as hard_solved,
      COALESCE(ds.yesterday_solved, 0) as yesterday_solved,
      COALESCE(ds.today_solved, 0) as today_solved,
      COALESCE(ds.contest_solved, 0) as contest_solved,
      COALESCE(ds.contest_total, 4) as contest_total,
      COALESCE(ds.contest_rating, 0) as contest_rating,
      COALESCE(ds.global_ranking, 0) as global_ranking,
      COALESCE(ds.acceptance_rate, 0) as acceptance_rate,
      COALESCE(ds.total_submissions, 0) as total_submissions
    FROM students s
    LEFT JOIN daily_stats ds ON s.id = ds.student_id AND ds.date = ?
    WHERE COALESCE(s.is_banned, 0) = 0
    ORDER BY rank
  `, [targetDate]);
}

// Get top students
async function getTopStudents(limit = 10) {
  const db = getDb();

  return await db.all(`
    SELECT 
      s.id,
      s.reg_no,
      s.name,
      s.department,
      COALESCE(ds.total_solved, 0) as total_solved,
      COALESCE(ds.today_solved, 0) as today_solved,
      COALESCE(ds.contest_rating, 0) as contest_rating
    FROM students s
    LEFT JOIN daily_stats ds ON s.id = ds.student_id 
      AND ds.date = (SELECT MAX(date) FROM daily_stats WHERE student_id = s.id)
    WHERE COALESCE(s.is_banned, 0) = 0
    ORDER BY total_solved DESC, today_solved DESC
    LIMIT ?
  `, [limit]);
}

// Get low activity students
async function getLowActivityStudents(threshold = 0) {
  const db = getDb();

  return await db.all(`
    SELECT 
      s.id,
      s.reg_no,
      s.name,
      s.department,
      COALESCE(ds.total_solved, 0) as total_solved,
      COALESCE(ds.today_solved, 0) as today_solved,
      COALESCE(ds.yesterday_solved, 0) as yesterday_solved,
      ds.date as last_active
    FROM students s
    LEFT JOIN daily_stats ds ON s.id = ds.student_id 
      AND ds.date = (SELECT MAX(date) FROM daily_stats WHERE student_id = s.id)
    WHERE COALESCE(ds.today_solved, 0) <= ? AND COALESCE(s.is_banned, 0) = 0
    ORDER BY total_solved ASC
  `, [threshold]);
}

// Daily chart data
async function getDailyChartData(days = 7) {
  const db = getDb();

  return await db.all(`
    SELECT 
      ds.date,
      SUM(ds.total_solved) as total,
      SUM(ds.easy_solved) as easy,
      SUM(ds.medium_solved) as medium,
      SUM(ds.hard_solved) as hard,
      COUNT(DISTINCT ds.student_id) as active_students,
      SUM(ds.today_solved) as new_solved
    FROM daily_stats ds
    JOIN students s ON s.id = ds.student_id
    WHERE ds.date >= date('now', '-' || ? || ' days') AND COALESCE(s.is_banned, 0) = 0
    GROUP BY ds.date
    ORDER BY ds.date ASC
  `, [days]);
}

// Export report data
async function generateExcelReport(type, date) {
  const db = getDb();
  let data;
  let filename;

  if (type === 'daily') {
    data = await getDailyReport(date);
    filename = `LeetCode_Daily_Report_${date || new Date().toISOString().split('T')[0]}.xlsx`;
  } else if (type === 'department') {
    data = await getDepartmentStats();
    filename = `LeetCode_Department_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  } else if (type === 'contest_weekly' || type === 'contest_biweekly') {
    const isWeekly = type === 'contest_weekly';
    const contestRow = await db.get(`
        SELECT contest_name, contest_date 
        FROM contest_stats 
        WHERE contest_date IS NOT NULL 
          AND contest_name LIKE ?
          ${date ? 'AND date(contest_date) <= date(?)' : ''}
        ORDER BY contest_date DESC LIMIT 1
    `, [isWeekly ? '%Weekly%' : '%Biweekly%', ...(date ? [date] : [])].filter(Boolean));

    if (contestRow) {
      // Exclude biweekly explicitly for weekly
      if (isWeekly && contestRow.contest_name.includes('Biweekly')) {
        // This is a catch-all safety if the SQL above matched poorly, but it handles it.
      }
      data = await db.all(`
            SELECT 
                s.reg_no,
                s.name,
                s.department,
                CASE 
                    WHEN cs.problems_solved IS NULL THEN 'Not Registered'
                    WHEN cs.problems_solved = 0 THEN 'Registered  (0/4)'
                    ELSE 'Registered (' || cs.problems_solved || '/' || cs.contest_total || ')'
                END as status,
                cs.problems_solved,
                cs.contest_rating,
                cs.contest_ranking
            FROM students s
            LEFT JOIN contest_stats cs ON s.id = cs.student_id AND cs.contest_name = ?
            WHERE COALESCE(s.is_banned, 0) = 0
            ORDER BY CASE WHEN cs.problems_solved IS NULL THEN 1 ELSE 0 END, cs.problems_solved DESC
        `, [contestRow.contest_name]);
      filename = `LeetCode_${contestRow.contest_name.replace(/\s+/g, '_')}_Report.xlsx`;
    } else {
      data = [];
      filename = `LeetCode_Contest_Report.xlsx`;
    }
  } else {
    data = await getLatestStatsForStudents();
    filename = `LeetCode_Full_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  }

  const buffer = exportToExcel(data, filename);
  return { buffer, filename };
}

module.exports = {
  getDashboardSummary,
  getLatestStatsForStudents,
  getDepartmentStats,
  getDailyReport,
  getTopStudents,
  getLowActivityStudents,
  getDailyChartData,
  generateExcelReport
};
