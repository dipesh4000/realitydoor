import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Calculator, CheckCircle2, FilePlus2, FileText, Info, Landmark, RefreshCw } from 'lucide-react';
import { getReadiness } from '../api/readiness';
import { getSession } from '../api/session';
import { getMtspLimit } from '../api/rules';
import { Badge, Button, Callout, Card, EmptyState, LoadingState, PageHeader } from '../components/ui';

function ActionCard({ issue, onAction }) {
  const config = {
    error: { icon: FilePlus2, className: '' },
    warning: { icon: RefreshCw, className: 'action-card--warning' },
    info: { icon: Info, className: 'action-card--info' },
  }[issue.severity] || { icon: FileText, className: 'action-card--info' };
  const Icon = config.icon;
  return (
    <div className={`action-card ${config.className}`}>
      <div className="action-card__icon"><Icon size={19} /></div>
      <div className="action-card__copy"><strong>{issue.title}</strong>{issue.description && <p>{issue.description}</p>}{issue.rule_ref && <span className="citation-chip">{issue.rule_ref}</span>}</div>
      <Button size="sm" variant={issue.severity === 'error' ? 'primary' : 'secondary'} onClick={() => onAction(issue)}>{issue.action || 'Review'} <ArrowRight size={14} /></Button>
    </div>
  );
}

