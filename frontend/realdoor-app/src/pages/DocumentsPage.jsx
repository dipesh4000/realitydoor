import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Trash2, Eye, CheckCircle2, Loader2, AlertCircle, PlusCircle } from 'lucide-react';
import AiPanel from '../components/layout/AiPanel';
import { getDocuments, deleteDocument } from '../api/documents';

const STATUS_CONFIG = {
  scanning: { label: 'Scanning…', icon: <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />, color: 'var(--color-primary-container)' },
  scanned:  { label: 'Scanned',   icon: <CheckCircle2 size={13} />, color: 'var(--color-success)' },
  error:    { label: 'Error',     icon: <AlertCircle size={13} />,  color: 'var(--color-error)' },
};

export default function DocumentsPage() {
  const [docs, setDocs] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { getDocuments().then((res) => setDocs(res.documents)); }, []);

  const handleDelete = async (id) => {
    await deleteDocument(id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
  };

  const sc = (s) => STATUS_CONFIG[s] || STATUS_CONFIG.scanned;

  return (
    <>
      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Documents</h1>
            <p className="page-subtitle">Manage your uploaded files and view extraction results.</p>
          </div>
          <button className="btn btn-primary" style={{ gap: 6 }} onClick={() => navigate('/upload')}>
            <PlusCircle size={15} /> Add Document
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {docs.map((doc) => {
            const s = sc(doc.status);
            return (
              <div key={doc.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' }}>
                <div style={{ width: 40, height: 40, background: 'var(--color-surface-container)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={18} color="var(--color-primary-container)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-outline)' }}>{doc.size} · Uploaded {doc.uploadedAt}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 500, color: s.color, flexShrink: 0 }}>
                  {s.icon} {s.label}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button className="btn btn-outline btn-sm" style={{ gap: 4 }} onClick={() => navigate('/extraction')}>
                    <Eye size={13} /> Review
                  </button>
                  <button className="btn btn-sm" style={{ color: 'var(--color-error)', background: 'var(--color-error-container)', border: 'none', gap: 4 }} onClick={() => handleDelete(doc.id)}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}

          {docs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-outline)' }}>
              <FileText size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <p>No documents uploaded yet.</p>
              <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => navigate('/upload')}>Upload Documents</button>
            </div>
          )}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>

      <AiPanel
        title="Copilot"
        subtitle="Document Review"
        suggestedQuestions={['What documents are still required?', 'Which documents have issues?', 'Explain document freshness rules']}
      />
    </>
  );
}
