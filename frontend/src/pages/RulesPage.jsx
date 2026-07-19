import { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, Search } from 'lucide-react';
import { getRules } from '../api/rules';
import { Badge, Card, EmptyState, LoadingState, PageHeader } from '../components/ui';

function RuleCard({ rule }) {
  const [expanded, setExpanded] = useState(rule.id === 'RULE-MTSP-DEFINITION-2026');
  return (
    <Card className="rule-card">
      <button type="button" className="rule-card__trigger" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <div><h3>{rule.title}</h3><div className="program-card__features"><Badge tone="success">Active FY2026 rule</Badge><Badge tone="neutral">{rule.category}</Badge></div></div>
        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {expanded && (
        <div className="rule-card__body">
          <div className="rule-block"><span className="rule-block__label">In plain language</span><p>{rule.plain_english}</p></div>
          <div className="rule-block"><span className="rule-block__label">Official sources</span><div className="citation-list">{rule.citations.map((citation, index) => citation.url ? <a key={`${citation.label}-${index}`} href={citation.url} target="_blank" rel="noreferrer">{citation.label} <ExternalLink size={10} /></a> : <span key={`${citation.label}-${index}`}>{citation.label}</span>)}</div></div>
          {rule.formula && <div className="rule-block"><span className="rule-block__label">Formula used by RealDoor</span><div className="formula">{rule.formula}</div></div>}
        </div>
      )}
    </Card>
  );
}

export default function RulesPage() {
  const [rules, setRules] = useState(null);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('All Rules');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setRules(null);
    getRules(category).then((response) => { setRules(response.rules); setCategories(response.categories); }).catch(() => setRules([]));
  }, [category]);

  const filtered = rules?.filter((rule) => !search || rule.title.toLowerCase().includes(search.toLowerCase()) || rule.plain_english.toLowerCase().includes(search.toLowerCase())) || [];

  return (
    <main id="main-content" className="main-content">
      <PageHeader eyebrow="Official guidance" title="Rules & sources" description="See the frozen FY2026 guidance and deterministic formulas RealDoor uses to explain your preparation checklist." />
      <div className="filters"><label className="search-box"><Search size={17} color="var(--ink-500)" /><span className="sr-only">Search rules and sources</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a rule, term, or formula…" /></label></div>
      <div className="rules-layout">
        <Card className="rules-sidebar"><h2>Browse topics</h2>{categories.map((item) => <button className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)} key={item}>{item}</button>)}</Card>
        <div>{rules === null ? <LoadingState label="Loading cited guidance…" /> : filtered.length ? filtered.map((rule) => <RuleCard key={rule.id} rule={rule} />) : <Card><EmptyState icon={BookOpen} title="No matching guidance" description="Try a broader phrase or choose another topic." /></Card>}</div>
      </div>
    </main>
  );
}
