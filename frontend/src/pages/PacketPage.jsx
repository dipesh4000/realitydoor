import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Download, FileCheck2, LockKeyhole, Trash2 } from 'lucide-react';
import { deletePacket, downloadPacket, generatePacket, getPacketPreview } from '../api/income';
import { Button, Callout, Card, LoadingState, PageHeader, ResponsiveActions } from '../components/ui';
import { PacketIllustration } from '../components/illustrations/JourneyIllustrations';

export default function PacketPage() {
  const [preview, setPreview] = useState(null);
  const [selected, setSelected] = useState([]);
  const [notes, setNotes] = useState('');
  const [packet, setPacket] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getPacketPreview().then((data) => { setPreview(data); setSelected(data.documents.map((document) => document.id)); }).catch(() => setError('The packet preview could not be loaded. Return to your plan and try again.'));
  }, []);

  const create = async () => {
    setBusy(true); setError(''); setPacket(null);
    try { setPacket(await generatePacket({ notes, include_document_ids: selected })); }
    catch { setError('The packet could not be generated. Review the selected files and try again.'); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    if (!packet) return;
    setBusy(true);
    try { await deletePacket(packet.packet_id); setPacket(null); }
    catch { setError('The generated packet could not be deleted. Please try again.'); }
    finally { setBusy(false); }
  };

  if (!preview && !error) return <main id="main-content" className="main-content"><LoadingState label="Preparing your packet preview…" /></main>;
  if (!preview) return <main id="main-content" className="main-content"><Callout tone="error" title="Preview unavailable">{error}</Callout><ResponsiveActions><Button variant="secondary" onClick={() => navigate('/readiness')}>Return to readiness</Button></ResponsiveActions></main>;

  const includedDocuments = preview.documents.filter((document) => selected.includes(document.id));

  return (
    <main id="main-content" className="main-content">
      <PageHeader eyebrow="Step 5 of 5" title="Review your packet" description="Choose what to include, add a note if useful, and generate a private PDF only when you are satisfied." illustration={<PacketIllustration />} />
      <Callout tone="info" icon={LockKeyhole} title="RealDoor never sends this packet automatically">Generating creates a downloadable copy for you. You decide what happens next.</Callout>
      {error && <Callout className="packet-success" tone="error" title="Packet action unsuccessful">{error}</Callout>}

      <div className="packet-layout packet-success">
        <Card className="packet-options">
          <h2>Choose what to include</h2><p>Only checked documents appear in the generated packet inventory.</p>
          {preview.documents.length ? preview.documents.map((document) => (
            <label className="packet-file" key={document.id}><input type="checkbox" checked={selected.includes(document.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, document.id] : current.filter((id) => id !== document.id))} /><span><strong>{document.name}</strong><small>{document.document_type.replaceAll('_', ' ')} · {document.status}</small></span></label>
          )) : <Callout tone="warning">No documents are currently available to include.</Callout>}
          <label className="form-field packet-success" htmlFor="packet-notes"><span className="form-field__label">Optional renter note</span><span className="form-field__hint">Up to 1,200 characters. Keep sensitive details out unless needed.</span><textarea id="packet-notes" value={notes} maxLength="1200" onChange={(event) => setNotes(event.target.value)} rows="5" /></label>
          <div className="privacy-note"><LockKeyhole size={15} /><span>Your packet is temporary and remains under your control.</span></div>
        </Card>

        <section className="packet-paper" aria-label="Generated packet preview">
          <header className="packet-paper__header"><div className="packet-paper__brand">REALDOOR</div><span>LIHTC Application-Readiness Packet</span></header>
          <div className="packet-meta"><div><strong>Program</strong>{preview.program}</div><div><strong>Area</strong>{preview.area}</div><div><strong>Household</strong>{preview.household_size} {preview.household_size === 1 ? 'person' : 'people'}</div><div><strong>Income band</strong>{preview.income_band}% MTSP</div></div>
          <div className="packet-section"><h3>Important notice</h3><p>{preview.notice}</p><p style={{ marginTop: 5, color: 'var(--ink-650)' }}>RealDoor does not approve, deny, score, rank, or predict eligibility.</p></div>
          {notes && <div className="packet-section"><h3>Renter note</h3><p style={{ whiteSpace: 'pre-wrap' }}>{notes}</p></div>}
          <div className="packet-section"><h3>Preparation checklist</h3><p><strong>{preview.checklist_label}</strong> · {preview.checks_passed} of {preview.checks_total} checks pass · {preview.issues_count} open {preview.issues_count === 1 ? 'finding' : 'findings'}</p>{preview.issues.map((issue) => <div className="packet-finding" key={issue.id}><strong>{issue.title}</strong><span>{issue.description}</span><div>Next: {issue.action}{issue.rule_ref ? ` · ${issue.rule_ref}` : ''}</div></div>)}</div>
          <div className="packet-section"><h3>Confirmed calculation</h3>{preview.confirmed_income ? <p><strong>${preview.confirmed_income.annualized_income.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> annualized · {preview.confirmed_income.inputs.gross_pay.toLocaleString(undefined, { style: 'currency', currency: 'USD' })} × {preview.confirmed_income.inputs.periods_per_year} · {preview.confirmed_income.rule_id}</p> : <p>No calculation is included until gross pay and pay frequency are confirmed or corrected.</p>}</div>
          <div className="packet-section"><h3>Document inventory</h3>{includedDocuments.length ? includedDocuments.map((document) => <p key={document.id}><FileCheck2 size={13} style={{ verticalAlign: 'middle', marginRight: 6 }} />{document.name} · {document.document_type.replaceAll('_', ' ')}</p>) : <p>No documents selected for inclusion.</p>}</div>
          <footer className="packet-footer">{preview.source_note}</footer>
        </section>
      </div>

      {packet && <Callout className="packet-success" tone="success" title="Your reviewed packet is ready" icon={CheckCircle2}>Download it now or remove the generated copy from this session.</Callout>}
      <ResponsiveActions><Button variant="ghost" onClick={() => navigate('/readiness')}>Back to readiness</Button><div className="program-card__features">{!packet ? <Button size="lg" loading={busy} onClick={create}>Generate reviewed packet</Button> : <><Button size="lg" onClick={() => downloadPacket(packet)}><Download size={16} /> Download PDF</Button><Button variant="secondary" loading={busy} onClick={remove}><Trash2 size={15} /> Delete generated copy</Button></>}</div></ResponsiveActions>
    </main>
  );
}
