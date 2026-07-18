import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, CheckSquare, FileText, BookOpen, Sparkles } from 'lucide-react';

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">R</div>
        <span className="sidebar-logo-text">RealDoor</span>
      </div>

      {/* User */}
      <div className="sidebar-user">
        <div className="sidebar-avatar">RK</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-on-surface)' }}>Copilot</div>
          <div style={{ fontSize: 11, color: 'var(--color-on-surface-variant)' }}>Application Readiness</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <LayoutGrid size={16} />
          Programs
        </NavLink>

        <NavLink
          to="/readiness"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <CheckSquare size={16} />
          Readiness
        </NavLink>

        <NavLink
          to="/documents"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <FileText size={16} />
          Documents
        </NavLink>

        <NavLink
          to="/rules"
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <BookOpen size={16} />
          Rules
        </NavLink>
      </nav>

      {/* Ask AI button */}
      <div className="sidebar-footer">
        <button className="ask-ai-btn" onClick={() => navigate('/readiness')}>
          <Sparkles size={15} />
          Ask AI
        </button>
      </div>
    </aside>
  );
}
