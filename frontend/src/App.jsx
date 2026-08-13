import { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import WelcomeScreen from './components/WelcomeScreen';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import ImportPage from './pages/ImportPage';
import DepartmentsPage from './pages/DepartmentsPage';
import Contests from './pages/Contests';
import Reports from './pages/Reports';
import SettingsPage from './pages/SettingsPage';
import { checkHealth } from './services/api';

export default function App() {
    const [backendReady, setBackendReady] = useState(false);
    const [backendError, setBackendError] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [firstCheck, setFirstCheck] = useState(true);

    useEffect(() => {
        let retries = 0;
        const maxRetries = 30;

        const poll = async () => {
            try {
                await checkHealth();
                setBackendReady(true);
                setBackendError(false);

                // Check if first time (no students yet)
                if (firstCheck) {
                    setFirstCheck(false);
                    const { getStudents } = await import('./services/api');
                    const result = await getStudents({ sortBy: 'name', sortDir: 'ASC' }).catch(() => null);
                    if (!result || result.total === 0) {
                        setShowWelcome(true);
                    }
                }
            } catch (e) {
                retries++;
                if (retries >= maxRetries) {
                    setBackendError(true);
                } else {
                    setTimeout(poll, 1000);
                }
            }
        };

        poll();
    }, []);

    if (!backendReady && !backendError) {
        return (
            <div className="loading-screen">
                <div className="loading-content">
                    <div className="loading-logo">🏆</div>
                    <div className="loading-title">LeetCode Student Tracking</div>
                    <div className="loading-sub">Starting backend services...</div>
                    <div className="spinner spinner-lg" style={{ margin: '20px auto' }}></div>
                </div>
            </div>
        );
    }

    if (backendError) {
        return (
            <div className="loading-screen">
                <div className="loading-content">
                    <div className="loading-logo">⚠️</div>
                    <div className="loading-title" style={{ color: 'var(--color-hard)' }}>Backend Unavailable</div>
                    <div className="loading-sub">Could not connect to backend. Please restart the app.</div>
                    <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => window.location.reload()}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (showWelcome) {
        return (
            <>
                <WelcomeScreen onComplete={() => setShowWelcome(false)} />
                <Toaster position="top-right" toastOptions={{ style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #1e3a5f' } }} />
            </>
        );
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="app-main">
                <Topbar />
                <div className="app-content">
                    <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/students" element={<Students />} />
                        <Route path="/students/:id" element={<StudentDetail />} />
                        <Route path="/import" element={<ImportPage />} />
                        <Route path="/departments" element={<DepartmentsPage />} />
                        <Route path="/contests" element={<Contests />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </div>
            </div>
            <Toaster
                position="top-right"
                toastOptions={{
                    style: {
                        background: '#1e293b',
                        color: '#f1f5f9',
                        border: '1px solid #1e3a5f',
                        borderRadius: '10px',
                    },
                    success: { iconTheme: { primary: '#10b981', secondary: '#0f172a' } },
                    error: { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } }
                }}
            />
        </div>
    );
}
