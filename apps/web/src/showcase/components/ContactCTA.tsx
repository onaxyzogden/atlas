/**
 * ContactCTA — Phase 4 (2026-05-21) tier-aware terminus for the
 * Three Streams showcase scrolly. Locked Phase 4 decision: each tier's
 * PRIMARY action now deep-links to `/register?next=instantiate&template=
 * ecosystem-farm` with tier-specific flags (drawFirst / fullSetup).
 *
 *   Dreaming     → instant-instantiate empty boundary; visitor draws later
 *   Transitioning → drawFirst=true → /new boundary-step first, then template
 *   Stewarding   → fullSetup=true  → /new with org-setup prelude
 *
 * Calendly / contact-form remain as the SECONDARY action so a low-touch
 * conversation path stays open for visitors who aren't ready to register.
 *
 * Covenant-clean copy per the 2026-05-04 erasure ADR; see the
 * wiki decisions index for the full vocab list.
 */

import type { Tier } from '../data/sceneManifest';
import { recordShowcaseEvent } from '../lib/showcaseEventLog';

interface TierCopy {
  headline: string;
  subline: string;
  /** Primary action — template-instantiation deep link into /register. */
  primary: { href: string; label: string };
  /** Secondary action — low-touch contact path (Calendly / form). */
  secondary: { href: string; label: string };
}

const TIER_CTA: Record<Tier, TierCopy> = {
  dreaming: {
    headline: 'Start your own ecosystem farm',
    subline:
      'Spin up a project pre-loaded with the Three Streams pattern. You can draw your parcel boundary anytime.',
    primary: {
      href: '/register?next=instantiate&template=ecosystem-farm',
      label: 'Create your project',
    },
    secondary: {
      href: 'https://calendly.com/ogden-three-streams/dreaming',
      label: 'Or book an intro call',
    },
  },
  transitioning: {
    headline: 'Convert your operation, the Three Streams way',
    subline:
      "Draw your parcel first; we'll land the Ecosystem Farm pattern on your land so you can edit instead of starting blank.",
    primary: {
      href: '/register?next=instantiate&template=ecosystem-farm&drawFirst=true',
      label: 'Draw your parcel & start',
    },
    secondary: {
      href: '#transitioning-form',
      label: 'Or open the contact form',
    },
  },
  stewarding: {
    headline: 'Long-horizon stewardship, instrumented',
    subline:
      "Set up your organization, then land the Three Streams pattern on your land — with monitoring baselines already in place.",
    primary: {
      href: '/register?next=instantiate&template=ecosystem-farm&fullSetup=true',
      label: 'Set up your stewardship project',
    },
    secondary: {
      href: '#stewarding-form',
      label: 'Or open the contact form',
    },
  },
};

export function ContactCTA({ tier }: { tier: Tier }) {
  const c = TIER_CTA[tier];
  return (
    <section
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        background: '#f6f8f4',
      }}
    >
      <h2 style={{ marginBottom: 12 }}>{c.headline}</h2>
      <p style={{ color: '#555', marginBottom: 24 }}>{c.subline}</p>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <a
          href={c.primary.href}
          onClick={() =>
            recordShowcaseEvent({
              eventType: 'cta_primary_click',
              tier,
              payload: { href: c.primary.href },
            })
          }
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            background: '#0a7d2c',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          {c.primary.label}
        </a>
        <a
          href={c.secondary.href}
          onClick={() =>
            recordShowcaseEvent({
              eventType: 'cta_secondary_click',
              tier,
              payload: { href: c.secondary.href },
            })
          }
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            color: '#0a7d2c',
            textDecoration: 'underline',
            fontSize: 14,
          }}
        >
          {c.secondary.label}
        </a>
      </div>
    </section>
  );
}
