import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ExternalLink, RefreshCw, Edit2, Trophy,
    Target, Zap, Globe, Star, TrendingUp, Calendar
} from 'lucide-react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getStudent, refreshStudent } from '../services/api';
import toast from 'react-hot-toast';
import ManualEditModal from '../components/ManualEditModal';

function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: '#1e293b', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
            <div style={{ color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>{label}</div>
            {payload.map((p, i) => (
                <div key={i} style={{ color: p.color, display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ width: 8, height: 8, background: p.color, borderRadius: '50%', display: 'inline-block' }}></span>
                    {p.name}: <strong style={{ color: '#f1f5f9', marginLeft: 4 }}>{p.value}</strong>
                </div>
            ))}
        </div>
    );
}

export default function StudentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [editing, setEditing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    const load = async () => {
        setLoading(true);
        try {
            const result = await getStudent(id);
            setData(result);
        } catch (e) {
            toast.error('Failed to load student');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]);

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await refreshStudent(id);
            toast.success('Data refreshed!');
            load();
        } catch (e) {
            toast.error(e.response?.data?.message || e.message);
        } finally {
            setRefreshing(false);
        }
    };

    if (loading) {
        return (
            <div className="empty-state">
                <div className="spinner spinner-lg"></div>
                <p style={{ marginTop: 16, color: 'var(--color-text-muted)' }}>Loading student...</p>
            </div>
        );
    }

    if (!data?.student) {
        return (
            <div className="empty-state">
                <div className="empty-state-title">Student not found</div>
                <button className="btn btn-secondary mt-4" onClick={() => navigate('/students')}>← Back</button>
            </div>
        );
    }

    const { student, latest, history, contests } = data;

    // Prepare chart data (last 30 days, oldest first)
    const chartHistory = [...(history || [])].reverse().slice(0, 30);

    const initials = student.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

    return (
        <div>
            {/* Back */}
            <button className="btn btn-secondary btn-sm" style={{ marginBottom: 16 }} onClick={() => navigate('/students')}>
                <ArrowLeft size={14} /> Back to Students
            </button>

            {/* Student Header */}
            <div className="student-header">
                <div className="student-avatar">{initials}</div>
                <div className="student-info" style={{ flex: 1 }}>
                    <h2>{student.name}</h2>
                    <div className="student-meta">
                        <span className="student-meta-item">
                            <span className="td-reg">{student.reg_no}</span>
                        </span>
                        <span className="student-meta-item">
                            <span className="td-dept">{student.department || '—'}</span>
                        </span>
                        {student.leetcode_username && (
                            <span className="student-meta-item" style={{ color: 'var(--color-text-accent)', fontSize: 12 }}>
                                @{student.leetcode_username}
                            </span>
                        )}
                        {latest?.stat_date && (
                            <span className="student-meta-item">
                                <Calendar size={12} />
                                Last updated: {latest.stat_date}
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => {
                        const url = student.leetcode_profile_url;
                        if (url) {
                            if (window.electronAPI) window.electronAPI.openExternal(url);
                            else window.open(url, '_blank');
                        }
                    }} disabled={!student.leetcode_profile_url}>
                        <ExternalLink size={13} /> LeetCode Profile
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                        <Edit2 size={13} /> Edit Data
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleRefresh} disabled={refreshing}>
                        {refreshing ? <><div className="spinner" style={{ width: 12, height: 12 }}></div> Refreshing...</>
                            : <><RefreshCw size={13} /> Refresh Data</>}
                    </button>
                </div>
            </div>

            {/* Current Performance Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                    { label: 'Total Solved', value: latest?.total_solved || 0, color: 'var(--color-text-primary)' },
                    { label: 'Easy', value: latest?.easy_solved || 0, color: 'var(--color-easy)' },
                    { label: 'Medium', value: latest?.medium_solved || 0, color: 'var(--color-medium)' },
                    { label: 'Hard', value: latest?.hard_solved || 0, color: 'var(--color-hard)' },
                    { label: 'Yesterday', value: latest?.yesterday_solved || 0, color: 'var(--color-text-secondary)' },
                    { label: 'Today', value: latest?.today_solved || 0, color: 'var(--color-brand)' },
                    { label: 'Contest', value: `${latest?.contest_solved || 0}/${latest?.contest_total || 4}`, color: 'var(--color-purple)' },
                    { label: 'Rating', value: latest?.contest_rating ? Math.round(latest.contest_rating) : '—', color: 'var(--color-purple)' },
                    { label: 'Global Rank', value: latest?.global_ranking ? latest.global_ranking.toLocaleString() : '—', color: 'var(--color-cyan)' },
                ].map(item => (
                    <div key={item.label} className="detail-item">
                        <div className="detail-item-label">{item.label}</div>
                        <div className="detail-item-value" style={{ color: item.color, fontSize: 22 }}>{item.value}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab${activeTab === 'overview' ? ' active' : ''}`} onClick={() => setActiveTab('overview')}>
                    📈 Performance History
                </button>
                <button className={`tab${activeTab === 'contests' ? ' active' : ''}`} onClick={() => setActiveTab('contests')}>
                    🏆 Contest History
                </button>
                <button className={`tab${activeTab === 'ranking' ? ' active' : ''}`} onClick={() => setActiveTab('ranking')}>
                    🌐 Ranking History
                </button>
            </div>

            {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Total Solved Chart */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Total Problems Solved Over Time</div>
                        </div>
                        {chartHistory.length > 0 ? (
                            <div style={{ height: 220 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartHistory}>
                                        <defs>
                                            <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="total_solved" name="Total Solved" stroke="#f59e0b" fill="url(#gTotal)" strokeWidth={2} dot={{ r: 3, strokeWidth: 2 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: 24 }}>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Not enough historical data. Refresh data on multiple days to see trends.</p>
                            </div>
                        )}
                    </div>

                    {/* Easy/Medium/Hard Chart */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Easy / Medium / Hard Progress</div>
                        </div>
                        {chartHistory.length > 0 ? (
                            <div style={{ height: 220 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartHistory}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: 12 }} />
                                        <Line type="monotone" dataKey="easy_solved" name="Easy" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="medium_solved" name="Medium" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                                        <Line type="monotone" dataKey="hard_solved" name="Hard" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: 24 }}>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>No history data yet.</p>
                            </div>
                        )}
                    </div>

                    {/* Daily submissions */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Daily Problems Solved</div>
                        </div>
                        {chartHistory.length > 0 ? (
                            <div style={{ height: 180 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartHistory}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                        <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Bar dataKey="today_solved" name="Today Solved" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="empty-state" style={{ padding: 24 }}>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>No data.</p>
                            </div>
                        )}
                    </div>

                    {/* History Table */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">📅 Daily History</div>
                        </div>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        {['Date', 'Total', 'Easy', 'Medium', 'Hard', 'Today', 'Yesterday', 'Contest', 'Rating', 'Ranking', 'Source'].map(h => (
                                            <th key={h}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(history || []).slice(0, 30).map(h => (
                                        <tr key={h.id}>
                                            <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{h.date}</td>
                                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{h.total_solved}</td>
                                            <td className="td-easy">{h.easy_solved}</td>
                                            <td className="td-medium">{h.medium_solved}</td>
                                            <td className="td-hard">{h.hard_solved}</td>
                                            <td><span className="td-today">{h.today_solved}</span></td>
                                            <td style={{ color: 'var(--color-text-secondary)' }}>{h.yesterday_solved}</td>
                                            <td className="td-contest">{h.contest_solved}/{h.contest_total}</td>
                                            <td className="td-rating">{h.contest_rating ? Math.round(h.contest_rating) : '—'}</td>
                                            <td className="td-ranking">{h.global_ranking ? h.global_ranking.toLocaleString() : '—'}</td>
                                            <td><span className={`badge ${h.data_source === 'manual' ? 'badge-warn' : 'badge-info'}`}>{h.data_source || 'auto'}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'contests' && (
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">🏆 Contest Participation</div>
                    </div>
                    {contests?.length > 0 ? (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        {['Contest Name', 'Date', 'Solved', 'Rating', 'Ranking'].map(h => <th key={h}>{h}</th>)}
                                    </tr>
                                </thead>
                                <tbody>
                                    {contests.map(c => (
                                        <tr key={c.id}>
                                            <td style={{ fontWeight: 600 }}>{c.contest_name}</td>
                                            <td style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.contest_date}</td>
                                            <td className="td-contest">{c.problems_solved}/{c.contest_total}</td>
                                            <td className="td-rating">{c.contest_rating ? Math.round(c.contest_rating) : '—'}</td>
                                            <td className="td-ranking">{c.contest_ranking ? c.contest_ranking.toLocaleString() : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: 24 }}>
                            <p style={{ color: 'var(--color-text-muted)' }}>No contest history. Refresh data to populate.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'ranking' && (
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">🌐 Global Ranking History</div>
                    </div>
                    {chartHistory.filter(h => h.global_ranking > 0).length > 0 ? (
                        <div style={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartHistory.filter(h => h.global_ranking > 0)}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} reversed={true} tickFormatter={v => v.toLocaleString()} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Line type="monotone" dataKey="global_ranking" name="Global Rank" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="empty-state" style={{ padding: 24 }}>
                            <p style={{ color: 'var(--color-text-muted)' }}>No ranking history yet.</p>
                        </div>
                    )}

                    {/* Ranking table */}
                    <div className="table-wrapper" style={{ marginTop: 16 }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Contest Rating</th>
                                    <th>Global Ranking</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(history || []).filter(h => h.global_ranking > 0).slice(0, 20).map(h => (
                                    <tr key={h.id}>
                                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{h.date}</td>
                                        <td className="td-rating">{h.contest_rating ? Math.round(h.contest_rating) : '—'}</td>
                                        <td className="td-ranking">{h.global_ranking.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {editing && (
                <ManualEditModal
                    student={student}
                    latestStats={latest}
                    onClose={() => setEditing(false)}
                    onSaved={() => { setEditing(false); load(); }}
                />
            )}
        </div>
    );
}
