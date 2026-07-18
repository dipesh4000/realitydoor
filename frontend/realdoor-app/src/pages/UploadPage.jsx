import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudUpload, FileText, Image, CheckCircle2, Loader2, Wallet, Building2, CreditCard, ChevronRight, ArrowRight } from 'lucide-react';
import AiPanel from '../components/layout/AiPanel';
import { uploadDocument } from '../api/documents';

const REQUIRED_DOCS = [
  { id: 'pay_stub', label: 'Recent Pay Stubs', icon: <Wallet size={16} /> },
  { id: 'w2', label: 'W-2 or Tax Returns', icon: <Building2 size={16} /> },
  { id: 'government_id', label: 'Government ID', icon: <CreditCard size={16} /> },
];

const AI_MESSAGES = [
  {
    role: 'ai',
    text: "Ready to help you prepare. As you upload documents, I will securely scan them to extract necessary data and verify they meet the application requirements.\n\nI'll highlight any missing information or discrepancies before you submit.",
  },
];

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState([
    { id: 'doc_1', name: 'Q3_PayStub_2024.pdf', size: '2.4 MB', status: 'scanning' },
    { id: 'doc_2', name: 'Driver_License_Front.jpg', size: '1.1 MB', status: 'scanned' },
  ]);
  const [uploading, setUploading] = useState(false);
  const [countdown, setCountdown] = useState(null); // null = not started
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const countdownRef = useRef(null);

  // Simulate first doc finishing scan after 2s on mount
  useEffect(() => {
    const t = setTimeout(() => {
      setUploaded((prev) => prev.map((d) => d.id === 'doc_1' ? { ...d, status: 'scanned' } : d));
    }, 2000);
    return () => clearTimeout(t);
  }, []);

  // Watch for all docs scanned → start countdown
  useEffect(() => {
    const allScanned = uploaded.length > 0 && uploaded.every((d) => d.status === 'scanned');
    if (allScanned && countdown === null && !uploading) {
      setCountdown(3);
    }
  }, [uploaded, uploading]);

  // Countdown ticker
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      navigate('/extraction');
      return;
    }
    countdownRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(countdownRef.current);
  }, [countdown, navigate]);

  const handleFiles = async (files) => {
    setCountdown(null); // reset countdown if more files added
    clearTimeout(countdownRef.current);
    setUploading(true);
    for (const file of files) {
      const res = await uploadDocument(file);
      setUploaded((prev) => [...prev, { id: res.document.id, name: file.name, size: res.document.size, status: 'scanning' }]);
      setTimeout(() => {
        setUploaded((prev) => prev.map((d) => d.id === res.document.id ? { ...d, status: 'scanned' } : d));
      }, 2000);
    }
    setUploading(false);
  };

  const allScanned = uploaded.length > 0 && uploaded.every((d) => d.status === 'scanned');

  return (
    <>
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Upload Documents</h1>
          <p className="page-subtitle">Step 1: Securely upload your required files to begin the readiness assessment.</p>
        </div>

        {/* Auto-redirect banner */}
        {allScanned && countdown !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 18px', marginBottom: 20,
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1.5px solid #bae6fd', borderRadius: 'var(--radius-xl)',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle2 size={18} color="var(--color-success)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-on-surface)' }}>All documents scanned successfully</div>
                <div style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
                  Redirecting to <strong>Review Extracted Fields</strong> in <strong>{countdown}s</strong>…
                </div>
              </div>
            </div>
            <button className="btn btn-primary" style={{ gap: 5, flexShrink: 0 }} onClick={() => navigate('/extraction')}>
              Review Extracted Fields <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Drop zone */}
        <div
          className={`upload-zone${dragOver ? ' drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles([...e.dataTransfer.files]); }}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={(e) => handleFiles([...e.target.files])} />
          <div className="upload-icon">
            {uploading ? <Loader2 size={24} color="var(--color-primary-container)" style={{ animation: 'spin 1s linear infinite' }} /> : <CloudUpload size={24} color="var(--color-primary-container)" />}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Drag &amp; Drop files here</h2>
          <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)', marginBottom: 12 }}>or browse to choose files from your computer</p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', color: 'var(--color-outline)', fontSize: 13 }}>
            <span><FileText size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />PDF</span>
            <span><Image size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />JPG/PNG</span>
            <span>Max 50MB</span>
          </div>
        </div>

        {/* Two-column: required docs + uploaded */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1" ry="1"/><path d="M9 12h6m-6 4h4"/></svg>
              Required Documents
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {REQUIRED_DOCS.map((d) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'var(--color-surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-on-surface-variant)' }}>{d.icon}</div>
                  <span style={{ flex: 1, fontSize: 14 }}>{d.label}</span>
                  <span className="badge badge-neutral">Required</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              Uploaded Files
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {uploaded.map((f) => (
                <div key={f.id} className="file-item">
                  <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--color-surface-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={15} color="var(--color-on-surface-variant)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-outline)' }}>{f.size}</div>
                  </div>
                  {f.status === 'scanning' ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-primary-container)', fontWeight: 500, flexShrink: 0 }}>
                      <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Scanning...
                    </span>
                  ) : (
                    <CheckCircle2 size={16} color="var(--color-success)" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Continue button (fallback if auto-nav hasn't triggered) */}
        {!allScanned && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/extraction')}>
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>

      <AiPanel
        title="Copilot"
        subtitle="Ready to assist"
        initialMessages={AI_MESSAGES}
        suggestedQuestions={['What documents are required?', 'What counts as proof of income?']}
      />
    </>
  );
}

