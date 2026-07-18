// src/api/rules.js
// Mock API — Future endpoints: GET /api/rules, GET /api/rules/:id
const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

const _rules = [
  {
    id: 'rule_1',
    title: 'Maximum Allowable Income (LIHTC)',
    status: 'active',
    category: 'Income Limits',
    plain_english:
      "A household's total anticipated gross income for the next 12 months cannot exceed the designated Area Median Income (AMI) limit for their household size at the time of initial occupancy.",
    citations: [
      { label: 'IRC §42(g)(1)', url: '#' },
      { label: 'HUD Handbook 4350.3 REV-1, Ch. 5', url: '#' },
    ],
    formula: `const calculateGrossIncome = (wages, assets, benefits) => {
  let totalWages = wages.reduce((sum, val) => sum + val, 0);
  let assetIncome = calculateAssetIncome(assets);
  return totalWages + assetIncome + benefits;
};
// Rule Validation
assert(calculateGrossIncome(...) <= AMILimit[householdSize]);`,
  },
  {
    id: 'rule_2',
    title: 'Student Rule Eligibility',
    status: 'active',
    category: 'Household Composition',
    plain_english:
      'Households comprised entirely of full-time students generally do not qualify for LIHTC housing unless they meet specific exceptions defined by the IRS.',
    citations: [
      { label: 'IRC §42(i)(3)(D)', url: '#' },
      { label: 'IRS Revenue Ruling 2004-82', url: '#' },
    ],
    formula: `const isEligibleStudentHousehold = (members) => {
  const allStudents = members.every(m => m.isFullTimeStudent);
  if (!allStudents) return true;
  return members.some(m => meetsStudentException(m));
};`,
  },
  {
    id: 'rule_3',
    title: 'Asset Income Calculation',
    status: 'active',
    category: 'Income Limits',
    plain_english:
      'When total household assets exceed $5,000, the greater of actual asset income or imputed asset income (assets × passbook rate) must be included in gross income.',
    citations: [
      { label: 'HUD Handbook 4350.3 REV-1, §5-7', url: '#' },
    ],
    formula: `const assetIncome = (assets, passbookRate = 0.0006) => {
  const totalAssets = assets.reduce((s, a) => s + a.value, 0);
  if (totalAssets <= 5000) return assets.reduce((s, a) => s + a.income, 0);
  const imputed = totalAssets * passbookRate;
  const actual  = assets.reduce((s, a) => s + a.income, 0);
  return Math.max(imputed, actual);
};`,
  },
  {
    id: 'rule_4',
    title: 'Document Freshness — Pay Stubs',
    status: 'active',
    category: 'Asset Restrictions',
    plain_english:
      'Pay stubs must be dated within 60 days of the certification date. Stubs older than 60 days are considered stale and cannot be used for income verification.',
    citations: [
      { label: 'HUD Handbook 4350.3 REV-1, §5-14', url: '#' },
    ],
    formula: `const isPayStubFresh = (payStubDate, certDate) => {
  const diffDays = (certDate - payStubDate) / (1000 * 60 * 60 * 24);
  return diffDays <= 60;
};`,
  },
];

const _categories = ['All Rules', 'Income Limits', 'Household Composition', 'Asset Restrictions'];

export const getRules = async (filter = 'All Rules') => {
  await delay();
  // FUTURE: return (await axios.get(`${API}/api/rules`, { params: { category: filter } })).data;
  const filtered = filter === 'All Rules' ? _rules : _rules.filter((r) => r.category === filter);
  return { rules: filtered, categories: _categories };
};

export const getRule = async (id) => {
  await delay(300);
  // FUTURE: return (await axios.get(`${API}/api/rules/${id}`)).data;
  return { rule: _rules.find((r) => r.id === id) || null };
};
