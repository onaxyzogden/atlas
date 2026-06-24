/**
 * planFeatureActions — the per-kind action registry behind `PlanSelectionFloater`.
 *
 * One `FeatureActionConfig` per `PlanSelectionKind`. The floater renders purely
 * from this table instead of hard-coded `switch` branches, so adding a newly
 * selectable feature is a single entry here (label + how to delete + optional
 * rich-edit / quick actions) rather than a new branch in the component.
 *
 * The `Record<PlanSelectionKind, …>` type makes coverage a compile-time
 * guarantee: every selectable kind MUST have an entry or the build fails.
 *
 * Behaviour-preserving migration of the floater's prior hard-coded logic:
 *   - `remove` folds the old `removeOne` switch (one delete per namespace store).
 *   - `getEditHandler` folds the old paddock / habitat / line count-label editors.
 *   - `quickActions` is new — it gives the formerly-unselectable simple kinds
 *     (fence-line, ecological note, slaughter / cold-chain / market nodes) a
 *     Rename affordance so their floating bar carries a type-appropriate option,
 *     not just Delete.
 */

import * as turf from '@turf/turf';
import { Pencil, type LucideIcon } from 'lucide-react';
import type { PlanSelectionItem, PlanSelectionKind } from '../../store/planSelectionStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useClosedLoopStore } from '../../store/closedLoopStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { useUtilityRunStore } from '../../store/utilityRunStore.js';
import { useSetbackStore } from '../../store/setbackStore.js';
import { useMonitoringTransectStore } from '../../store/monitoringTransectStore.js';
import { useWaterSystemsStore } from '../../store/waterSystemsStore.js';
import { useEcologicalNoteStore } from '../../store/ecologicalNoteStore.js';
import { useAgribusinessStore } from '../../store/agribusinessStore.js';
import { useSlopeSurveyStore } from '../../store/slopeSurveyStore.js';
import {
  getDesignElementsForProject,
  removeDesignElement,
  removeStructure,
  updateDesignElement,
} from '../../store/builtEnvironmentSelectors.js';
import { useInlineFormStore } from './draw/inlineFormStore.js';
import {
  buildPaddockEditSchema,
  buildHabitatFeatureEditSchema,
  buildLineFeatureEditSchema,
  buildSlopeReclassifySchema,
  buildRingResizeSchema,
} from './layers/inlineEditSchemas.js';
import { useZoneRingConfigStore } from '../../store/zoneRingConfigStore.js';
import { bandsFromRadii, ringCircle } from './layers/zoneRingConstants.js';
import { buildRingZoneGeometries } from './engine/zoneGenerators/ringSeedGenerator.js';
import type { PolyFeature } from './engine/zoneGenerators/parcelGeometry.js';
import type { LandZone } from '../../store/zoneStore.js';
import type { ZoneRingRadii } from './layers/zoneRingConstants.js';
import {
  resolveSilvopastureHosts,
  listHostsForSelection,
} from '../../features/agroforestry/silvopastureHosts.js';

/** An extra button surfaced in the floater for a single selection (e.g.
 *  Rename). Distinct from the count-label editor (`FeatureEditHandler`). */
export interface FeatureQuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
}

/** The rich inline editor opened by clicking the count label (paddock /
 *  habitat / line). `title` is the button tooltip the floater shows. */
export interface FeatureEditHandler {
  title: string;
  run: () => void;
}

export interface FeatureActionConfig {
  /** Human label, used for the count pill and the delete-confirm prompt. */
  label: string;
  /** Whether Edit-vertices applies. Only `'polygon'` is wired today (the
   *  `direct_select` vertex handler is polygon-only); `'line'` is reserved for
   *  a future line-vertex editor and currently behaves as `false`. */
  supportsVertexEdit: 'polygon' | 'line' | false;
  /** Delete this feature from its backing store. */
  remove: (item: PlanSelectionItem) => void;
  /** Rich count-label editor (paddock / habitat / line). Returns null when the
   *  selected instance has no count-label editor (most kinds). */
  getEditHandler?: (item: PlanSelectionItem) => FeatureEditHandler | null;
  /** Extra action buttons for a single selection. */
  quickActions?: (item: PlanSelectionItem) => FeatureQuickAction[];
}

