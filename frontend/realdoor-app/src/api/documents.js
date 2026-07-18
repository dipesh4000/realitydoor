// src/api/documents.js
// Mock API — replace return values with real axios calls when backend is ready.
// Future base URL: import axios from 'axios'; const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

let _documents = [
  { id: 'doc_1', name: 'Q3_PayStub_2024.pdf',       size: '2.4 MB', type: 'pay_stub',    status: 'scanning',  uploadedAt: '2024-11-01' },
  { id: 'doc_2', name: 'Driver_License_Front.jpg',   size: '1.1 MB', type: 'government_id', status: 'scanned', uploadedAt: '2024-11-01' },
];

const _fields = {
  doc_1: [
    { id: 'f1', field_name: 'Full Name',           raw_value: 'John R. Doe',   normalized_value: 'John R. Doe',   confidence: 0.99, status: 'extracted', page: 1 },
    { id: 'f2', field_name: 'Employer Name',        raw_value: 'Acme Corp LLC', normalized_value: 'Acme Corp LLC', confidence: 0.98, status: 'extracted', page: 1 },
    { id: 'f3', field_name: 'Gross Monthly Income', raw_value: '$8,450.00',     normalized_value: 8450.0,          confidence: 0.64, status: 'needs_review', page: 1, note: 'Value is blurry in source document. Please verify against pay stub.' },
    { id: 'f4', field_name: 'Social Security Number', raw_value: 'XXX-XX-1234', normalized_value: 'XXX-XX-1234',  confidence: 0.99, status: 'extracted', page: 1 },
  ],
  doc_2: [
    { id: 'f5', field_name: 'Full Name', raw_value: 'John R. Doe', normalized_value: 'John R. Doe', confidence: 0.97, status: 'extracted', page: 1 },
    { id: 'f6', field_name: 'Issue Date', raw_value: '2019-03-15', normalized_value: '2019-03-15',  confidence: 0.95, status: 'extracted', page: 1 },
    { id: 'f7', field_name: 'Expiry Date', raw_value: '2023-03-15', normalized_value: '2023-03-15', confidence: 0.95, status: 'needs_review', page: 1, note: 'Document is expired. Please upload a current ID.' },
  ],
};

export const getDocuments = async () => {
  await delay();
  // FUTURE: return (await axios.get(`${API}/api/documents`)).data;
  return { documents: _documents };
};

export const uploadDocument = async (file) => {
  await delay(1200);
  // FUTURE: const form = new FormData(); form.append('file', file); return (await axios.post(`${API}/api/documents/upload`, form)).data;
  const newDoc = {
    id: `doc_${Date.now()}`,
    name: file.name,
    size: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
    type: 'unknown',
    status: 'scanning',
    uploadedAt: new Date().toISOString().slice(0, 10),
  };
  _documents = [..._documents, newDoc];
  return { document: newDoc };
};

export const deleteDocument = async (docId) => {
  await delay(400);
  // FUTURE: return (await axios.delete(`${API}/api/documents/${docId}`)).data;
  _documents = _documents.filter((d) => d.id !== docId);
  return { success: true };
};

export const getDocumentFields = async (docId) => {
  await delay();
  // FUTURE: return (await axios.get(`${API}/api/documents/${docId}/fields`)).data;
  return { fields: _fields[docId] || [] };
};

export const confirmField = async (docId, fieldId) => {
  await delay(400);
  // FUTURE: return (await axios.post(`${API}/api/documents/${docId}/fields/${fieldId}/confirm`)).data;
  if (_fields[docId]) {
    _fields[docId] = _fields[docId].map((f) => f.id === fieldId ? { ...f, status: 'confirmed' } : f);
  }
  return { success: true };
};

export const correctField = async (docId, fieldId, newValue) => {
  await delay(400);
  // FUTURE: return (await axios.post(`${API}/api/documents/${docId}/fields/${fieldId}/correct`, { value: newValue })).data;
  if (_fields[docId]) {
    _fields[docId] = _fields[docId].map((f) => f.id === fieldId ? { ...f, normalized_value: newValue, status: 'corrected' } : f);
  }
  return { success: true };
};

export const rejectField = async (docId, fieldId) => {
  await delay(400);
  // FUTURE: return (await axios.post(`${API}/api/documents/${docId}/fields/${fieldId}/reject`)).data;
  if (_fields[docId]) {
    _fields[docId] = _fields[docId].map((f) => f.id === fieldId ? { ...f, status: 'rejected' } : f);
  }
  return { success: true };
};
