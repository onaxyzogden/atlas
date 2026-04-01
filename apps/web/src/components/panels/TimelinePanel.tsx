/**
 * TimelinePanel — phased development timeline with expandable phase cards.
 * Shows 4 development phases with key features, investment totals,
 * status badges, and filter chips.
 */

import { useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useMapStore } from '../../store/mapStore.js';

interface TimelinePanelProps {
  project: LocalProject;
}

type PhaseFilter = 'all' | '0-1' | '1-3' | '3-5' | '5+';

interface Phase {
  number: number;
  name: string;
  years: string;
  filterKey: PhaseFilter;
  subtitle: string;
  investment: string;
  status: 'In Progress' | 'Planned' | 'Complete';
  quote: string;
  features: string[];
  color: string;
}

const PHASES: Phase[] = [
  {
    number: 1,
    name: 'Site Intelligence',
    years: 'Year 0\u20131',
    filterKey: '0-1',
    subtitle: 'Infrastructure & Habitation',
    investment: '~$211K',
    status: 'In Progress',
    quote: 'Establish presence, secure water, build core infrastructure. The foundation from which all else grows.',
    features: [
      'Well drilling & water system',
      'Road grading & access',
      'Off-grid solar installation',
      'Main cabin construction',
      'Initial soil amendment & cover cropping',
      'Emergency fencing',
      'Conservation Halton pre-consultation',
      'Tile drain assessment & control structures',
    ],
    color: '#c4a265',
  },
  {
    number: 2,
    name: 'Design Atlas',
    years: 'Year 1\u20133',
    filterKey: '1-3',
    subtitle: 'Agricultural Systems',
    investment: '~$65K',
    status: 'Planned',
    quote: 'Establish productive systems \u2014 food, water, livestock \u2014 generating sustenance and early revenue.',
    features: [
      'Keyline pond & swale network',
      '8-paddock rotational grazing',
      'Orchard planting (200 trees)',
      'Market garden with irrigation',
      'Livestock acquisition',
      'Forest edge reforestation',
      'Hedgerow establishment',
      'Composting infrastructure',
    ],
    color: '#2d7a4f',
  },
  {
    number: 3,
    name: 'Collaboration & Community',
    years: 'Year 3\u20135',
    filterKey: '3-5',
    subtitle: 'Retreat & Community',
    investment: '~$285K',
    status: 'Planned',
    quote: 'Open the land to guests, seekers, and community. Build the hospitality and educational infrastructure.',
    features: [
      '4 guest cabins',
      'Prayer pavilion & contemplation garden',
      'Community hall & classroom',
      'Educational farm trail',
      'Event lawn & fire circle',
      'Guest-safe livestock buffers',
      'Interpretive signage',
      'Kitchen garden expansion',
    ],
    color: '#5b9db8',
  },
  {
    number: 4,
    name: 'Full Vision',
    years: 'Year 5+',
    filterKey: '5+',
    subtitle: 'Maturity & Expansion',
    investment: '',
    status: 'Planned',
    quote: 'The mature expression \u2014 a living sanctuary for land, spirit, family, and community.',
    features: [
      'Expanded retreat (8+ units)',
      "Men's cohort facilities",
      'Mature food forest canopy',
      'Carbon monitoring program',
      'Atlas template publication',
      'Advanced water system monitoring',
      'Wildlife corridor completion',
      'Community land trust exploration',
    ],
    color: '#9a8a74',
  },
];

const TOTAL_INVESTMENT = '$561K';

// Map phase filter keys to phase names used in stores
const FILTER_TO_PHASE: Record<PhaseFilter, string> = {
  'all': 'all',
  '0-1': 'Phase 1',
  '1-3': 'Phase 2',
  '3-5': 'Phase 3',
  '5+': 'Phase 4',
};

