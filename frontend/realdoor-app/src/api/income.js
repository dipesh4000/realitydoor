import { api } from './client';

export const calculateIncome = async ({ gross_pay, pay_frequency }) => (
  await api.post('/income/calculate', { gross_pay, pay_frequency })
).data;

export const getPacketPreview = async () => (await api.get('/packets/preview')).data;
export const generatePacket = async (options = {}) => (await api.post('/packets', options)).data;

export const downloadPacket = async (packet) => {
  const response = await api.get(packet.download_url.replace('/api', ''), { responseType: 'blob' });
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'RealDoor_Application_Readiness_Packet.pdf';
  anchor.click();
  URL.revokeObjectURL(url);
};

export const deletePacket = async (packetId) => (await api.delete(`/packets/${packetId}`)).data;
