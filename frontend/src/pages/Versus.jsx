import { useState, useEffect } from 'react';
import { getStudents, getStudent } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Swords } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Versus() {
    const [allStudents, setAllStudents] = useState([]);
    const [student1_id, setStudent1_id] = useState('');
    const [student2_id, setStudent2_id] = useState('');

    const [stud1, setStud1] = useState(null);
    const [stud2, setStud2] = useState(null);

    useEffect(() => {
        getStudents({ sortDir: 'ASC' }).then(res => {
            setAllStudents(res.students || []);
        });
    }, []);

    useEffect(() => {
        if (student1_id) {
            getStudent(student1_id).then(res => setStud1(res.latest)).catch(() => toast.error("Failed to fetch Student 1 limit data"));
        } else {
            setStud1(null);
        }
    }, [student1_id]);

    useEffect(() => {
        if (student2_id) {
            getStudent(student2_id).then(res => setStud2(res.latest)).catch(() => toast.error("Failed to fetch Student 2 limit data"));
        } else {
            setStud2(null);
        }
    }, [student2_id]);

    const chartData = stud1 && stud2 ? [
        { name: 'Total Solved', S1: stud1.total_solved || 0, S2: stud2.total_solved || 0 },
        { name: 'Easy', S1: stud1.easy_solved || 0, S2: stud2.easy_solved || 0 },
        { name: 'Medium', S1: stud1.medium_solved || 0, S2: stud2.medium_solved || 0 },
        { name: 'Hard', S1: stud1.hard_solved || 0, S2: stud2.hard_solved || 0 },
        { name: 'Recent (Last 2 Days)', S1: (stud1.today_solved || 0) + (stud1.yesterday_solved || 0), S2: (stud2.today_solved || 0) + (stud2.yesterday_solved || 0) },
        { name: 'Contest Solved', S1: stud1.contest_solved || 0, S2: stud2.contest_solved || 0 }
    ] : [];

    return (
        <div>
            <div className="page-header" style={{ marginBottom: 20 }}>
                <h1><Swords size={24} style={{ position: 'relative', top: 4, marginRight: 8, color: 'var(--color-brand)' }} /> Peer-to-Peer Versus</h1>
                <p>Compare two students' performance metrics head-to-head.</p>
            </div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 30 }}>
                {/* Student 1 Selection */}
                <div style={{ flex: 1, backgroundColor: 'var(--color-bg-secondary)', padding: 16, borderRadius: 12, borderTop: '4px solid var(--color-blue)' }}>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 600 }}>STUDENT A</label>
                    <select className="form-input" value={student1_id} onChange={e => setStudent1_id(e.target.value)}>
                        <option value="">-- Select Student A --</option>
                        {allStudents.map(s => <option key={s.id} value={s.id}>{s.reg_no} - {s.name}</option>)}
                    </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold', fontSize: 24, color: 'var(--color-text-muted)' }}>
                    VS
                </div>

                {/* Student 2 Selection */}
                <div style={{ flex: 1, backgroundColor: 'var(--color-bg-secondary)', padding: 16, borderRadius: 12, borderTop: '4px solid var(--color-purple)' }}>
                    <label style={{ display: 'block', marginBottom: 8, color: 'var(--color-text-secondary)', fontSize: 12, fontWeight: 600 }}>STUDENT B</label>
                    <select className="form-input" value={student2_id} onChange={e => setStudent2_id(e.target.value)}>
                        <option value="">-- Select Student B --</option>
                        {allStudents.map(s => <option key={s.id} value={s.id}>{s.reg_no} - {s.name}</option>)}
                    </select>
                </div>
            </div>

            {stud1 && stud2 ? (
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">Performance Comparison</div>
                    </div>
                    <div style={{ height: 400 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#2a3f5f" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                                <YAxis tick={{ fill: '#94a3b8' }} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} />
                                <Legend />
                                <Bar dataKey="S1" name="Student A" fill="var(--color-blue)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="S2" name="Student B" fill="var(--color-purple)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="empty-state" style={{ height: 300 }}>
                    <div className="empty-state-icon"><Swords size={32} /></div>
                    <p style={{ marginTop: 12, color: 'var(--color-text-muted)' }}>Select two students from the dropdowns above to compare performance.</p>
                </div>
            )}
        </div>
    );
}
