import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../api/session';
import { Button } from './ui';

export default function ProgramGuard({ children, refreshKey }) {
  const [status, setStatus] = useState('loading');
  const [retryKey, setRetryKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setStatus('loading');
    getSession().then((session) => {
      if (active) setStatus(session.program_selected ? 'ready' : 'program-required');
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; };
  }, [refreshKey, retryKey]);

  if (status === 'loading') return <main id="main-content" className="main-content route-status" aria-live="polite"><div className="loading-state"><Loader2 className="spin" size={28} />Checking your selected program…</div></main>;

  if (status === 'program-required') {
    return <main id="main-content" className="main-content route-status"><div className="program-required-card" role="alert"><AlertCircle size={36} /><h1>Choose a program first</h1><p>Your private workspace, document review, cited rules, and packet tools become available after program selection.</p><Button size="lg" onClick={() => navigate('/')}>Go to programs <ArrowRight size={16} /></Button></div></main>;
  }

  if (status === 'error') {
    return <main id="main-content" className="main-content route-status"><div className="program-required-card" role="alert"><AlertCircle size={36} /><h1>We could not verify your session</h1><p>Make sure the RealDoor API is running, then try again. No document or packet action was performed.</p><Button onClick={() => setRetryKey((current) => current + 1)}>Try again</Button></div></main>;
  }

  return children;
}
