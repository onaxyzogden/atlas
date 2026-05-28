/**
 * LegacyModuleEmbed — React.lazy embed of one of the 7 Phase 3 module
 * dashboards inside a Domain Detail surface (OLOS Observe Dashboard Spec
 * §4 + Phase 4 Slice 4.3 plan).
 *
 * Resolves `OBSERVE_DOMAIN_CATALOG[domainId].legacyModuleMapping` to one
 * of the seven mounted `ModulePanel<X>` exporters under
 * `apps/web/src/v3/observe/modules/`. Each panel's default export is a
 * `ModulePanel` object whose `Dashboard` field is the dashboard FC; the
 * lazy wrapper unwraps the field at import time so React.lazy sees a
 * default-exported component.
 *
 * 9 net-new spec domains have `legacyModuleMapping = null`; for those the
 * caller skips this embed entirely and renders a thin "Open observation
 * needs" rail beside the overlay strip. See `DomainDetailLayout`.
 *
 * The dashboards rely on `useParams` to discover the active projectId, so
 * no props are forwarded. Suspense renders a small skeleton while the
 * panel's module + child detail components hydrate.
 */

import { Suspense, lazy, type ComponentType } from 'react';
import type { UniversalDomain } from '@ogden/shared';
import { OBSERVE_DOMAIN_CATALOG } from '@ogden/shared';
import css from './LegacyModuleEmbed.module.css';

type LegacyModuleId = NonNullable<
  (typeof OBSERVE_DOMAIN_CATALOG)[UniversalDomain]['legacyModuleMapping']
>;

const LegacyDashboards: Record<LegacyModuleId, ComponentType> = {
  topography: lazy(() =>
    import('../../modules/TopographyPanel.js').then((mod) => ({
      default: mod.default.Dashboard,
    })),
  ),
  'earth-water-ecology': lazy(() =>
    import('../../modules/EarthWaterEcologyPanel.js').then((mod) => ({
      default: mod.default.Dashboard,
    })),
  ),
  'macroclimate-hazards': lazy(() =>
    import('../../modules/MacroclimateHazardsPanel.js').then((mod) => ({
      default: mod.default.Dashboard,
    })),
  ),
  'sectors-zones': lazy(() =>
    import('../../modules/SectorsZonesPanel.js').then((mod) => ({
      default: mod.default.Dashboard,
    })),
  ),
  'human-context': lazy(() =>
    import('../../modules/HumanContextPanel.js').then((mod) => ({
      default: mod.default.Dashboard,
    })),
  ),
  'built-environment': lazy(() =>
    import('../../modules/BuiltEnvironmentPanel.js').then((mod) => ({
      default: mod.default.Dashboard,
    })),
  ),
  'swot-synthesis': lazy(() =>
    import('../../modules/SwotSynthesisPanel.js').then((mod) => ({
      default: mod.default.Dashboard,
    })),
  ),
};

interface Props {
  domainId: UniversalDomain;
}

export default function LegacyModuleEmbed({ domainId }: Props) {
  const legacyId = OBSERVE_DOMAIN_CATALOG[domainId].legacyModuleMapping;
  if (!legacyId) return null;

  const Dashboard = LegacyDashboards[legacyId];

  return (
    <div className={css.embed}>
      <div className={css.embedHeader}>
        <span className={css.embedLabel}>From the {legacyId.replace(/-/g, ' ')} module</span>
      </div>
      <Suspense
        fallback={
          <div className={css.skeleton} aria-live="polite">
            Loading module content...
          </div>
        }
      >
        <Dashboard />
      </Suspense>
    </div>
  );
}
