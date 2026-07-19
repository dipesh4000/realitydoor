import { api } from './client';

export const getRules = async (category = 'All Rules', query = '') => (
  await api.get('/rules', { params: { category, query: query || undefined } })
).data;

export const getRule = async (id) => (await api.get(`/rules/${id}`)).data;
