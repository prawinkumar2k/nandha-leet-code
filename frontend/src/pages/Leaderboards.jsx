import { useState, useEffect } from 'react';
import { getDepartmentStats } from '../services/api';
import { useDate } from '../context/DateContext';
import { Trophy, Medal, Building2, Flame } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Leaderboards() {
    const { selectedBatch } = useDate();
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDepartmentStats(selectedBatch).then(res => {
            if (res.success && res.data) {
                // Sort departments by average total solved descending
                const sorted = [...res.data]
                    .filter(d => d.department && d.department !== 'Unknown')
                    .sort((a, b) => (b.avg_solved || 0) - (a.avg_solved || 0));
                setDepartments(sorted);
            }
        }).catch(() => toast.error("Failed to load department standings"))
            .finally(() => setLoading(false));
    }, [selectedBatch]);

    const getPodiumColor = (index) => {
        if (index === 0) return { bg: 'linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(234, 179, 8, 0.05))', border: '#eab308', text: '#fde047' };
        if (index === 1) return { bg: 'linear-gradient(135deg, rgba(148, 163, 184, 0.2), rgba(148, 163, 184, 0.05))', border: '#94a3b8', text: '#cbd5e1' };
        if (index === 2) return { bg: 'linear-gradient(135deg, rgba(161, 98, 7, 0.2), rgba(161, 98, 7, 0.05))', border: '#a16207', text: '#fef08a' };
        return { bg: 'var(--color-bg-secondary)', border: '#334155', text: 'var(--color-text-primary)' };
    };

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 30 }}>
                <div>
                    <h1 className="page-title"><Flame size={24} style={{ position: 'relative', top: 4, marginRight: 8, color: '#f97316' }} /> Global Leaderboards</h1>
                    <p className="page-desc">Real-time gamified standings of Department performance across the institution.</p>
                </div>
            </div>

            {loading ? (
                <div className="empty-state"><div className="spinner spinner-lg"></div></div>
            ) : departments.length === 0 ? (
                <div className="empty-state"><p>No department data available.</p></div>
            ) : (
                <div className="card" style={{ padding: '30px 20px' }}>
                    <div className="card-header" style={{ justifyContent: 'center', marginBottom: 20 }}>
                        <div className="card-title" style={{ fontSize: 20 }}>🏆 Department Power Rankings</div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 800, margin: '0 auto' }}>
                        {departments.map((dept, index) => {
                            const current = getPodiumColor(index);
                            return (
                                <div key={dept.department} style={{
                                    display: 'flex', alignItems: 'center', padding: '16px 24px',
                                    background: current.bg, border: `1px solid ${current.border}`,
                                    borderRadius: 16, transition: 'transform 0.2s',
                                    boxShadow: index < 3 ? '0 8px 16px rgba(0,0,0,0.2)' : 'none'
                                }}>
                                    {/* Rank */}
                                    <div style={{ width: 60, fontSize: index < 3 ? 24 : 18, fontWeight: 800, color: current.text }}>
                                        {index === 0 ? '🥇 1st' : index === 1 ? '🥈 2nd' : index === 2 ? '🥉 3rd' : `#${index + 1}`}
                                    </div>

                                    {/* Name */}
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${current.border}` }}>
                                            <Building2 size={20} color={current.text} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>{dept.department}</div>
                                            <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{dept.total_students} Active Students</div>
                                        </div>
                                    </div>

                                    {/* Score */}
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 28, fontWeight: 800, color: current.text, fontFamily: 'var(--font-mono)' }}>
                                            {Math.round(dept.avg_solved || 0)} <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600 }}>AVG</span>
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                            {dept.total_solved?.toLocaleString()} Total Solved
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
