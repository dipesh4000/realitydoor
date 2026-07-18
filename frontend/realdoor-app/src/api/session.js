// src/api/session.js
// Mock API — Future endpoints: GET /api/session, DELETE /api/session
const delay = (ms = 400) => new Promise((res) => setTimeout(res, ms));

export const getSession = async () => {
  await delay();
  // FUTURE: return (await axios.get(`${API}/api/session`)).data;
  return {
    session_id: 'sess_mock_001',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    program: 'LIHTC',
    area: 'Albany, GA MSA',
    year: 2026,
  };
};

export const deleteSession = async () => {
  await delay(600);
  // FUTURE: return (await axios.delete(`${API}/api/session`)).data;
  return { success: true, message: 'Session and all associated data deleted.' };
};
