import { useState, useEffect, useCallback } from 'react';
import {
    Users, Target, TrendingUp, Zap, Trophy, Award,
    Activity, Star, Globe, RefreshCw, ChevronDown
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    getDashboardSummary, getDepartmentStats, getTopStudents,
    getLowActivityStudents, getChartData, getAvailableDates, getFetchErrors
} from '../services/api';

const COLORS = {
    easy: '#10b981',
    medium: '#f59e0b',
    hard: '#ef4444',
    blue: '#3b82f6',
    purple: '#8b5cf6',
    cyan: '#06b6d4'
};

function StatCard({ icon: Icon, label, value, sub, color = 'brand', className = '' }) {
    return (
        <div className={`stat-card ${color} ${className}`}>
            <div className={`stat-icon ${color}`}>
                <Icon size={18} />
            </div>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value?.toLocaleString() ?? '—'}</div>
            {sub && <div className="stat-sub">{sub}</div>}
        </div>
    );
}

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: '#1e293b', border: '1px solid #1e3a5f',
            borderRadius: 8, padding: '10px 14px', fontSize: 12
        }}>
            <div style={{ color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ width: 8, height: 8, background: p.color, borderRadius: '50%', display: 'inline-block' }}></span>
                    {p.name}: <strong style={{ color: '#f1f5f9', marginLeft: 4 }}>{p.value?.toLocaleString()}</strong>
                </div>
            ))}
        </div>
    );
}

