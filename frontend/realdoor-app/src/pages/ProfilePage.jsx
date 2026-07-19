import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { acceptConsent, updateProfile } from '../api/session';

export default function ProfilePage() {
  const [household, setHousehold] = useState(3);
  const [band, setBand] = useState(60);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const save = async () => {
    setBusy(true);
    try {
      await updateProfile(Number(household), Number(band));
      await acceptConsent();
      navigate('/upload');
    } finally { setBusy(false); }
  };
  return <main className="main-content" style={{ maxWidth: 820 }}>
    <div className="page-header"><div className="step-indicator">Step 1 of 5</div><h1 className="page-title">Confirm your preparation profile</h1><p className="page-subtitle">These two values control the exact HUD table lookup. You can change them later.</p></div>
    <div className="card" style={{ display: 'grid', gap: 20 }}>
      <label>Household size<select value={household} onChange={e => setHousehold(e.target.value)} style={{ display: 'block', width: '100%', marginTop: 7, padding: 11 }}>{[1,2,3,4,5,6,7,8].map(n => <option key={n}>{n}</option>)}</select></label>
      <fieldset style={{ border: 0, padding: 0 }}><legend style={{ fontWeight: 600, marginBottom: 8 }}>Income-limit band to review</legend>{[50,60].map(n => <label key={n} style={{ marginRight: 24 }}><input type="radio" name="band" checked={band === n} onChange={() => setBand(n)} /> {n}% MTSP</label>)}</fieldset>
      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 14, background: 'var(--color-surface-container)', borderRadius: 10 }}><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span><b><ShieldCheck size={15} style={{ verticalAlign: 'middle' }} /> I consent to document processing for this session.</b><br/><small>Uploads are used only for preparation, can be corrected or deleted, expire with the session, and are never automatically submitted.</small></span></label>
      <button className="btn btn-primary btn-lg" disabled={!consent || busy} onClick={save}>{busy ? 'Saving…' : 'Save and continue'}</button>
    </div>
  </main>;
}