/** Plain LineString DesignElement kinds whose only inline-edit affordance is
 *  the real-world `widthM` override + label (no bespoke metadata axis).
 *  `swale` is excluded (edited via its own water form); habitat lines like
 *  `insectary-strip` go through `buildHabitatFeatureEditSchema`. */
const LINE_EDIT_KINDS: ReadonlySet<string> = new Set(['hedgerow', 'path', 'road']);

/** Open the single-field Rename popover anchored at a feature's centroid. */
function openRenameForm(opts: {
  kindLabel: string;
  id: string;
  name: string;
  geometry: GeoJSON.Geometry;
  update: (id: string, patch: { name: string }) => void;
}): void {
  const centroid = turf.centroid(turf.feature(opts.geometry));
  const [lng, lat] = centroid.geometry.coordinates as [number, number];
  useInlineFormStore.getState().open({
    title: `Rename ${opts.kindLabel.toLowerCase()}`,
    anchor: [lng, lat],
    fields: [{ key: 'name', label: 'Name', kind: 'text', required: true }],
    initial: { name: opts.name },
    onSave: (values) => {
      const name = typeof values.name === 'string' ? values.name.trim() : '';
      if (name) opts.update(opts.id, { name });
    },
    onCancel: () => {},
  });
}

/** Factory for the simple point/line kinds whose only options are Rename +
 *  Delete (no vertex edit, no bespoke metadata form). */
function simpleNamedKind(opts: {
  label: string;
  getRecord: (
    id: string,
  ) => { name: string; geometry: GeoJSON.Geometry } | undefined;
  update: (id: string, patch: { name: string }) => void;
  remove: (id: string) => void;
}): FeatureActionConfig {
  return {
    label: opts.label,
    supportsVertexEdit: false,
    remove: (item) => opts.remove(item.id),
    quickActions: (item) => {
      const rec = opts.getRecord(item.id);
      if (!rec) return [];
      return [
        {
          id: 'rename',
          label: 'Rename',
          icon: Pencil,
          run: () =>
            openRenameForm({
              kindLabel: opts.label,
              id: item.id,
              name: rec.name,
              geometry: rec.geometry,
              update: opts.update,
            }),
        },
      ];
    },
  };
}

/** Paddock count-label editor — always present for a paddock selection; the
 *  run defers the record lookup so a stale id is a safe no-op. */
function paddockEditHandler(item: PlanSelectionItem): FeatureEditHandler {
  return {
    title: 'Edit paddock',
    run: () => {
      const pd = useLivestockStore
        .getState()
        .paddocks.find((p) => p.id === item.id);
      if (!pd) return;
      const centroid = turf.centroid(turf.feature(pd.geometry));
      const [lng, lat] = centroid.geometry.coordinates as [number, number];
      const updatePaddock = useLivestockStore.getState().updatePaddock;
      const hostOptions = listHostsForSelection(
        resolveSilvopastureHosts(
          pd.projectId,
          useCropStore.getState().cropAreas,
          getDesignElementsForProject(pd.projectId),
        ),
      );
      useInlineFormStore.getState().open({
        ...buildPaddockEditSchema(pd, updatePaddock, hostOptions),
        anchor: [lng, lat],
      });
    },
  };
}

/** Design-element count-label editor — habitat metadata form, plain-line
 *  width/label form, or none (returns null → count renders as a span). */