export default function WorkspacePage() {
  const [data, setData] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = () => {
    setError('');
    getReadiness().then(setData).catch(() => setError('Your readiness checklist could not be loaded. Please try again.'));
    getSession().then((session) => getMtspLimit({
      area: session.area,
      fiscal_year: session.year,
      income_band: session.income_band,
      household_size: session.household_size,
    }).then((limit) => setComparison({ session, limit }))).catch(() => setComparison(null));
  };
  useEffect(load, []);

  const handleAction = (issue) => {
    if (['missing_document', 'expired_document', 'stale_document'].includes(issue.type)) navigate('/upload');
    else if (['missing_fields', 'low_confidence', 'unconfirmed_fields', 'untrusted_document_instruction'].includes(issue.type)) navigate(issue.doc_id ? `/extraction?document=${issue.doc_id}` : '/extraction');
  };

  if (!data && !error) return <main id="main-content" className="main-content"><LoadingState label="Building your readiness checklist…" /></main>;

  const openIssues = data?.issues || [];
  const doNext = openIssues.filter((issue) => issue.severity === 'error');
  const review = openIssues.filter((issue) => issue.severity !== 'error');
  const completed = data ? Math.max(0, data.checks_passed) : 0;

  return (
    <main id="main-content" className="main-content">
      <PageHeader eyebrow="Step 4 of 5" title="Application Readiness" description="Review missing items and warnings before preparing your packet. This checklist describes document readiness—not housing eligibility." />
      {error && <Callout tone="error" title="We could not load readiness" actions={<Button size="sm" variant="secondary" onClick={load}>Try again</Button>}>{error}</Callout>}

      {data && (
        <>
          <Card className="readiness-hero">
            <div>
              <div className="readiness-hero__count"><strong>{data.issues_count}</strong><span>{data.issues_count === 1 ? 'item remaining' : 'items remaining'}</span></div>
              <h2>{data.issues_count ? 'A few steps will strengthen your packet' : 'Your preparation checklist is complete'}</h2>
              <p>{data.checks_passed} of {data.checks_total} policy-dataset requirements pass. This is never an eligibility score.</p>
            </div>
            <div className="check-progress" aria-label={`${data.completion_percent}% of preparation checks complete`}><div className="check-progress__bar"><span style={{ width: `${data.completion_percent}%` }} /></div><small>{data.completion_percent}% checklist complete</small></div>
          </Card>

          <section className="plan-section">
            <div className="plan-section__title"><h2>Requirements from the policy dataset</h2><Badge tone="neutral">{data.requirements.length} document groups</Badge></div>
            <div className="policy-requirement-grid">
              {data.requirements.map((requirement) => (
                <Card className="policy-requirement" key={requirement.id}>
                  <div className="panel-title"><h3>{requirement.label}</h3><Badge tone="info">{requirement.minimum_count} required</Badge></div>
                  <p>{requirement.max_age_days ? `Must be dated within ${requirement.max_age_days} days. ` : ''}{requirement.expiry_field ? 'Must be unexpired. ' : ''}RealDoor checks these extracted details:</p>
                  <div className="required-field-chips">{requirement.required_fields.map((field) => <span key={field.name}>{field.label}</span>)}</div>
                  <small>{requirement.citation}</small>
                </Card>
              ))}
            </div>
          </section>

          {comparison && (
            <Card className="understand-card">
              <div className="understand-card__heading"><span><Landmark size={20} /></span><div><Badge tone="info">Published FY{comparison.limit.fiscal_year} comparison</Badge><h2>Understand the rule and calculation</h2><p>This explains the selected table row and confirmed math. It is not an eligibility decision.</p></div></div>
              <div className="understand-grid">
                <div><span>Selected profile</span><strong>{comparison.limit.household_size}-person household</strong><small>{comparison.limit.income_band}% MTSP band · {comparison.limit.area_name}</small></div>
                <div><span>Published threshold</span><strong>{comparison.limit.income_limit.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}</strong><small>Effective {comparison.limit.effective_from}</small></div>
                <div><span>Confirmed value</span><strong>{data.confirmed_income ? data.confirmed_income.annualized_income.toLocaleString(undefined, { style: 'currency', currency: 'USD' }) : 'Waiting for confirmation'}</strong><small>{data.confirmed_income ? 'Renter-confirmed or corrected evidence only' : 'Confirm gross pay and pay frequency to calculate'}</small></div>
                <div><span>Deterministic formula</span><strong>{data.confirmed_income ? `${data.confirmed_income.inputs.gross_pay.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} × ${data.confirmed_income.inputs.periods_per_year}` : 'Confirmed gross × pay periods'}</strong><small>{data.confirmed_income?.rule_id || 'Income rule applied after confirmation'}</small></div>
              </div>
              <div className="understand-card__source"><strong>Authoritative source</strong><span>{comparison.limit.source_title} · page {comparison.limit.source_page} · {comparison.limit.source_id}</span></div>
            </Card>
          )}

          {data.confirmed_income && (
            <Card className="income-card" tone="teal">
              <div className="income-card__icon"><Calculator size={21} /></div>
              <div><Badge tone="success">Confirmed calculation</Badge><strong>${data.confirmed_income.annualized_income.toLocaleString(undefined, { minimumFractionDigits: 2 })} annualized</strong><p>{data.confirmed_income.inputs.gross_pay.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} × {data.confirmed_income.inputs.periods_per_year} pay periods · {data.confirmed_income.rule_id}</p><p>{data.confirmed_income.disclaimer}</p></div>
            </Card>
          )}

          {doNext.length > 0 && <section className="plan-section"><div className="plan-section__title"><h2>Do next</h2><Badge tone="error">{doNext.length} required</Badge></div><div className="action-list">{doNext.map((issue) => <ActionCard key={issue.id} issue={issue} onAction={handleAction} />)}</div></section>}
          {review.length > 0 && <section className="plan-section"><div className="plan-section__title"><h2>Review when ready</h2><Badge tone="warning">{review.length} to review</Badge></div><div className="action-list">{review.map((issue) => <ActionCard key={issue.id} issue={issue} onAction={handleAction} />)}</div></section>}
          <section className="plan-section"><div className="plan-section__title"><h2>Completed</h2><Badge tone="success">{completed} checks</Badge></div>{completed ? <Callout tone="success" title={`${completed} preparation ${completed === 1 ? 'check is' : 'checks are'} complete`}>Completed checks remain visible in the packet preview.</Callout> : <Card><EmptyState icon={CheckCircle2} title="Completed items will appear here" description="Add and review documents to complete your preparation checklist." /></Card>}</section>

          <Callout className="packet-success" tone="info" title="You can preview a packet at any time" icon={AlertTriangle} actions={<Button size="sm" variant="secondary" onClick={() => navigate('/packet')}>Preview packet</Button>}>Open findings remain clearly labeled. RealDoor never sends the packet automatically.</Callout>
        </>
      )}
    </main>
  );
}
