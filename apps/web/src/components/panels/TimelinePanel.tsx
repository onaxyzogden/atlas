/**
 * TimelinePanel — phased development timeline with expandable phase cards.
 * Shows 4 development phases with key features, investment totals,
 * status badges, and filter chips.
 */

import { useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useMapStore } from '../../store/mapStore.js';
import p from '../../styles/panel.module.css';
import s from './TimelinePanel.module.css';

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
  const setActivePhaseFilter = useMapStore((ms) => ms.setActivePhaseFilter);

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

  const visiblePhases = filter === 'all' ? PHASES : PHASES.filter((ph) => ph.filterKey === filter);

  return (
    <div className={p.container}>
      <h2 className={p.title} style={{ marginBottom: 4 }}>Timeline & Phasing</h2>
      <div className={s.subtitle}>
        Total investment: {TOTAL_INVESTMENT} over 10 years
      </div>

      {/* Filter chips */}
      <div className={p.mb16}>
        <div className={s.filterLabel}>Filter map by phase:</div>
        <div className={s.filterRow}>
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => handleFilterChange(f.key)}
              className={`${s.filterChip} ${filter === f.key ? s.filterChipActive : ''}`}
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
                className={`${s.phaseHeader} ${isExpanded ? s.phaseHeaderExpanded : s.phaseHeaderCollapsed}`}
              >
                {/* Number circle */}
                <div
                  className={s.phaseCircle}
                  style={{ borderColor: phase.color, color: phase.color }}
                >
                  {phase.number}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className={s.phaseNameRow}>
                    <span className={s.phaseName}>{phase.name}</span>
                    <span className={s.phaseYears} style={{ color: phase.color }}>{phase.years}</span>
                  </div>
                  <div className={s.phaseSubtitle}>
                    {phase.subtitle}
                  </div>
                  {phase.investment && (
                    <div className={s.phaseInvestment}>
                      {phase.investment} investment
                    </div>
                  )}
                  <StatusBadge status={phase.status} />
                </div>

                {/* Chevron */}
                <span className={s.phaseChevron}>
                  {isExpanded ? '\u25BE' : '\u203A'}
                </span>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className={s.phaseDetail}>
                  <h4 className={s.phaseDetailTitle} style={{ color: phase.color }}>
                    {phase.name} &mdash; {phase.years}
                  </h4>
                  <p className={s.phaseQuote}>
                    &ldquo;{phase.quote}&rdquo;
                  </p>

                  <div className={s.keyFeaturesLabel}>
                    Key Features:
                  </div>
                  <ul className={s.featureList}>
                    {phase.features.map((feat) => (
                      <li key={feat} className={s.featureItem}>
                        <span className={s.featureDot} style={{ color: phase.color }}>{'\u25CF'}</span>
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

function StatusBadge({ status }: { status: 'In Progress' | 'Planned' | 'Complete' }) {
  const statusClass = status === 'In Progress' ? s.statusInProgress
    : status === 'Complete' ? s.statusComplete
    : s.statusPlanned;
  return (
    <span className={`${s.statusBadge} ${statusClass}`}>
      {status}
    </span>
  );
}
