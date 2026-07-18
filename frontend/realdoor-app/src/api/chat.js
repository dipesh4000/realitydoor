// src/api/chat.js
// Mock API — Future endpoint: POST /api/chat
const delay = (ms = 900) => new Promise((res) => setTimeout(res, ms));

const _responses = [
  "Based on program rules, pay stubs must be dated within **60 days** of the certification date. [HUD Handbook 4350.3 REV-1, §5-14]",
  "The 2026 MTSP 60% limit for a 3-person household in Albany, GA MSA is **$41,580**. The housing provider makes the final determination.",
  "Household size is determined by counting all members who share the unit as their primary residence, including temporarily absent members. Refer to [HUD Handbook 4350.3 REV-1, Ch. 3].",
  "Annualized biweekly income is calculated as: gross pay × 26. Example: $1,540 × 26 = **$40,040**. [Rule INC-BIWEEKLY-001]",
  "I can help you understand program rules, review your documents, or calculate income. What would you like to explore?",
];

let _idx = 0;

export const sendMessage = async (text, context = null) => {
  await delay();
  // FUTURE:
  // return (await axios.post(`${API}/api/chat`, { message: text, context })).data;
  const response = _responses[_idx % _responses.length];
  _idx++;
  return {
    reply: response,
    sources: context?.sources || [],
    disclaimer: 'AI can make mistakes. Verify critical compliance logic.',
  };
};
