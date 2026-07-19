import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../api/session';

export default function ProgramGuard({ children, refreshKey }) {
  const [status, setStatus] = useState('loading');
  const [retryKey, setRetryKey] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setStatus('loading');
    getSession()
      .then((session) => {
        if (active) setStatus(session.program_selected ? 'ready' : 'program-required');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => { active = false; };
  }, [refreshKey, retryKey]);

  if (status === 'loading') {
    return <main className="main-content route-status" aria-live="polite"><Loader2 className="route-status-spinner" size={28} />Checking your selected program…</main>;
  }

  if (status === 'program-required') {
    return (
      <main className="main-content route-status">
        <div className="program-required-card" role="alert">
          <AlertCircle size={36} />
          <h1>Select a program before continuing</h1>
          <p>Choose a housing program first. Readiness, documents, rules, uploads, extraction, and packet tools become available after program selection.</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>
            Go to Programs <ArrowRight size={16} />
          </button>
        </div>
      </main>
    );
  }

  if (status === 'error') {
    return (
      <main className="main-content route-status">
        <div className="program-required-card" role="alert">
          <AlertCircle size={36} />
          <h1>We could not verify your session</h1>
          <p>Make sure the RealDoor API is running, then retry. No document or packet action was performed.</p>
          <button className="btn btn-primary" onClick={() => setRetryKey((current) => current + 1)}>Retry</button>
        </div>
      </main>
    );
  }

  return children;
}
