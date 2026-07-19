import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, CloudUpload, CreditCard, FileText, Landmark, Loader2, LockKeyhole, WalletCards } from 'lucide-react';
import { getDocuments, uploadDocument } from '../api/documents';
import { getReadiness } from '../api/readiness';
import { Badge, Button, Callout, Card, PageHeader } from '../components/ui';
import { UploadIllustration } from '../components/illustrations/JourneyIllustrations';

const requirementIcons = {
  pay_stub: WalletCards,
  employment_verification: BriefcaseBusiness,
  bank_statement: Landmark,
  government_id: CreditCard,
};

function requirementDetail(requirement) {
  const parts = [`${requirement.minimum_count} required`];
  if (requirement.max_age_days) parts.push(`within ${requirement.max_age_days} days`);
  if (requirement.expiry_field) parts.push('must be unexpired');
  parts.push(`${requirement.required_fields.length} details checked`);
  return parts.join(' · ');
}

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [checklistTitle, setChecklistTitle] = useState('Preparation checklist');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getDocuments(), getReadiness()]).then(([documentResponse, readiness]) => {
      setDocuments(documentResponse.documents);
      setRequirements(readiness.requirements || []);
      setChecklistTitle(readiness.checklist_title || 'Preparation checklist');
    }).catch(() => setError('We could not load your document checklist.'));
  }, []);

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    setError('');
    const existingNames = new Set(documents.map((document) => document.name.toLowerCase()));
    const uniqueFiles = files.filter((file) => !existingNames.has(file.name.toLowerCase()));
    if (!uniqueFiles.length) {
      setError('Those files are already in your workspace. Rename a genuinely different file before adding it.');
      setUploading(false);
      return;
    }
    try {
      for (const file of uniqueFiles) {
        const response = await uploadDocument(file);
        setDocuments((current) => current.some((document) => document.id === response.document.id) ? current : [...current, response.document]);
      }
    } catch {
      setError('One or more files could not be added. Any successful uploads remain safely available below.');
    } finally {
      setUploading(false);
    }
  };

  const ready = documents.length > 0 && documents.every((document) => document.status !== 'scanning');

  return (
    <main id="main-content" className="main-content">
      <PageHeader eyebrow="Step 2 of 5" title="Add the documents you have" description="Start with any available document. RealDoor will show what is missing and ask you to review every extracted detail." illustration={<UploadIllustration />} />

      {ready && <Callout tone="success" title={`${documents.length} ${documents.length === 1 ? 'document is' : 'documents are'} ready to review`} actions={<Button size="sm" onClick={() => navigate('/extraction')}>Review details <ArrowRight size={15} /></Button>}>You can add more now or continue when you are ready.</Callout>}
      {error && <Callout className="packet-success" tone="error" title="Check your files">{error}</Callout>}

      <div className="upload-layout packet-success">
        <div>
          <div
            className={`upload-zone ${dragging ? 'is-dragging' : ''}`}
            role="button"
            tabIndex="0"
            aria-label="Upload PDF, JPG, or PNG documents"
            aria-busy={uploading}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); handleFiles([...event.dataTransfer.files]); }}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inputRef.current?.click(); } }}
          >
            <input ref={inputRef} className="sr-only" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => { handleFiles([...event.target.files]); event.target.value = ''; }} />
            <div className="upload-zone__icon">{uploading ? <Loader2 className="spin" size={26} /> : <CloudUpload size={27} />}</div>
            <h2>{uploading ? 'Adding your documents…' : 'Drop files here or choose from your device'}</h2>
            <p>We accept PDF, JPG, and PNG files up to 50 MB each.</p>
            <div className="upload-zone__meta"><span>PDF</span><span>JPG / PNG</span><span>Private session</span></div>
          </div>

          {documents.length > 0 && (
            <Card className="packet-success">
              <div className="panel-title"><h2>Your uploaded files</h2><Badge tone={ready ? 'success' : 'info'}>{ready ? 'Ready to review' : 'Processing'}</Badge></div>
              <div className="file-list">
                {documents.map((document) => (
                  <div className="file-row" key={document.id}>
                    <div className="file-row__icon"><FileText size={17} /></div>
                    <div className="file-row__copy"><strong title={document.name}>{document.name}</strong><small>{document.size || 'Uploaded securely'}</small></div>
                    {document.status === 'scanning' ? <Badge tone="info"><Loader2 className="spin" size={12} /> Reading</Badge> : <Badge tone="success">Added</Badge>}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <Card>
          <div className="panel-title"><h2>{checklistTitle}</h2><Badge tone="neutral">Policy dataset</Badge></div>
          <div className="requirement-list">
            {requirements.map((requirement) => {
              const Icon = requirementIcons[requirement.document_type] || FileText;
              const uploadedCount = documents.filter((document) => document.type === requirement.document_type).length;
              const supplied = uploadedCount >= requirement.minimum_count;
              return (
              <div className="requirement-item" key={requirement.id}>
                <div className="requirement-item__icon"><Icon size={16} /></div>
                <div className="requirement-item__copy"><strong>{requirement.label}</strong><small>{requirementDetail(requirement)}</small></div>
                <CheckCircle2 size={16} color={supplied ? 'var(--sage-700)' : 'var(--border-strong)'} aria-label={supplied ? 'Required file count supplied' : 'Still needed'} />
              </div>
              );
            })}
          </div>
          <div className="privacy-note"><LockKeyhole size={15} /><span>RealDoor reads only allowlisted fields and ignores instruction-like text inside uploaded documents.</span></div>
        </Card>
      </div>

      {documents.length > 0 && <div className="responsive-actions"><Button variant="ghost" onClick={() => navigate('/profile')}>Back</Button><Button size="lg" disabled={!ready || uploading} onClick={() => navigate('/extraction')}>Review extracted details <ArrowRight size={17} /></Button></div>}
    </main>
  );
}
