import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronDown, LockKeyhole, LogOut, PanelLeftClose, PanelLeftOpen, ShieldCheck } from 'lucide-react';
import { MOBILE_NAV, PRIMARY_NAV, ROUTES } from '../../routeConfig';
import RealDoorLogo from '../RealDoorLogo';
import { Button, Modal } from '../ui';

function Brand() {
  return (
    <NavLink to="/" className="brand" aria-label="RealDoor home">
      <RealDoorLogo />
    </NavLink>
  );
}

export default function Sidebar({ onTerminate, collapsed = false, onCollapsedChange, resizeHandleProps }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const terminate = async () => {
    setBusy(true);
    setError('');
    try {
      await onTerminate();
      setConfirming(false);
      setMenuOpen(false);
    } catch {
      setError('We could not delete the session. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <aside className={`sidebar${collapsed ? ' is-collapsed' : ''}`}>
        <div className="sidebar__header">
          <Brand />
          <button className="icon-button sidebar__collapse" aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'} onClick={() => onCollapsedChange?.(!collapsed)}>
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <div className="sidebar__trust">
          <span className="sidebar__trust-icon"><ShieldCheck size={17} /></span>
          <span><strong>Private workspace</strong><small>Your files stay in this session</small></span>
        </div>

        <nav className="sidebar__nav" aria-label="Primary navigation">
          {PRIMARY_NAV.map((path) => {
            const item = ROUTES[path];
            const Icon = item.icon;
            return (
              <NavLink key={path} to={path} end={path === '/'} title={collapsed ? item.label : undefined} className={({ isActive }) => `nav-link${isActive ? ' is-active' : ''}`}>
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className={`session-menu ${menuOpen ? 'is-open' : ''}`}>
          <button className="session-menu__trigger" aria-label="Privacy and session controls" aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>
            <span className="session-menu__avatar"><ShieldCheck size={16} /></span>
            <span><strong>Privacy & session</strong><small>Review or delete your data</small></span>
            <ChevronDown size={16} />
          </button>
          {menuOpen && (
            <div className="session-menu__popover">
              <div className="session-menu__note"><LockKeyhole size={16} /><span>Uploads expire with this temporary session and are never sent automatically.</span></div>
              <button className="session-menu__danger" onClick={() => setConfirming(true)}><LogOut size={16} /> End and delete session</button>
            </div>
          )}
        </div>
        {!collapsed && <div className="panel-resize-handle panel-resize-handle--right" role="separator" aria-orientation="vertical" aria-label="Resize navigation" tabIndex="0" {...resizeHandleProps} />}
      </aside>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {MOBILE_NAV.map((path) => {
          const item = ROUTES[path];
          const Icon = item.icon;
          return <NavLink key={path} to={path} end={path === '/'} className={({ isActive }) => isActive ? 'is-active' : ''}><Icon size={20} /><span>{item.shortLabel}</span></NavLink>;
        })}
      </nav>

      <Modal
        open={confirming}
        onClose={() => !busy && setConfirming(false)}
        title="End and delete this session?"
        description="This permanently removes the session, assistant conversation, uploaded documents, and generated packets. This cannot be undone."
      >
        {error && <div className="inline-error" role="alert">{error}</div>}
        <div className="modal__actions">
          <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>Keep session</Button>
          <Button variant="danger" loading={busy} onClick={terminate}>End and delete</Button>
        </div>
      </Modal>
    </>
  );
}
