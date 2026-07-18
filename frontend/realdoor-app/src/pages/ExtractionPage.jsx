import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, AlertTriangle, CheckCircle2, Pencil, Eye } from 'lucide-react';
import AiPanel from '../components/layout/AiPanel';
import { getDocumentFields, confirmField, correctField } from '../api/documents';

const CONFIDENCE_THRESHOLD_LOW = 0.75;

function ConfidenceBadge({ value }) {
  const pct = Math.round(value * 100);
  if (pct >= 90) return <span className="badge badge-success"><CheckCircle2 size={10} /> {pct}% High</span>;
  if (pct >= 75) return <span className="badge badge-warning"><AlertTriangle size={10} /> {pct}% Med</span>;
  return <span className="badge badge-error"><AlertTriangle size={10} /> {pct}% Low</span>;
}

const SOURCE_SNIPPET_AI = [
  {
    role: 'ai',
    text: "I've analyzed the uploaded W-2 form. Most fields look solid, but I flagged **Gross Monthly Income** for review due to low scan quality.",
  },
  {
    role: 'user',
    text: 'Show where the Gross Monthly Income came from.',
  },
  {
    role: 'ai',
    text: "Here is the source evidence for the **Gross Monthly Income** calculation. It appears the total yearly wage was divided by 12, but the source text is smudged.",
  },
];

function SourceSnippet() {
  return (
    <div style={{ marginTop: 12 }}>
      <div className="source-snippet">
        <div className="source-snippet-header">
          <span>Source Snippet</span>
          <span style={{ fontFamily: 'Inter, sans-serif' }}>W2_Form_2023_JohnDoe.pdf — Pg 1</span>
        </div>
        <div style={{ color: '#6c7086', marginBottom: 4 }}>1. Wages, tips, other comp.</div>
        <div style={{ padding: '4px 8px', background: 'rgba(37,99,235,0.15)', borderRadius: 4, color: '#89b4fa', margin: '4px 0' }}>
          Box 1: $ 101,400.00
        </div>
        <div style={{ color: '#6c7086' }}>2. Federal income tax withheld</div>
        <div style={{ marginTop: 10 }}>
          <button className="btn btn-primary btn-sm" style={{ fontSize: 12, gap: 4 }}>
            <Eye size={12} /> View in Document
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExtractionPage() {
  const [fields, setFields] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getDocumentFields('doc_1').then((res) => setFields(res.fields));
  }, []);

  const handleConfirm = async (f) => {
    await confirmField('doc_1', f.id);
    setFields((prev) => prev.map((x) => x.id === f.id ? { ...x, status: 'confirmed' } : x));
  };

  const handleSaveEdit = async (f) => {
    await correctField('doc_1', f.id, editValue);
    setFields((prev) => prev.map((x) => x.id === f.id ? { ...x, normalized_value: editValue, status: 'corrected' } : x));
    setEditingId(null);
  };

  const isFlagged = (f) => f.confidence < CONFIDENCE_THRESHOLD_LOW || f.status === 'needs_review';

  return (
    <>
      <main className="main-content">
        {/* Step header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div className="step-indicator">
              <span>Step 2 of 4</span>
              <span style={{ color: 'var(--color-outline)' }}>›</span>
              <span style={{ color: 'var(--color-outline)' }}>Data Extraction</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>Review Extracted Fields</h1>
          </div>
          <button className="btn btn-outline" style={{ gap: 6 }}>
            <RefreshCw size={14} /> Re-scan Document
          </button>
        </div>

        {/* Document banner */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '14px 18px' }}>
          <div style={{ width: 36, height: 36, background: 'var(--color-surface-container)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary-container)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>W2_Form_2023_JohnDoe.pdf</div>
            <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>AI has extracted key data points from the uploaded documents. Review the values and confidence scores before proceeding.</div>
          </div>
        </div>

        {/* Fields table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {fields.map((f) =>
            isFlagged(f) ? (
              /* Flagged row */
              <div key={f.id} style={{ padding: '14px 18px', background: '#fffbeb', borderBottom: '1px solid var(--color-outline-variant)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div className="field-name" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <AlertTriangle size={14} color="var(--color-warning)" /> {f.field_name}
                  </div>
                  <div className="field-value" style={{ color: 'var(--color-on-surface)' }}>
                    {editingId === f.id ? (
                      <input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        style={{ border: '1.5px solid var(--color-primary-container)', borderRadius: 6, padding: '4px 8px', fontSize: 14, fontWeight: 600, fontFamily: 'Inter', outline: 'none' }}
                        autoFocus
                      />
                    ) : (
                      String(f.normalized_value)
                    )}
                  </div>
                  <ConfidenceBadge value={f.confidence} />
                  <div className="field-actions">
                    {editingId === f.id ? (
                      <button className="btn btn-primary btn-sm" onClick={() => handleSaveEdit(f)}>Save</button>
                    ) : (
                      <>
                        <button className="btn btn-ghost btn-sm" style={{ gap: 4 }} onClick={() => handleConfirm(f)}>
                          <CheckCircle2 size={13} /> Verify
                        </button>
                        <button className="btn btn-outline btn-sm" style={{ padding: '5px 8px' }} onClick={() => { setEditingId(f.id); setEditValue(String(f.normalized_value)); }}>
                          <Pencil size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {f.note && <div style={{ fontSize: 12, color: 'var(--color-warning)', marginTop: 4 }}>{f.note}</div>}
                <SourceSnippet />
              </div>
            ) : (
              /* Normal row */
              <div key={f.id} className="field-row">
                <div className="field-name">{f.field_name}</div>
                <div className="field-value" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {f.field_name === 'Social Security Number' ? f.normalized_value : String(f.normalized_value)}
                  <ConfidenceBadge value={f.confidence} />
                  {f.status === 'confirmed' && <span style={{ fontSize: 11, color: 'var(--color-success)', fontWeight: 600 }}>✓ Confirmed</span>}
                  {f.status === 'corrected' && <span style={{ fontSize: 11, color: 'var(--color-primary-container)', fontWeight: 600 }}>✓ Corrected</span>}
                </div>
              </div>
            )
          )}
        </div>

        {/* Bottom nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 28 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/upload')}>Back</button>
          <span style={{ fontSize: 13, color: 'var(--color-on-surface-variant)' }}>{fields.length} fields extracted</span>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>
            Continue to Validation →
          </button>
        </div>
      </main>

      <AiPanel
        title="Copilot"
        subtitle="Extraction Assistant"
        initialMessages={SOURCE_SNIPPET_AI}
        suggestedQuestions={['Explain this extracted value', 'Why is confidence low?']}
      />
    </>
  );
}
