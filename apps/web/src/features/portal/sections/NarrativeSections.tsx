/**
 * NarrativeSections [MT] — "How it evolves" + "What you can support".
 */

import type { PortalConfig } from '../../../store/portalStore.js';
import type { LocalProject } from '../../../store/projectStore.js';
import { earth, zone, semantic } from '../../../lib/tokens.js';

interface Props { config: PortalConfig; project: LocalProject }

export default function NarrativeSections({ config, project }: Props) {
  return (
    <section style={{ padding: '80px 24px', maxWidth: 800, margin: '0 auto' }}>
      {/* How it evolves */}
      <div style={{ marginBottom: 60 }}>
        <h2 style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: zone.spiritual, marginBottom: 24, textAlign: 'center',
        }}>
          How It Evolves
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
          {[
            { label: 'Year 1', title: 'Foundation', desc: 'Water, access, and first shelter. The land begins to heal.' },
            { label: 'Year 2\u20133', title: 'Growth', desc: 'Orchards, gardens, and livestock systems establish roots.' },
            { label: 'Year 3\u20135', title: 'Community', desc: 'Hospitality, education, and gathering spaces open.' },
            { label: 'Year 5+', title: 'Maturity', desc: 'The full vision realized \u2014 a living sanctuary.' },
          ].map((phase) => (
            <div key={phase.label} style={{
              padding: 20, borderRadius: 10,
              background: 'rgba(196,162,101,0.04)',
              border: '1px solid rgba(196,162,101,0.1)',
            }}>
              <div style={{ fontSize: 10, color: zone.spiritual, fontWeight: 600, letterSpacing: '0.08em', marginBottom: 6 }}>
                {phase.label}
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 500, color: earth[100], marginBottom: 8, marginTop: 0 }}>
                {phase.title}
              </h3>
              <p style={{ fontSize: 13, color: semantic.sidebarIcon, lineHeight: 1.6, margin: 0 }}>
                {phase.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* What you can support */}
      <div style={{ textAlign: 'center' }}>
        <h2 style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: semantic.sidebarActive, marginBottom: 24,
        }}>
          What You Can Support
        </h2>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16,
          maxWidth: 600, margin: '0 auto',
        }}>
          {[
            { icon: '\u{1F331}', label: 'Tree Planting', desc: 'Reforest edges and establish food forests' },
            { icon: '\u{1F4A7}', label: 'Water Systems', desc: 'Ponds, swales, and water retention' },
            { icon: '\u{1F54C}', label: 'Sacred Spaces', desc: 'Prayer pavilion and contemplation gardens' },
            { icon: '\u{1F3D5}', label: 'Guest Cabins', desc: 'Retreat accommodation for seekers' },
            { icon: '\u{1F4DA}', label: 'Education', desc: 'Farm tours and learning programs' },
            { icon: '\u{1F33E}', label: 'Agriculture', desc: 'Market garden and orchard establishment' },
          ].map((item) => (
            <div key={item.label} style={{
              padding: 16, borderRadius: 8,
              border: '1px solid rgba(196,162,101,0.1)',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: earth[100], marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: semantic.sidebarIcon, lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
