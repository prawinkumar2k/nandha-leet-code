import { useState, useEffect } from 'react';
import { getAuditLogs, deleteAuditLog, clearAuditLogs } from '../services/api';
import { ShieldAlert, RefreshCw, AlertTriangle, CheckCircle2, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuditLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await getAuditLogs();
            if (res.success) {
                setLogs(res.logs || []);
            } else {
                toast.error(res.message || "Failed to load audit logs");
            }
        } catch (error) {
            toast.error("Error loading logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const handleDismiss = async (id) => {
        try {
            await deleteAuditLog(id);
            setLogs(logs.filter(l => l.id !== id));
            toast.success("Log dismissed");
        } catch (error) {
            toast.error("Failed to dismiss log");
        }
    };

    const handleClearAll = async () => {
        if (!confirm("Are you sure you want to clear all audit logs?")) return;
        try {
            await clearAuditLogs();
            setLogs([]);
            toast.success("All logs cleared");
        } catch (error) {
            toast.error("Failed to clear logs");
        }
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title"><ShieldAlert size={24} style={{ position: 'relative', top: 4, marginRight: 8, color: 'var(--color-hard)' }} /> Audit Logs</h1>
                    <p className="page-desc">Review automatically flagged suspicious spikes or abnormal data shrinks.</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {logs.length > 0 && (
                        <button className="btn btn-secondary" onClick={handleClearAll} style={{ color: 'var(--color-hard)' }}>
                            <Trash2 size={14} /> Clear All
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={fetchLogs}>
                        <RefreshCw size={14} className={loading ? "spin" : ""} />
                        Refresh
                    </button>
                </div>
            </div>

            <div className="card">
                {loading ? (
                    <div className="empty-state">
                        <div className="spinner spinner-lg"></div>
                        <p style={{ marginTop: 16, color: 'var(--color-text-muted)' }}>Loading audit logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-easy)' }}><CheckCircle2 size={32} /></div>
                        <div className="empty-state-title">No Suspicious Activity</div>
                        <div className="empty-state-desc">The refresh engine hasn't detected any abnormal submission spikes or cheating metrics. All clear!</div>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: 12, textTransform: 'uppercase' }}>
                                    <th style={{ padding: '12px 16px' }}>Timestamp</th>
                                    <th style={{ padding: '12px 16px' }}>Student</th>
                                    <th style={{ padding: '12px 16px' }}>Event Type</th>
                                    <th style={{ padding: '12px 16px' }}>Details / Evidence</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(log => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                                            {new Date(log.timestamp).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <a href={`#/students/${log.student_id}`} style={{ fontWeight: 600, color: 'var(--color-text-primary)', textDecoration: 'none' }}>
                                                {log.name}
                                            </a>
                                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{log.reg_no} • {log.department || 'N/A'}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, color: 'var(--color-hard)' }}>
                                                <AlertTriangle size={12} />
                                                {log.type}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                                            {log.details}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                            <button 
                                                className="btn btn-secondary btn-sm btn-icon" 
                                                title="Dismiss Log"
                                                onClick={() => handleDismiss(log.id)}
                                            >
                                                <X size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