export default function TimelinePanel({ project }: TimelinePanelProps) {
  const [filter, setFilter] = useState<PhaseFilter>('all');
  const [expandedPhase, setExpandedPhase] = useState<number | null>(1);
  const setActivePhaseFilter = useMapStore((s) => s.setActivePhaseFilter);

  const handleFilterChange = (f: PhaseFilter) => {
    setFilter(f);
    setActivePhaseFilter(FILTER_TO_PHASE[f]);
  };

  const filters: { key: PhaseFilter; label: string }[] = [
    { key: 'all', label: 'All Phases' },
    { key: '0-1', label: 'Year 0\u20131' },
    { key: '1-3', label: 'Year 1\u20133' },
    { key: '3-5', label: 'Year 3\u20135' },
    { key: '5+', label: 'Year 5+' },
  ];

  const visiblePhases = filter === 'all' ? PHASES : PHASES.filter((p) => p.filterKey === filter);

  return (
    <div style={{ padding: 20 }}>
      <PanelTitle>Timeline & Phasing</PanelTitle>
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 16 }}>
        Total investment: {TOTAL_INVESTMENT} over 10 years
      </div>

      {/* Filter chips */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 6 }}>Filter map by phase:</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              style={{
                padding: '5px 12px',
                fontSize: 11,
                fontWeight: filter === f.key ? 600 : 400,
                border: filter === f.key ? '1px solid #c4a265' : '1px solid var(--color-border)',
                borderRadius: 16,
                background: filter === f.key ? 'rgba(196, 162, 101, 0.12)' : 'transparent',
                color: filter === f.key ? '#c4a265' : 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Phase cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {visiblePhases.map((phase) => {
          const isExpanded = expandedPhase === phase.number;
          return (
            <div key={phase.number}>
              {/* Phase header card */}
              <button
                onClick={() => setExpandedPhase(isExpanded ? null : phase.number)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '14px 12px',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  borderRadius: isExpanded ? '10px 10px 0 0' : 10,
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--color-text)',
                }}
              >
                {/* Number circle */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: `2px solid ${phase.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    color: phase.color,
                    flexShrink: 0,
                  }}
                >
                  {phase.number}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{phase.name}</span>
                    <span style={{ fontSize: 11, color: phase.color, fontWeight: 600 }}>{phase.years}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>
                    {phase.subtitle}
                  </div>
                  {phase.investment && (
                    <div style={{ fontSize: 12, color: '#c4a265', fontWeight: 600, fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                      {phase.investment} investment
                    </div>
                  )}
                  <StatusBadge status={phase.status} />
                </div>

                {/* Chevron */}
                <span style={{ color: 'var(--color-text-muted)', fontSize: 12, marginTop: 4 }}>
                  {isExpanded ? '▾' : '›'}
                </span>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div
                  style={{
                    padding: 16,
                    background: 'rgba(196, 162, 101, 0.04)',
                    border: '1px solid var(--color-border)',
                    borderTop: 'none',
                    borderRadius: '0 0 10px 10px',
                  }}
                >
                  <h4
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      fontStyle: 'italic',
                      color: phase.color,
                      marginBottom: 8,
                    }}
                  >
                    {phase.name} &mdash; {phase.years}
                  </h4>
                  <p
                    style={{
                      fontSize: 12,
                      lineHeight: 1.6,
                      fontStyle: 'italic',
                      color: 'var(--color-text)',
                      marginBottom: 14,
                    }}
                  >
                    &ldquo;{phase.quote}&rdquo;
                  </p>

                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                    Key Features:
                  </div>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {phase.features.map((feat) => (
                      <li key={feat} style={{ display: 'flex', gap: 6, fontSize: 12, color: 'var(--color-text)' }}>
                        <span style={{ color: phase.color, flexShrink: 0 }}>●</span>
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-panel-title)', marginBottom: 4 }}>
      {children}
    </h2>
  );
}

function StatusBadge({ status }: { status: 'In Progress' | 'Planned' | 'Complete' }) {
  const styles = {
    'In Progress': { bg: 'rgba(196, 162, 101, 0.12)', color: '#c4a265', border: '1px solid rgba(196, 162, 101, 0.3)' },
    Planned: { bg: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' },
    Complete: { bg: 'rgba(45, 122, 79, 0.12)', color: '#2d7a4f', border: '1px solid rgba(45, 122, 79, 0.3)' },
  };
  const s = styles[status];
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 10,
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: 4,
        background: s.bg,
        color: s.color,
        border: s.border,
      }}
    >
      {status}
    </span>
  );
}
