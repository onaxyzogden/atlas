/**
 * HeroSection — full-viewport hero with project name, subtitle, CTA.
 */

import type { PortalConfig } from '../../../store/portalStore.js';
import type { LocalProject } from '../../../store/projectStore.js';
import { earth, semantic } from '../../../lib/tokens.js';

interface Props { config: PortalConfig; project: LocalProject }

export default function HeroSection({ config, project }: Props) {
  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '80px 24px 60px',
        background: 'linear-gradient(180deg, #1a1611 0%, #2a2117 40%, #1a1611 100%)',
        position: 'relative',
      }}
    >
      {/* Decorative circle */}
      <div style={{
        width: 120, height: 120, borderRadius: '50%',
        border: `2px solid ${config.brandColor}`,
        opacity: 0.2, marginBottom: 40,
      }} />

      <h1 style={{
        fontSize: 'clamp(32px, 5vw, 56px)',
        fontWeight: 300,
        letterSpacing: '0.08em',
        color: earth[100],
        marginBottom: 12,
        lineHeight: 1.2,
      }}>
        {config.heroTitle || project.name}
      </h1>

      <p style={{
        fontSize: 'clamp(14px, 2vw, 18px)',
        color: semantic.sidebarIcon,
        maxWidth: 600,
        lineHeight: 1.7,
        marginBottom: 8,
      }}>
        {config.heroSubtitle || project.description || 'A land design brought to life with the OGDEN Atlas.'}
      </p>

      {project.address && (
        <p style={{ fontSize: 12, color: earth[800], letterSpacing: '0.05em', marginTop: 8 }}>
          {project.address}
          {project.provinceState && `, ${project.provinceState}`}
          {project.acreage && ` \u00B7 ${project.acreage} ${project.units === 'metric' ? 'ha' : 'ac'}`}
        </p>
      )}

      {/* CTA */}
      <button
        onClick={() => {
          const next = document.getElementById('portal-section-mission') ?? document.getElementById('portal-section-map');
          next?.scrollIntoView({ behavior: 'smooth' });
        }}
        style={{
          marginTop: 48,
          padding: '14px 32px',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.08em',
          border: `1px solid ${config.brandColor}`,
          borderRadius: 8,
          background: 'transparent',
          color: config.brandColor,
          cursor: 'pointer',
          transition: 'background 200ms',
        }}
        onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(212, 175, 95, 0.1)'; }}
        onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
      >
        Explore the Land
      </button>

      {/* Scroll indicator */}
      <div style={{
        position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        color: earth[800], fontSize: 10, letterSpacing: '0.1em',
        animation: 'portalBounce 2s infinite',
      }}>
        <span style={{ fontSize: 18 }}>{'\u2193'}</span>
      </div>

      <style>{`
        @keyframes portalBounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(8px); }
        }
      `}</style>
    </section>
  );
}
