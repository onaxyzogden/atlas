/**
 * PlanSiteMapPanel — the aggregate site map for the Plan Command Centre, filling
 * the centre of the dashboard shell. Mirrors `SiteMapPanel` (Observe).
 *
 * Embeds the standalone DiagnoseMap read-only, fit to the project boundary when
 * present (falling back to the project centre), and mounts the canonical Plan
 * overlays on top: `PlanDataLayers` (persisted water/zones/paths/crops…, read-
 * only) and `DesignElementLayers` (the Vision-Layout design elements). Both are
 * scoped to the active module so the map focuses with the rest of the page.
 * Decisions are not spatial, so the map shows Plan geometry — not decision pins.
 */

import { Filter } from 'lucide-react';
import { useV3Project } from '../../data/useV3Project.js';
import DiagnoseMap from '../../components/DiagnoseMap.js';
import PlanDataLayers from '../layers/PlanDataLayers.js';
import DesignElementLayers from '../canvas/layers/DesignElementLayers.js';
import PlanMapLegend from './PlanMapLegend.js';
import { PLAN_MODULE_LABEL, type PlanModule } from '../types.js';
import css from '../../command/ObserveCommandCentrePage.module.css';

/** Last-resort centre when a project carries neither boundary nor centre. */
const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];

interface Props {
  projectId: string;
  activeModule: PlanModule | null;
  showData: boolean;
  showDesign: boolean;
  showBoundary: boolean;
}

export default function PlanSiteMapPanel({
  projectId,
  activeModule,
  showData,
  showDesign,
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
          {PLAN_MODULE_LABEL[activeModule]}
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
                <PlanDataLayers
                  map={map}
                  projectId={projectId}
                  editable={false}
                  activeModule={activeModule}
                />
              )}
              {showDesign && (
                <DesignElementLayers
                  map={map}
                  projectId={projectId}
                  view="vision"
                  activeModule={activeModule}
                />
              )}
            </>
          )}
        </DiagnoseMap>
      </div>
      <PlanMapLegend active={activeModule} />
    </section>
  );
}
