import { useState, useEffect } from 'react';
import { BarChart2, Building2, Users, TrendingUp, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getDepartmentStats } from '../services/api';

const DEPT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#14b8a6'];

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#1e293b', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
            <div style={{ color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ width: 8, height: 8, background: p.color, borderRadius: '50%', display: 'inline-block' }}></span>
                    {p.name}: <strong style={{ color: '#f1f5f9', marginLeft: 4 }}>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</strong>
                </div>
            ))}
        </div>
    );
}

export default function DepartmentsPage() {
    const [deptStats, setDeptStats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDepartmentStats().then(r => {
            setDeptStats(r.data || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const chartData = deptStats.map((d, i) => ({
        name: d.department || 'Unknown',
        students: d.total_students,
        avg: Math.round(d.avg_solved || 0),
        total: d.total_solved || 0,
        color: DEPT_COLORS[i % DEPT_COLORS.length]
    }));

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">🏫 Departments</h1>
                    <p className="page-desc">Department-wise performance analytics</p>
                </div>
            </div>

            {loading ? (
                <div className="empty-state"><div className="spinner spinner-lg"></div></div>
            ) : deptStats.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><Building2 size={28} /></div>
                    <div className="empty-state-title">No department data</div>
                    <div className="empty-state-desc">Import students to see department analytics</div>
                </div>
            ) : (
                <>
                    {/* Charts */}
                    <div className="grid-2" style={{ marginBottom: 20 }}>
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Average Problems Solved</div>
                            </div>
                            <div style={{ height: 250 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={70} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="avg" name="Avg Solved" radius={[0, 4, 4, 0]}>
                                            {chartData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Total Problems Solved</div>
                            </div>
                            <div style={{ height: 250 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                        <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} width={70} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="total" name="Total Solved" radius={[0, 4, 4, 0]}>
                                            {chartData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Department Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                        {deptStats.map((dept, i) => (
                            <div key={dept.department} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                                    background: DEPT_COLORS[i % DEPT_COLORS.length]
                                }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 10,
                                        background: `${DEPT_COLORS[i % DEPT_COLORS.length]}20`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Building2 size={18} color={DEPT_COLORS[i % DEPT_COLORS.length]} />
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)' }}>
                                            {dept.department || 'Unknown'}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                            {dept.total_students} students
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <div style={{ textAlign: 'center', padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>AVG SOLVED</div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: DEPT_COLORS[i % DEPT_COLORS.length] }}>
                                            {Math.round(dept.avg_solved || 0)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>TOTAL SOLVED</div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: 'var(--color-text-primary)' }}>
                                            {(dept.total_solved || 0).toLocaleString()}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>AVG TODAY</div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: 'var(--color-brand)' }}>
                                            {Math.round(dept.avg_today || 0)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center', padding: '8px', borderRadius: 8, background: 'rgba(255,255,255,0.03)' }}>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 2 }}>CONTEST</div>
                                        <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 18, color: 'var(--color-purple)' }}>
                                            {dept.contest_participants || 0}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