export default function Dashboard() {
    const [summary, setSummary] = useState(null);
    const [deptStats, setDeptStats] = useState([]);
    const [topStudents, setTopStudents] = useState([]);
    const [lowActivity, setLowActivity] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [dates, setDates] = useState([]);
    const [fetchErrors, setFetchErrors] = useState([]);
    const [selectedDate, setSelectedDate] = useState('');
    const [loading, setLoading] = useState(true);

    const loadData = useCallback(async (date) => {
        setLoading(true);
        try {
            const [sum, dept, top, low, chart, dateList, errs] = await Promise.allSettled([
                getDashboardSummary(date || undefined),
                getDepartmentStats(),
                getTopStudents(10),
                getLowActivityStudents(0),
                getChartData(14),
                getAvailableDates(),
                getFetchErrors()
            ]);

            if (sum.status === 'fulfilled') setSummary(sum.value.data);
            if (dept.status === 'fulfilled') setDeptStats(dept.value.data || []);
            if (top.status === 'fulfilled') setTopStudents(top.value.data || []);
            if (low.status === 'fulfilled') setLowActivity(low.value.data || []);
            if (chart.status === 'fulfilled') setChartData(chart.value.data || []);
            if (dateList.status === 'fulfilled') setDates(dateList.value.dates || []);
            if (errs.status === 'fulfilled') setFetchErrors(errs.value.data || []);
        } catch (e) {
            console.error('Dashboard load error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
        loadData(e.target.value);
    };

    const diffData = summary ? [
        { name: 'Easy', value: summary.total_easy || 0, color: COLORS.easy },
        { name: 'Medium', value: summary.total_medium || 0, color: COLORS.medium },
        { name: 'Hard', value: summary.total_hard || 0, color: COLORS.hard }
    ] : [];

    const deptChartData = deptStats.slice(0, 8).map(d => ({
        name: d.department || 'Unknown',
        avg: Math.round(d.avg_solved || 0),
        total: d.total_solved || 0
    }));

    return (
        <div>
            {/* Page Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">📊 Dashboard</h1>
                    <p className="page-desc">Daily student performance overview</p>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {dates.length > 0 && (
                        <select className="form-select" value={selectedDate} onChange={handleDateChange} style={{ width: 180 }}>
                            <option value="">Latest Data</option>
                            {dates.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    )}
                    <button className="btn btn-secondary" onClick={() => loadData(selectedDate || undefined)}>
                        <RefreshCw size={14} />
                        Refresh
                    </button>
                </div>
            </div>

            {loading && !summary ? (
                <div className="empty-state">
                    <div className="spinner spinner-lg"></div>
                    <p style={{ marginTop: 16, color: 'var(--color-text-muted)' }}>Loading dashboard...</p>
                </div>
            ) : (
                <>
                    {fetchErrors.length > 0 && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            color: '#ef4444', padding: '12px 16px', borderRadius: 8, marginBottom: 20,
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <div>
                                <strong style={{ fontSize: 14 }}>⚠️ Sync Issues Detected:</strong>
                                <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--color-text-primary)' }}>
                                    {fetchErrors.length} student profiles could not be resolved from LeetCode (e.g. invalid username or private profile).
                                </span>
                            </div>
                            <a href="#/reports" style={{ color: '#ef4444', fontWeight: 600, fontSize: 13, textDecoration: 'underline' }}>
                                View Details in Reports »
                            </a>
                        </div>
                    )}

                    {/* Main Stat Cards */}
                    <div className="stat-cards">
                        <StatCard icon={Users} label="Total Students" value={summary?.total_students} color="blue" sub="Registered students" />
                        <StatCard icon={Target} label="Total Problems Solved" value={summary?.total_problems} color="brand" sub="All time" />
                        <StatCard icon={TrendingUp} label="Yesterday Solved" value={summary?.yesterday_solved} color="purple" sub={`${summary?.students_active_yesterday || 0} students`} />
                        <StatCard icon={Zap} label="Today Solved" value={summary?.today_solved} color="green" sub={`${summary?.students_active_today || 0} students`} />
                        <StatCard icon={Trophy} label="Contest Solved" value={summary?.contest_solved} color="brand" sub={`${summary?.students_active_contest || 0} students`} />
                    </div>

                    {/* Secondary Stats */}
                    <div className="stat-cards" style={{ marginBottom: 20 }}>
                        <StatCard icon={Activity} label="Total Easy" value={summary?.total_easy} color="easy" />
                        <StatCard icon={Activity} label="Total Medium" value={summary?.total_medium} color="medium" />
                        <StatCard icon={Activity} label="Total Hard" value={summary?.total_hard} color="hard" />
                        <StatCard icon={Star} label="Avg Problems" value={summary?.avg_problems} color="blue" sub="Per student" />
                        <StatCard icon={Trophy} label="Avg Contest Rating" value={summary?.avg_contest_rating || '—'} color="purple" />
                        <StatCard icon={Globe} label="Best Global Rank" value={summary?.best_global_ranking?.toLocaleString() || '—'} color="cyan" sub="Lower = better" />
                    </div>

                    {/* Charts Row */}
                    <div className="grid-2" style={{ marginBottom: 20 }}>
                        {/* Daily Problems Chart */}
                        <div className="card">
                            <div className="card-header">
                                <div>
                                    <div className="card-title">📈 Daily Problems (Last 14 Days)</div>
                                    <div className="card-subtitle">New problems solved per day</div>
                                </div>
                            </div>
                            <div className="chart-container" style={{ height: 200 }}>
                                {chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                                            <defs>
                                                <linearGradient id="colorSolved" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone" dataKey="new_solved" name="New Solved"
                                                stroke="#f59e0b" fill="url(#colorSolved)" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="empty-state" style={{ padding: 20 }}>
                                        <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>No historical data yet. Refresh LeetCode data to populate charts.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Difficulty Distribution */}
                        <div className="card">
                            <div className="card-header">
                                <div>
                                    <div className="card-title">🎯 Difficulty Distribution</div>
                                    <div className="card-subtitle">Easy / Medium / Hard breakdown</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', height: 200 }}>
                                {diffData.some(d => d.value > 0) ? (
                                    <ResponsiveContainer width="60%" height="100%">
                                        <PieChart>
                                            <Pie data={diffData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                                                paddingAngle={3} dataKey="value">
                                                {diffData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip content={<CustomTooltip />} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div style={{ width: '60%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                                        No data available
                                    </div>
                                )}
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {diffData.map(d => (
                                        <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <span style={{ width: 12, height: 12, background: d.color, borderRadius: '50%', display: 'block' }} />
                                            <div>
                                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{d.name}</div>
                                                <div style={{ fontSize: 15, fontWeight: 700, color: d.color, fontFamily: 'var(--font-mono)' }}>
                                                    {d.value?.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Department Chart + Top Students */}
                    <div className="grid-2" style={{ marginBottom: 20 }}>
                        {/* Department Performance */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">🏫 Department Performance</div>
                                <div className="card-subtitle">Average problems solved</div>
                            </div>
                            <div className="chart-container" style={{ height: 220 }}>
                                {deptChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={deptChartData} margin={{ top: 5, right: 5, bottom: 20, left: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} angle={-30} textAnchor="end" />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar dataKey="avg" name="Avg Solved" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="empty-state" style={{ padding: 20 }}>
                                        <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>No data available</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Top 10 Students */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">🥇 Top Performing Students</div>
                            </div>
                            <div style={{ overflow: 'hidden' }}>
                                {topStudents.length > 0 ? (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>#</th>
                                                <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Student</th>
                                                <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Solved</th>
                                                <th style={{ textAlign: 'right', padding: '6px 8px', fontSize: 10, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Today</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topStudents.map((s, i) => (
                                                <tr key={s.id} style={{ borderTop: '1px solid rgba(30,58,95,0.5)' }}>
                                                    <td style={{ padding: '7px 8px', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: i < 3 ? 'var(--color-brand)' : 'var(--color-text-muted)' }}>
                                                        {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                                                    </td>
                                                    <td style={{ padding: '7px 8px' }}>
                                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.name}</div>
                                                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{s.department}</div>
                                                    </td>
                                                    <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-text-primary)', fontSize: 13 }}>
                                                        {(s.total_solved || 0).toLocaleString()}
                                                    </td>
                                                    <td style={{ padding: '7px 8px', textAlign: 'right' }}>
                                                        <span style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-brand)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12, padding: '2px 6px', borderRadius: 4 }}>
                                                            +{s.today_solved || 0}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="empty-state" style={{ padding: 20 }}>
                                        <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>No data available</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Low Activity Students */}
                    <div className="card">
                        <div className="card-header">
                            <div>
                                <div className="card-title">⚠️ Low Activity Students</div>
                                <div className="card-subtitle">Students with 0 problems solved today — may need attention</div>
                            </div>
                            <span className="badge badge-warn">{lowActivity.length} students</span>
                        </div>
                        {lowActivity.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {lowActivity.slice(0, 30).map(s => (
                                    <div key={s.id} style={{
                                        background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
                                        borderRadius: 8, padding: '6px 12px', fontSize: 12
                                    }}>
                                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{s.name}</div>
                                        <div style={{ color: 'var(--color-text-muted)', fontSize: 10 }}>{s.reg_no} • {s.department}</div>
                                    </div>
                                ))}
                                {lowActivity.length > 30 && (
                                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', alignSelf: 'center', padding: '0 8px' }}>
                                        +{lowActivity.length - 30} more
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ color: 'var(--color-easy)', fontSize: 13, fontWeight: 600 }}>
                                ✅ All students have activity today!
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
