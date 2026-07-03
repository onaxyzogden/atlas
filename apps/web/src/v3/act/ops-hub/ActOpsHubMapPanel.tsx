/**
 * ActOpsHubMapPanel — the map demoted to one bounded panel inside the
 * Operations Hub.
 *
 * The locked "replace tier-shell" decision makes the hub the primary Act
 * surface and the map a single embedded card rather than the whole canvas.
 * This panel reuses the EXACT read-only Act substrate that ActMapFirstLayout
 * mounts (BaseMapCard, Observe annotations, read-only Plan layers, Act data
 * layers, structure hit-testing + popover, sector compass) MINUS any authoring
 * tools — Act executes against existing features here; geometry authoring
 * happens in the walkthrough (Phase 3). On top of that substrate it mounts
 * ActTierMapMarkers (reused verbatim) so each objective shows a real pin at the
 * centroid of its logged field-action geometry; clicking a pin selects that
 * objective (the hub routes to act/ops/$objectiveId).
 *
 * Pin positions and progress colours are REAL (computeObjectiveMarkerPositions
 * / computeObjectiveProgress over the field-action store) — objectives with no
 * logged location render no pin (hide-until-real), exactly as in the tier
 * shell. `activeModule` + `scopedDomains` are the Phase-2b category-filter
 * seams: they drive ActDataLayers emphasis and dim out-of-category pins.
 */

import { useEffect, useMemo } from 'react';
import type { UniversalDomain } from '@ogden/shared';
import { useProjectStore, MTC_SEED } from '../../../store/projectStore.js';
import {
  selectFieldActionsForProject,
  useFieldActionStore,
} from '../../../store/fieldActionStore.js';
import { extractBoundaryGeometry } from '../../../lib/geo.js';
import { useV3Project } from '../../data/useV3Project.js';
import { useProjectObjectives } from '../../plan/strata/useProjectObjectives.js';
import { seedActionsIfEmpty } from '../field-action/seedDemoActions.js';
import { computeObjectiveProgress } from '../tier-shell/objectiveProgress.js';
import { computeObjectiveMarkerPositions } from '../tier-shell/objectiveMarkerGeometry.js';
import DiagnoseMap from '../../components/DiagnoseMap.js';
import BaseMapCard from '../../plan/canvas/BaseMapCard.js';
import ObserveAnnotationLayers from '../../observe/components/layers/ObserveAnnotationLayers.js';
import SectorCompassOverlay from '../../observe/components/overlays/SectorCompassOverlay.js';
import PlanDataLayers from '../../plan/layers/PlanDataLayers.js';
import ActDataLayers from '../layers/ActDataLayers.js';
import ActStructureClickHandler from '../layers/ActStructureClickHandler.js';
import ActStructurePopover from '../ActStructurePopover.js';
import ActTierMapMarkers from '../tier-shell/ActTierMapMarkers.js';
import type { ActModule } from '../types.js';
import css from './ActOpsHubMapPanel.module.css';

const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];

interface Props {
  projectId: string;
  /** URL-selected objective (the pin gets the active outline). */
  activeObjectiveId: string | null;
  /** Pin click → select an objective (hub routes to act/ops/$objectiveId). */
  onSelectObjective: (objectiveId: string) => void;
  /** Category filter (Phase 2b): emphasises the matching Act data layer. */
  activeModule?: ActModule | null;
  /** Category filter (Phase 2b): dims pins outside these domains (never hides). */
  scopedDomains?: ReadonlySet<UniversalDomain>;
}

export default function ActOpsHubMapPanel({
  projectId,
  activeObjectiveId,
  onSelectObjective,
  activeModule = null,
  scopedDomains,
}: Props) {
  const projects = useProjectStore((s) => s.projects);
  const project = useMemo(
    () =>
      projects.find((p) => p.id === projectId || p.serverId === projectId) ??
      MTC_SEED,
    [projects, projectId],
  );

  const boundary = extractBoundaryGeometry(project.parcelBoundaryGeojson) as
    | GeoJSON.Polygon
    | undefined;

  // Coords-only fallback (no boundary): prefer the parcel's intake center via
  // the v2→v3 adapter seam over the hard-coded stage centroid. DiagnoseMap
  // still fits to `boundary` when one exists. (Mirrors ActMapFirstLayout.)
  const v3Project = useV3Project(projectId);
  const fallbackCenter = v3Project?.location.center ?? FALLBACK_CENTROID;

  // Real data: objectives (per-project resolution) + field actions.
  const { objectives } = useProjectObjectives(projectId);
  const actions = useFieldActionStore((s) =>
    selectFieldActionsForProject(s, projectId),
  );

  // Defensive first-load seed (idempotent, no-op once any action exists) so a
  // detail-first deep link on a non-MTC project still has marker data — the ops
  // dashboard does not seed. Mirrors ActTierShell's mount seed.
  const isMtc = useMemo(
    () =>
      projectId === 'mtc' ||
      project.id === 'mtc' ||
      /moontrance/i.test(project.name ?? ''),
    [projectId, project.id, project.name],
  );
  useEffect(() => {
    if (!projectId) return;
    seedActionsIfEmpty(projectId, isMtc);
  }, [projectId, isMtc]);

  // Per-objective progress + real marker positions, shared with the markers.
  // Full objective set (every stratum) — the hub is not stratum-scoped.
  const progressByObjective = useMemo(
    () => computeObjectiveProgress(objectives, actions),
    [objectives, actions],
  );
  const positionByObjective = useMemo(
    () => computeObjectiveMarkerPositions(objectives, actions),
    [objectives, actions],
  );

  return (
    <section className={css.panel} aria-label="Field activity map">
      <header className={css.head}>
        <h2 className={css.title}>Field activity</h2>
        <span className={css.hint}>Tap a pin to open its walkthrough</span>
      </header>
      <div className={css.mapWrap}>
        <DiagnoseMap centroid={fallbackCenter} boundary={boundary}>
          {({ map }) => (
            <>
              <BaseMapCard stage="act" />
              <ObserveAnnotationLayers map={map} projectId={projectId} />
              <PlanDataLayers map={map} projectId={projectId} editable={false} />
              <ActStructureClickHandler map={map} projectId={projectId} />
              <ActDataLayers
                map={map}
                projectId={projectId}
                activeModule={activeModule}
              />
              <SectorCompassOverlay projectId={projectId} map={map} />
              <ActStructurePopover map={map} projectId={projectId} />
              <ActTierMapMarkers
                map={map}
                positionByObjective={positionByObjective}
                objectives={objectives}
                progressByObjective={progressByObjective}
                activeObjectiveId={activeObjectiveId}
                onSelectObjective={onSelectObjective}
                scopedDomains={scopedDomains}
              />
            </>
          )}
        </DiagnoseMap>
      </div>
    </section>
  );
}