function designElementEditHandler(
  item: PlanSelectionItem,
): FeatureEditHandler | null {
  if (!item.projectId) return null;
  const projectId = item.projectId;
  const elements = getDesignElementsForProject(projectId);
  const el = elements.find((e) => e.id === item.id);
  if (!el) return null;
  if (el.category === 'habitat') {
    return {
      title: 'Edit habitat feature',
      run: () => {
        const centroid = turf.centroid(turf.feature(el.geometry));
        const [lng, lat] = centroid.geometry.coordinates as [number, number];
        useInlineFormStore.getState().open({
          ...buildHabitatFeatureEditSchema(
            el,
            projectId,
            updateDesignElement,
            elements,
          ),
          anchor: [lng, lat],
        });
      },
    };
  }
  if (LINE_EDIT_KINDS.has(el.kind)) {
    return {
      title: 'Edit width & label',
      run: () => {
        const centroid = turf.centroid(turf.feature(el.geometry));
        const [lng, lat] = centroid.geometry.coordinates as [number, number];
        useInlineFormStore.getState().open({
          ...buildLineFeatureEditSchema(el, projectId, updateDesignElement),
          anchor: [lng, lat],
        });
      },
    };
  }
  return null;
}

/** Slope-gradient reclassify editor — resolves the polygon via the store's
 *  global id scan (ids are globally unique), anchors at its centroid, and
 *  opens the single-select class picker. A stale id is a safe no-op. */
function slopeReclassifyHandler(
  item: PlanSelectionItem,
): FeatureEditHandler | null {
  return {
    title: 'Reclassify slope',
    run: () => {
      const hit = useSlopeSurveyStore.getState().findFeatureGlobal(item.id);
      if (!hit) return;
      const centroid = turf.centroid(turf.feature(hit.feature.geometry));
      const [lng, lat] = centroid.geometry.coordinates as [number, number];
      useInlineFormStore.getState().open({
        ...buildSlopeReclassifySchema(hit.feature, (slopeClass) =>
          useSlopeSurveyStore
            .getState()
            .updateClass(hit.projectId, item.id, slopeClass),
        ),
        anchor: [lng, lat],
      });
    },
  };
}

/** Resolve a project's ring-seed home centre (the anchor every ring grows
 *  from). Prefers the explicit `isHomeCentre` flag, falls back to a Z0 zone. */
function findHomeCentre(zones: LandZone[], projectId: string): LandZone | null {
  const mine = zones.filter((z) => z.projectId === projectId);
  return (
    mine.find((z) => z.isHomeCentre) ??
    mine.find((z) => z.permacultureZone === 0) ??
    null
  );
}

/**
 * Re-grow the whole seeded ring set in place from the home anchor at the
 * given radii — the "whole ring set together" resize. The home disc (Z0)
 * and the Z1–Z5 annuli are recomputed via the SAME `buildRingZoneGeometries`
 * the seeder uses, so resized rings stay nested and never cover hand-drawn
 * work or the home centre. Only `ring-seed` zones are touched; each existing
 * ring is matched by its Z-level and gets new geometry + area, preserving
 * its name / category / notes / any reshape.
 */
export function recomputeRingZones(
  projectId: string,
  radii: ZoneRingRadii,
): void {
  const store = useZoneStore.getState();
  const mine = store.zones.filter((z) => z.projectId === projectId);
  const home = findHomeCentre(mine, projectId);
  if (!home) return;
  const center = turf.centroid(
    turf.feature(home.geometry),
  ) as GeoJSON.Feature<GeoJSON.Point>;

  // New Z0 disc — also a blocker for the annuli, exactly as the seeder.
  const homeDisc = ringCircle(center, radii.homeM) as PolyFeature;
  if (home.seedProvenance === 'ring-seed') {
    store.updateZone(home.id, {
      geometry: homeDisc.geometry,
      areaM2: turf.area(homeDisc),
    });
  }

  // Hand-drawn / non-ring work the resized annuli must not cover, plus the
  // new home disc. (Old ring-seed annuli are NOT blockers — we replace them.)
  const blockers: PolyFeature[] = mine
    .filter((z) => z.seedProvenance !== 'ring-seed')
    .map((z) => turf.feature(z.geometry) as PolyFeature);
  blockers.push(homeDisc);

  const byLevel = new Map(
    buildRingZoneGeometries(center, bandsFromRadii(radii), blockers).map(
      (b) => [b.zLevel, b.geometry] as const,
    ),
  );
  for (const z of mine) {
    if (z.seedProvenance !== 'ring-seed') continue;
    if (z.permacultureZone == null || z.permacultureZone === 0) continue;
    const geom = byLevel.get(z.permacultureZone as 1 | 2 | 3 | 4 | 5);
    if (!geom) continue; // band collapsed to a sliver — keep the old geometry
    store.updateZone(z.id, {
      geometry: geom,
      areaM2: turf.area(turf.feature(geom)),
    });
  }
}

