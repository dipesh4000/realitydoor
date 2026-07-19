import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, FileCheck2, Trash2 } from 'lucide-react';
import { deletePacket, downloadPacket, generatePacket, getPacketPreview } from '../api/income';

const previewSection = {
  padding: '18px 22px',
  borderTop: '1px solid #d8e1e8',
};

export default function PacketPage() {
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState([]);
  const [notes, setNotes] = useState('');
  const [packet, setPacket] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getPacketPreview()
      .then((data) => {
        setPreview(data);
        setSelected(data.documents.map((document) => document.id));
      })
      .catch(() => setError('The packet preview could not be loaded. Return to readiness and try again.'));
  }, []);

  const create = async () => {
    setBusy(true);
    setError('');
    try {
      setPacket(await generatePacket({ notes, include_document_ids: selected }));
    } catch {
      setError('The packet could not be generated. Please review the selected files and try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (packet) await deletePacket(packet.packet_id);
    setPacket(null);
  };

  if (error && !preview) return <main className="main-content"><div className="card" role="alert" style={{ color: 'var(--color-error)' }}>{error}</div></main>;
  if (!preview) return <main className="main-content" aria-live="polite">Preparing preview…</main>;

  const includedDocuments = preview.documents.filter((document) => selected.includes(document.id));

  return (
    <main className="main-content">
      <div className="page-header">
        <div className="step-indicator">Step 5 of 5</div>
        <h1 className="page-title">Preview your readiness packet</h1>
        <p className="page-subtitle">This live preview mirrors the information that will appear in the generated PDF.</p>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 17, marginBottom: 12 }}>Choose files to include</h2>
        {preview.documents.length ? preview.documents.map((document) => (
          <label key={document.id} className="file-item" style={{ marginTop: 8 }}>
            <input
              type="checkbox"
              checked={selected.includes(document.id)}
              onChange={(event) => setSelected((current) => event.target.checked
                ? [...current, document.id]
                : current.filter((id) => id !== document.id))}
            />
            <span><b>{document.name}</b><br /><small>{document.document_type.replaceAll('_', ' ')} · {document.status}</small></span>
          </label>
        )) : <p>No documents uploaded.</p>}
        <label htmlFor="packet-notes" style={{ display: 'block', marginTop: 16 }}><b>Optional renter notes</b></label>
        <textarea id="packet-notes" value={notes} maxLength={1200} onChange={(event) => setNotes(event.target.value)} rows={4} style={{ width: '100%', marginTop: 8, padding: 10 }} />
      </div>

      <section aria-label="Generated packet preview" style={{ maxWidth: 760, margin: '0 auto', background: '#fff', border: '1px solid #cbd5e1', borderRadius: 8, boxShadow: '0 16px 36px rgba(15,23,42,.12)', overflow: 'hidden' }}>
        <header style={{ padding: '34px 24px 26px', textAlign: 'center', background: 'linear-gradient(180deg,#f7fffe,#fff)' }}>
          <div style={{ color: '#17324d', fontWeight: 800, fontSize: 28, letterSpacing: '.08em' }}>REALDOOR</div>
          <div style={{ color: '#637381', marginTop: 5 }}>LIHTC Application-Readiness Packet</div>
        </header>

        <div className="packet-meta-grid" style={{ ...previewSection, background: '#eaf7f5', fontSize: 13 }}>
          <div><b>Program</b><br />{preview.program}</div>
          <div><b>Area</b><br />{preview.area}</div>
          <div><b>Household</b><br />{preview.household_size} person</div>
          <div><b>Income band</b><br />{preview.income_band}% MTSP</div>
        </div>

        <div style={previewSection}>
          <h3 style={{ color: '#17324d', marginBottom: 7 }}>Important notice</h3>
          <p style={{ fontSize: 13 }}>{preview.notice}</p>
          <p style={{ fontSize: 12, color: '#637381', marginTop: 7 }}>RealDoor does not approve, deny, score, rank, or predict eligibility.</p>
        </div>

        {notes && <div style={previewSection}><h3 style={{ color: '#17324d', marginBottom: 7 }}>Renter notes</h3><p style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{notes}</p></div>}

        <div style={previewSection}>
          <h3 style={{ color: '#17324d', marginBottom: 7 }}>Checklist status</h3>
          <p><b>{preview.checklist_label}</b> · {preview.checks_passed} of {preview.checks_total} checks pass · {preview.issues_count} finding(s)</p>
          <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
            {preview.issues.length ? preview.issues.map((issue) => (
              <div key={issue.id} style={{ padding: 10, borderRadius: 6, background: issue.severity === 'error' ? '#fff1f0' : issue.severity === 'warning' ? '#fffbeb' : '#eff6ff', fontSize: 12 }}>
                <b>{issue.title}</b><div>{issue.description}</div><div style={{ marginTop: 3, color: '#637381' }}>Next action: {issue.action}{issue.rule_ref ? ` · ${issue.rule_ref}` : ''}</div>
              </div>
            )) : <p>No open checklist findings.</p>}
          </div>
        </div>

        <div style={previewSection}>
          <h3 style={{ color: '#17324d', marginBottom: 7 }}>Confirmed calculation</h3>
          {preview.confirmed_income ? (
            <p><b>${preview.confirmed_income.annualized_income.toLocaleString(undefined, { minimumFractionDigits: 2 })}</b> annualized · {preview.confirmed_income.inputs.gross_pay.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} × {preview.confirmed_income.inputs.periods_per_year} · {preview.confirmed_income.rule_id}</p>
          ) : <p style={{ fontSize: 13 }}>No calculation is included until gross pay and pay frequency are confirmed or corrected.</p>}
        </div>

        <div style={previewSection}>
          <h3 style={{ color: '#17324d', marginBottom: 7 }}>Document inventory</h3>
          {includedDocuments.length ? includedDocuments.map((document) => <div key={document.id} style={{ fontSize: 13, padding: '5px 0' }}><FileCheck2 size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />{document.name} · {document.document_type.replaceAll('_', ' ')}</div>) : <p style={{ fontSize: 13 }}>No files selected for inclusion.</p>}
        </div>

        <footer style={{ ...previewSection, color: '#637381', fontSize: 11 }}>{preview.source_note}</footer>
      </section>

      {error && <div role="alert" style={{ color: 'var(--color-error)', marginTop: 14 }}>{error}</div>}
      <p className="disclaimer" style={{ marginTop: 14 }}>The packet is downloaded only when you choose. RealDoor never sends it.</p>
      <div className="responsive-actions">
        <button className="btn btn-ghost" onClick={() => navigate('/readiness')}>Back</button>
        {!packet ? (
          <button className="btn btn-primary" disabled={busy} onClick={create}>{busy ? 'Generating…' : 'Generate reviewed packet'}</button>
        ) : (
          <>
            <button className="btn btn-primary" onClick={() => downloadPacket(packet)}><Download size={14} /> Download</button>
            <button className="btn btn-outline" onClick={remove}><Trash2 size={14} /> Delete generated packet</button>
          </>
        )}
      </div>
    </main>
  );
}
