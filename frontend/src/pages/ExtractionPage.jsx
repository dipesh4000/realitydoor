import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Eye, Pencil } from 'lucide-react';
import {
  confirmField,
  correctField,
  getDocumentContentUrl,
  getDocumentPageUrl,
  getDocumentFields,
  getDocuments,
} from '../api/documents';

function ConfidenceBadge({ value }) {
  const pct = Math.round(value * 100);
  const kind = pct >= 90 ? 'success' : pct >= 75 ? 'warning' : 'error';
  return <span className={`badge badge-${kind}`}>{pct}% confidence</span>;
}

const label = (name) => name.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());

export default function ExtractionPage() {
  const [documents, setDocuments] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [fields, setFields] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [selectedField, setSelectedField] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    getDocuments().then(({ documents: records }) => {
      setDocuments(records);
      const requested = searchParams.get('document');
      setActiveId(records.some((item) => item.id === requested) ? requested : records[0]?.id || null);
    });
  }, [searchParams]);

  useEffect(() => {
    if (!activeId) {
      setFields([]);
      return;
    }
    getDocumentFields(activeId).then((res) => { setFields(res.fields); setSelectedField(res.fields[0] || null); });
  }, [activeId]);

  const activeDocument = documents.find((item) => item.id === activeId);

  const confirm = async (field) => {
    await confirmField(activeId, field.id);
    setFields((current) => current.map((item) => item.id === field.id ? { ...item, status: 'confirmed' } : item));
  };

  const save = async (field) => {
    let value = editValue;
    if (typeof field.normalized_value === 'number') {
      const parsed = Number(editValue.replaceAll(',', '').replace('$', ''));
      value = Number.isNaN(parsed) ? editValue : parsed;
    }
    await correctField(activeId, field.id, value);
    setFields((current) => current.map((item) => item.id === field.id ? { ...item, normalized_value: value, status: 'corrected' } : item));
    setEditingId(null);
  };

  return (
    <main className="main-content">
        <div className="page-header">
          <div className="step-indicator"><span>Step 3 of 5</span><span>›</span><span>Evidence review</span></div>
          <h1 className="page-title">Review Extracted Fields</h1>
          <p className="page-subtitle">Confirm or correct values before RealDoor uses them in a calculation.</p>
        </div>

        {documents.length > 0 && (
          <div className="card" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
            <label htmlFor="document-select" style={{ fontWeight: 600, fontSize: 13 }}>Document</label>
            <select id="document-select" value={activeId || ''} onChange={(event) => setActiveId(event.target.value)} style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--color-outline-variant)', borderRadius: 8 }}>
              {documents.map((document) => <option key={document.id} value={document.id}>{document.name}</option>)}
            </select>
            {activeDocument && (
              <a className="btn btn-outline btn-sm" href={getDocumentContentUrl(activeDocument.id)} target="_blank" rel="noreferrer"><Eye size={13} /> View source</a>
            )}
          </div>
        )}

        {activeDocument?.safety_flags?.length > 0 && (
          <div className="card" style={{ marginBottom: 16, borderColor: 'var(--color-error)', background: 'var(--color-error-container)' }}>
            <b>Untrusted instruction detected.</b> RealDoor ignored instruction-like document text; remove or review this file.
          </div>
        )}

        {activeDocument && selectedField && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="section-label">Source evidence · {label(selectedField.field_name)} · page {selectedField.page || 1}</div>
            <div style={{ position: 'relative', maxWidth: 560, border: '1px solid var(--color-outline-variant)' }}>
              <img src={getDocumentPageUrl(activeDocument.id, selectedField.page || 1)} alt={`Page ${selectedField.page || 1} of ${activeDocument.name}`} style={{ width: '100%', display: 'block' }} />
              {selectedField.bounding_box && <div aria-label="Extracted source region" style={{ position: 'absolute', left: `${selectedField.bounding_box[0] / 612 * 100}%`, top: `${selectedField.bounding_box[1] / 792 * 100}%`, width: `${(selectedField.bounding_box[2] - selectedField.bounding_box[0]) / 612 * 100}%`, height: `${(selectedField.bounding_box[3] - selectedField.bounding_box[1]) / 792 * 100}%`, border: '3px solid #ef4444', background: 'rgba(239,68,68,.15)', pointerEvents: 'none' }} />}
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {fields.map((field) => {
            const flagged = field.status === 'needs_review' || field.confidence < 0.75;
            return (
              <div key={field.id} style={{ padding: '13px 18px', borderBottom: '1px solid var(--color-outline-variant)', background: flagged ? '#fffbeb' : 'white' }}>
                <div className="extracted-field-grid">
                  <div className="field-name">{flagged && <AlertTriangle size={13} color="var(--color-warning)" style={{ marginRight: 5 }} />}{label(field.field_name)}</div>
                  <div className="field-value">
                    {editingId === field.id ? (
                      <input aria-label={`Correct ${label(field.field_name)}`} value={editValue} onChange={(event) => setEditValue(event.target.value)} autoFocus style={{ width: '100%', padding: '6px 8px', border: '1.5px solid var(--color-primary-container)', borderRadius: 6 }} />
                    ) : String(field.normalized_value ?? '—')}
                  </div>
                  <ConfidenceBadge value={field.confidence} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    {editingId === field.id ? (
                      <button className="btn btn-primary btn-sm" onClick={() => save(field)}>Save</button>
                    ) : (
                      <>
                        <button aria-label={`Confirm ${label(field.field_name)}`} className="btn btn-ghost btn-sm" disabled={['confirmed', 'corrected'].includes(field.status)} onClick={() => confirm(field)}><CheckCircle2 size={13} /> {field.status === 'confirmed' ? 'Confirmed' : field.status === 'corrected' ? 'Corrected' : 'Confirm'}</button>
                        <button aria-label={`Correct ${label(field.field_name)}`} className="btn btn-outline btn-sm" onClick={() => { setEditingId(field.id); setEditValue(String(field.normalized_value ?? '')); }}><Pencil size={13} /></button>
                      </>
                    )}
                  </div>
                </div>
                {field.source_text && <button className="btn btn-ghost btn-sm" style={{ marginTop: 7 }} onClick={() => setSelectedField(field)}>Show source: “{field.source_text}” · page {field.page || 1}</button>}
                {field.note && <div style={{ marginTop: 4, fontSize: 12, color: 'var(--color-warning)' }}>{field.note}</div>}
              </div>
            );
          })}
          {documents.length === 0 && <div style={{ padding: 40, textAlign: 'center' }}>Upload a document to review extracted evidence.</div>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <button className="btn btn-ghost" onClick={() => navigate('/upload')}>Back</button>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/readiness')}>Continue to readiness →</button>
        </div>
    </main>
  );
}
