/**
 * ModuleDashboardsPanel — the seven Observe module dashboards, embedded.
 *
 * Each module's dashboard is independently importable (it reads projectId from
 * useParams and pulls its own zustand slices — no MapProvider/DrawHost), so we
 * mount all seven here as Command-Centre panels. Each card header deep-links to
 * that module's working surface (/observe/$module) for hands-on edits.
 */

import type { FC } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import {
  OBSERVE_MODULES,
  OBSERVE_MODULE_LABEL,
  type ObserveModule,
} from '../observe/types.js';
import HumanContextDashboard from '../observe/modules/human-context/HumanContextDashboard.js';
import BuiltEnvironmentDashboard from '../observe/modules/built-environment/BuiltEnvironmentDashboard.js';
import MacroclimateDashboard from '../observe/modules/macroclimate-hazards/MacroclimateDashboard.js';
import TopographyDashboard from '../observe/modules/topography/TopographyDashboard.js';
import EarthWaterEcologyDashboard from '../observe/modules/earth-water-ecology/EarthWaterEcologyDashboard.js';
import SectorsDashboard from '../observe/modules/sectors-zones/SectorsDashboard.js';
import SwotDashboard from '../observe/modules/swot-synthesis/SwotDashboard.js';
import css from './ObserveCommandCentrePage.module.css';

const DASHBOARD: Record<ObserveModule, FC> = {
  'human-context': HumanContextDashboard,
  'built-environment': BuiltEnvironmentDashboard,
  'macroclimate-hazards': MacroclimateDashboard,
  topography: TopographyDashboard,
  'earth-water-ecology': EarthWaterEcologyDashboard,
  'sectors-zones': SectorsDashboard,
  'swot-synthesis': SwotDashboard,
};

interface Props {
  projectId: string;
}

export default function ModuleDashboardsPanel({ projectId }: Props) {
  return (
    <div className={css.modGrid}>
      {OBSERVE_MODULES.map((module) => {
        const Dashboard = DASHBOARD[module];
        return (
          <section key={module} className={css.modCard} aria-label={OBSERVE_MODULE_LABEL[module]}>
            <header className={css.modHeader}>
              <h3 className={css.modTitle}>{OBSERVE_MODULE_LABEL[module]}</h3>
              <Link
                to="/v3/project/$projectId/observe/$module"
                params={{ projectId, module }}
                className={css.modLink}
              >
                Open module <ArrowUpRight size={13} strokeWidth={2} />
              </Link>
            </header>
            <div className={css.modBody}>
              <Dashboard />
            </div>
          </section>
        );
      })}
    </div>
  );
}
