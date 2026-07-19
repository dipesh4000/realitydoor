import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, Home, Landmark, LockKeyhole, ShieldCheck } from 'lucide-react';
import { selectProgram } from '../api/session';
import { Badge, Button, Callout, Card } from '../components/ui';
import { WelcomeIllustration } from '../components/illustrations/JourneyIllustrations';

const futurePrograms = [
  { name: 'Section 8 HCV', description: 'Housing Choice Voucher preparation guidance', icon: Home },
  { name: 'HOME Program', description: 'HOME Investment Partnerships guidance', icon: Landmark },
];

export default function PolicySelectPage({ onProgramSelected }) {
  const navigate = useNavigate();
  const [selecting, setSelecting] = useState(false);
  const [selectionError, setSelectionError] = useState('');

  const begin = async () => {
    if (selecting) return;
    setSelecting(true);
    setSelectionError('');
    try {
      const session = await selectProgram();
      if (!session.program_selected) throw new Error('Program selection was not saved');
      onProgramSelected?.(session);
      navigate('/profile');
    } catch {
      setSelectionError('We could not start your LIHTC workspace. Make sure the RealDoor API is running, then try again.');
    } finally {
      setSelecting(false);
    }
  };

  return (
    <main id="main-content" className="main-content">
      <section className="welcome-layout">
        <div>
          <div className="eyebrow">Application preparation, made clearer</div>
          <h1>Know what you need before you apply.</h1>
          <p>RealDoor helps you collect, review, and understand your housing documents—one calm step at a time.</p>
          <Button size="lg" loading={selecting} onClick={begin}>Start with LIHTC <ArrowRight size={17} /></Button>
          <div className="trust-row" aria-label="RealDoor trust commitments">
            <span><ShieldCheck size={15} /> Temporary, private session</span>
            <span><CheckCircle2 size={15} /> Cited 2026 guidance</span>
            <span><LockKeyhole size={15} /> No eligibility decisions</span>
          </div>
        </div>
        <div className="welcome-layout__art" aria-hidden="true"><WelcomeIllustration /></div>
      </section>

      {selectionError && <Callout className="packet-success" tone="error" title="Could not start your workspace">{selectionError}</Callout>}

      <div className="section-intro">
        <div><h2>Available program</h2><p>RealDoor currently supports one carefully scoped preparation flow.</p></div>
        <Badge tone="success">FY2026 active</Badge>
      </div>

      <Card className="program-card">
        <div className="program-card__icon"><Building2 size={24} /></div>
        <div className="program-card__content">
          <h3>Low-Income Housing Tax Credit</h3>
          <p>Albany, Georgia MSA · 50% and 60% MTSP income-limit bands</p>
          <div className="program-card__features">
            <Badge tone="info">Official HUD sources</Badge>
            <Badge tone="neutral">Deterministic income math</Badge>
            <Badge tone="neutral">Renter-controlled packet</Badge>
          </div>
        </div>
        <Button loading={selecting} onClick={begin}>Choose LIHTC <ArrowRight size={16} /></Button>
      </Card>

      <details className="future-programs">
        <summary>See programs planned for future releases</summary>
        <div className="future-program-grid">
          {futurePrograms.map(({ name, description, icon: Icon }) => (
            <div className="future-program" key={name}><Icon size={18} aria-hidden="true" /><strong>{name}</strong><span>{description} · Coming later</span></div>
          ))}
        </div>
      </details>

      <Callout title="Preparation help—not a housing decision" tone="info" className="packet-success">
        RealDoor helps you understand documents and published rules. The housing provider or administering agency makes every final decision.
      </Callout>
    </main>
  );
}
