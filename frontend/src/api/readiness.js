import { api, ensureSession } from './client';

export const getReadiness = async () => {
  await ensureSession();
  return (await api.get('/readiness')).data;
};
