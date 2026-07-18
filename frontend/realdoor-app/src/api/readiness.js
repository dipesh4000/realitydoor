// src/api/readiness.js
// Mock API — Future endpoint: GET /api/readiness
const delay = (ms = 600) => new Promise((res) => setTimeout(res, ms));

export const getReadiness = async () => {
  await delay();
  // FUTURE: return (await axios.get(`${API}/api/readiness`)).data;
  return {
    score: 65,
    label: 'Attention Required',
    issues_count: 3,
    issues: [
      {
        id: 'iss_1',
        type: 'missing_document',
        severity: 'error',
        title: 'Missing 2023 W2',
        description: 'Required for income verification under HUD Section 8 guidelines.',
        rule_ref: 'HUD Section 8 Guide',
        action: 'Upload Missing',
        doc_type: 'w2',
      },
      {
        id: 'iss_2',
        type: 'expired_document',
        severity: 'warning',
        title: 'Expired State ID',
        description: 'Government-issued ID must be valid and unexpired at time of submission.',
        rule_ref: 'Title 24 CFR 5.659',
        action: 'Update',
        doc_type: 'government_id',
      },
      {
        id: 'iss_3',
        type: 'low_confidence',
        severity: 'info',
        title: 'Low Confidence: Annual Income',
        description: 'Extracted value does not match supporting documents.',
        rule_ref: null,
        action: 'Verify Field',
        doc_id: 'doc_1',
        field_id: 'f3',
      },
    ],
    ai_action: {
      title: 'Action Required: Missing Tax Return',
      message:
        "Based on the applicant's stated income sources, a complete 2023 Federal Tax Return (1040) is necessary to verify self-employment earnings. The current upload only includes Schedule C.",
      file_ref: 'Uploaded_SchC_2023.pdf',
    },
    suggested_questions: [
      'Why is this document required?',
      'What should I upload next?',
      'Explain this warning',
    ],
  };
};
