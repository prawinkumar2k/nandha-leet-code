import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Wifi, WifiOff, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { refreshAll, getRefreshStatus, stopRefresh } from '../services/api';
import toast from 'react-hot-toast';

export default function Topbar({ lastRefresh, onRefreshComplete }) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [refreshInfo, setRefreshInfo] = useState(null);
    const [online, setOnline] = useState(navigator.onLine);
    const [now, setNow] = useState(new Date());
    const pollRef = useRef(null);

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60000);
        const onOnline = () => setOnline(true);
        const onOffline = () => setOnline(false);
        window.addEventListener('online', onOnline);
        window.addEventListener('offline', onOffline);
        return () => {
            clearInterval(timer);
            window.removeEventListener('online', onOnline);
            window.removeEventListener('offline', onOffline);
        };
    }, []);

    const startPolling = () => {
        pollRef.current = setInterval(async () => {
            try {
                const status = await getRefreshStatus();
                setRefreshInfo(status);
                if (!status.isRunning) {
                    clearInterval(pollRef.current);
                    setIsRefreshing(false);
                    onRefreshComplete && onRefreshComplete(new Date().toISOString());
                    toast.success(
                        `Refresh complete! ✅ ${status.successful} success, ${status.failed} failed`,
                        { duration: 5000 }
                    );
                }
            } catch (e) { }
        }, 1500);
    };

    const handleRefresh = async () => {
        if (isRefreshing) {
            await stopRefresh();
            clearInterval(pollRef.current);
            setIsRefreshing(false);
            toast('Refresh stopped', { icon: '⏸️' });
            return;
        }

        if (!online) {
            toast.error('No internet connection. Cannot fetch LeetCode data.');
            return;
        }

        try {
            setIsRefreshing(true);
            const result = await refreshAll();
            if (result.success) {
                toast(`Refreshing ${result.total} students...`, { icon: '🔄', duration: 3000 });
                startPolling();
            } else {
                toast.error(result.message || 'Failed to start refresh');
                setIsRefreshing(false);
            }
        } catch (e) {
            toast.error('Could not start refresh: ' + e.message);
            setIsRefreshing(false);
        }
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="topbar">
            <div style={{ flex: 1 }}>
                <div className="topbar-title">
                    LEO
                    <span className="topbar-subtitle" style={{ marginLeft: 12, fontSize: 12, fontWeight: 400 }}>
                        Student Performance Dashboard — by Prawinkumar.N
                    </span>
                </div>
            </div>

            <div className="topbar-info">
                {/* Online Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    {online
                        ? <Wifi size={14} color="var(--color-easy)" />
                        : <WifiOff size={14} color="var(--color-hard)" />
                    }
                    <span style={{ color: online ? 'var(--color-easy)' : 'var(--color-hard)', fontWeight: 600 }}>
                        {online ? 'Online' : 'Offline'}
                    </span>
                </div>

                {/* Current Date/Time */}
                <div className="topbar-stat">
                    <div className="topbar-stat-label">Current Time</div>
                    <div className="topbar-stat-value" style={{ fontSize: 12 }}>
                        {formatDate(now)} • {formatTime(now)}
                    </div>
                </div>

                {/* Last Refresh */}
                {lastRefresh && (
                    <div className="topbar-stat">
                        <div className="topbar-stat-label">Last Refresh</div>
                        <div className="topbar-stat-value" style={{ fontSize: 12 }}>
                            {new Date(lastRefresh).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </div>
                    </div>
                )}

                {/* Refresh progress */}
                {isRefreshing && refreshInfo && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: '#ffffff' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                            <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#dae3f3' }}>
                                {refreshInfo.current} / {refreshInfo.total} ({refreshInfo.percentage}%)
                            </div>
                            {refreshInfo.currentStudent && (
                                <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                                    {refreshInfo.currentStudent}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Refresh Button */}
                <button
                    className="btn btn-primary"
                    onClick={handleRefresh}
                    style={{ minWidth: 140, background: isRefreshing ? 'rgba(255,255,255,0.1)' : undefined, color: '#ffffff', boxShadow: isRefreshing ? 'none' : undefined }}
                >
                    {isRefreshing
                        ? <><Loader2 size={14} className="spin-icon" style={{ animation: 'spin 1s linear infinite' }} /> Stop Refresh</>
                        : <><RefreshCw size={14} /> Refresh Data</>
                    }
                </button>
            </div>
        </div>
    );
}
