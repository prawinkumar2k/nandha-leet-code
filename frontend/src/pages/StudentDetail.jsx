import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft, ExternalLink, RefreshCw, Edit2, Trophy,
    Target, Zap, Globe, Star, TrendingUp, Calendar, BookOpen
} from 'lucide-react';
import {
    LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
    PieChart, Pie, Cell
} from 'recharts';
import { getStudent, refreshStudent, verifyStudent, getHistoricStats } from '../services/api';
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
    const [verifyData, setVerifyData] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const [heatmapData, setHeatmapData] = useState([]);

    const loadHeatmap = async () => {
        try {
            const hStats = await getHistoricStats(id);
            setHeatmapData(hStats.data || []);
        } catch (e) {
            console.error("Failed to load historic stats");
        }
    };

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

    useEffect(() => { load(); loadHeatmap(); }, [id]);

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

    const skillData = [
        { subject: 'Fundamentals', A: student.fundamental_solved || 0, fullMark: 100 },
        { subject: 'Intermediate', A: student.intermediate_solved || 0, fullMark: 100 },
        { subject: 'Advanced', A: student.advanced_solved || 0, fullMark: 100 },
    ];

    let languagesData = [];
    try {
        if (student.language_stats) {
            const parsed = typeof student.language_stats === 'string' ? JSON.parse(student.language_stats) : student.language_stats;
            if (Array.isArray(parsed)) languagesData = parsed;
        }
    } catch (e) { }

    let recentSubmissions = [];
    try {
        if (student.recent_submissions) {
            const parsed = typeof student.recent_submissions === 'string' ? JSON.parse(student.recent_submissions) : student.recent_submissions;
            if (Array.isArray(parsed)) recentSubmissions = parsed;
        }
    } catch (e) { }

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
                        <span className="student-meta-item">
                            <Globe size={12} />
                            {student.top_language || 'General'}
                        </span>
                        {student.badges && student.badges !== '[]' && (
                            <span className="student-meta-item" style={{ color: 'var(--color-brand)' }}>
                                <Trophy size={12} />
                                {(() => {
                                    try { return JSON.parse(student.badges).length; }
                                    catch { return 0; }
                                })()} Badges
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
                    { label: 'Acceptance Rate', value: latest?.acceptance_rate ? `${latest.acceptance_rate}%` : '—', color: (latest?.acceptance_rate >= 70 ? 'var(--color-easy)' : latest?.acceptance_rate >= 40 ? 'var(--color-medium)' : 'var(--color-hard)') },
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
                <button className={`tab${activeTab === 'verify' ? ' active' : ''}`} onClick={() => setActiveTab('verify')}>
                    🔍 Verify Data
                </button>
            </div>

            {activeTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Consistency Heatmap */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Activity Last 365 Days</div>
                        </div>
                        <div style={{ overflowX: 'auto', padding: '10px 0' }}>
                            <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 10px)', gridAutoFlow: 'column', gap: 3, paddingBottom: 10 }}>
                                {Array.from({ length: 365 }).map((_, i) => {
                                    const d = new Date();
                                    d.setDate(d.getDate() - (364 - i));
                                    const dateStr = d.toISOString().split('T')[0];
                                    const record = heatmapData.find(x => x.date === dateStr);
                                    const count = record ? record.today_solved : 0;

                                    let level = 'var(--color-bg-secondary)'; // 0 solved
                                    if (count > 0 && count <= 2) level = 'rgba(16, 185, 129, 0.3)'; // light green
                                    else if (count > 2 && count <= 5) level = 'rgba(16, 185, 129, 0.6)';
                                    else if (count > 5) level = 'rgba(16, 185, 129, 1)'; // full green

                                    return (
                                        <div
                                            key={i}
                                            title={`${dateStr}: ${count} problems solved`}
                                            style={{
                                                width: 10, height: 10, backgroundColor: level,
                                                borderRadius: 2, border: count === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none'
                                            }}
                                        />
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: 10, color: 'var(--color-text-muted)', gap: 4, alignItems: 'center' }}>
                                Less
                                <span style={{ width: 10, height: 10, background: 'var(--color-bg-secondary)', borderRadius: 2 }}></span>
                                <span style={{ width: 10, height: 10, background: 'rgba(16, 185, 129, 0.3)', borderRadius: 2 }}></span>
                                <span style={{ width: 10, height: 10, background: 'rgba(16, 185, 129, 0.6)', borderRadius: 2 }}></span>
                                <span style={{ width: 10, height: 10, background: 'rgba(16, 185, 129, 1)', borderRadius: 2 }}></span>
                                More
                            </div>
                        </div>
                    </div>

                    {/* Recent Performance Details & Radar */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* Skill Breakdown Radar Chart */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title"><BookOpen size={18} style={{ marginRight: 8, display: 'inline' }} /> DSA Skill Breakdown</div>
                            </div>
                            <div style={{ height: 250 }}>
                                {(student?.fundamental_solved || student?.intermediate_solved || student?.advanced_solved) ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={skillData}>
                                            <PolarGrid stroke="#1e3a5f" />
                                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                            <PolarRadiusAxis angle={30} domain={[0, 'dataMax + 10']} tick={false} axisLine={false} />
                                            <Radar name="Solved" dataKey="A" stroke="var(--color-purple)" fill="var(--color-purple)" fillOpacity={0.5} />
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: 8 }} itemStyle={{ color: '#f8fafc' }} />
                                        </RadarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="empty-state" style={{ height: '100%' }}>
                                        <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>No strict DSA tag classification available</p>
                                    </div>
                                )}
                            </div>
                        </div>

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
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>Not enough historical data.</p>
                                </div>
                            )}
                        </div>
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

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* Contest Rating Trends */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title"><Trophy size={18} style={{ marginRight: 8, display: 'inline', color: 'var(--color-brand)' }} /> Contest Rating Trends</div>
                            </div>
                            {chartHistory.some(c => c.contest_rating > 0) ? (
                                <div style={{ height: 220 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={chartHistory}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                                            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} domain={['auto', 'auto']} />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Line type="monotone" dataKey="contest_rating" name="Rating" stroke="var(--color-brand)" strokeWidth={2} dot={{ r: 3 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="empty-state" style={{ padding: 24 }}>
                                    <p style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>No contest participation recorded.</p>
                                </div>
                            )}
                        </div>

                        {/* Daily submissions */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Daily Problems Solved</div>
                            </div>
                            {chartHistory.length > 0 ? (
                                <div style={{ height: 220 }}>
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
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {/* Language Mix Breakdown */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">Top Languages Used</div>
                            </div>
                            {languagesData.length > 0 ? (
                                <div style={{ height: 220 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={languagesData} dataKey="problemsSolved" nameKey="languageName" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5}>
                                                {languagesData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} itemStyle={{ color: '#f8fafc' }} />
                                            <Legend wrapperStyle={{ fontSize: 11 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="empty-state" style={{ padding: 24 }}><p>No languages recorded.</p></div>
                            )}
                        </div>

                        {/* Recent Problems Solved Feed */}
                        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div className="card-header">
                                <div className="card-title">Recent Problems (Live)</div>
                            </div>
                            <div style={{ padding: 16, flex: 1, overflowY: 'auto', maxHeight: 220 }}>
                                {recentSubmissions.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {recentSubmissions.map((sub, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-easy)' }}></div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{sub.title}</div>
                                                    <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                                                        {sub.timestamp ? new Date(sub.timestamp * 1000).toLocaleString() : 'Unknown date'}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="empty-state" style={{ height: '100%' }}><p>No recent activity detected.</p></div>
                                )}
                            </div>
                        </div>
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

            {activeTab === 'verify' && (
                <div className="card">
                    <div className="card-header" style={{ marginBottom: 12 }}>
                        <div>
                            <div className="card-title">🔍 Data Verification</div>
                            <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                                Fetches live data from LeetCode and compares with what LEO has stored.
                            </p>
                        </div>
                        <button
                            className="btn btn-primary btn-sm"
                            disabled={verifying}
                            onClick={async () => {
                                setVerifying(true);
                                setVerifyData(null);
                                try {
                                    const r = await verifyStudent(id);
                                    setVerifyData(r);
                                } catch (e) {
                                    setVerifyData({ error: e.response?.data?.message || e.message });
                                } finally {
                                    setVerifying(false);
                                }
                            }}
                        >
                            {verifying ? <><div className="spinner" style={{ width: 12, height: 12 }} /> Fetching...</> : '⚡ Run Verify'}
                        </button>
                    </div>

                    {!verifyData && !verifying && (
                        <div className="empty-state" style={{ padding: 32 }}>
                            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
                            <div className="empty-state-title">Click "Run Verify" to check</div>
                            <div className="empty-state-desc">Compares LEO's stored data with live LeetCode data</div>
                        </div>
                    )}

                    {verifyData?.error && (
                        <div className="alert alert-error" style={{ marginTop: 8 }}>
                            ❌ {verifyData.error}
                        </div>
                    )}

                    {verifyData && !verifyData.error && (() => {
                        const { live, stored } = verifyData;
                        const rows = [
                            { label: 'Total Solved', live: live.total_solved, stored: stored?.total_solved },
                            { label: 'Easy Solved', live: live.easy_solved, stored: stored?.easy_solved },
                            { label: 'Medium Solved', live: live.medium_solved, stored: stored?.medium_solved },
                            { label: 'Hard Solved', live: live.hard_solved, stored: stored?.hard_solved },
                            { label: 'Contest Rating', live: live.contest_rating ? Math.round(live.contest_rating) : 0, stored: stored?.contest_rating ? Math.round(stored.contest_rating) : 0 },
                            { label: 'Global Ranking', live: live.global_ranking, stored: stored?.global_ranking },
                            { label: 'Latest Contest Solved', live: live.contest_solved, stored: stored?.contest_solved },
                        ];
                        const allMatch = rows.every(r => String(r.live) === String(r.stored ?? ''));
                        return (
                            <div>
                                <div className={`alert ${allMatch ? 'alert-success' : 'alert-warn'}`} style={{ marginBottom: 12 }}>
                                    {allMatch
                                        ? '✅ All data matches! LEO data is accurate.'
                                        : '⚠️ Some values differ between LEO and LeetCode live data. Refresh to sync.'}
                                </div>
                                <div className="table-wrapper">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Field</th>
                                                <th>🌐 LeetCode (Live)</th>
                                                <th>💾 LEO (Stored)</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map(row => {
                                                const match = String(row.live) === String(row.stored ?? '');
                                                return (
                                                    <tr key={row.label} style={!match ? { background: 'rgba(239,68,68,0.07)' } : {}}>
                                                        <td style={{ fontWeight: 600, fontSize: 13 }}>{row.label}</td>
                                                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--color-brand)' }}>
                                                            {row.live ?? '—'}
                                                        </td>
                                                        <td style={{ fontFamily: 'var(--font-mono)', color: match ? 'var(--color-text-primary)' : 'var(--color-hard)' }}>
                                                            {row.stored ?? '—'}
                                                        </td>
                                                        <td>
                                                            {match
                                                                ? <span style={{ color: 'var(--color-easy)', fontWeight: 700 }}>✅ Match</span>
                                                                : <span style={{ color: 'var(--color-hard)', fontWeight: 700 }}>⚠️ Mismatch</span>}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ marginTop: 10, fontSize: 11, color: 'var(--color-text-muted)' }}>
                                    Live data fetched at: {new Date().toLocaleString()} • Stored data from: {stored?.date || 'N/A'}
                                </div>
                            </div>
                        );
                    })()}
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
