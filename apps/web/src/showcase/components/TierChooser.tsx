import { Link } from '@tanstack/react-router';
const TIERS = [
  { id: 'dreaming', label: 'I am dreaming about my own land', sub: "You're envisioning a future project." },
  { id: 'transitioning', label: 'I am transitioning an operation', sub: 'You have land in production today.' },
  { id: 'stewarding', label: 'I am stewarding for the long horizon', sub: 'You manage land for an org or generation.' },
] as const;

export function TierChooser() {
  return (
    <nav aria-label="Choose your path" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, maxWidth: 720, margin: '32px auto' }}>
      {TIERS.map((t) => (
        <Link key={t.id} to="/showcase/three-streams/$tier" params={{ tier: t.id }} style={{ padding: 24, border: '1px solid #ddd', borderRadius: 12, textDecoration: 'none', color: 'inherit' }}>
          <strong style={{ display: 'block', fontSize: 18 }}>{t.label}</strong>
          <span style={{ color: '#555' }}>{t.sub}</span>
        </Link>
      ))}
    </nav>
  );
}
