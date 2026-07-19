import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutGrid, CheckSquare, FileText, BookOpen, LogOut, PackageCheck, X } from 'lucide-react';

export default function Sidebar({ onTerminate }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const terminate = async () => {
    setBusy(true);
    setError('');
    try {
      await onTerminate();
      setConfirming(false);
    } catch {
      setError('Could not terminate the session. Please try again.');
    } finally {
      setBusy(false);
    }
  };

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

        <NavLink to="/packet" className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
          <PackageCheck size={16} /> Packet
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        {confirming ? (
          <div className="terminate-confirm" role="alert">
            <p>Delete this session, chat, documents, and packets?</p>
            <div>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)} disabled={busy}><X size={13} /> Cancel</button>
              <button className="btn btn-sm terminate-confirm-button" onClick={terminate} disabled={busy}>{busy ? 'Deleting…' : 'Delete all'}</button>
            </div>
            {error && <small>{error}</small>}
          </div>
        ) : (
          <button className="terminate-session-btn" onClick={() => setConfirming(true)}>
            <LogOut size={15} />
            Terminate Session
          </button>
        )}
      </div>
    </aside>
  );
}
