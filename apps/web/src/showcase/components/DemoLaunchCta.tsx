import { recordShowcaseEvent } from '../lib/showcaseEventLog';

/**
 * DemoLaunchCta — "Launch the interactive demo" hero CTA, shown ONLY in the
 * free client-only offline build (FEATURE_DEMO_OFFLINE=true).
 *
 * Why a plain <a>, not a router <Link>: `/home` belongs to the MAIN app entry,
 * not the showcase entry (the two are separate bundles — see the showcase
 * bundle-split ADR). A TanStack <Link> here would try to client-route to a path
 * the showcase router doesn't own; a full-page navigation hands off to the main
 * entry, whose offline-demo boot mints the guest + seeds the sample and the
 * count-aware landing route drops the visitor into /v3/portfolio.
 *
 * Why read the flag inline: importing DEMO_OFFLINE_ENABLED from app/demoSession
 * would drag that module's store graph into the lean showcase chunk. Vite's
 * `define` replaces `process.env.FEATURE_DEMO_OFFLINE` with a literal in every
 * entry, so this comparison costs nothing and pulls in nothing.
 *
 * In every non-offline build (the marketing scrollytelling on the paid Render
 * deploy) this renders null — `/home` there is the currently-broken login wall,
 * so advertising it would break the honesty promise.
 */
const DEMO_OFFLINE = process.env.FEATURE_DEMO_OFFLINE === 'true';

export function DemoLaunchCta() {
  if (!DEMO_OFFLINE) return null;

  return (
    <div style={{ maxWidth: 720, margin: '40px auto 8px' }}>
      <a
        href="/home"
        onClick={() =>
          recordShowcaseEvent({
            eventType: 'cta_primary_click',
            payload: { cta: 'launch_demo', href: '/home' },
          })
        }
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          padding: '20px 28px',
          borderRadius: 12,
          background: '#1f513f',
          color: '#fff',
          textDecoration: 'none',
          textAlign: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
        }}
      >
        <strong style={{ fontSize: 18 }}>Launch the interactive demo</strong>
        <span style={{ opacity: 0.85, fontSize: 14 }}>
          Open the full OLOS app in your browser — no sign-up, free, your work
          stays on this device.
        </span>
      </a>
    </div>
  );
}
