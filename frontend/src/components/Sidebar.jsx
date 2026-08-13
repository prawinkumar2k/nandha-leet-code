import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Users, FileText, Trophy, Building2,
    BarChart3, Upload, Settings, ChevronRight
} from 'lucide-react';

const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/students', icon: Users, label: 'Students' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    { to: '/contests', icon: Trophy, label: 'Contests' },
    { to: '/departments', icon: Building2, label: 'Departments' },
    { to: '/import', icon: Upload, label: 'Import Excel' },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
    return (
        <div className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">🏆</div>
                <h1>LEO</h1>
                <p>Student Tracker</p>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-section-label">Navigation</div>
                {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    >
                        <Icon className="nav-icon" size={18} />
                        {label}
                    </NavLink>
                ))}
            </nav>

            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 600, marginBottom: 2, color: 'rgba(255,255,255,0.6)' }}>v1.0.0</div>
                    <div>Developed by <strong style={{ color: '#dae3f3' }}>Prawinkumar.N</strong></div>
                </div>
            </div>
        </div>
    );
}
