/**
 * VisionPanel — toggle between current state and full vision,
 * with before/after slider and narrative mode.
 */

import { useState } from 'react';
import { useMapStore } from '../../store/mapStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import p from '../../styles/panel.module.css';

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
    <div className={p.container}>
      <h2 className={p.title}>
        Vision Layer
      </h2>

      {/* Mode switcher */}
      <div className={`${p.tabBar} ${p.mb20}`}>
        {([
          { key: 'current' as VisionMode, label: 'Current' },
          { key: 'vision' as VisionMode, label: 'Full Vision' },
          { key: 'compare' as VisionMode, label: 'Narrative' },
        ]).map((m) => (
          <button
            key={m.key}
            onClick={() => handleModeChange(m.key)}
            className={`${p.tabBtn} ${mode === m.key ? p.tabBtnActive : ''}`}
            style={{ padding: '10px 0', fontSize: 12, letterSpacing: '0.02em' }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'current' && (
        <div>
          <div className={`${p.highlightBox} ${p.highlightBoxGold}`}>
            <div className={p.highlightBoxTitle}>Current State</div>
            <div className={p.highlightBoxText}>
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
          <div className={`${p.highlightBox} ${p.highlightBoxGreen}`}>
            <div className={p.highlightBoxTitle}>Full Vision</div>
            <div className={p.highlightBoxText}>
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
          <div className={`${p.label} ${p.mb12}`}>
            Step through the design narrative phase by phase
          </div>

          {/* Narrative step cards */}
          <div className={`${p.section} ${p.sectionGapLg}`}>
            {narrativeSteps.map((step, i) => (
              <button
                key={i}
                onClick={() => handleNarrativeStep(i)}
                className={`${p.stepCard} ${narrativeStep === i ? p.stepCardActive : ''}`}
              >
                <div className={`${p.row} ${p.mb8}`} style={{ gap: 10 }}>
                  <span className={`${p.stepNumber} ${narrativeStep === i ? p.stepNumberActive : ''}`}>
                    {i + 1}
                  </span>
                  <div>
                    <div className={`${p.text13} ${p.fontSemibold}`}>{step.title}</div>
                  </div>
                </div>
                {narrativeStep === i && (
                  <div className={p.stepDesc}>
                    {`"${step.description}"`}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className={p.flexGap8}>
            <button
              onClick={() => handleNarrativeStep(Math.max(0, narrativeStep - 1))}
              disabled={narrativeStep === 0}
              className={`${p.navBtnPrev} ${narrativeStep === 0 ? p.navBtnDisabled : ''}`}
            >
              {'\u2190'} Previous
            </button>
            <button
              onClick={() => handleNarrativeStep(Math.min(narrativeSteps.length - 1, narrativeStep + 1))}
              disabled={narrativeStep === narrativeSteps.length - 1}
              className={`${p.navBtnNext} ${narrativeStep === narrativeSteps.length - 1 ? p.navBtnNextDisabled : ''}`}
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
    <div className={p.infoCard}>
      <div className={p.infoCardTitle}>
        {title}
      </div>
      <div className={p.infoCardText}>
        {text}
      </div>
    </div>
  );
}
