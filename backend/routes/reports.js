const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');
const { getDashboardSummary, getDepartmentStats, getDailyReport, getTopStudents, getLowActivityStudents, getDailyChartData, generateExcelReport } = require('../services/reportService');
const { exportToCsv } = require('../services/excelService');

router.get('/dashboard', async (req, res) => {
    try {
        const { date } = req.query;
        const summary = await getDashboardSummary(date);
        res.json({ success: true, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/departments', async (req, res) => {
    try {
        const stats = await getDepartmentStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/top-students', async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const students = await getTopStudents(parseInt(limit));
        res.json({ success: true, data: students });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/low-activity', async (req, res) => {
    try {
        const { threshold = 0 } = req.query;
        const students = await getLowActivityStudents(parseInt(threshold));
        res.json({ success: true, data: students });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/chart-data', async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const data = await getDailyChartData(parseInt(days));
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/daily-report', async (req, res) => {
    try {
        const { date } = req.query;
        const data = await getDailyReport(date);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/available-dates', async (req, res) => {
    try {
        const db = getDb();
        const result = await db.all('SELECT DISTINCT date FROM daily_stats ORDER BY date DESC LIMIT 90');
        res.json({ success: true, dates: result.map(r => r.date) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/export/excel', async (req, res) => {
    try {
        const { type = 'daily', date } = req.query;
        const { buffer, filename } = await generateExcelReport(type, date);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(buffer);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/export/csv', async (req, res) => {
    try {
        const { date } = req.query;
        const data = await getDailyReport(date);
        const csv = exportToCsv(data);
        const filename = `LeetCode_Report_${date || new Date().toISOString().split('T')[0]}.csv`;

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/fetch-errors', async (req, res) => {
    try {
        const db = getDb();
        const errors = await db.all('SELECT * FROM fetch_errors ORDER BY error_at DESC LIMIT 100');
        res.json({ success: true, data: errors });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
