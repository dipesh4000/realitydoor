import { api, ensureSession } from './client';

export const getDocuments = async () => {
  await ensureSession();
  return (await api.get('/documents')).data;
};

export const uploadDocument = async (file) => {
  await ensureSession();
  const form = new FormData();
  form.append('file', file);
  return (await api.post('/documents/upload', form)).data;
};

export const deleteDocument = async (docId) => (await api.delete(`/documents/${docId}`)).data;
export const getDocumentFields = async (docId) => (await api.get(`/documents/${docId}/fields`)).data;
export const confirmField = async (docId, fieldId) => (await api.post(`/documents/${docId}/fields/${fieldId}/confirm`)).data;
export const correctField = async (docId, fieldId, newValue) => (await api.post(`/documents/${docId}/fields/${fieldId}/correct`, { value: newValue })).data;
export const rejectField = async (docId, fieldId) => (await api.post(`/documents/${docId}/fields/${fieldId}/reject`)).data;

export const getDocumentContentUrl = (docId) => `${api.defaults.baseURL}/documents/${docId}/content`;
export const getDocumentPageUrl = (docId, page = 1) => `${api.defaults.baseURL}/documents/${docId}/pages/${page}.png`;
