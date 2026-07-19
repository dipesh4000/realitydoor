import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, FilePlus2, FileText, Loader2, Plus, Trash2 } from 'lucide-react';
import { deleteDocument, getDocuments } from '../api/documents';
import { Badge, Button, Card, EmptyState, LoadingState, Modal, PageHeader } from '../components/ui';

const statusConfig = {
  scanning: { label: 'Reading', tone: 'info' },
  scanned: { label: 'Ready', tone: 'success' },
  needs_review: { label: 'Needs review', tone: 'warning' },
  error: { label: 'Could not read', tone: 'error' },
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState(null);
  const [filter, setFilter] = useState('all');
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => { getDocuments().then((response) => setDocuments(response.documents)).catch(() => setDocuments([])); }, []);
  const filtered = useMemo(() => documents?.filter((document) => filter === 'all' || (filter === 'review' ? ['needs_review', 'error'].includes(document.status) : document.status === filter)) || [], [documents, filter]);

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await deleteDocument(deleting.id);
      setDocuments((current) => current.filter((document) => document.id !== deleting.id));
      setDeleting(null);
    } finally { setBusy(false); }
  };

  if (documents === null) return <main id="main-content" className="main-content"><LoadingState label="Loading your documents…" /></main>;

  return (
    <main id="main-content" className="main-content">
      <PageHeader eyebrow="Your secure workspace" title="Documents" description="Review extraction status, revisit a source, or remove a file from this temporary session." actions={<Button onClick={() => navigate('/upload')}><Plus size={16} /> Add documents</Button>} />

      {documents.length > 0 && <div className="filters"><div className="filter-tabs" aria-label="Filter documents">{[['all','All'],['scanned','Ready'],['review','Needs review'],['scanning','Reading']].map(([value,label]) => <button className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)} key={value}>{label}</button>)}</div></div>}

      {documents.length === 0 ? (
        <Card><EmptyState icon={FilePlus2} title="No documents yet" description="Add the files you have. RealDoor will help identify what may still be needed." action={<Button onClick={() => navigate('/upload')}>Add your first document</Button>} /></Card>
      ) : filtered.length === 0 ? (
        <Card><EmptyState icon={FileText} title="No documents match this filter" description="Choose another status to see your files." action={<Button variant="secondary" onClick={() => setFilter('all')}>Show all documents</Button>} /></Card>
      ) : (
        <div className="document-grid">
          {filtered.map((document) => {
            const status = statusConfig[document.status] || statusConfig.scanned;
            return (
              <Card className="document-card" key={document.id}>
                <div className="document-card__top"><div className="document-card__icon"><FileText size={20} /></div><div className="document-card__title"><strong title={document.name}>{document.name}</strong><span>{document.size || 'Uploaded file'} · {document.uploadedAt ? `Uploaded ${document.uploadedAt}` : 'Temporary session'}</span></div><Badge tone={status.tone}>{document.status === 'scanning' && <Loader2 className="spin" size={12} />}{status.label}</Badge></div>
                <div className="document-card__actions"><Button size="sm" variant="secondary" onClick={() => navigate(`/extraction?document=${document.id}`)}><Eye size={14} /> Review details</Button><Button size="sm" variant="ghost" aria-label={`Delete ${document.name}`} onClick={() => setDeleting(document)}><Trash2 size={14} /> Remove</Button></div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(deleting)} onClose={() => !busy && setDeleting(null)} title="Remove this document?" description={deleting ? `${deleting.name} and its extracted fields will be permanently removed from this temporary session.` : ''}>
        <div className="modal__actions"><Button variant="secondary" onClick={() => setDeleting(null)} disabled={busy}>Keep document</Button><Button variant="danger" loading={busy} onClick={remove}>Remove document</Button></div>
      </Modal>
    </main>
  );
}
