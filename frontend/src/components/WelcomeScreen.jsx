import { useState } from 'react';
import { Upload, Database, Loader2 } from 'lucide-react';
import { insertSampleData, importExcel as apiImportExcel } from '../services/api';
import toast from 'react-hot-toast';

export default function WelcomeScreen({ onComplete }) {
    const [loading, setLoading] = useState(false);

    const handleSampleData = async () => {
        setLoading(true);
        try {
            await insertSampleData();
            toast.success('Sample data loaded! Explore the dashboard.');
            setTimeout(onComplete, 500);
        } catch (e) {
            toast.error('Failed to load sample data: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleImportExcel = () => {
        onComplete();
        setTimeout(() => {
            window.location.hash = '#/import';
        }, 100);
    };

    return (
        <div className="welcome-screen">
            <div className="welcome-card">
                <div className="welcome-logo">🏆</div>
                <h1 className="welcome-title">Welcome to LeetCode<br />Student Tracking</h1>
                <p className="welcome-desc">
                    Track LeetCode performance of your students daily.<br />
                    Import your student Excel file to get started, or explore with sample data.
                </p>

                <div className="welcome-actions">
                    <div className="welcome-option" onClick={handleImportExcel}>
                        <div className="welcome-option-icon brand">
                            <Upload size={22} />
                        </div>
                        <div>
                            <div className="welcome-option-title">Import Excel File</div>
                            <div className="welcome-option-desc">Load your student data from your real Excel file</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
