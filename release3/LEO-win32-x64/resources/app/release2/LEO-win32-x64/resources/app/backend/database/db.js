const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

let db = null;
let sqlJs = null;
let isDirty = false;
let saveTimeout = null;

function getDbPath() {
    if (process.env.DB_PATH) return process.env.DB_PATH;

    const dataDir = path.join(__dirname, '..', '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'leetcode_tracking.db');
}

function scheduleSave() {
    isDirty = true;
    if (!saveTimeout) {
        saveTimeout = setTimeout(() => {
            saveDb();
        }, 1000); // Debounce saves by 1 second to batch disk writes
    }
}

function saveDb() {
    if (!db || !isDirty) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(getDbPath(), buffer);
    isDirty = false;

    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
    }
}

async function initDb() {
    if (db) return dbWrapper;

    sqlJs = await initSqlJs({
        locateFile: file => path.join(__dirname, '..', '..', 'node_modules', 'sql.js', 'dist', file)
    });
    const dbPath = getDbPath();

    if (fs.existsSync(dbPath)) {
        const filebuffer = fs.readFileSync(dbPath);
        db = new sqlJs.Database(filebuffer);
        console.log('Loaded existing database from', dbPath);

        // Migration: add batch column if missing
        try {
            db.run(`ALTER TABLE students ADD COLUMN batch TEXT;`);
            console.log('Migration: Added `batch` column to students table');
            isDirty = true;
            saveDb();
        } catch (e) {
            // Likely already exists, ignore
        }

        // Migration: add is_banned column if missing
        try {
            db.run(`ALTER TABLE students ADD COLUMN is_banned INTEGER DEFAULT 0;`);
            console.log('Migration: Added `is_banned` column to students table');
            isDirty = true;
            saveDb();
        } catch (e) { }

        // Migrations for Advanced Tracking
        try {
            db.run(`ALTER TABLE students ADD COLUMN badges TEXT;`);
            db.run(`ALTER TABLE students ADD COLUMN top_language TEXT;`);
            db.run(`ALTER TABLE students ADD COLUMN admin_tags TEXT;`);
            console.log('Migration: Added advanced tracking columns to students');
            isDirty = true;
            saveDb();
        } catch (e) { }

        try {
            db.run(`ALTER TABLE daily_stats ADD COLUMN acceptance_rate REAL DEFAULT 0;`);
            db.run(`ALTER TABLE daily_stats ADD COLUMN total_submissions INTEGER DEFAULT 0;`);
            console.log('Migration: Added advanced tracking columns to daily_stats');
            isDirty = true;
            saveDb();
        } catch (e) { }

        try {
            db.run(`
                CREATE TABLE IF NOT EXISTS audit_logs (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  student_id INTEGER NOT NULL,
                  type TEXT NOT NULL,
                  details TEXT,
                  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
                );
            `);
            console.log('Migration: Added audit_logs table');
            isDirty = true;
            saveDb();
        } catch (e) { }

        try {
            db.run(`ALTER TABLE students ADD COLUMN language_stats TEXT;`);
            console.log('Migration: Added language_stats to students');
            isDirty = true;
        } catch (e) { }

        try {
            db.run(`ALTER TABLE students ADD COLUMN recent_submissions TEXT;`);
            console.log('Migration: Added recent_submissions to students');
            isDirty = true;
        } catch (e) { }

        if (isDirty) saveDb();
    } else {
        db = new sqlJs.Database();

        // Apply schema
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.run(schema);
        isDirty = true;
        saveDb();
        console.log('Created new database at', dbPath);
    }

    return dbWrapper;
}

// Map bindings
function prepareParams(params) {
    if (!params) return [];
    // Ensure we don't pass undefined, sql.js prefers null
    return params.map(p => p === undefined ? null : p);
}

const dbWrapper = {
    get: async (sql, params) => {
        const stmt = db.prepare(sql);
        try {
            stmt.bind(prepareParams(params));
            if (stmt.step()) {
                return stmt.getAsObject();
            }
            return undefined;
        } finally {
            stmt.free();
        }
    },
    all: async (sql, params) => {
        const stmt = db.prepare(sql);
        const results = [];
        try {
            stmt.bind(prepareParams(params));
            while (stmt.step()) {
                results.push(stmt.getAsObject());
            }
            return results;
        } finally {
            stmt.free();
        }
    },
    run: async (sql, params) => {
        // If it's a COMMIT or BEGIN, sql.js handles it or ignores it since it's in-memory single threaded
        if (sql.trim().toUpperCase().startsWith('BEGIN') || sql.trim().toUpperCase().startsWith('COMMIT') || sql.trim().toUpperCase().startsWith('ROLLBACK')) {
            db.run(sql);
            return;
        }

        if (params && params.length > 0) {
            db.run(sql, prepareParams(params));
        } else {
            db.run(sql);
        }
        scheduleSave();
        return { changes: db.getRowsModified() };
    }
};

function getDb() {
    if (!db) {
        throw new Error('Database not initialized! Call initDb first.');
    }
    return dbWrapper;
}

async function closeDb() {
    if (db) {
        saveDb(); // Force final save
        db.close();
        db = null;
    }
}

// Ensure we save on exit
process.on('exit', () => {
    if (db && isDirty) saveDb();
});

module.exports = { initDb, getDb, closeDb, getDbPath };
