/**
 * ActMapFirstLayout — the live, map-first Act surface (ADR 7 headline).
 *
 * Promotes the map to the primary surface: the act map fills the canvas and
 * the field-action data panels (View B all-tasks dashboard / View A objective
 * execution) dock beside it as a side-panel (desktop/tablet) — the mobile
 * bottom-sheet treatment lands in a later slice. This is the hybrid graft
 * called for in ADR 7: the map-centric *shell* shape from the tier prototype
 * (ActProtoTierShell) fused with the already-wired, store-backed View A/B
 * panels from ActFieldActionLayout — none of the prototype's mock data.
 *
 * The map mounts the same read-only act substrate ActLayout's command-centre
 * uses (BaseMapCard, Observe annotations, read-only Plan layers, Act data
 * layers, structure hit-testing + popover, sector compass) MINUS the authoring
 * tools (no MapToolbar / ActDrawHost / InlineFeaturePopover) — Act executes
 * against existing features, it does not author geometry.
 *
 * Route param `objectiveId` drives the panel: present → View A, else View B,
 * matching ActFieldActionLayout so deep links stay stable. The legacy
 * rail-with-map ActFieldActionLayout and command-centre shell are preserved on
 * disk behind the Act shell toggle (no deletion).
 */

import { useMemo } from 'react';
import { useParams } from '@tanstack/react-router';
import { useProjectStore, MTC_SEED } from '../../../store/projectStore.js';
import { extractBoundaryGeometry } from '../../../lib/geo.js';
import { useV3Project } from '../../data/useV3Project.js';
import DiagnoseMap from '../../components/DiagnoseMap.js';
import BaseMapCard from '../../plan/canvas/BaseMapCard.js';
import ObserveAnnotationLayers from '../../observe/components/layers/ObserveAnnotationLayers.js';
import SectorCompassOverlay from '../../observe/components/overlays/SectorCompassOverlay.js';
import PlanDataLayers from '../../plan/layers/PlanDataLayers.js';
import ActDataLayers from '../layers/ActDataLayers.js';
import ActStructureClickHandler from '../layers/ActStructureClickHandler.js';
import ActStructurePopover from '../ActStructurePopover.js';
import ActOpsDashboard from './ActOpsDashboard.js';
import ViewAObjectiveExecution from './ViewAObjectiveExecution.js';
import { useViewScope } from '../../roles/useViewScope.js';
import RoleFocusControl from '../../roles/RoleFocusControl.js';
import css from './ActMapFirstLayout.module.css';

const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];

export default function ActMapFirstLayout() {
  const params = useParams({ strict: false }) as {
    projectId?: string;
    objectiveId?: string;
  };
  const id = params.projectId ?? 'mtc';
  const objectiveId = params.objectiveId;

  const projects = useProjectStore((s) => s.projects);
  const project = useMemo(
    () => projects.find((p) => p.id === id || p.serverId === id) ?? MTC_SEED,
    [projects, id],
  );

  const boundary = extractBoundaryGeometry(project.parcelBoundaryGeojson) as
    | GeoJSON.Polygon
    | undefined;

  // Coords-only fallback (no boundary): prefer the parcel's intake center via
  // the v2→v3 adapter seam over the hard-coded stage centroid. DiagnoseMap
  // still fits to `boundary` when one exists.
  const v3Project = useV3Project(params.projectId);
  const fallbackCenter = v3Project?.location.center ?? FALLBACK_CENTROID;

  // Operational Role Layer (additive; never hides). Auto-scopes the act map to
  // the viewer's own operational-role domains and -- via RoleFocusControl in the
  // panel header -- lets a coordinator view as any role. Out-of-scope execution
  // markers dim (ActDataLayers `scopedDomains`) but stay on the map + clickable.
  // The header renders only when the layer is live or a role can be picked, so
  // solo projects show no role UI at all.
  const { isScoped, scope, layerActive, canPickRole } = useViewScope(id, {
    allowRoleOverride: true,
  });
  const scopedDomains = isScoped ? scope : undefined;
  const showRoleControl = layerActive || canPickRole;

  return (
    <div className={css.shell}>
      <div className={css.body}>
        <div className={css.canvas}>
          <DiagnoseMap centroid={fallbackCenter} boundary={boundary}>
            {({ map }) => (
              <>
                <BaseMapCard stage="act" />
                <ObserveAnnotationLayers map={map} projectId={id} />
                <PlanDataLayers map={map} projectId={id} editable={false} />
                <ActStructureClickHandler map={map} projectId={id} />
                <ActDataLayers
                  map={map}
                  projectId={id}
                  activeModule={null}
                  {...(scopedDomains ? { scopedDomains } : {})}
                />
                <SectorCompassOverlay projectId={id} map={map} />
                <ActStructurePopover map={map} projectId={id} />
              </>
            )}
          </DiagnoseMap>
        </div>
        <aside className={css.panel} aria-label="Field actions">
          {showRoleControl && (
            <div className={css.panelHeader}>
              <RoleFocusControl projectId={id} />
            </div>
          )}
          <div className={css.panelBody}>
            {objectiveId ? (
              <ViewAObjectiveExecution projectId={id} objectiveId={objectiveId} />
            ) : (
              <ActOpsDashboard projectId={id} />
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
