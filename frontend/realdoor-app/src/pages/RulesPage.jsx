import { useState, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import AiPanel from '../components/layout/AiPanel';
import { getRules } from '../api/rules';

const RULES_AI_MESSAGES = [
  {
    role: 'user',
    text: 'Can you explain how a projected bonus affects the Maximum Allowable Income calculation for a household?',
  },
  {
    role: 'ai',
    text: "Certainly. When calculating anticipated gross income, you must include all recurring pay and any expected bonuses, even if they aren't guaranteed. If historical data indicates a bonus is likely, it must be annualized.\n\nHere is a breakdown of how it impacts the **calculateGrossIncome** rule:",
  },
];

function CalculationCard() {
  return (
    <div style={{ background: 'var(--color-surface-container)', borderRadius: 'var(--radius-lg)', padding: 14, marginTop: 10, fontSize: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: 10 }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
        Calculation Breakdown
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--color-outline-variant)', color: 'var(--color-on-surface-variant)' }}>
        <span>Base Salary (Annualized)</span><span style={{ fontWeight: 500 }}>$45,000.00</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid var(--color-outline-variant)', color: 'var(--color-primary-container)' }}>
        <span>+ Projected Bonus</span><span style={{ fontWeight: 600 }}>$2,500.00</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-outline-variant)' }}>
        <span style={{ fontWeight: 700 }}>Total Anticipated Gross</span><span style={{ fontWeight: 700 }}>$47,500.00</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: 'var(--color-error)' }}>
        <span>60% AMI Limit (2 Persons)</span><span style={{ fontWeight: 600 }}>$49,200.00</span>
      </div>
    </div>
  );
}

function RuleCard({ rule }) {
  const [expanded, setExpanded] = useState(rule.id === 'rule_1');

  return (
    <div className="rule-card">
      <div className="rule-card-header" onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: expanded ? 'var(--color-primary-container)' : 'var(--color-outline-variant)', marginTop: 6, flexShrink: 0 }} />
          <div>
            <h3 className="rule-card-title">{rule.title}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <span className="badge badge-primary" style={{ fontSize: 11, padding: '2px 8px' }}>ACTIVE RULE</span>
              <span style={{ fontSize: 12, color: 'var(--color-on-surface-variant)' }}>• Category: {rule.category}</span>
            </div>
          </div>
        </div>
        {expanded ? <ChevronUp size={18} color="var(--color-outline)" /> : <ChevronDown size={18} color="var(--color-outline)" />}
      </div>

      {expanded && (
        <div style={{ marginTop: 16 }}>
          {/* Plain English */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: 8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Plain English
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--color-on-surface)', marginBottom: 16 }}>{rule.plain_english}</p>

          {/* Citations */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: 8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            Official Citation
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            {rule.citations.map((c, i) => (
              <span key={i} className="citation-tag">{c.label}</span>
            ))}
          </div>

          {/* Formula */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-on-surface-variant)', marginBottom: 8 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
            Computational Formula
          </div>
          <div className="code-block">{rule.formula}</div>

          {/* Ask AI */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button className="btn btn-outline" style={{ gap: 5, fontSize: 13 }}>
              <Sparkles size={13} /> Ask AI about this rule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RulesPage() {
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All Rules');
  const [search, setSearch] = useState('');

  useEffect(() => {
    getRules(activeCategory).then((res) => {
      setRules(res.rules);
      setCategories(res.categories);
    });
  }, [activeCategory]);

  const filtered = rules.filter((r) =>
    !search || r.title.toLowerCase().includes(search.toLowerCase()) || r.plain_english.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Rules Library</h1>
          <p className="page-subtitle">Explore compliance criteria and computational logic.</p>
        </div>

        {/* Search */}
        <div className="search-bar" style={{ marginBottom: 16 }}>
          <Search size={16} color="var(--color-outline)" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rules, citations, or formulas..." />
        </div>

        {/* Filters */}
        <div className="filter-chips" style={{ marginBottom: 24 }}>
          {categories.map((cat) => (
            <button key={cat} className={`chip${activeCategory === cat ? ' active' : ''}`} onClick={() => setActiveCategory(cat)}>
              {cat}
            </button>
          ))}
        </div>

        {/* Rules */}
        <div>
          {filtered.map((rule) => <RuleCard key={rule.id} rule={rule} />)}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-outline)' }}>No rules match your search.</div>
          )}
        </div>
      </main>

      <AiPanel
        title="AI Assistant"
        subtitle="Context: Income Calculations"
        initialMessages={RULES_AI_MESSAGES}
        suggestedQuestions={['Explain this rule', 'Show official citation', 'Explain this formula']}
      />
    </>
  );
}
