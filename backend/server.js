const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./database/db');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check (before db init so it's always available)
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Initialize database before routes
initDb().then(() => {
    console.log('DB initialized successfully');

    // Routes — registered after DB is ready
    app.use('/api/students', require('./routes/students'));
    app.use('/api/import', require('./routes/import'));
    app.use('/api/refresh', require('./routes/refresh'));
    app.use('/api/reports', require('./routes/reports'));
    app.use('/api/contests', require('./routes/contests'));
    app.use('/api/settings', require('./routes/settings'));

    // Serve frontend build in production
    if (process.env.NODE_ENV === 'production') {
        const frontendPath = path.join(__dirname, '..', 'frontend', 'dist');
        app.use(express.static(frontendPath));
        app.get('*', (req, res) => {
            res.sendFile(path.join(frontendPath, 'index.html'));
        });
    }

}).catch(err => {
    console.error('Failed to init DB:', err);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`LeetCode Tracking Backend running at http://127.0.0.1:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    server.close(() => {
        const { closeDb } = require('./database/db');
        closeDb().then(() => process.exit(0));
    });
});

module.exports = { app, server };
