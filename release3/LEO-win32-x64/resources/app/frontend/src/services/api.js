import axios from 'axios';

// In production Electron (file:// protocol), Vite's proxy doesn't exist.
// We must call the backend directly on its port.
const isElectronProd = typeof __IS_ELECTRON_PROD__ !== 'undefined' && __IS_ELECTRON_PROD__;
const API_BASE = isElectronProd ? 'http://localhost:3001/api' : '/api';

// ---- Health ----
export const checkHealth = () => axios.get(`${API_BASE}/health`).then(r => r.data);

// ---- Students ----
export const getStudents = (params = {}) =>
    axios.get(`${API_BASE}/students`, { params }).then(r => r.data);

export const getDepartments = () =>
    axios.get(`${API_BASE}/students/departments`).then(r => r.data);

export const getStudent = (id) =>
    axios.get(`${API_BASE}/students/${id}`).then(r => r.data);

export const createStudent = (data) =>
    axios.post(`${API_BASE}/students`, data).then(r => r.data);

export const updateStudentManual = (id, data) =>
    axios.put(`${API_BASE}/students/${id}/manual`, data).then(r => r.data);

export const banStudent = (id, is_banned) =>
    axios.put(`${API_BASE}/students/${id}/ban`, { is_banned }).then(r => r.data);

export const deleteStudent = (id) =>
    axios.delete(`${API_BASE}/students/${id}`).then(r => r.data);

export const deleteAllStudents = () =>
    axios.delete(`${API_BASE}/students/all`).then(r => r.data);

export const updateStudent = (id, data) =>
    axios.patch(`${API_BASE}/students/${id}`, data).then(r => r.data);

export const insertSampleData = () =>
    axios.get(`${API_BASE}/students/sample/insert`).then(r => r.data);

// ---- Import ----
export const downloadSampleTemplate = () => {
    window.location.href = `${API_BASE}/import/template`;
};

export const importExcel = (formData) =>
    axios.post(`${API_BASE}/import/excel`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);

// ---- Refresh ----
export const getRefreshStatus = () =>
    axios.get(`${API_BASE}/refresh/status`).then(r => r.data);

export const refreshAll = () =>
    axios.post(`${API_BASE}/refresh/all`).then(r => r.data);

export const refreshStudent = (id) =>
    axios.post(`${API_BASE}/refresh/student/${id}`).then(r => r.data);

export const stopRefresh = () =>
    axios.post(`${API_BASE}/refresh/stop`).then(r => r.data);

export const verifyStudent = (id) =>
    axios.get(`${API_BASE}/refresh/verify/${id}`).then(r => r.data);

// ---- Reports ----
export const getDashboardSummary = (date) =>
    axios.get(`${API_BASE}/reports/dashboard`, { params: { date } }).then(r => r.data);

export const getDepartmentStats = () =>
    axios.get(`${API_BASE}/reports/departments`).then(r => r.data);

export const getTopStudents = (limit = 10) =>
    axios.get(`${API_BASE}/reports/top-students`, { params: { limit } }).then(r => r.data);

export const getLowActivityStudents = (threshold = 0) =>
    axios.get(`${API_BASE}/reports/low-activity`, { params: { threshold } }).then(r => r.data);

export const getChartData = (days = 14) =>
    axios.get(`${API_BASE}/reports/chart-data`, { params: { days } }).then(r => r.data);

export const getAvailableDates = () =>
    axios.get(`${API_BASE}/reports/available-dates`).then(r => r.data);

export const getDailyReport = (date) =>
    axios.get(`${API_BASE}/reports/daily-report`, { params: { date } }).then(r => r.data);

export const getFetchErrors = () =>
    axios.get(`${API_BASE}/reports/fetch-errors`).then(r => r.data);

export const clearAllFetchErrors = () =>
    axios.delete(`${API_BASE}/reports/fetch-errors`).then(r => r.data);

export const exportErrorsExcel = () =>
    `${API_BASE}/reports/export-errors-excel`;

export const fixUrls = (formData) =>
    axios.post(`${API_BASE}/import/fix-urls`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);

// ---- Auditing ----
export const getAuditLogs = () =>
    axios.get(`${API_BASE}/audit`).then(r => r.data);

// ---- Contest Intervals ----
export const getContestIntervalLists = () =>
    axios.get(`${API_BASE}/reports/contest-intervals/list`).then(r => r.data);

export const getContestIntervalReport = (contestName) =>
    axios.get(`${API_BASE}/reports/contest-intervals/report?contestName=${encodeURIComponent(contestName)}`).then(r => r.data);

export const exportExcel = (type = 'daily', date) => {
    const params = new URLSearchParams({ type });
    if (date) params.append('date', date);
    window.open(`${API_BASE}/reports/export/excel?${params.toString()}`, '_blank');
};

export const exportCsv = (date) => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    window.open(`${API_BASE}/reports/export/csv?${params.toString()}`, '_blank');
};

// ---- Contests ----
export const getContests = (student_id) =>
    axios.get(`${API_BASE}/contests`, { params: { student_id } }).then(r => r.data);

export const getLatestContest = (date) =>
    axios.get(`${API_BASE}/contests/latest`, { params: { date } }).then(r => r.data);

export const getUpcomingContests = () =>
    axios.get(`${API_BASE}/contests/upcoming`).then(r => r.data);


// ---- Settings ----
export const getSettings = () =>
    axios.get(`${API_BASE}/settings`).then(r => r.data);

export const saveSettings = (settings) =>
    axios.put(`${API_BASE}/settings`, { settings }).then(r => r.data);

export const backupDatabase = () =>
    axios.post(`${API_BASE}/settings/backup`).then(r => r.data);

export const getBackups = () =>
    axios.get(`${API_BASE}/settings/backups`).then(r => r.data);

export const getHistoricStats = (id) =>
    axios.get(`${API_BASE}/students/historic-stats/${id}`).then(r => r.data);
