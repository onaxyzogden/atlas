/**
 * ActSiteMapPanel — the aggregate site map for the Act Command Centre, filling
 * the centre of the dashboard shell. Mirrors `PlanSiteMapPanel` (Plan).
 *
 * Embeds the standalone DiagnoseMap read-only, fit to the project boundary when
 * present (falling back to the project centre), and mounts the canonical Act
 * execution overlay on top: `ActDataLayers` (persisted harvest / livestock /
 * maintenance execution events, read-only), scoped to the active module so the
 * map focuses with the rest of the page. Work items aren't all spatial, so the
 * map carries Act execution geometry — not work-item pins (same rationale as
 * Plan's decisions). Act has no design layer, so there is no DesignElementLayers.
 */

import { Filter } from 'lucide-react';
import { useV3Project } from '../../data/useV3Project.js';
import DiagnoseMap from '../../components/DiagnoseMap.js';
import ActDataLayers from '../layers/ActDataLayers.js';
import ActMapLegend from './ActMapLegend.js';
import { ACT_MODULE_LABEL, type ActModule } from '../types.js';
import css from '../../command/ObserveCommandCentrePage.module.css';

/** Last-resort centre when a project carries neither boundary nor centre. */
const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];

interface Props {
  projectId: string;
  activeModule: ActModule | null;
  showData: boolean;
  showBoundary: boolean;
}

export default function ActSiteMapPanel({
  projectId,
  activeModule,
  showData,
  showBoundary,
}: Props) {
  const project = useV3Project(projectId);
  const centroid = project?.location.center ?? FALLBACK_CENTROID;
  const boundary = project?.location.boundary;

  return (
    <section className={css.mapRegion} aria-label="Full site map">
      {activeModule && (
        <span className={css.filteredChip}>
          <Filter size={13} strokeWidth={2} /> Filtered to{' '}
          {ACT_MODULE_LABEL[activeModule]}
        </span>
      )}
      <div className={css.mapFill}>
        <DiagnoseMap
          centroid={centroid}
          boundary={showBoundary ? boundary : undefined}
        >
          {({ map }) => (
            <>
              {showData && (
                <ActDataLayers
                  map={map}
                  projectId={projectId}
                  activeModule={activeModule}
                />
              )}
            </>
          )}
        </DiagnoseMap>
      </div>
      <ActMapLegend active={activeModule} />
    </section>
  );
}
