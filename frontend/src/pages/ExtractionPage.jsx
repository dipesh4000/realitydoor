import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Eye, FileQuestion, Layers3, Pencil, SearchCheck, UploadCloud } from 'lucide-react';
import { confirmField, correctField, getDocumentContentUrl, getDocumentFields, getDocumentPageUrl, getDocuments } from '../api/documents';
import { Badge, Button, Callout, Card, EmptyState, LoadingState, PageHeader } from '../components/ui';
import { ReviewIllustration } from '../components/illustrations/JourneyIllustrations';

const label = (name) => name.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());

function confidenceState(value) {
  const percent = Math.round(value * 100);
  if (percent >= 90) return { label: 'Looks good', tone: 'success', percent };
  if (percent >= 75) return { label: 'Please review', tone: 'warning', percent };
  return { label: 'Needs correction', tone: 'error', percent };
}

export default function ExtractionPage() {
  const [documents, setDocuments] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [fields, setFields] = useState(null);
  const [pageCount, setPageCount] = useState(1);
  const [duplicatesOmitted, setDuplicatesOmitted] = useState(0);
  const [activePage, setActivePage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [selectedField, setSelectedField] = useState(null);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    getDocuments().then(({ documents: records }) => {
      setDocuments(records);
      const requested = searchParams.get('document');
      setActiveId(records.some((item) => item.id === requested) ? requested : records[0]?.id || null);
    }).catch(() => { setDocuments([]); setError('We could not load your documents.'); });
  }, [searchParams]);

  useEffect(() => {
    if (!activeId) { setFields([]); return; }
    setFields(null);
    setError('');
    getDocumentFields(activeId).then((response) => {
      setFields(response.fields);
      setPageCount(response.page_count || 1);
      setDuplicatesOmitted(response.duplicates_omitted || 0);
      const firstPage = response.fields[0]?.page || 1;
      setActivePage(firstPage);
      setSelectedField(response.fields[0] || null);
    }).catch(() => { setFields([]); setPageCount(1); setDuplicatesOmitted(0); setError('We could not load the extracted details for this document.'); });
  }, [activeId]);

  const activeDocument = documents?.find((document) => document.id === activeId);
  const confirmedCount = useMemo(() => fields?.filter((field) => ['confirmed', 'corrected'].includes(field.status)).length || 0, [fields]);
  const reviewCount = (fields?.length || 0) - confirmedCount;
  const hasUsefulData = fields === null || fields.length > 0 || duplicatesOmitted > 0;
  const pageNumbers = useMemo(() => Array.from({ length: pageCount }, (_, index) => index + 1), [pageCount]);
  const pageFields = useMemo(() => fields?.filter((field) => (field.page || 1) === activePage) || [], [fields, activePage]);

  const selectPage = (page) => {
    setActivePage(page);
    setSelectedField((fields || []).find((field) => (field.page || 1) === page) || null);
  };

  const confirm = async (field) => {
    setError('');
    try {
      await confirmField(activeId, field.id);
      setFields((current) => current.map((item) => item.id === field.id ? { ...item, status: 'confirmed' } : item));
    } catch { setError(`We could not confirm ${label(field.field_name)}. Please try again.`); }
  };

  const save = async (field) => {
    let value = editValue;
    if (typeof field.normalized_value === 'number') {
      const parsed = Number(editValue.replaceAll(',', '').replace('$', ''));
      value = Number.isNaN(parsed) ? editValue : parsed;
    }
    setError('');
    try {
      await correctField(activeId, field.id, value);
      setFields((current) => current.map((item) => item.id === field.id ? { ...item, normalized_value: value, status: 'corrected' } : item));
      setEditingId(null);
    } catch { setError(`We could not save the correction to ${label(field.field_name)}.`); }
  };

  if (documents === null) return <main id="main-content" className="main-content"><LoadingState label="Loading your document workspace…" /></main>;

  return (
    <main id="main-content" className="main-content">
      <PageHeader eyebrow="Step 3 of 5" title="Check what RealDoor found" description="Choose a document and inspect every page. Compare each policy-relevant detail with its source, then confirm or correct it." illustration={<ReviewIllustration />} />

      {error && <Callout tone="error" title="Something needs attention">{error}</Callout>}
      {activeDocument?.safety_flags?.length > 0 && <Callout className="packet-success" tone="warning" title="Instruction-like text was ignored" icon={AlertTriangle}>RealDoor treated the document as untrusted evidence and did not follow instructions found inside it. Review or remove this file.</Callout>}

      {documents.length === 0 ? (
        <Card><EmptyState icon={SearchCheck} title="No documents to review yet" description="Add at least one document before reviewing extracted details." action={<Button onClick={() => navigate('/upload')}>Add documents</Button>} /></Card>
      ) : (
        <>
          <Card className="evidence-toolbar">
            <label htmlFor="document-select">Selected document</label>
            <select id="document-select" value={activeId || ''} onChange={(event) => setActiveId(event.target.value)}>
              {documents.map((document) => <option key={document.id} value={document.id}>{document.name}</option>)}
            </select>
            {activeDocument && <a className="button button--secondary button--sm" href={getDocumentContentUrl(activeDocument.id)} target="_blank" rel="noreferrer"><Eye size={14} /> Open original</a>}
          </Card>

          {fields === null ? <LoadingState label="Reading extracted details…" /> : (
            <>
              {!hasUsefulData && (
                <Callout tone="warning" title="No useful application data was found" icon={FileQuestion} actions={<Button size="sm" onClick={() => navigate('/upload')}><UploadCloud size={15} /> Add a different document</Button>}>
                  This file does not appear to contain supported income, identity, banking, or employment details. Check that you uploaded the intended document, or choose another file.
                </Callout>
              )}
              {duplicatesOmitted > 0 && (
                <Callout tone="info" title={`${duplicatesOmitted} repeated ${duplicatesOmitted === 1 ? 'detail was' : 'details were'} removed`}>
                  Those exact values are already represented by another document, so you only need to review them once.
                </Callout>
              )}

              <Card className="page-selector" aria-label="Document pages">
                <div className="page-selector__heading"><Layers3 size={16} /><strong>{pageCount} {pageCount === 1 ? 'page' : 'pages'} in {activeDocument?.name}</strong><span>Select a page to inspect its extracted details.</span></div>
                <div className="page-selector__tabs" role="tablist" aria-label="PDF pages">
                  {pageNumbers.map((page) => {
                    const count = fields.filter((field) => (field.page || 1) === page).length;
                    return <button key={page} type="button" role="tab" aria-selected={activePage === page} className={activePage === page ? 'is-active' : ''} onClick={() => selectPage(page)}>Page {page}<small>{count ? `${count} ${count === 1 ? 'detail' : 'details'}` : 'No data'}</small></button>;
                  })}
                </div>
              </Card>

              <div className={`evidence-workspace${!hasUsefulData ? ' evidence-workspace--empty' : ''}`}>
                <Card className="document-preview">
                  <div className="document-preview__header"><div><strong>Source evidence · page {activePage}</strong><span>{selectedField ? label(selectedField.field_name) : 'No extracted detail selected on this page'}</span></div><Badge tone="info">Page {activePage} of {pageCount}</Badge></div>
                  {activeDocument && (
                    <div className="document-preview__canvas">
                      <img src={getDocumentPageUrl(activeDocument.id, activePage)} alt={`Page ${activePage} of ${activeDocument.name}`} />
                      {selectedField?.bounding_box && (selectedField.page || 1) === activePage && <div className="evidence-highlight" aria-label="Highlighted extracted source region" style={{ left: `${selectedField.bounding_box[0] / 612 * 100}%`, top: `${selectedField.bounding_box[1] / 792 * 100}%`, width: `${(selectedField.bounding_box[2] - selectedField.bounding_box[0]) / 612 * 100}%`, height: `${(selectedField.bounding_box[3] - selectedField.bounding_box[1]) / 792 * 100}%` }} />}
                    </div>
                  )}
                </Card>

                <Card className="field-panel">
                  <div className="field-panel__header"><h2>Extracted details · page {activePage}</h2><p>{pageFields.length ? `${pageFields.length} ${pageFields.length === 1 ? 'detail was' : 'details were'} found on this page. ${reviewCount} remain to review across the document.` : 'No policy-relevant details were found on this page.'}</p></div>
                  {!hasUsefulData ? (
                    <EmptyState icon={FileQuestion} title="Nothing useful to review" description="RealDoor could not find application-related details in this document. The file remains in your workspace until you replace or remove it." action={<Button variant="secondary" onClick={() => navigate('/documents')}>Manage this document</Button>} />
                  ) : pageFields.length === 0 ? (
                    <EmptyState icon={FileQuestion} title={`No useful data found on page ${activePage}`} description="This page is still shown so you can verify it individually. Try a clearer scan if this page should contain renter, income, employment, banking, or identity details." />
                  ) : pageFields.map((field) => {
                    const confidence = confidenceState(field.confidence);
                    const reviewed = ['confirmed', 'corrected'].includes(field.status);
                    return (
                      <div className={`extracted-field ${confidence.tone !== 'success' && !reviewed ? 'is-review' : ''}`} key={field.id}>
                        <div className="extracted-field__top">
                          <div><span className="extracted-field__label">{label(field.field_name)}</span><span className="extracted-field__value">{String(field.normalized_value ?? 'Not found')}</span></div>
                          <Badge tone={reviewed ? 'success' : confidence.tone}>{reviewed ? (field.status === 'corrected' ? 'Corrected' : 'Confirmed') : confidence.label}</Badge>
                        </div>
                        {editingId === field.id ? (
                          <div className="field-edit"><input type="text" aria-label={`Edit ${label(field.field_name)}`} value={editValue} onChange={(event) => setEditValue(event.target.value)} autoFocus /><Button size="sm" onClick={() => save(field)}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button></div>
                        ) : (
                          <div className="extracted-field__actions">
                            <Button size="sm" variant={reviewed ? 'secondary' : 'primary'} disabled={reviewed} onClick={() => confirm(field)}><CheckCircle2 size={14} /> {reviewed ? 'Reviewed' : 'This is correct'}</Button>
                            <Button size="sm" variant="secondary" onClick={() => { setEditingId(field.id); setEditValue(String(field.normalized_value ?? '')); }}><Pencil size={14} /> Correct</Button>
                          </div>
                        )}
                        {field.source_text && <button className="source-button" title={field.source_text} onClick={() => { setActivePage(field.page || 1); setSelectedField(field); }}>Show source: “{field.source_text}” · page {field.page || 1}</button>}
                        {field.note && <Callout tone="warning" className="packet-success">{field.note}</Callout>}
                      </div>
                    );
                  })}
                </Card>
              </div>
            </>
          )}

          {hasUsefulData && <div className="confirmation-summary">
            <div><strong>{confirmedCount} of {fields?.length || 0} details reviewed</strong><span>Readiness checks every field declared by the policy dataset and keeps missing or open details flagged.</span></div>
            <Button onClick={() => navigate('/readiness')}>See readiness <ArrowRight size={16} /></Button>
          </div>}
        </>
      )}
    </main>
  );
}
