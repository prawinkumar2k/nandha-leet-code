-- Students table
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sno INTEGER,
  reg_no TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department TEXT,
  batch TEXT,
  leetcode_profile_url TEXT,
  leetcode_username TEXT,
  badges TEXT,
  top_language TEXT,
  admin_tags TEXT,
  fundamental_solved INTEGER DEFAULT 0,
  intermediate_solved INTEGER DEFAULT 0,
  advanced_solved INTEGER DEFAULT 0,
  language_stats TEXT,
  recent_submissions TEXT,
  is_banned INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily stats table - one record per student per date
CREATE TABLE IF NOT EXISTS daily_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  total_solved INTEGER DEFAULT 0,
  easy_solved INTEGER DEFAULT 0,
  medium_solved INTEGER DEFAULT 0,
  hard_solved INTEGER DEFAULT 0,
  yesterday_solved INTEGER DEFAULT 0,
  today_solved INTEGER DEFAULT 0,
  contest_solved INTEGER DEFAULT 0,
  contest_total INTEGER DEFAULT 4,
  contest_rating REAL DEFAULT 0,
  global_ranking INTEGER DEFAULT 0,
  acceptance_rate REAL DEFAULT 0,
  total_submissions INTEGER DEFAULT 0,
  data_source TEXT DEFAULT 'automatic',
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(student_id, date)
);

-- Contest stats table
CREATE TABLE IF NOT EXISTS contest_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  contest_date TEXT,
  contest_name TEXT,
  problems_solved INTEGER DEFAULT 0,
  contest_total INTEGER DEFAULT 4,
  contest_ranking INTEGER DEFAULT 0,
  contest_rating REAL DEFAULT 0,
  global_ranking INTEGER DEFAULT 0,
  fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  UNIQUE(student_id, contest_name)
);

-- Fetch errors log
CREATE TABLE IF NOT EXISTS fetch_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reg_no TEXT NOT NULL,
  date TEXT NOT NULL,
  error_message TEXT,
  profile_url TEXT,
  resolved INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs for tracking cheating/spikes
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  details TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- App settings
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_reg_no ON students(reg_no);
CREATE INDEX IF NOT EXISTS idx_students_department ON students(department);
CREATE INDEX IF NOT EXISTS idx_daily_stats_student_id ON daily_stats(student_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(date);
CREATE INDEX IF NOT EXISTS idx_daily_stats_student_date ON daily_stats(student_id, date);
CREATE INDEX IF NOT EXISTS idx_contest_stats_student_id ON contest_stats(student_id);
CREATE INDEX IF NOT EXISTS idx_contest_stats_date ON contest_stats(contest_date);
