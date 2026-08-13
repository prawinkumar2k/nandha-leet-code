import { useState, useEffect, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react';
import { importExcel as apiImportExcel } from '../services/api';
import toast from 'react-hot-toast';

export default function ImportPage() {
    const [dragging, setDragging] = useState(false);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleFile = async (file) => {
        if (!file) return;
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            toast.error('Only .xlsx and .xls files are supported');
            return;
        }

        setImporting(true);
        setResult(null);
        setError(null);

        const formData = new FormData();
        formData.append('excel', file);

        try {
            const response = await apiImportExcel(formData);
            setResult(response);
            if (response.success) {
                toast.success(`Import complete! ${response.summary.newStudents} new students added.`);
            } else {
                toast.error('Import failed: ' + response.message);
            }
        } catch (e) {
            const msg = e.response?.data?.message || e.message;
            setError(msg);
            toast.error('Import error: ' + msg);
        } finally {
            setImporting(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleElectronFile = async () => {
        if (window.electronAPI) {
            const result = await window.electronAPI.selectFile();
            if (!result.canceled && result.filePaths?.[0]) {
                fileInputRef.current.click();
            }
        } else {
            fileInputRef.current.click();
        }
    };

    const handleClearAll = async () => {
        if (window.confirm('Are you strictly sure you want to clear ALL students from the database? This is an undo operation.')) {
            try {
                const { deleteAllStudents } = await import('../services/api');
                await deleteAllStudents();
                setResult(null);
                setError(null);
                toast.success('Database has been completely cleared. Ready for a fresh import.');
            } catch (e) {
                toast.error('Failed to clear database: ' + e.message);
            }
        }
    };

    return (
        <div>
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20 }}>
                    <div>
                        <h1 className="page-title">📤 Import Excel</h1>
                        <p className="page-desc">Import student data from your Excel file with the 'cons' sheet</p>
                    </div>
                    <button className="btn btn-primary" onClick={() => {
                        import('../services/api').then(({ downloadSampleTemplate }) => {
                            downloadSampleTemplate();
                        });
                    }}>
                        <FileSpreadsheet size={16} /> Download Sample Template
                    </button>
                </div>
            </div>

            {/* Instructions */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-header">
                    <div className="card-title">📋 Import Instructions</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, fontSize: 13 }}>
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>Excel Format:</div>
                        <ul style={{ color: 'var(--color-text-secondary)', lineHeight: 2, paddingLeft: 20 }}>
                            <li>Sheet name: <strong style={{ color: 'var(--color-brand)' }}>cons</strong></li>
                            <li>Column: <strong>S.No</strong> (serial number)</li>
                            <li>Column: <strong>reg_no</strong> (register number) - <span style={{ color: '#ef4444' }}>Required</span></li>
                            <li>Column: <strong>name</strong> (student name) - <span style={{ color: '#ef4444' }}>Required</span></li>
                            <li>Column: <strong>department</strong></li>
                            <li>Column: <strong>batch</strong> (e.g. 2028)</li>
                            <li>Column: <strong>leetcode_profile_url</strong></li>
                        </ul>
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 8 }}>What happens on import:</div>
                        <ul style={{ color: 'var(--color-text-secondary)', lineHeight: 2, paddingLeft: 20 }}>
                            <li>✅ New students are cleanly inserted</li>
                            <li>🔄 Existing students (same reg_no) are <strong>updated</strong> (stats are preserved)</li>
                            <li>✅ Zero duplicates — extremely safe to re-import the same file</li>
                            <li>✅ Invalid rows are elegantly reported</li>
                            <li>✅ LeetCode usernames are extracted automatically</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Drop Zone */}
            <div className="card" style={{ marginBottom: 20 }}>
                <div
                    className={`import-drop-zone ${dragging ? 'drag-over' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: 'none' }}
                        onChange={e => handleFile(e.target.files[0])}
                    />
                    {importing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            <div className="spinner spinner-lg"></div>
                            <div style={{ color: 'var(--color-brand)', fontWeight: 600 }}>Importing data...</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                            <FileSpreadsheet size={48} color="var(--color-text-muted)" />
                            <div>
                                <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 6 }}>
                                    Drop Excel file here or click to browse
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                                    Supports .xlsx and .xls files
                                </div>
                            </div>
                            <button className="btn btn-primary" onClick={e => { e.stopPropagation(); fileInputRef.current.click(); }}>
                                <Upload size={14} /> Select Excel File
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: 20 }}>
                <button className="btn btn-danger btn-sm" onClick={handleClearAll}>
                    <XCircle size={14} /> Undo Last / Clear Database
                </button>
            </div>

            {/* Error */}
            {
                error && (
                    <div className="alert alert-error" style={{ marginBottom: 16 }}>
                        <XCircle size={16} />
                        <div>
                            <strong>Import Failed</strong><br />
                            {error}
                        </div>
                    </div>
                )
            }

            {/* Result */}
            {
                result?.success && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="alert alert-success">
                            <CheckCircle2 size={16} />
                            <div>
                                <strong>Import Successful!</strong> — Sheet: <strong>{result.summary.sheetName}</strong>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">📊 Import Summary</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                                {[
                                    { label: 'Total Rows', value: result.summary.totalRows, color: 'var(--color-text-primary)' },
                                    { label: '✅ New Students', value: result.summary.newStudents, color: 'var(--color-easy)' },
                                    { label: '⏭️ Skipped (exist)', value: result.summary.skippedStudents, color: 'var(--color-blue)' },
                                    { label: '⚠️ Invalid Rows', value: result.summary.invalidRows, color: result.summary.invalidRows > 0 ? 'var(--color-hard)' : 'var(--color-text-muted)' }
                                ].map(item => (
                                    <div key={item.label} className="detail-item" style={{ textAlign: 'center' }}>
                                        <div className="detail-item-label">{item.label}</div>
                                        <div className="detail-item-value" style={{ color: item.color, fontSize: 28 }}>{item.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Invalid Rows Report */}
                        {result.invalidReport?.length > 0 && (
                            <div className="card">
                                <div className="card-header">
                                    <div className="card-title">⚠️ Invalid Rows Report</div>
                                    <span className="badge badge-error">{result.invalidReport.length} errors</span>
                                </div>
                                <div className="table-wrapper">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Row #</th>
                                                <th>Reg No</th>
                                                <th>Name</th>
                                                <th>Errors</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {result.invalidReport.map((row, i) => (
                                                <tr key={i}>
                                                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>{row.rowNum}</td>
                                                    <td style={{ fontFamily: 'var(--font-mono)' }}>{row.data?.reg_no || '—'}</td>
                                                    <td>{row.data?.name || '—'}</td>
                                                    <td>
                                                        {row.errors.map((e, j) => (
                                                            <span key={j} className="badge badge-error" style={{ marginRight: 4 }}>{e}</span>
                                                        ))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Next steps */}
                        <div className="alert alert-info">
                            <div>
                                ℹ️ <strong>Next Steps:</strong> Go to the Dashboard and click <strong>"Refresh Data"</strong> to fetch LeetCode statistics for all imported students.
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
