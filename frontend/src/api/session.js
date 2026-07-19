import { api } from './client';

export const getSession = async () => (await api.get('/session')).data;

export const selectProgram = async () => (
  await api.post('/session/program', {
    program: 'LIHTC',
    area: 'Albany, GA MSA',
    year: 2026,
  })
).data;

export const deleteSession = async () => (await api.delete('/session')).data;
export const updateProfile = async (household_size, income_band) => (await api.patch('/session/profile', { household_size, income_band })).data;
export const acceptConsent = async () => (await api.post('/session/consent', { accepted: true, consent_version: '2026-07-privacy-v1' })).data;