/** "Resize rings" editor — only for seeded (`ring-seed`) zones. Opens the
 *  scale + per-ring form prefilled from the project's current radii; on save
 *  it persists the radii (so the overlay follows) and re-grows the whole set
 *  from the home anchor. Returns null for hand-drawn zones (no edit handler). */
function ringResizeHandler(item: PlanSelectionItem): FeatureEditHandler | null {
  const zones = useZoneStore.getState().zones;
  const zone = zones.find((z) => z.id === item.id);
  if (!zone || zone.seedProvenance !== 'ring-seed') return null;
  const projectId = zone.projectId;
  if (!findHomeCentre(zones, projectId)) return null;
  return {
    title: 'Resize rings',
    run: () => {
      const home = findHomeCentre(useZoneStore.getState().zones, projectId);
      if (!home) return;
      const centroid = turf.centroid(turf.feature(home.geometry));
      const [lng, lat] = centroid.geometry.coordinates as [number, number];
      const current = useZoneRingConfigStore.getState().getRadii(projectId);
      useInlineFormStore.getState().open({
        ...buildRingResizeSchema(current, (next) => {
          useZoneRingConfigStore.getState().setRadii(projectId, next);
          // Recompute from the clamped, persisted value (not the raw form).
          recomputeRingZones(
            projectId,
            useZoneRingConfigStore.getState().getRadii(projectId),
          );
        }),
        anchor: [lng, lat],
      });
    },
  };
}

