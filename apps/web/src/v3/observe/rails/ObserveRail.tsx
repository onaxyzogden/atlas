/**
 * ObserveRail — right-rail panel for Observe stage. Module-aware checklist +
 * placeholder Notes tab. Phase A: hard-coded placeholder checklist items per
 * module (real items wired in Phase B).
 */

import { useState } from 'react';
import type { Project } from '../../types.js';
import {
  OBSERVE_MODULE_LABEL,
  type ObserveModule,
} from '../types.js';
import railCss from '../../components/rails/railPanel.module.css';
import css from './ObserveRail.module.css';

interface ObserveRailProps {
  project: Project | null;
  activeModule?: ObserveModule;
}

const PLACEHOLDER_CHECKLIST: Record<ObserveModule, string[]> = {
  'people-governance': [
    'Capture stakeholder vision',
    'Document current land use',
    'Note governance & tenure',
    'List adjacent neighbours',
  ],
  'built-infrastructure': [
    'Trace buildings and outbuildings',
    'Mark wells and septic systems',
    'Sketch power and buried utilities',
    'Walk the fence and gate lines',
  ],
  'climate': [
    'Pull regional climate normals',
    'Map wildfire / flood / wind exposure',
    'Note historical extremes',
  ],
  topography: [
    'Generate slope raster',
    'Identify ridges & drainages',
    'Mark aspect zones',
  ],
  'hydrology': [
    'Soil sampling plan',
    'Surface water inventory',
    'Existing vegetation survey',
  ],
  'access-circulation': [
    'Identify wild energy sectors',
    'Sketch zone 0–5 placement',
    'Note disturbance corridors',
  ],
  'monitoring-records': [
    'Strengths review',
    'Weaknesses review',
    'Opportunities review',
    'Threats review',
  ],
  // Unauthored Observe domains — empty checklists.
  'vision-intent': [],
  'land-base': [],
  soil: [],
  ecology: [],
  'plants-food': [],
  'animals-livestock': [],
  'energy-resources': [],
  'economics-capacity': [],
  'risk-compliance': [],
};

type Tab = 'checklist' | 'notes';

export default function ObserveRail({ project, activeModule }: ObserveRailProps) {
  const [tab, setTab] = useState<Tab>('checklist');
  const moduleLabel = activeModule ? OBSERVE_MODULE_LABEL[activeModule] : 'Observe';
  const items = activeModule ? PLACEHOLDER_CHECKLIST[activeModule] : [];

  return (
    <div className={railCss.panel}>
      <div className={css.tabs} role="tablist" aria-label="Observe rail tabs">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'checklist'}
          className={`${css.tab} ${tab === 'checklist' ? css.tabActive : ''}`}
          onClick={() => setTab('checklist')}
        >
          Checklist
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'notes'}
          className={`${css.tab} ${tab === 'notes' ? css.tabActive : ''}`}
          onClick={() => setTab('notes')}
        >
          Notes
        </button>
      </div>

      {tab === 'checklist' && (
        <section className={railCss.section}>
          <span className={railCss.sectionLabel}>{moduleLabel}</span>
          <ul className={railCss.list}>
            {items.map((item) => (
              <li key={item} className={railCss.listItem}>
                <span className={`${railCss.dot} ${railCss.dotInfo}`} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          {!project && <p className={css.empty}>Select a project to track checklist progress.</p>}
        </section>
      )}

      {tab === 'notes' && (
        <section className={railCss.section}>
          <span className={railCss.sectionLabel}>Notes</span>
          <p className={css.empty}>Note-taking arrives in Phase B.</p>
        </section>
      )}
    </div>
  );
}
