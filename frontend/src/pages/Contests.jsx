import { useState, useEffect, useRef } from 'react';
import { Trophy, Medal, Star, Calendar, Clock, ExternalLink, Timer, Download } from 'lucide-react';
import { getLatestContest, getUpcomingContests } from '../services/api';
import { useDate } from '../context/DateContext';

// ── Live countdown timer hook ─────────────────────────────────────────────────
function useCountdown(targetMs) {
    const [diff, setDiff] = useState(targetMs - Date.now());
    useEffect(() => {
        const id = setInterval(() => setDiff(targetMs - Date.now()), 1000);
        return () => clearInterval(id);
    }, [targetMs]);
    return Math.max(0, diff);
}

function formatCountdown(ms) {
    const total = Math.floor(ms / 1000);
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const pad = n => String(n).padStart(2, '0');
    if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m ${pad(s)}s`;
    return `${pad(h)}h ${pad(m)}m ${pad(s)}s`;
}

// ── Countdown block ───────────────────────────────────────────────────────────
function ContestCountdown({ contest }) {
    const ms = useCountdown(contest.startTime);
    const started = ms === 0;

    const startLocal = new Date(contest.startTime).toLocaleString('en-IN', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
    });

    return (
        <div style={{
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(139,92,246,0.1))',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px 24px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            flexWrap: 'wrap'
        }}>
            <div style={{ width: 52, height: 52, background: 'var(--gradient-brand)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                {contest.title?.toLowerCase().includes('biweekly') ? '⚡' : '🏆'}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                    {contest.title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={12} /> {startLocal}
                </div>
            </div>
            <div style={{ textAlign: 'center' }}>
                {started ? (
                    <div style={{ background: 'var(--color-easy-bg)', border: '1px solid var(--color-easy)', color: 'var(--color-easy)', borderRadius: 'var(--radius-md)', padding: '8px 20px', fontWeight: 700 }}>
                        🟢 LIVE NOW
                    </div>
                ) : (
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Starts in</div>
                        <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--color-brand)' }}>
                            {formatCountdown(ms)}
                        </div>
                    </div>
                )}
            </div>
            {contest.slug && (
                <a
                    href={`https://leetcode.com/contest/${contest.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-sm"
                    style={{ textDecoration: 'none' }}
                >
                    <ExternalLink size={13} /> Register
                </a>
            )}
        </div>
    );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Contests() {
    const { selectedDate, selectedBatch } = useDate();
    const [weeklyData, setWeeklyData] = useState({ contest: null, data: [] });
    const [biweeklyData, setBiweeklyData] = useState({ contest: null, data: [] });
    const [activeTab, setActiveTab] = useState('weekly');
    const [upcoming, setUpcoming] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([getLatestContest(selectedDate || undefined, selectedBatch || undefined), getUpcomingContests()])
            .then(([contestRes, upcomingData]) => {
                setWeeklyData(contestRes.weekly || { contest: null, data: [] });
                setBiweeklyData(contestRes.biweekly || { contest: null, data: [] });
                setUpcoming(upcomingData.contests || []);
            })
            .catch(e => console.error(e))
            .finally(() => setLoading(false));
    }, [selectedDate, selectedBatch]);

    const currentView = activeTab === 'weekly' ? weeklyData : biweeklyData;
    const latestContest = currentView.contest;
    const summary = currentView.data || [];

    const getContestColor = (solved, total) => {
        const ratio = solved / (total || 4);
        if (ratio === 1) return 'var(--color-easy)';
        if (ratio >= 0.5) return 'var(--color-brand)';
        if (ratio > 0) return 'var(--color-medium)';
        return 'var(--color-text-muted)';
    };

    // If problems_solved is specifically 0, they attended but failed all.
    // If problems_solved is null, they did not participate.
    const participated = summary.filter(s => s.problems_solved !== null);
    const solvedZero = summary.filter(s => s.problems_solved === 0);
    const solvedAll = summary.filter(s => s.problems_solved >= 4);
    const nonParticipants = summary.filter(s => s.problems_solved === null);

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">🏆 Contests</h1>
                    <p className="page-desc">LeetCode Weekly & Biweekly Contest tracking</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary btn-sm" onClick={async () => {
                        const { exportExcel } = await import('../services/api');
                        exportExcel(activeTab === 'weekly' ? 'contest_weekly' : 'contest_biweekly', selectedDate || undefined);
                    }}>
                        <Download size={13} /> Excel
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={async () => {
                        const { exportCsv } = await import('../services/api');
                        exportCsv(activeTab === 'weekly' ? 'contest_weekly' : 'contest_biweekly', selectedDate || undefined);
                    }}>
                        <Download size={13} /> CSV
                    </button>
                </div>
            </div>

            {/* Upcoming Contests */}
            {upcoming.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 7 }}>
                        <Timer size={13} /> Upcoming Contests
                    </div>
                    {upcoming.map((c, i) => (
                        <ContestCountdown key={i} contest={c} />
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                <button
                    className="btn"
                    style={{
                        flex: 1,
                        background: activeTab === 'weekly' ? 'var(--color-brand)' : 'var(--color-bg-secondary)',
                        color: activeTab === 'weekly' ? '#fff' : 'var(--color-text-primary)',
                        border: `1px solid ${activeTab === 'weekly' ? 'var(--color-brand)' : 'var(--border-color)'}`,
                        justifyContent: 'center'
                    }}
                    onClick={() => setActiveTab('weekly')}
                >
                    Weekly Contests
                </button>
                <button
                    className="btn"
                    style={{
                        flex: 1,
                        background: activeTab === 'biweekly' ? 'var(--color-brand)' : 'var(--color-bg-secondary)',
                        color: activeTab === 'biweekly' ? '#fff' : 'var(--color-text-primary)',
                        border: `1px solid ${activeTab === 'biweekly' ? 'var(--color-brand)' : 'var(--border-color)'}`,
                        justifyContent: 'center'
                    }}
                    onClick={() => setActiveTab('biweekly')}
                >
                    Biweekly Contests
                </button>
            </div>

            {loading ? (
                <div className="empty-state"><div className="spinner spinner-lg"></div></div>
            ) : !latestContest ? (
                <div className="empty-state">
                    <div className="empty-state-icon"><Trophy size={28} /></div>
                    <div className="empty-state-title">No contest data yet</div>
                    <div className="empty-state-desc">Refresh LeetCode data to populate contest information</div>
                </div>
            ) : (
                <>
                    {/* Last Contest Header */}
                    <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(6,182,212,0.05))', border: '1px solid rgba(139,92,246,0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg,#8b5cf6,#06b6d4)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🎯</div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Last Tracked Contest</div>
                                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>{latestContest.contest_name}</div>
                                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                        <Calendar size={15} /> {latestContest.contest_date || 'Latest'}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                        <Star size={13} /> {participated.length} participated
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="stat-cards" style={{ marginBottom: 20 }}>
                        {[
                            { label: 'Participants', value: participated.length, color: 'blue', icon: Star },
                            { label: 'Solved All (4/4)', value: solvedAll.length, color: 'green', icon: Trophy },
                            { label: 'Attended (0/4)', value: solvedZero.length, color: 'medium', icon: Trophy },
                            { label: 'Non-Participants', value: nonParticipants.length, color: 'hard', icon: Medal },
                        ].map(({ label, value, color, icon: Icon }) => (
                            <div key={label} className={`stat-card ${color}`}>
                                <div className={`stat-icon ${color}`}><Icon size={18} /></div>
                                <div className="stat-label">{label}</div>
                                <div className="stat-value">{value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Contest Table */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">Student Contest Performance</div>
                            <span className="badge badge-purple">{summary.length} students</span>
                        </div>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Rank</th>
                                        <th>Register No</th>
                                        <th>Name</th>
                                        <th>Department</th>
                                        <th>Problems Solved</th>
                                        <th>Contest Rating</th>
                                        <th>Contest Rank</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.map((s, i) => (
                                        <tr key={s.reg_no || i}>
                                            <td className={`td-rank${i < 3 && s.problems_solved !== null && s.problems_solved > 0 ? ' top-3' : ''}`}>
                                                {s.problems_solved !== null && s.problems_solved > 0 ? (i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1) : '—'}
                                            </td>
                                            <td className="td-reg">{s.reg_no}</td>
                                            <td className="td-name">{s.name}</td>
                                            <td><span className="td-dept">{s.department || '—'}</span></td>
                                            <td>
                                                {s.problems_solved !== null ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-easy)' }}>✅ Registered</span>
                                                        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: getContestColor(s.problems_solved, s.contest_total || 4) }}>
                                                            {s.problems_solved}/{s.contest_total || 4} Solved
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span style={{ color: 'var(--color-error)', fontWeight: 600, fontSize: 13, padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 4 }}>
                                                        ❌ Not Registered
                                                    </span>
                                                )}
                                            </td>
                                            <td className="td-rating">{s.contest_rating ? Math.round(s.contest_rating) : '—'}</td>
                                            <td className="td-ranking">{s.contest_ranking ? s.contest_ranking.toLocaleString() : '—'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
