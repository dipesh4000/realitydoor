import { api } from './client';

export const getRules = async (category = 'All Rules', query = '') => (
  await api.get('/rules', { params: { category, query: query || undefined } })
).data;

export const getRule = async (id) => (await api.get(`/rules/${id}`)).data;

export const getMtspLimit = async ({ area, fiscal_year, income_band, household_size }) => (
  await api.get('/limits/mtsp', { params: { area, fiscal_year, income_band, household_size } })
).data;
