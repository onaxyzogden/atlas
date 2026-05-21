import type { Tier } from '../data/sceneManifest';

const TIER_CTA: Record<Tier, { headline: string; subline: string; href: string; cta: string }> = {
  dreaming: { headline: 'Talk to us about starting your own land journey', subline: 'Low-pressure conversation about where you might begin.', href: 'https://calendly.com/ogden-three-streams/dreaming', cta: 'Book an intro call' },
  transitioning: { headline: 'Talk to us about converting your operation', subline: "Share your land context; we'll respond within a week.", href: '#transitioning-form', cta: 'Open the contact form' },
  stewarding: { headline: 'Talk to us about long-horizon stewardship partnership', subline: 'For orgs and multi-generational stewards.', href: '#stewarding-form', cta: 'Open the contact form' },
};

export function ContactCTA({ tier }: { tier: Tier }) {
  const c = TIER_CTA[tier];
  return (
    <section style={{ padding: '48px 24px', textAlign: 'center', background: '#f6f8f4' }}>
      <h2 style={{ marginBottom: 12 }}>{c.headline}</h2>
      <p style={{ color: '#555', marginBottom: 24 }}>{c.subline}</p>
      <a href={c.href} style={{ display: 'inline-block', padding: '12px 24px', background: '#0a7d2c', color: '#fff', borderRadius: 8, textDecoration: 'none' }}>{c.cta}</a>
    </section>
  );
}
