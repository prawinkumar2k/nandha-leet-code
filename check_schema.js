const initSqlJs = require('sql.js');
const fs = require('fs');

initSqlJs().then(SQL => {
    const db = new SQL.Database(fs.readFileSync(process.env.APPDATA + '/leo-student-tracking/LeetCodeData/leetcode_tracking.db'));
    
    const studentCols = db.exec('PRAGMA table_info(students)')[0].values.map(r => r[1]);
    console.log('students cols:', studentCols);
    
    const auditExists = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs'")[0]?.values;
    console.log('audit_logs exists:', auditExists);
    
    const dailyCols = db.exec('PRAGMA table_info(daily_stats)')[0].values.map(r => r[1]);
    console.log('daily_stats cols:', dailyCols);
});
