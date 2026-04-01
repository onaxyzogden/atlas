/**
 * VisionPanel — toggle between current state and full vision,
 * with before/after slider and narrative mode.
 */

import { useState } from 'react';
import { useMapStore } from '../../store/mapStore.js';
import type { LocalProject } from '../../store/projectStore.js';

interface VisionPanelProps {
  project: LocalProject;
}

type VisionMode = 'current' | 'vision' | 'compare';

export default function VisionPanel({ project }: VisionPanelProps) {
  const [mode, setMode] = useState<VisionMode>('vision');
  const setActivePhaseFilter = useMapStore((s) => s.setActivePhaseFilter);
  const [narrativeStep, setNarrativeStep] = useState(0);

  const handleModeChange = (m: VisionMode) => {
    setMode(m);
    if (m === 'current') setActivePhaseFilter('Phase 1');
    else setActivePhaseFilter('all');
  };

  const narrativeSteps = [
    { phase: 'Phase 1', title: 'Year 0\u20131: Establish Presence', description: 'Secure water, build core infrastructure, establish the foundation from which all else grows. The land begins to breathe again.' },
    { phase: 'Phase 2', title: 'Year 1\u20133: Productive Systems', description: 'Plant the orchards, establish grazing rotations, build the food forest. The land begins to feed and sustain.' },
    { phase: 'Phase 3', title: 'Year 3\u20135: Community & Hospitality', description: 'Open the land to guests, seekers, and community. Build the retreat infrastructure and educational programs.' },
    { phase: 'Phase 4', title: 'Year 5+: Full Vision', description: 'The mature expression \u2014 a living sanctuary for land, spirit, family, and community.' },
  ];

  const handleNarrativeStep = (step: number) => {
    setNarrativeStep(step);
    const s = narrativeSteps[step];
    if (s) setActivePhaseFilter(s.phase);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-panel-title)', marginBottom: 16 }}>
        Vision Layer
      </h2>

      {/* Mode switcher */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(196,162,101,0.2)' }}>
        {([
          { key: 'current' as VisionMode, label: 'Current' },
          { key: 'vision' as VisionMode, label: 'Full Vision' },
          { key: 'compare' as VisionMode, label: 'Narrative' },
        ]).map((m) => (
          <button
            key={m.key}
            onClick={() => handleModeChange(m.key)}
            style={{
              flex: 1, padding: '10px 0', fontSize: 12,
              fontWeight: mode === m.key ? 600 : 400,
              background: mode === m.key ? 'rgba(196,162,101,0.12)' : 'transparent',
              border: 'none',
              color: mode === m.key ? '#c4a265' : 'var(--color-panel-muted)',
              cursor: 'pointer', letterSpacing: '0.02em',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'current' && (
        <div>
          <div style={{ padding: '16px', background: 'rgba(196,162,101,0.06)', borderRadius: 10, border: '1px solid rgba(196,162,101,0.1)', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-panel-text)', marginBottom: 6 }}>Current State</div>
            <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', lineHeight: 1.6 }}>
              Showing only Phase 1 elements \u2014 what exists or is under construction now.
              The map filters to show infrastructure, initial habitation, and established zones only.
            </div>
          </div>
          <InfoCard
            title="What the land is today"
            text="Raw potential shaped by its history \u2014 the soils, the water patterns, the existing vegetation, and the marks of previous use. Every design decision starts from honest observation of what is here now."
          />
        </div>
      )}

      {mode === 'vision' && (
        <div>
          <div style={{ padding: '16px', background: 'rgba(45,122,79,0.06)', borderRadius: 10, border: '1px solid rgba(45,122,79,0.1)', marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-panel-text)', marginBottom: 6 }}>Full Vision</div>
            <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', lineHeight: 1.6 }}>
              All phases visible \u2014 the complete design as envisioned at maturity.
              Every zone, structure, path, and system rendered together.
            </div>
          </div>
          <InfoCard
            title="What this land wants to become"
            text={`The ${project.name} property at full expression \u2014 a place where regenerative agriculture, contemplative hospitality, education, and ecological stewardship converge into a living landscape that serves land, family, and community.`}
          />
        </div>
      )}

      {mode === 'compare' && (
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-panel-muted)', marginBottom: 12 }}>
            Step through the design narrative phase by phase
          </div>

          {/* Narrative step cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
            {narrativeSteps.map((step, i) => (
              <button
                key={i}
                onClick={() => handleNarrativeStep(i)}
                style={{
                  textAlign: 'left', padding: '14px 16px',
                  background: narrativeStep === i ? 'rgba(196,162,101,0.08)' : 'transparent',
                  border: narrativeStep === i ? '1px solid rgba(196,162,101,0.2)' : '1px solid var(--color-panel-card-border)',
                  borderRadius: 10, cursor: 'pointer',
                  color: 'var(--color-panel-text)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%',
                    border: `2px solid ${narrativeStep === i ? '#c4a265' : 'var(--color-panel-subtle)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 600, color: narrativeStep === i ? '#c4a265' : 'var(--color-panel-muted)',
                    flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{step.title}</div>
                  </div>
                </div>
                {narrativeStep === i && (
                  <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', lineHeight: 1.6, marginTop: 4, fontStyle: 'italic', paddingLeft: 38 }}>
                    {`"${step.description}"`}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => handleNarrativeStep(Math.max(0, narrativeStep - 1))}
              disabled={narrativeStep === 0}
              style={{
                flex: 1, padding: '10px', fontSize: 12, border: '1px solid var(--color-panel-card-border)',
                borderRadius: 8, background: 'transparent',
                color: narrativeStep === 0 ? 'var(--color-panel-subtle)' : 'var(--color-panel-muted)',
                cursor: narrativeStep === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {'\u2190'} Previous
            </button>
            <button
              onClick={() => handleNarrativeStep(Math.min(narrativeSteps.length - 1, narrativeStep + 1))}
              disabled={narrativeStep === narrativeSteps.length - 1}
              style={{
                flex: 1, padding: '10px', fontSize: 12, border: 'none',
                borderRadius: 8,
                background: narrativeStep === narrativeSteps.length - 1 ? 'var(--color-panel-subtle)' : 'rgba(196,162,101,0.15)',
                color: narrativeStep === narrativeSteps.length - 1 ? 'var(--color-panel-muted)' : '#c4a265',
                cursor: narrativeStep === narrativeSteps.length - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              Next {'\u2192'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <div style={{
      padding: '16px', background: 'rgba(196,162,101,0.04)',
      borderRadius: 10, border: '1px solid rgba(196,162,101,0.08)',
      borderLeft: '3px solid rgba(196,162,101,0.3)',
    }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-panel-text)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--color-panel-muted)', lineHeight: 1.7, fontStyle: 'italic' }}>
        {text}
      </div>
    </div>
  );
}
