import { useState, useEffect } from 'react';
import { BarChart3, Download, FileText, Table, AlertCircle } from 'lucide-react';
import { getDailyReport, exportExcel, exportCsv, getFetchErrors, clearAllFetchErrors, exportErrorsExcel, fixUrls } from '../services/api';
import { useDate } from '../context/DateContext';
import toast from 'react-hot-toast';

export default function Reports() {
    const { selectedDate, selectedBatch } = useDate();
    const [activeTab, setActiveTab] = useState('daily');
    const [report, setReport] = useState([]);
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [fixResult, setFixResult] = useState(null);

    useEffect(() => {
        if (activeTab === 'daily') {
            setLoading(true);
            getDailyReport(selectedDate || undefined, selectedBatch || undefined).then(r => {
                setReport(r.data || []);
                setLoading(false);
            }).catch(() => setLoading(false));
        } else if (activeTab === 'errors') {
            getFetchErrors().then(r => setErrors(r.data || []));
        }
    }, [activeTab, selectedDate, selectedBatch]);

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">📋 Reports</h1>
                    <p className="page-desc">Daily performance and export reports {selectedDate && `(as of ${selectedDate})`}</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => exportExcel('daily', selectedDate || undefined, selectedBatch || undefined)}>
                        <Download size={13} /> Export Excel
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => exportCsv(selectedDate || undefined, selectedBatch || undefined)}>
                        <Download size={13} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab${activeTab === 'daily' ? ' active' : ''}`} onClick={() => setActiveTab('daily')}>
                    <FileText size={14} /> Daily Report
                </button>
                <button className={`tab${activeTab === 'errors' ? ' active' : ''}`} onClick={() => setActiveTab('errors')}>
                    <AlertCircle size={14} /> Fetch Errors
                </button>
            </div>

            {activeTab === 'daily' && (
                <div>
                    {/* Date Filter removed since it's global now */}
                    <div className="filters-row">
                        <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                            {report.length} students
                        </span>
                    </div>

                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Register No</th>
                                    <th>Name</th>
                                    <th>Batch</th>
                                    <th>Department</th>
                                    <th>Total</th>
                                    <th>Easy</th>
                                    <th>Medium</th>
                                    <th>Hard</th>
                                    <th>Yesterday</th>
                                    <th>Today</th>
                                    <th>Contest</th>
                                    <th>Rating</th>
                                    <th>Ranking</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={13} style={{ textAlign: 'center', padding: 40 }}>
                                            <div className="spinner"></div>
                                        </td>
                                    </tr>
                                ) : report.length === 0 ? (
                                    <tr>
                                        <td colSpan={13}>
                                            <div className="empty-state">
                                                <div className="empty-state-title">No report data</div>
                                                <div className="empty-state-desc">Import students and refresh LeetCode data first</div>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    report.map((s, i) => (
                                        <tr key={s.reg_no || i}>
                                            <td className={`td-rank${i < 3 ? ' top-3' : ''}`}>{i < 3 ? ['🥇', '🥈', '🥉'][i] : s.rank}</td>
                                            <td className="td-reg">{s.reg_no}</td>
                                            <td className="td-name">{s.name}</td>
                                            <td style={{ fontSize: 11, fontWeight: 600 }}>{s.batch || '—'}</td>
                                            <td><span className="td-dept">{s.department || '—'}</span></td>
                                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{s.total_solved?.toLocaleString() || 0}</td>
                                            <td className="td-easy">{s.easy_solved || 0}</td>
                                            <td className="td-medium">{s.medium_solved || 0}</td>
                                            <td className="td-hard">{s.hard_solved || 0}</td>
                                            <td style={{ color: 'var(--color-text-secondary)' }}>{s.yesterday_solved || 0}</td>
                                            <td><span className="td-today">{s.today_solved || 0}</span></td>
                                            <td className="td-contest">{s.contest_solved || 0}/{s.contest_total || 4}</td>
                                            <td className="td-rating">{s.contest_rating ? Math.round(s.contest_rating) : '—'}</td>
                                            <td className="td-ranking">{s.global_ranking ? s.global_ranking.toLocaleString() : '—'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'errors' && (
                <div>
                    <div className="card-header" style={{ marginBottom: 12 }}>
                        <div className="card-title">Recent Fetch Errors</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className="badge badge-error">{errors.length}</span>
                            {errors.length > 0 && (<>
                                {/* Step 1: Export */}
                                <button className="btn btn-secondary btn-sm"
                                    title="Download editable Excel — fill Correct URL column"
                                    onClick={() => { setFixResult(null); exportErrorsExcel(); }}
                                >
                                    ⬇ Export Errors Excel
                                </button>
                                {/* Step 2: Import fixed sheet */}
                                <button className="btn btn-sm"
                                    style={{ background: 'var(--color-brand)', color: '#fff', fontSize: 11, padding: '2px 10px', borderRadius: 6 }}
                                    disabled={importing}
                                    onClick={() => document.getElementById('fix-url-input').click()}
                                >
                                    {importing ? '⏳ Updating...' : '⬆ Import URL Fix'}
                                </button>
                                <input
                                    id="fix-url-input"
                                    type="file"
                                    accept=".xlsx,.xls,.csv"
                                    style={{ display: 'none' }}
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        e.target.value = '';
                                        setImporting(true);
                                        setFixResult(null);
                                        try {
                                            const fd = new FormData();
                                            fd.append('file', file);
                                            const res = await fixUrls(fd);
                                            setFixResult(res);
                                            // Refresh errors list
                                            getFetchErrors().then(res => setErrors(res.data || []));
                                        } catch (err) {
                                            setFixResult({ error: err.response?.data?.message || err.message });
                                        } finally {
                                            setImporting(false);
                                        }
                                    }}
                                />
                                <button className="btn btn-sm"
                                    style={{ background: 'var(--color-error, #ef4444)', color: '#fff', fontSize: 11, padding: '2px 10px', borderRadius: 6 }}
                                    onClick={async () => {
                                        if (!window.confirm('Clear all fetch errors?')) return;
                                        await clearAllFetchErrors();
                                        setErrors([]);
                                        setFixResult(null);
                                    }}
                                >
                                    🗑 Clear All
                                </button>
                            </>)}
                        </div>
                    </div>
                    {/* Workflow hint */}
                    {errors.length > 0 && (
                        <div className="alert" style={{ marginBottom: 10, fontSize: 12, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, padding: '8px 14px', color: 'var(--color-text-secondary)' }}>
                            💡 <strong>How to fix:</strong> 1) Click <em>Export Errors Excel</em> → open file → fill <strong>"Correct URL (Fill This)"</strong> column with the right LeetCode URL for each student → 2) Click <em>Import URL Fix</em> to upload and bulk-update.
                        </div>
                    )}
                    {/* Fix result banner */}
                    {fixResult && (
                        fixResult.error
                            ? <div className="alert alert-error" style={{ marginBottom: 10 }}>❌ {fixResult.error}</div>
                            : <div className="alert alert-success" style={{ marginBottom: 10 }}>
                                ✅ Updated <strong>{fixResult.updated}</strong> student URL(s).
                                {fixResult.skipped > 0 && ` ${fixResult.skipped} skipped (blank or not found).`}
                                {fixResult.errors?.length > 0 && <div style={{ marginTop: 4, fontSize: 11, color: 'var(--color-hard)' }}>{fixResult.errors.join(' | ')}</div>}
                            </div>
                    )}
                    {errors.length === 0 ? (
                        <div className="alert alert-success">
                            ✅ No fetch errors recorded. All student data is being fetched correctly.
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Register No</th>
                                        <th>Name</th>
                                        <th>Batch</th>
                                        <th>Dept</th>
                                        <th>Profile URL</th>
                                        <th>Error</th>
                                        <th>At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {errors.map(e => (
                                        <tr key={e.id}>
                                            <td className="td-reg">{e.reg_no}</td>
                                            <td className="td-name">{e.student_name}</td>
                                            <td style={{ fontSize: 11, fontWeight: 600 }}>{e.batch || '-'}</td>
                                            <td style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{e.department || '-'}</td>
                                            <td style={{ fontSize: 11, color: 'var(--color-text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {e.profile_url}
                                            </td>
                                            <td>
                                                <span className="badge badge-error" style={{ maxWidth: 200, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {e.error_reason}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                                                {new Date(e.error_at).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
