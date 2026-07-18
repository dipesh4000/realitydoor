import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, FileText, RefreshCw, Info, CheckCircle2 } from 'lucide-react';
import AiPanel from '../components/layout/AiPanel';
import { getReadiness } from '../api/readiness';

/* ── Donut chart ─────────────────────────────────────────── */
function DonutChart({ value }) {
  const r = 54, cx = 64, cy = 64;
  const circ = 2 * Math.PI * r;
  const dash = (value / 100) * circ;
  return (
    <svg width="128" height="128" viewBox="0 0 128 128">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-surface-container)" strokeWidth="12" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke="var(--color-primary-container)"
        strokeWidth="12"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 64 64)"
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--color-on-surface)" fontFamily="Inter">{value}%</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="var(--color-on-surface-variant)" fontFamily="Inter">Ready</text>
    </svg>
  );
}

/* ── Action item ─────────────────────────────────────────── */
function ActionItem({ issue, onAction }) {
  const severityIcon = {
    error:   <FileText size={18} color="var(--color-error)" />,
    warning: <RefreshCw size={18} color="var(--color-warning)" />,
    info:    <Info size={18} color="var(--color-primary-container)" />,
  };
  const actionClass = {
    error:   'btn btn-primary',
    warning: 'btn btn-outline',
    info:    'btn btn-outline',
  };

  return (
    <div className={`action-item ${issue.severity}`}>
      <div style={{ flexShrink: 0 }}>{severityIcon[issue.severity]}</div>
      <div className="action-item-content">
        <div className="action-item-title">{issue.title}</div>
        {issue.description && <div className="action-item-desc">{issue.description}</div>}
        <div className="action-item-meta">
          {issue.severity === 'info' && issue.type === 'low_confidence' && (
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }}>
              <Info size={12} /> Review Extraction
            </button>
          )}
          {issue.rule_ref && (
            <span className="citation-tag">
              <BookStack size={10} /> {issue.rule_ref}
            </span>
          )}
          {issue.type === 'missing_document' && (
            <button style={{ fontSize: 12, color: 'var(--color-primary-container)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>
              <Info size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
              Why this is required
            </button>
          )}
        </div>
      </div>
      <button className={actionClass[issue.severity]} style={{ flexShrink: 0, fontSize: 13 }} onClick={() => onAction && onAction(issue)}>
        {issue.action}
      </button>
    </div>
  );
}

function BookStack({ size }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/></svg>;
}

export default function WorkspacePage() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { getReadiness().then(setData); }, []);

  const handleAction = (issue) => {
    if (issue.type === 'missing_document' || issue.type === 'expired_document') navigate('/upload');
    if (issue.type === 'low_confidence') navigate('/extraction');
  };

  if (!data) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-on-surface-variant)' }}>
        Loading…
      </div>
    );
  }

  return (
    <>
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Application Readiness</h1>
          <p className="page-subtitle">Review missing items and warnings before submission.</p>
        </div>

        {/* Readiness summary */}
        <div className="readiness-summary">
          <DonutChart value={data.score} />
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{data.label}</h2>
            <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', lineHeight: 1.6 }}>
              You have {data.issues.filter(i => i.type === 'missing_document').length} missing documents and{' '}
              {data.issues.filter(i => i.type === 'low_confidence').length} low-confidence field blocking submission.
            </p>
            <div style={{ marginTop: 12 }}>
              <span className="badge badge-error">
                <AlertTriangle size={11} /> {data.issues_count} Issues
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="section-label">Required Actions</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {data.issues.map((issue) => (
            <ActionItem key={issue.id} issue={issue} onAction={handleAction} />
          ))}
        </div>

        {/* Packet button */}
        <div style={{ marginTop: 28, display: 'flex', gap: 10 }}>
          <button className="btn btn-outline" style={{ gap: 6 }}>
            <CheckCircle2 size={15} /> Generate Readiness Packet
          </button>
          <button className="btn btn-ghost" style={{ gap: 6, color: 'var(--color-error)', borderColor: 'var(--color-error-container)' }}>
            Delete Session
          </button>
        </div>
      </main>

      <AiPanel
        title="AI Copilot"
        actionCard={data.ai_action ? {
          title: data.ai_action.title,
          message: data.ai_action.message,
          fileRef: data.ai_action.file_ref,
          action: 'Fix Now',
        } : null}
        suggestedQuestions={data.suggested_questions}
      />
    </>
  );
}
