import { useState, useEffect } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { updateStudent, createStudent } from '../services/api';
import toast from 'react-hot-toast';

export default function StudentDataModal({ student, onClose, onSaved }) {
    const isNew = !student;

    const [form, setForm] = useState({
        reg_no: student?.reg_no || '',
        name: student?.name || '',
        department: student?.department || '',
        batch: student?.batch || '',
        leetcode_profile_url: student?.leetcode_profile_url || '',
        admin_tags: student?.admin_tags || ''
    });
    const [saving, setSaving] = useState(false);

    const handleChange = (field, val) => {
        setForm(prev => ({ ...prev, [field]: val }));
    };

    const handleSave = async () => {
        if (!form.reg_no || !form.name) {
            toast.error("Register Number and Name are required");
            return;
        }

        setSaving(true);
        try {
            if (isNew) {
                await createStudent(form);
                toast.success('Student created successfully');
            } else {
                await updateStudent(student.id, form);
                toast.success('Student data updated successfully');
            }
            onSaved();
        } catch (e) {
            toast.error(e.response?.data?.message || e.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">{isNew ? '➕ Add New Student' : '✏️ Edit Student Profile'}</div>
                    <button className="modal-close" onClick={onClose}><X size={20} /></button>
                </div>

                {!isNew && (
                    <div style={{ marginBottom: 16, padding: '10px 12px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--color-blue)' }}>
                        ℹ️ Editing: <strong>{student.name}</strong> ({student.reg_no})
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                        <label className="form-label" style={{ color: 'var(--color-text-primary)' }}>Register Number *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={form.reg_no}
                            placeholder="e.g. 732221CS001"
                            onChange={e => handleChange('reg_no', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ color: 'var(--color-text-primary)' }}>Student Name *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={form.name}
                            placeholder="e.g. John Doe"
                            onChange={e => handleChange('name', e.target.value)}
                        />
                    </div>
                    <div className="form-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div>
                            <label className="form-label" style={{ color: 'var(--color-text-primary)' }}>Department</label>
                            <input
                                type="text"
                                className="form-input"
                                value={form.department}
                                placeholder="e.g. CSE"
                                onChange={e => handleChange('department', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="form-label" style={{ color: 'var(--color-text-primary)' }}>Batch</label>
                            <input
                                type="text"
                                className="form-input"
                                value={form.batch}
                                placeholder="e.g. 2021-2025"
                                onChange={e => handleChange('batch', e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ color: 'var(--color-text-primary)' }}>LeetCode Profile URL</label>
                        <input
                            type="text"
                            className="form-input"
                            value={form.leetcode_profile_url}
                            placeholder="https://leetcode.com/u/username"
                            onChange={e => handleChange('leetcode_profile_url', e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label" style={{ color: 'var(--color-text-primary)' }}>🏷️ Admin Tags (Comma separated)</label>
                        <input
                            type="text"
                            className="form-input"
                            value={form.admin_tags}
                            placeholder="e.g. Needs_Help, Placement_Ready"
                            onChange={e => handleChange('admin_tags', e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                        {saving ? <><div className="spinner" style={{ width: 12, height: 12 }}></div> Saving...</>
                            : <><Save size={13} /> {isNew ? 'Create Student' : 'Save Changes'}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
