import { useState, useEffect } from 'react';
import { Settings, Database, Save, HardDrive, RefreshCw, AlertTriangle } from 'lucide-react';
import { getSettings, saveSettings, backupDatabase, getBackups } from '../services/api';
import toast from 'react-hot-toast';

export default function SettingsPage() {
    const [settings, setSettings] = useState({});
    const [dbPath, setDbPath] = useState('');
    const [backups, setBackups] = useState([]);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [backing, setBacking] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const result = await getSettings();
            setSettings(result.settings || {});
            setDbPath(result.dbPath || '');
            const backupsResult = await getBackups();
            setBackups(backupsResult.backups || []);
        } catch (e) {
            toast.error('Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveSettings(settings);
            toast.success('Settings saved');
        } catch (e) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleBackup = async () => {
        setBacking(true);
        try {
            const result = await backupDatabase();
            if (result.success) {
                toast.success(`Database backed up: ${result.filename}`);
                loadSettings(); // Refresh backup list
            } else {
                toast.error(result.message);
            }
        } catch (e) {
            toast.error('Backup failed: ' + e.message);
        } finally {
            setBacking(false);
        }
    };

    const settingFields = [
        { key: 'app_theme', label: 'Theme', type: 'select', options: ['dark', 'light'], default: 'dark' },
        { key: 'default_department', label: 'Default Department Filter', type: 'text', placeholder: 'e.g. AI&DS' },
        { key: 'refresh_concurrency', label: 'Refresh Concurrency (requests at once)', type: 'number', placeholder: '4', min: 1, max: 10 },
        { key: 'refresh_delay_ms', label: 'Delay Between Batches (ms)', type: 'number', placeholder: '500', min: 100, max: 5000 },
        { key: 'low_activity_threshold', label: 'Low Activity Threshold (problems/day)', type: 'number', placeholder: '0' },
    ];

    if (loading) {
        return (
            <div className="empty-state">
                <div className="spinner spinner-lg"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">⚙️ Settings</h1>
                    <p className="page-desc">Application configuration and database management</p>
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                    {saving ? <div className="spinner" style={{ width: 14, height: 14 }}></div> : <Save size={14} />}
                    Save Settings
                </button>
            </div>

            <div className="grid-2">
                {/* App Settings */}
                <div className="card">
                    <div className="card-header">
                        <div className="card-title">🔧 Application Settings</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {settingFields.map(field => (
                            <div className="form-group" key={field.key}>
                                <label className="form-label">{field.label}</label>
                                {field.type === 'select' ? (
                                    <select
                                        className="form-select"
                                        value={settings[field.key] || field.default || ''}
                                        onChange={e => setSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    >
                                        {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                ) : (
                                    <input
                                        type={field.type}
                                        className="form-input"
                                        placeholder={field.placeholder}
                                        min={field.min}
                                        max={field.max}
                                        value={settings[field.key] || ''}
                                        onChange={e => setSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Database Settings */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">🗄️ Database</div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 16 }}>
                            <label className="form-label">Database Location</label>
                            <input
                                className="form-input"
                                value={dbPath}
                                readOnly
                                style={{ color: 'var(--color-text-muted)', cursor: 'default' }}
                            />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <button
                                className="btn btn-success"
                                onClick={handleBackup}
                                disabled={backing}
                                style={{ justifyContent: 'center' }}
                            >
                                {backing ? <div className="spinner" style={{ width: 14, height: 14 }}></div> : <HardDrive size={14} />}
                                Backup Database
                            </button>
                        </div>
                    </div>

                    {/* Backups List */}
                    {backups.length > 0 && (
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">💾 Available Backups</div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {backups.map(b => (
                                    <div key={b.filename} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '10px 12px', background: 'rgba(255,255,255,0.03)',
                                        borderRadius: 8, border: '1px solid var(--color-border)'
                                    }}>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{b.filename}</div>
                                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                                                {(b.size / 1024).toFixed(1)} KB • {new Date(b.created).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <span className="badge badge-success">Saved</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* About */}
                    <div className="card">
                        <div className="card-header">
                            <div className="card-title">ℹ️ About</div>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 2 }}>
                            <div>Developer: <strong style={{ color: 'var(--color-brand)', fontSize: 14 }}>Prawinkumar.N</strong></div>
                            <div>Version: <strong style={{ color: 'var(--color-brand)' }}>1.0.0</strong></div>
                            <div>Stack: React + Vite + Express + SQLite + Electron</div>
                            <div>Database: SQLite (local, no internet required)</div>
                            <div>LeetCode API: GraphQL endpoint</div>
                            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border)', fontSize: 11, color: 'var(--color-text-muted)' }}>
                                © 2026 Prawinkumar.N — All Rights Reserved
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* LeetCode API Info */}
            <div className="card" style={{ marginTop: 20 }}>
                <div className="card-header">
                    <div className="card-title">⚠️ LeetCode API Limitations</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                    {[
                        'LeetCode uses GraphQL API — no official stable public API guarantee.',
                        'Rate limiting may occur when fetching many students (handled with delays).',
                        'Data fetching requires an internet connection.',
                        'Some user profiles may be private and return no data.',
                        'Contest rating is available only for users who have participated in contests.',
                        'If a student has not set a public username, URL extraction may fail.',
                        'Previously stored data remains accessible in offline mode.'
                    ].map((item, i) => (
                        <div key={i} className="alert alert-warn" style={{ padding: '8px 12px' }}>
                            {item}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
