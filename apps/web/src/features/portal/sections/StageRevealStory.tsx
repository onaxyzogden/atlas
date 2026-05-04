/**
 * StageRevealStory [MT] — scroll-triggered phase reveal with narrative cards.
 */

import { useState } from 'react';
import type { PortalConfig } from '../../../store/portalStore.js';
import type { LocalProject } from '../../../store/projectStore.js';
import { earth, zone, semantic, phase as phaseTokens } from '../../../lib/tokens.js';

interface Props { config: PortalConfig; project: LocalProject }

const DEFAULT_PHASES = [
  { num: 1, title: 'Site Intelligence', years: 'Year 0\u20131', desc: 'Establish presence, secure water, build core infrastructure. The foundation from which all else grows.', color: phaseTokens[1] },
  { num: 2, title: 'Design Atlas', years: 'Year 1\u20133', desc: 'Establish productive systems \u2014 food, water, livestock \u2014 generating sustenance and early revenue.', color: zone.food_production },
  { num: 3, title: 'Collaboration & Community', years: 'Year 3\u20135', desc: 'Open the land to guests, seekers, and community. Build the hospitality and educational infrastructure.', color: zone.spiritual },
  { num: 4, title: 'Full Vision', years: 'Year 5+', desc: 'The mature expression \u2014 a living sanctuary for land, spirit, family, and community.', color: zone.habitation },
];

export default function StageRevealStory({ config }: Props) {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  const phases = config.storyScenes.length > 0
    ? config.storyScenes.map((s, i) => ({ num: i + 1, title: s.title, years: '', desc: s.narrative, color: DEFAULT_PHASES[i]?.color ?? phaseTokens[1] }))
    : DEFAULT_PHASES;

  return (
    <section style={{ padding: '80px 24px', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2 style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: semantic.sidebarActive, marginBottom: 8,
        }}>
          The Vision Unfolds
        </h2>
        <p style={{ fontSize: 14, color: semantic.sidebarIcon }}>
          A land transformed through patience, intention, and stewardship.
        </p>
      </div>

      {/* Phase timeline */}
      <div style={{ position: 'relative', paddingLeft: 40 }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute', left: 15, top: 0, bottom: 0,
          width: 2, background: 'rgba(212, 175, 95, 0.15)',
        }} />

        {phases.map((phase) => (
          <div key={phase.num} style={{ marginBottom: 32, position: 'relative' }}>
            {/* Dot */}
            <div style={{
              position: 'absolute', left: -33,
              width: 28, height: 28, borderRadius: '50%',
              border: `2px solid ${phase.color}`,
              background: expandedPhase === phase.num ? phase.color : '#1a1611',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
              color: expandedPhase === phase.num ? '#1a1611' : phase.color,
              transition: 'all 300ms ease',
              cursor: 'pointer',
            }}
              onClick={() => setExpandedPhase(expandedPhase === phase.num ? null : phase.num)}
            >
              {phase.num}
            </div>

            {/* Content */}
            <button
              onClick={() => setExpandedPhase(expandedPhase === phase.num ? null : phase.num)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'left', padding: 0, width: '100%', color: 'inherit',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h3 style={{ fontSize: 18, fontWeight: 500, color: earth[100], margin: 0 }}>
                  {phase.title}
                </h3>
                {phase.years && (
                  <span style={{ fontSize: 12, color: phase.color, fontWeight: 500 }}>
                    {phase.years}
                  </span>
                )}
              </div>
            </button>

            {/* Expanded description */}
            {expandedPhase === phase.num && (
              <div style={{
                marginTop: 12, padding: 20,
                background: 'rgba(212, 175, 95, 0.04)',
                border: '1px solid rgba(212, 175, 95, 0.1)',
                borderRadius: 10, borderLeft: `3px solid ${phase.color}`,
              }}>
                <p style={{
                  fontSize: 15, fontStyle: 'italic', lineHeight: 1.7,
                  color: earth[400], margin: 0,
                }}>
                  &ldquo;{phase.desc}&rdquo;
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
