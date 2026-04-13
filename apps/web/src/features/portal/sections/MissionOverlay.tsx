/**
 * MissionOverlay [MT] — "Why this place" narrative section.
 */

import type { PortalConfig } from '../../../store/portalStore.js';
import type { LocalProject } from '../../../store/projectStore.js';
import { earth, zone, semantic } from '../../../lib/tokens.js';

interface Props { config: PortalConfig; project: LocalProject }

export default function MissionOverlay({ config }: Props) {
  if (!config.missionStatement) {
    return (
      <section style={{ padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: zone.spiritual, marginBottom: 16 }}>
          Why This Place
        </h2>
        <p style={{ fontSize: 16, color: semantic.sidebarIcon, fontStyle: 'italic', maxWidth: 500, margin: '0 auto' }}>
          The mission statement has not been written yet. Configure it in the Portal settings.
        </p>
      </section>
    );
  }

  return (
    <section style={{
      padding: '100px 24px',
      maxWidth: 720,
      margin: '0 auto',
      textAlign: 'center',
    }}>
      <div style={{
        width: 40, height: 2, background: zone.spiritual, margin: '0 auto 24px',
      }} />

      <h2 style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.15em',
        textTransform: 'uppercase', color: zone.spiritual, marginBottom: 24,
      }}>
        Why This Place
      </h2>

      <blockquote style={{
        fontSize: 'clamp(18px, 3vw, 24px)',
        fontWeight: 300,
        fontStyle: 'italic',
        lineHeight: 1.8,
        color: earth[200],
        margin: 0,
        padding: '0 16px',
        borderLeft: 'none',
      }}>
        &ldquo;{config.missionStatement}&rdquo;
      </blockquote>

      <div style={{
        width: 40, height: 2, background: zone.spiritual, margin: '32px auto 0',
      }} />
    </section>
  );
}
