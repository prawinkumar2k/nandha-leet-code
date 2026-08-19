const fs = require('fs');
const initSqlJs = require('sql.js');
async function test() {
  const SQL = await initSqlJs();
  const filebuffer = fs.readFileSync('data/leetcode_tracking.db');
  const db = new SQL.Database(filebuffer);
  
  const res = db.exec("SELECT DISTINCT batch FROM students WHERE batch IS NOT NULL AND batch != '';");
  console.log('Batches:', JSON.stringify(res, null, 2));
  
  const firstStudent = db.exec('SELECT batch, reg_no, name FROM students LIMIT 1;');
  console.log('Student:', JSON.stringify(firstStudent, null, 2));
}
test().catch(console.error);
