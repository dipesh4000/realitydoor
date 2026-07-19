import { AlertCircle, CheckCircle2, Info, Loader2, X } from 'lucide-react';

export function Button({ children, variant = 'primary', size = 'md', loading = false, className = '', ...props }) {
  return (
    <button className={`button button--${variant} button--${size} ${className}`.trim()} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="spin" size={16} aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Card({ children, className = '', tone = 'default', as: Component = 'div', ...props }) {
  return <Component className={`surface-card surface-card--${tone} ${className}`.trim()} {...props}>{children}</Component>;
}

const statusIcons = {
  success: CheckCircle2,
  warning: AlertCircle,
  error: AlertCircle,
  info: Info,
  neutral: Info,
};

export function Badge({ children, tone = 'neutral', icon = true, className = '' }) {
  const Icon = statusIcons[tone];
  return <span className={`status-badge status-badge--${tone} ${className}`.trim()}>{icon && Icon ? <Icon size={13} aria-hidden="true" /> : null}{children}</span>;
}

export function Callout({ title, children, tone = 'info', icon: Icon, actions, className = '' }) {
  const FallbackIcon = statusIcons[tone] || Info;
  const DisplayIcon = Icon || FallbackIcon;
  return (
    <div className={`callout callout--${tone} ${className}`.trim()} role={tone === 'error' ? 'alert' : undefined}>
      <DisplayIcon className="callout__icon" size={20} aria-hidden="true" />
      <div className="callout__body">
        {title && <strong className="callout__title">{title}</strong>}
        <div className="callout__content">{children}</div>
      </div>
      {actions && <div className="callout__actions">{actions}</div>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, description, actions, illustration }) {
  return (
    <header className={`page-heading ${illustration ? 'page-heading--illustrated' : ''}`}>
      <div className="page-heading__copy">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {actions && <div className="page-heading__actions">{actions}</div>}
      </div>
      {illustration && <div className="page-heading__illustration" aria-hidden="true">{illustration}</div>}
    </header>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && <div className="empty-state__icon"><Icon size={26} aria-hidden="true" /></div>}
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <span className={`skeleton ${className}`.trim()} aria-hidden="true" />;
}

export function LoadingState({ label = 'Loading your workspace…' }) {
  return (
    <div className="loading-state" role="status">
      <Loader2 className="spin" size={24} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function Modal({ open, title, description, children, onClose }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby={description ? 'modal-description' : undefined}>
        <button className="icon-button modal__close" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
        <h2 id="modal-title">{title}</h2>
        {description && <p id="modal-description">{description}</p>}
        {children}
      </div>
    </div>
  );
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={`form-field ${className}`.trim()}>
      <div className="form-field__label">{label}</div>
      {hint && <div className="form-field__hint">{hint}</div>}
      {children}
    </div>
  );
}

export function ResponsiveActions({ children, className = '' }) {
  return <div className={`responsive-actions ${className}`.trim()}>{children}</div>;
}
