import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, CheckCircle2, Sparkles, Building2, Home, Landmark } from 'lucide-react';

const POLICIES = [
  {
    id: 'lihtc',
    label: 'LIHTC Program',
    tag: '2026 Active',
    tagColor: 'var(--color-success)',
    tagBg: 'var(--color-success-container)',
    icon: <Building2 size={28} />,
    description:
      'Low-Income Housing Tax Credit — the primary affordable rental housing production program in the U.S. Supports 60% and 50% AMI income limits.',
    details: ['2026 MTSP income limits', 'HUD 4350.3 REV-1 rules', 'LIHTC §42 compliance'],
    available: true,
    gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
  },
  {
    id: 'section8',
    label: 'Section 8 HCV',
    tag: 'Coming Soon',
    tagColor: 'var(--color-outline)',
    tagBg: 'var(--color-surface-highest)',
    icon: <Home size={28} />,
    description:
      'Housing Choice Voucher program — tenant-based rental assistance allowing eligible low-income families to choose their own housing.',
    details: ['HUD Section 8 guidelines', 'Payment standard lookup', 'Utility allowance rules'],
    available: false,
    gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
  },
  {
    id: 'home',
    label: 'HOME Program',
    tag: 'Coming Soon',
    tagColor: 'var(--color-outline)',
    tagBg: 'var(--color-surface-highest)',
    icon: <Landmark size={28} />,
    description:
      'HOME Investment Partnerships Program — federal block grant funds for building, buying, or rehabilitating affordable housing.',
    details: ['HUD HOME regulations', 'Income targeting rules', '24 CFR Part 92 compliance'],
    available: false,
    gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
  },
];

export default function PolicySelectPage() {
  const navigate = useNavigate();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-surface)' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #001f6b 0%, #003ea8 60%, #2563eb 100%)',
        padding: '48px 60px 64px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background decoration */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 320, height: 320, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -40, left: '40%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
          <Sparkles size={14} color="rgba(255,255,255,0.6)" />
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)' }}>
            Application Readiness Copilot
          </span>
        </div>

        <h1 style={{ fontSize: 42, fontWeight: 800, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.15, maxWidth: 600, marginBottom: 16 }}>
          Select Your Housing Program
        </h1>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, maxWidth: 520 }}>
          RealDoor checks your documents against the selected program's 2026 rules and income limits — helping you understand exactly what's needed before you apply.
        </p>

        <div style={{ display: 'flex', gap: 20, marginTop: 28, flexWrap: 'wrap' }}>
          {[
            { label: 'Evidence-based', icon: '✦' },
            { label: 'Citation-backed rules', icon: '✦' },
            { label: 'No eligibility decisions', icon: '✦' },
          ].map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
              <span style={{ fontSize: 8, color: '#93c5fd' }}>{item.icon}</span> {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Policy cards */}
      <div style={{ flex: 1, padding: '40px 60px', maxWidth: 1200 }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: 4 }}>Available Programs</h2>
          <p style={{ fontSize: 14, color: 'var(--color-on-surface-variant)' }}>
            Select a program to begin your application readiness review.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {POLICIES.map((policy) => (
            <PolicyCard key={policy.id} policy={policy} onSelect={() => navigate('/upload')} />
          ))}
        </div>

        {/* Disclaimer */}
        <div style={{
          marginTop: 40, padding: '14px 20px',
          background: 'var(--color-surface-white)',
          border: '1px solid var(--color-outline-variant)',
          borderRadius: 'var(--radius-lg)',
          display: 'flex', alignItems: 'flex-start', gap: 10,
          fontSize: 12, color: 'var(--color-on-surface-variant)', lineHeight: 1.7,
        }}>
          <span style={{ color: 'var(--color-primary-container)', fontWeight: 700, flexShrink: 0 }}>ℹ</span>
          <span>
            RealDoor provides application readiness assistance only. It does not approve, reject, rank, or determine housing eligibility. Final decisions remain with the housing provider or administering agency.
          </span>
        </div>
      </div>
    </div>
  );
}

function PolicyCard({ policy, onSelect }) {
  return (
    <div
      onClick={policy.available ? onSelect : undefined}
      style={{
        background: 'var(--color-surface-white)',
        border: '1.5px solid var(--color-outline-variant)',
        borderRadius: 'var(--radius-2xl)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-card)',
        cursor: policy.available ? 'pointer' : 'not-allowed',
        opacity: policy.available ? 1 : 0.68,
        transition: 'all 0.2s ease',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        if (!policy.available) return;
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = '0 12px 32px -4px rgba(37,99,235,0.15)';
        e.currentTarget.style.borderColor = 'var(--color-primary-container)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'var(--shadow-card)';
        e.currentTarget.style.borderColor = 'var(--color-outline-variant)';
      }}
    >
      {/* Card header gradient */}
      <div style={{ background: policy.gradient, padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.15)', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          {policy.icon}
        </div>
        <span style={{ padding: '4px 10px', background: policy.tagBg, borderRadius: 'var(--radius-full)', fontSize: 11, fontWeight: 700, color: policy.tagColor, letterSpacing: '0.04em' }}>
          {policy.tag}
        </span>
      </div>

      {/* Card body */}
      <div style={{ padding: '20px 22px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--color-on-surface)' }}>{policy.label}</h3>
        <p style={{ fontSize: 13, color: 'var(--color-on-surface-variant)', lineHeight: 1.65, marginBottom: 16, flex: 1 }}>
          {policy.description}
        </p>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {policy.details.map((d) => (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--color-on-surface-variant)' }}>
              <CheckCircle2 size={12} color={policy.available ? 'var(--color-primary-container)' : 'var(--color-outline)'} />
              {d}
            </div>
          ))}
        </div>

        {/* CTA */}
        {policy.available ? (
          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', gap: 6, fontWeight: 600 }}
            onClick={(e) => { e.stopPropagation(); onSelect(); }}
          >
            Select Program <ArrowRight size={15} />
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: 'var(--color-surface-container)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-outline)', fontWeight: 500, justifyContent: 'center' }}>
            <Lock size={13} /> Not yet available
          </div>
        )}
      </div>
    </div>
  );
}
