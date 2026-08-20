import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, ChevronUp, ChevronDown, RefreshCw, Edit2, ExternalLink,
    Loader2, Filter, Download, MoreVertical
} from 'lucide-react';
import { deleteStudent } from '../services/api';
import toast from 'react-hot-toast';
import StudentDataModal from '../components/ManualEditModal';
import { useDate } from '../context/DateContext';

function SortIcon({ field, sortBy, sortDir }) {
    if (sortBy !== field) return <span className="sort-arrow">↕</span>;
    return sortDir === 'DESC'
        ? <span className="sort-arrow active">↓</span>
        : <span className="sort-arrow active">↑</span>;
}

export default function Students() {
    const navigate = useNavigate();
    const { selectedDate, selectedBatch } = useDate();
    const [students, setStudents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [department, setDepartment] = useState('');
    const [sortBy, setSortBy] = useState('total_solved');
    const [sortDir, setSortDir] = useState('DESC');
    const [showBanned, setShowBanned] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [refreshingId, setRefreshingId] = useState(null);
    const searchTimeout = useRef(null);

    const loadStudents = useCallback(async () => {
        setLoading(true);
        try {
            const { getStudents } = await import('../services/api');
            const result = await getStudents({
                search: search || undefined,
                department: department || undefined,
                batch: selectedBatch || undefined,
                sortBy, sortDir,
                date: selectedDate || undefined,
                banned: showBanned
            });
            setStudents(result.students || []);
        } catch (e) {
            toast.error('Failed to load students');
        } finally {
            setLoading(false);
        }
    }, [search, department, sortBy, sortDir, selectedDate, selectedBatch, showBanned]);

    useEffect(() => {
        import('../services/api').then(({ getDepartments }) => {
            getDepartments().then(r => setDepartments(r.departments || [])).catch(() => { });
        });
    }, []);

    useEffect(() => {
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = setTimeout(loadStudents, 300);
        return () => clearTimeout(searchTimeout.current);
    }, [loadStudents]);

    const handleSort = (field) => {
        if (sortBy === field) {
            setSortDir(d => d === 'DESC' ? 'ASC' : 'DESC');
        } else {
            setSortBy(field);
            setSortDir('DESC');
        }
    };

    const handleRefreshStudent = async (e, student) => {
        e.stopPropagation();
        setRefreshingId(student.id);
        try {
            const { refreshStudent } = await import('../services/api');
            await refreshStudent(student.id);
            toast.success(`Refreshed: ${student.name}`);
            loadStudents();
        } catch (e) {
            toast.error(`Failed: ${e.response?.data?.message || e.message}`);
        } finally {
            setRefreshingId(null);
        }
    };

    const handleBanToggle = async (e, student) => {
        e.stopPropagation();
        const action = student.is_banned ? 'unban' : 'ban';
        if (window.confirm(`Are you sure you want to ${action} ${student.name}?`)) {
            try {
                const { banStudent } = await import('../services/api');
                await banStudent(student.id, !student.is_banned);
                toast.success(`Student ${action}ned successfully`);
                loadStudents();
            } catch (e) {
                toast.error(`Failed to ${action} student`);
            }
        }
    };

    const handleViewProfile = (e, student) => {
        e.stopPropagation();
        const url = student.leetcode_profile_url;
        if (url) {
            if (window.electronAPI) {
                window.electronAPI.openExternal(url);
            } else {
                window.open(url, '_blank');
            }
        }
    };

    const handleEditSaved = () => {
        setEditingStudent(null);
        setIsAddingMode(false);
        loadStudents();
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this student and all their history?")) {
            try {
                await deleteStudent(id);
                toast.success('Student deleted');
                loadStudents();
            } catch (e) {
                toast.error('Failed to delete student: ' + e.message);
            }
        }
    };

    const cols = [
        { key: 'rank', label: 'Rank', sortable: false },
        { key: 'reg_no', label: 'Register No', sortable: true },
        { key: 'name', label: 'Student Name', sortable: true },
        { key: 'department', label: 'Department', sortable: false },
        { key: 'batch', label: 'Batch', sortable: false },
        { key: 'languages', label: 'Languages', sortable: false },
        { key: 'badges', label: 'Badge', sortable: false },
        { key: 'total_solved', label: 'Total', sortable: true },
        { key: 'needed', label: 'Needed', sortable: false },
        { key: 'easy_solved', label: 'Easy', sortable: true },
        { key: 'medium_solved', label: 'Medium', sortable: true },
        { key: 'hard_solved', label: 'Hard', sortable: true },
        { key: 'yesterday_solved', label: 'Yesterday', sortable: true },
        { key: 'today_solved', label: 'Today', sortable: true },
        { key: 'contest_solved', label: 'Contest', sortable: true },
        { key: 'contest_rating', label: 'Rating', sortable: true },
        { key: 'global_ranking', label: 'Ranking', sortable: true },
        { key: 'actions', label: 'Action', sortable: false }
    ];

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">👥 Students</h1>
                    <p className="page-desc">{students.length} students • {department || 'All Departments'}</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-primary btn-sm" onClick={() => setIsAddingMode(true)}>
                        ➕ Add Student
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={async () => {
                        const { exportExcel } = await import('../services/api');
                        exportExcel('daily', selectedDate || undefined);
                    }}>
                        <Download size={13} /> Excel
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={async () => {
                        const { exportCsv } = await import('../services/api');
                        exportCsv(selectedDate || undefined);
                    }}>
                        <Download size={13} /> CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="filters-row">
                <div className="search-bar" style={{ flex: 1, maxWidth: 280 }}>
                    <Search className="search-icon" />
                    <input
                        className="form-input"
                        placeholder="Search Reg No or Student Name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <select className="form-select" style={{ width: 140 }} value={showBanned ? 'true' : 'false'} onChange={e => setShowBanned(e.target.value === 'true')}>
                    <option value="false">Active Students</option>
                    <option value="true">Banned Students</option>
                </select>

                <select className="form-select" style={{ width: 160 }} value={department} onChange={e => setDepartment(e.target.value)}>
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select className="form-select" style={{ width: 160 }} value={sortBy} onChange={e => { setSortBy(e.target.value); }}>
                    <option value="total_solved">Sort: Total Solved</option>
                    <option value="easy_solved">Sort: Easy</option>
                    <option value="medium_solved">Sort: Medium</option>
                    <option value="hard_solved">Sort: Hard</option>
                    <option value="yesterday_solved">Sort: Yesterday</option>
                    <option value="today_solved">Sort: Today</option>
                    <option value="contest_solved">Sort: Contest</option>
                    <option value="contest_rating">Sort: Contest Rating</option>
                    <option value="global_ranking">Sort: Global Ranking</option>
                </select>
            </div>

            {/* Table */}
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            {cols.map(col => (
                                <th
                                    key={col.key}
                                    className={`${
                                        sortBy === col.key ? 'sorted' : ''
                                    } ${
                                        col.key === 'actions' ? 'actions-col-th' : ''
                                    } ${
                                        col.key === 'name' ? 'sticky-name-th' : ''
                                    }`}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                    style={{ cursor: col.sortable ? 'pointer' : 'default' }}
                                >
                                    {col.label}
                                    {col.sortable && <SortIcon field={col.key} sortBy={sortBy} sortDir={sortDir} />}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={14} style={{ textAlign: 'center', padding: '40px' }}>
                                    <div className="spinner"></div>
                                </td>
                            </tr>
                        ) : students.length === 0 ? (
                            <tr>
                                <td colSpan={14}>
                                    <div className="empty-state">
                                        <div className="empty-state-icon"><Search size={28} /></div>
                                        <div className="empty-state-title">No students found</div>
                                        <div className="empty-state-desc">Try adjusting your search or import an Excel file</div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            students.map((s, i) => (
                                <tr
                                    key={s.id}
                                    className="row-clickable"
                                    onClick={() => navigate(`/students/${s.id}`)}
                                >
                                    <td>
                                        <span className={`td-rank${i < 3 ? ' top-3' : ''}`}>
                                            {i < 3 ? ['🥇', '🥈', '🥉'][i] : s.rank}
                                        </span>
                                    </td>
                                    <td>
                                        {s.leetcode_profile_url ? (
                                            <a 
                                                href={s.leetcode_profile_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="td-reg"
                                                style={{ color: 'var(--color-blue)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
                                                title="Open LeetCode Profile"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {s.reg_no} <ExternalLink size={10} style={{ display: 'inline', marginBottom: 2 }} />
                                            </a>
                                        ) : (
                                            <span className="td-reg">{s.reg_no}</span>
                                        )}
                                    </td>
                                    <td className="sticky-name-td">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                            <span className="td-name">{s.name}</span>
                                            {s.admin_tags && (
                                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                                    {s.admin_tags.split(',').map(t => t.trim()).filter(Boolean).map(tag => (
                                                        <span key={tag} style={{ fontSize: 9, padding: '2px 6px', backgroundColor: 'rgba(59,130,246,0.2)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 4, fontWeight: 500 }}>
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td><span className="td-dept">{s.department || '—'}</span></td>
                                    <td><span className="td-dept" style={{ color: 'var(--color-purple)' }}>{s.batch || '—'}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', minWidth: 120 }}>
                                            {(() => {
                                                try {
                                                    const langs = JSON.parse(s.language_stats || '[]');
                                                    if (!langs.length) return <span className="td-dept">—</span>;
                                                    // Show top 3 languages
                                                    return langs.slice(0, 3).map(l => (
                                                        <span key={l.languageName} style={{ fontSize: 10, padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, whiteSpace: 'nowrap' }}>
                                                            {l.languageName}: <strong style={{ color: 'var(--color-brand)' }}>{l.problemsSolved}</strong>
                                                        </span>
                                                    ));
                                                } catch {
                                                    return <span className="td-dept">—</span>;
                                                }
                                            })()}
                                        </div>
                                    </td>
                                    <td>
                                        {s.badges
                                            ? <span style={{ fontSize: 11, padding: '3px 8px', background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(168,85,247,0.2))', color: 'var(--color-purple)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 99, fontWeight: 600, whiteSpace: 'nowrap' }}>🏅 {s.badges}</span>
                                            : <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>—</span>
                                        }
                                    </td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                                        {(s.total_solved || 0).toLocaleString()}
                                    </td>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--color-hard)' }}>
                                        {Math.max(0, 200 - (s.total_solved || 0))}
                                    </td>
                                    <td><span className="td-easy">{s.easy_solved || 0}</span></td>
                                    <td><span className="td-medium">{s.medium_solved || 0}</span></td>
                                    <td><span className="td-hard">{s.hard_solved || 0}</span></td>
                                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>{s.yesterday_solved || 0}</td>
                                    <td><span className="td-today">{s.today_solved || 0}</span></td>
                                    <td>
                                        <span className="td-contest">
                                            {s.contest_solved || 0}/{s.contest_total || 4}
                                        </span>
                                    </td>
                                    <td><span className="td-rating">{s.contest_rating ? Math.round(s.contest_rating) : '—'}</span></td>
                                    <td><span className="td-ranking">{s.global_ranking ? s.global_ranking.toLocaleString() : '—'}</span></td>
                                    <td className="actions-col-td">
                                        <div className="td-actions" onClick={e => e.stopPropagation()}>
                                            <button
                                                className="btn btn-secondary btn-sm btn-icon"
                                                title="Refresh data"
                                                onClick={(e) => handleRefreshStudent(e, s)}
                                                disabled={refreshingId === s.id}
                                            >
                                                {refreshingId === s.id
                                                    ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                                                    : <RefreshCw size={12} />
                                                }
                                            </button>
                                            <button
                                                className="btn btn-secondary btn-sm btn-icon"
                                                title="View LeetCode profile"
                                                onClick={(e) => handleViewProfile(e, s)}
                                            >
                                                <ExternalLink size={12} />
                                            </button>
                                            <button
                                                className="btn btn-secondary btn-sm btn-icon"
                                                title="Edit data"
                                                onClick={(e) => { e.stopPropagation(); setEditingStudent(s); }}
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                className="btn btn-secondary btn-sm btn-icon"
                                                title={s.is_banned ? "Unban student" : "Ban student"}
                                                onClick={(e) => handleBanToggle(e, s)}
                                                style={{ color: s.is_banned ? 'var(--color-easy)' : 'var(--color-medium)' }}
                                            >
                                                <span style={{ fontSize: 13, fontWeight: "bold" }}>{s.is_banned ? '✓' : '🚫'}</span>
                                            </button>
                                            <button
                                                className="btn btn-secondary btn-sm btn-icon"
                                                title="Delete student"
                                                onClick={(e) => handleDelete(e, s.id)}
                                                style={{ color: 'var(--color-hard)' }}
                                            >
                                                <span style={{ fontSize: 13, fontWeight: "bold", paddingBottom: 2 }}>×</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add / Edit Modal */}
            {(editingStudent || isAddingMode) && (
                <StudentDataModal
                    student={editingStudent}
                    onClose={() => {
                        setEditingStudent(null);
                        setIsAddingMode(false);
                    }}
                    onSaved={handleEditSaved}
                />
            )}
        </div>
    );
}
