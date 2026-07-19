import { api, ensureSession } from './client';

export const sendMessage = async (message, context = null) => {
  await ensureSession();
  return (await api.post('/chat', { message, context })).data;
};
