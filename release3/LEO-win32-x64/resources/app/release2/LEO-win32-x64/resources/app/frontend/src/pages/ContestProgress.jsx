import { useState, useEffect } from 'react';
import { getContestIntervalLists, getContestIntervalReport } from '../services/api';
import { Target, Download, Building2, Flame } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContestProgress() {
    const [contests, setContests] = useState([]);
    const [selectedContest, setSelectedContest] = useState('');
    const [report, setReport] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getContestIntervalLists().then(res => {
            if (res.success && res.data && res.data.length > 0) {
                setContests(res.data);
                setSelectedContest(res.data[0].contest_name);
            }
        });
    }, []);

    useEffect(() => {
        if (!selectedContest) return;
        setLoading(true);
        getContestIntervalReport(selectedContest).then(res => {
            if (res.success) setReport(res.data || []);
            else toast.error("Failed to load report");
        }).catch(() => toast.error("Error loading report"))
            .finally(() => setLoading(false));
    }, [selectedContest]);

    const handleExport = () => {
        if (!report.length) return;
        let csv = 'Student ID,Name,Department,Batch,Problems Solved Before Contest,Problems Solved In Contest\n';
        report.forEach(r => {
            csv += `"${r.reg_no}","${r.name}","${r.department}","${r.batch}",${r.solved_in_gap},${r.solved_in_contest}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Contest_Progress_${selectedContest}.csv`;
        a.click();
    };

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 30 }}>
                <div>
                    <h1 className="page-title"><Target size={24} style={{ position: 'relative', top: 4, marginRight: 8, color: '#f97316' }} /> Contest Interval Progress</h1>
                    <p className="page-desc">Track EXACTLY how many baseline problems students grinded during the 7 day interval leading up to a contest.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-primary" onClick={handleExport} disabled={!report.length}>
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            <div className="card" style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end' }}>
                    <div style={{ flex: 1, maxWidth: 350 }}>
                        <label style={{ display: 'block', fontSize: 13, marginBottom: 8, color: 'var(--color-text-muted)' }}>Target Contest</label>
                        <select
                            className="input"
                            style={{ width: '100%', cursor: 'pointer' }}
                            value={selectedContest}
                            onChange={(e) => setSelectedContest(e.target.value)}
                        >
                            {contests.map((c, i) => (
                                <option key={i} value={c.contest_name}>{c.contest_name} (Ended {c.date})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div className="table-wrapper">
                    {loading ? (
                        <div className="empty-state"><div className="spinner spinner-lg"></div></div>
                    ) : report.length === 0 ? (
                        <div className="empty-state">No progress data identified for this contest interval.</div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-secondary)', fontSize: 12, textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>
                                    <th style={{ padding: '16px 20px', fontWeight: 600 }}>Student</th>
                                    <th style={{ padding: '16px 20px', fontWeight: 600 }}>Department</th>
                                    <th style={{ padding: '16px 20px', fontWeight: 600 }}>Problems Solved In Interval<br /><span style={{ fontSize: 10, opacity: 0.7 }}>(7 Days Before Contest)</span></th>
                                    <th style={{ padding: '16px 20px', fontWeight: 600 }}>Solved Inside Contest<br /><span style={{ fontSize: 10, opacity: 0.7 }}>(Live Contest Result)</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.map((r, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '16px 20px' }}>
                                            <a href={`#/students/${r.reg_no}`} style={{ textDecoration: 'none', color: 'var(--color-text-primary)' }}>
                                                <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                                                <div style={{ color: 'var(--color-text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{r.reg_no}</div>
                                            </a>
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                                                <Building2 size={14} color="var(--color-text-muted)" />
                                                {r.department || 'Unknown'} {r.batch ? `(${r.batch})` : ''}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{
                                                display: 'inline-flex', alignItems: 'center', padding: '6px 12px', borderRadius: 8,
                                                background: r.solved_in_gap > 30 ? 'rgba(16, 185, 129, 0.1)' : r.solved_in_gap > 0 ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                                color: r.solved_in_gap > 30 ? 'var(--color-easy)' : r.solved_in_gap > 0 ? 'var(--color-brand)' : 'var(--color-text-muted)',
                                                fontWeight: 700, fontSize: 14
                                            }}>
                                                {r.solved_in_gap > 30 && <Flame size={14} style={{ marginRight: 6 }} />}
                                                {r.solved_in_gap}
                                            </div>
                                        </td>
                                        <td style={{ padding: '16px 20px' }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: r.participated ? 'var(--color-purple)' : 'var(--color-text-muted)' }}>
                                                {r.participated ? r.solved_in_contest : <span style={{ opacity: 0.5, fontWeight: 400 }}>No Attendance</span>}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