export const PLAN_FEATURE_ACTIONS: Record<PlanSelectionKind, FeatureActionConfig> = {
  guild: {
    label: 'Guild',
    supportsVertexEdit: false,
    // The "Open Guild Builder" button stays prop-driven in the floater.
    remove: (item) => usePolycultureStore.getState().removeGuild(item.id),
  },
  'guild-member': {
    label: 'Guild member',
    supportsVertexEdit: false,
    // Members are added/removed inside the Guild Builder, not the floater —
    // preserve the prior `removeOne` no-op for this kind.
    remove: () => {},
  },
  zone: {
    label: 'Zone',
    supportsVertexEdit: 'polygon',
    remove: (item) => useZoneStore.getState().deleteZone(item.id),
    // Seeded rings get a "Resize rings" editor (whole set re-grows together);
    // hand-drawn zones return null → no count-label editor, as before.
    getEditHandler: (item) => ringResizeHandler(item),
  },
  crop: {
    label: 'Crop area',
    supportsVertexEdit: 'polygon',
    remove: (item) => useCropStore.getState().deleteCropArea(item.id),
  },
  paddock: {
    label: 'Paddock',
    supportsVertexEdit: 'polygon',
    remove: (item) => useLivestockStore.getState().deletePaddock(item.id),
    getEditHandler: (item) => paddockEditHandler(item),
  },
  path: {
    label: 'Path',
    supportsVertexEdit: false,
    remove: (item) => usePathStore.getState().deletePath(item.id),
  },
  structure: {
    label: 'Structure',
    supportsVertexEdit: 'polygon',
    remove: (item) => removeStructure(item.id),
  },
  fertility: {
    label: 'Fertility node',
    supportsVertexEdit: false,
    remove: (item) => useClosedLoopStore.getState().removeFertilityInfra(item.id),
  },
  water: {
    label: 'Water node',
    supportsVertexEdit: false,
    remove: (item) => useWaterSystemsStore.getState().removeWaterNode(item.id),
  },
  utility: {
    label: 'Utility run',
    supportsVertexEdit: false,
    remove: (item) => useUtilityRunStore.getState().deleteRun(item.id),
  },
  'utility-point': {
    label: 'Utility point',
    supportsVertexEdit: false,
    // Utility points live in the utility-run store; deletion of the point kind
    // is handled by its own map handler today, so the floater Delete is a
    // no-op for it (preserves prior behaviour — `removeOne` had no case).
    remove: () => {},
  },
  setback: {
    label: 'Setback ring',
    supportsVertexEdit: false,
    remove: (item) => useSetbackStore.getState().deleteRing(item.id),
  },
  flow: {
    label: 'Flow connector',
    supportsVertexEdit: false,
    remove: (item) => useClosedLoopStore.getState().removeMaterialFlow(item.id),
  },
  transect: {
    label: 'Monitoring transect',
    supportsVertexEdit: false,
    remove: (item) => useMonitoringTransectStore.getState().deleteTransect(item.id),
  },
  'design-element': {
    label: 'Design element',
    supportsVertexEdit: 'polygon',
    remove: (item) => {
      if (!item.projectId) return;
      removeDesignElement(item.projectId, item.id);
    },
    getEditHandler: (item) => designElementEditHandler(item),
  },
  'slope-gradient': {
    label: 'Slope gradient',
    supportsVertexEdit: 'polygon',
    remove: (item) => {
      if (!item.projectId) return;
      useSlopeSurveyStore.getState().removeFeature(item.projectId, item.id);
    },
    getEditHandler: (item) => slopeReclassifyHandler(item),
  },

  // ── Phase 5: previously-unselectable simple kinds ──────────────────────
  fence: simpleNamedKind({
    label: 'Fence line',
    getRecord: (id) =>
      useLivestockStore.getState().fenceLines.find((f) => f.id === id),
    update: (id, patch) => useLivestockStore.getState().updateFenceLine(id, patch),
    remove: (id) => useLivestockStore.getState().deleteFenceLine(id),
  }),
  note: simpleNamedKind({
    label: 'Note',
    getRecord: (id) =>
      useEcologicalNoteStore.getState().notes.find((n) => n.id === id),
    update: (id, patch) => useEcologicalNoteStore.getState().updateNote(id, patch),
    remove: (id) => useEcologicalNoteStore.getState().deleteNote(id),
  }),
  'slaughter-point': simpleNamedKind({
    label: 'Slaughter point',
    getRecord: (id) =>
      useAgribusinessStore.getState().slaughterPoints.find((p) => p.id === id),
    update: (id, patch) =>
      useAgribusinessStore.getState().updateSlaughterPoint(id, patch),
    remove: (id) => useAgribusinessStore.getState().deleteSlaughterPoint(id),
  }),
  'cold-chain': simpleNamedKind({
    label: 'Cold-chain unit',
    getRecord: (id) =>
      useAgribusinessStore.getState().coldChainUnits.find((u) => u.id === id),
    update: (id, patch) =>
      useAgribusinessStore.getState().updateColdChainUnit(id, patch),
    remove: (id) => useAgribusinessStore.getState().deleteColdChainUnit(id),
  }),
  'market-node': simpleNamedKind({
    label: 'Market node',
    getRecord: (id) =>
      useAgribusinessStore.getState().marketNodes.find((m) => m.id === id),
    update: (id, patch) =>
      useAgribusinessStore.getState().updateMarketNode(id, patch),
    remove: (id) => useAgribusinessStore.getState().deleteMarketNode(id),
  }),
};

/**
 * Whether Edit-vertices applies to a specific selection. Static `'polygon'`
 * kinds always qualify; `design-element` is refined per-instance because its
 * geometry can be a Point / LineString / Polygon. Mirrors the floater's prior
 * `isPolygonSelection` exactly.
 */
export function supportsVertexEditing(item: PlanSelectionItem): boolean {
  const cfg = PLAN_FEATURE_ACTIONS[item.kind];
  if (cfg.supportsVertexEdit !== 'polygon') return false;
  if (item.kind === 'design-element') {
    if (!item.projectId) return false;
    const el = getDesignElementsForProject(item.projectId).find(
      (e) => e.id === item.id,
    );
    return el?.geometry.type === 'Polygon';
  }
  return true;
}
