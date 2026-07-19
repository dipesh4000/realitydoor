import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Info, ShieldCheck } from 'lucide-react';
import { acceptConsent, updateProfile } from '../api/session';
import { Button, Callout, Card, Field, PageHeader, ResponsiveActions } from '../components/ui';

export default function ProfilePage() {
  const [household, setHousehold] = useState(3);
  const [band, setBand] = useState(60);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      await updateProfile(Number(household), Number(band));
      await acceptConsent();
      navigate('/upload');
    } catch {
      setError('Your profile could not be saved. Nothing was uploaded. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main-content" className="main-content">
      <PageHeader eyebrow="Step 1 of 5" title="Tell us what to compare" description="Two details help RealDoor find the correct published income-limit row. You can revisit them later." />

      {error && <Callout tone="error" title="We could not save your profile">{error}</Callout>}

      <div className="profile-grid">
        <Card>
          <Field label="How many people are in your household?" hint="Include everyone the housing provider would count in the household.">
            <div className="choice-grid">
              {[1,2,3,4,5,6,7,8].map((number) => (
                <label className="choice-card" key={number}>
                  <input type="radio" name="household" checked={household === number} onChange={() => setHousehold(number)} />
                  <strong>{number} {number === 1 ? 'person' : 'people'}</strong>
                  <small>Household size {number}</small>
                </label>
              ))}
            </div>
          </Field>
        </Card>

        <Card>
          <Field label="Which income-limit band are you reviewing?" hint="Choose the band shown by the property or housing provider.">
            <div className="choice-grid">
              {[50,60].map((number) => (
                <label className="choice-card" key={number}>
                  <input type="radio" name="band" checked={band === number} onChange={() => setBand(number)} />
                  <strong>{number}% MTSP</strong>
                  <small>FY2026 Albany table</small>
                </label>
              ))}
            </div>
          </Field>
          <Callout tone="info" icon={Info} title="Not sure which band to choose?" className="packet-success">
            Check the property listing or ask the housing provider. RealDoor compares information; it does not select a band for you.
          </Callout>
        </Card>
      </div>

      <label className="consent-card">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span><strong><ShieldCheck size={16} aria-hidden="true" /> I agree to document processing for this temporary session.</strong><span>Your uploads are used only for preparation, can be corrected or deleted, expire with the session, and are never submitted automatically.</span></span>
      </label>

      <ResponsiveActions>
        <Button variant="ghost" onClick={() => navigate('/')}>Back</Button>
        <Button size="lg" loading={busy} disabled={!consent} onClick={save}>Save and add documents <ArrowRight size={17} /></Button>
      </ResponsiveActions>
    </main>
  );
}
