// src/api/income.js
// Mock API — Future endpoint: POST /api/income/calculate
const delay = (ms = 700) => new Promise((res) => setTimeout(res, ms));

export const calculateIncome = async ({ gross_pay, pay_frequency }) => {
  await delay();
  // FUTURE: return (await axios.post(`${API}/api/income/calculate`, { gross_pay, pay_frequency })).data;
  const multipliers = { weekly: 52, biweekly: 26, semimonthly: 24, monthly: 12 };
  const mult = multipliers[pay_frequency] || 12;
  const annualized = gross_pay * mult;
  return {
    calculation_id: `calc_${Date.now()}`,
    method: `${pay_frequency}_gross_times_${mult}`,
    inputs: { gross_pay, periods_per_year: mult },
    result: annualized,
    rule_id: `INC-${pay_frequency.toUpperCase()}-001`,
    source_ids: ['SOURCE_22'],
    disclaimer: 'The housing provider makes the final determination.',
  };
};

// src/api/packet.js — also exported here for convenience
// FUTURE: Split into packet.js
let _packetState = { status: 'not_generated' };

export const getPacket = async () => {
  await delay(300);
  // FUTURE: return (await axios.get(`${API}/api/packet`)).data;
  return _packetState;
};

export const generatePacket = async () => {
  await delay(1500);
  // FUTURE: return (await axios.post(`${API}/api/packet/generate`)).data;
  _packetState = { status: 'generated', url: '/mock-packet.pdf', generated_at: new Date().toISOString() };
  return _packetState;
};

export const deletePacket = async () => {
  await delay(500);
  // FUTURE: return (await axios.delete(`${API}/api/packet`)).data;
  _packetState = { status: 'not_generated' };
  return { success: true };
};
