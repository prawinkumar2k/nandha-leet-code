const XLSX = require('xlsx');
const path = require('path');

// Valid department list
const VALID_DEPARTMENTS = [
    'AI&DS', 'AIDS', 'CSE', 'CSE-CS', 'CSE-IOT', 'CSE-CS', 'ECE', 'IT', 'BME', 'EEE',
    'MECH', 'CIVIL', 'AIML', 'CSBS', 'MCA', 'MBA', 'AGRI', 'FOOD', 'BIOTECH',
    'AERO', 'AUTO', 'MINING', 'CHEM', 'CSIT', 'IOT'
];

function isValidUrl(url) {
    if (!url) return false;
    try {
        const u = new URL(url.trim());
        return u.hostname === 'leetcode.com';
    } catch {
        // Allow plain usernames
        return typeof url === 'string' && url.trim().length > 0;
    }
}

function sanitizeRow(row) {
    // Normalize ALL header names: lowercase, spaces→underscore, strip special chars
    const normalized = {};
    Object.keys(row).forEach(key => {
        const norm = key.toString().toLowerCase().trim()
            .replace(/[\s.]+/g, '_')
            .replace(/[^a-z0-9_]/g, '');
        normalized[norm] = row[key];
    });

    // reg_no: handles 'reg_no', 'reg_num', 'regno', 'register_no', 'register_number', 'regnum'
    const reg_no = (
        normalized['reg_no'] ||
        normalized['reg_num'] ||
        normalized['regno'] ||
        normalized['register_no'] ||
        normalized['register_number'] ||
        normalized['regnum'] ||
        normalized['registration_no'] ||
        ''
    ).toString().trim();

    // name: handles 'name', 'student_name', 'student name'
    const name = (
        normalized['name'] ||
        normalized['student_name'] ||
        normalized['student'] ||
        ''
    ).toString().trim();

    // department: handles 'department', 'dept', 'branch'
    const department = (
        normalized['department'] ||
        normalized['dept'] ||
        normalized['branch'] ||
        ''
    ).toString().trim().toUpperCase();

    // url: handles all common variants
    const leetcode_profile_url = (
        normalized['leetcode_profile_url'] ||
        normalized['leetcode_url'] ||
        normalized['profile_url'] ||
        normalized['leetcode'] ||
        normalized['url'] ||
        normalized['link'] ||
        ''
    ).toString().trim();

    // sno: handles 'sno', 's_no', 'serial', 'sl_no', 'sl'
    const sno = parseInt(
        normalized['sno'] || normalized['s_no'] || normalized['sl_no'] ||
        normalized['serial'] || normalized['sl'] || '0'
    ) || 0;

    // batch: optional field
    const batch = normalized['batch'] || normalized['year'] || '';

    return { sno, reg_no, name, department, leetcode_profile_url, batch: batch.toString().trim() };
}

function importExcel(filePath) {
    const workbook = XLSX.readFile(filePath, { cellText: true, cellDates: true });

    // Find 'cons' sheet (case-insensitive)
    let sheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'cons');
    if (!sheetName) {
        // Fall back to first sheet
        sheetName = workbook.SheetNames[0];
        console.warn(`Sheet 'cons' not found, using first sheet: ${sheetName}`);
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    const validRows = [];
    const invalidRows = [];

    rawRows.forEach((row, index) => {
        const rowNum = index + 2; // Excel row number (1-indexed with header)
        const cleaned = sanitizeRow(row, Object.keys(row));

        const errors = [];

        if (!cleaned.reg_no) errors.push('Missing reg_no');
        if (!cleaned.name) errors.push('Missing name');
        if (!cleaned.leetcode_profile_url) errors.push('Missing LeetCode URL');

        // Validate URL format loosely
        if (cleaned.leetcode_profile_url &&
            cleaned.leetcode_profile_url.startsWith('http') &&
            !isValidUrl(cleaned.leetcode_profile_url)) {
            errors.push('Invalid LeetCode URL');
        }

        if (errors.length > 0) {
            invalidRows.push({
                rowNum,
                data: cleaned,
                errors
            });
        } else {
            validRows.push(cleaned);
        }
    });

    return {
        sheetName,
        totalRows: rawRows.length,
        validRows,
        invalidRows
    };
}

function exportToExcel(data, filename, sheetName = 'Report') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-width columns
    const colWidths = [];
    if (data.length > 0) {
        const headers = Object.keys(data[0]);
        headers.forEach((h, i) => {
            const maxLen = Math.max(
                h.length,
                ...data.map(row => String(row[h] || '').length)
            );
            colWidths.push({ wch: Math.min(maxLen + 2, 50) });
        });
    }
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

function exportToCsv(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
        headers.map(h => {
            const val = row[h] !== null && row[h] !== undefined ? String(row[h]) : '';
            // Quote values with commas or quotes
            if (val.includes(',') || val.includes('"') || val.includes('\n')) {
                return `"${val.replace(/"/g, '""')}"`;
            }
            return val;
        }).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
}

module.exports = { importExcel, exportToExcel, exportToCsv };
