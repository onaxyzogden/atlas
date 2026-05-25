/**
 * annotationFieldSchemas — declarative per-kind field config for the
 * shared `<AnnotationFormSlideUp>`. Each schema owns:
 *
 *   - title           displayed in the form header
 *   - fields          ordered list of inputs to render
 *   - defaults        values used when `mode: 'create'`
 *   - loadDefaults    pulls existing record fields when `mode: 'edit'`
 *   - save            dispatches the create or update call into the
 *                     correct namespace store, accepting form values
 *                     plus the geometry/projectId context
 *
 * The schema lookup table at the bottom is the single contract that
 * draw tools and dashboard "Edit" affordances both read.
 */

import * as turf from '@turf/turf';
import { useHumanContextStore } from '../../../../store/humanContextStore.js';
import { useHomesteadStore } from '../../../../store/homesteadStore.js';
import { useTopographyStore } from '../../../../store/topographyStore.js';
import { usePlacementSignalStore } from '../../../../store/placementSignalStore.js';
import { useExternalForcesStore } from '../../../../store/externalForcesStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import {
  useVegetationStore,
  SUCCESSION_STAGE_LABELS,
  GROUND_COVER_LABELS,
  type SuccessionStage,
  type GroundCoverState,
} from '../../../../store/vegetationStore.js';
import { usePastureStore, type PastureKind } from '../../../../store/pastureStore.js';
import {
  useConventionalCropStore,
  type ConventionalCropKind,
  type CompactionLevel,
  type InputRegime,
  type TillageRegime,
  type IrrigationRegime,
} from '../../../../store/conventionalCropStore.js';
import { useSwotStore, type SwotBucket } from '../../../../store/swotStore.js';
import { useSoilSampleStore } from '../../../../store/soilSampleStore.js';
import {
  useBuiltEnvironmentStore,
  type BuildingSubtype,
  type WellKind,
  type SepticKind,
  type PowerLinePlacement,
  type BuriedUtilityKind,
  type FenceKind,
  type DrivewaySurface,
} from '../../../../store/builtEnvironmentStore.js';
import {
  BUILDING_SUBTYPE_OPTIONS as BE_BUILDING_SUBTYPE_OPTIONS,
  WELL_KIND_OPTIONS as BE_WELL_KIND_OPTIONS,
  SEPTIC_SUBTYPE_OPTIONS as BE_SEPTIC_SUBTYPE_OPTIONS,
  POWER_LINE_PLACEMENT_OPTIONS as BE_POWER_LINE_PLACEMENT_OPTIONS,
  BURIED_UTILITY_SUBTYPE_OPTIONS as BE_BURIED_UTILITY_SUBTYPE_OPTIONS,
  FENCE_SUBTYPE_OPTIONS as BE_FENCE_SUBTYPE_OPTIONS,
  DRIVEWAY_SURFACE_OPTIONS as BE_DRIVEWAY_SURFACE_OPTIONS,
} from '../../../builtEnvironment/schemas/beSchemaRegistry.js';

export type AnnotationKind =
  | 'neighbourPin'
  | 'household'
  | 'accessRoad'
  | 'frostPocket'
  | 'hazardZone'
  | 'contourLine'
  | 'highPoint'
  | 'drainageLine'
  | 'erosionFlag'
  | 'runoffPath'
  | 'watercourse'
  | 'waterbody'
  | 'vegetation'
  | 'pasture'
  | 'conventionalCrop'
  | 'soilSample'
  | 'swotTag'
  | 'sector'
  | 'building'
  | 'well'
  | 'septic'
  | 'powerLine'
  | 'buriedUtility'
  | 'fence'
  | 'gate'
  | 'existingDriveway';

export type FieldDef =
  | {
      name: string;
      label: string;
      type: 'text' | 'textarea';
      placeholder?: string;
      required?: boolean;
    }
  | {
      name: string;
      label: string;
      type: 'number';
      placeholder?: string;
      min?: number;
      max?: number;
      step?: number;
    }
  | {
      name: string;
      label: string;
      type: 'select';
      options: { value: string; label: string }[];
    }
  | { name: string; label: string; type: 'checkbox' }
  | { name: string; label: string; type: 'date' };

type FormValues = Record<string, unknown>;

interface SaveContext {
  projectId: string;
  geometry: GeoJSON.Geometry | null;
  existingId?: string;
  /**
   * When set, the create-branch of `save` uses this id instead of
   * generating a fresh UUID. Lets `createWithDefaults` (below) preallocate
   * the id so callers can immediately open the form in edit mode against
   * the just-created record. See ADDENDUM 6.
   */
  newId?: string;
  /** Optional bucket carried out-of-band for SWOT (S/W/O/T). */
  bucket?: SwotBucket;
}

export interface FieldSchema {
  title: string;
  fields: FieldDef[];
  defaults: FormValues;
  loadDefaults: (id: string, projectId: string) => FormValues | null;
  save: (values: FormValues, ctx: SaveContext) => void;
}

/**
 * Persist a new annotation immediately at draw-complete time using the
 * schema's `defaults` values. Returns the new id so the caller can open
 * `<AnnotationFormSlideUp>` in edit mode against the just-created record.
 *
 * Mirrors the PLAN-stage `useDesignElementDrawTool` pattern (auto-persist
 * on draw, no intermediate form gate) so the polygon survives even if the
 * form-open bridge fails. See ADDENDUM 6.
 */
export function createWithDefaults(
  schema: FieldSchema,
  ctx: SaveContext,
): string | null {
  if (!ctx.geometry) return null;
  const newId = crypto.randomUUID();
  schema.save(schema.defaults, { ...ctx, existingId: undefined, newId });
  // Pulse the placement signal so the objective workspace can auto-capture
  // annotation evidence when a feature is drawn with a required tool. Tools
  // stay oblivious to focus; the listener lives in ObjectiveAnnotationAutoCapture.
  usePlacementSignalStore.getState().signal(newId);
  return newId;
}

const nowIso = () => new Date().toISOString();

/** Helper: parse number-or-blank cleanly. */
function n(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

/** Helper: text-or-blank → string|undefined. */
function s(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t ? t : undefined;
}

// ────────────────────────────────────────────────────────────────────
// Schemas
// ────────────────────────────────────────────────────────────────────

const neighbourPin: FieldSchema = {
  title: 'Neighbour pin',
  fields: [
    { name: 'label', label: 'Label', type: 'text', placeholder: 'North neighbour' },
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Relationship, livestock, allies…' },
  ],
  defaults: { label: '', notes: '' },
  loadDefaults: (id) => {
    const rec = useHumanContextStore.getState().neighbours.find((n) => n.id === id);
    if (!rec) return null;
    return { label: rec.label ?? '', notes: rec.notes ?? '' };
  },
  save: (v, ctx) => {
    const store = useHumanContextStore.getState();
    if (ctx.existingId) {
      store.updateNeighbour(ctx.existingId, { label: s(v.label), notes: s(v.notes) });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'Point') return;
    const [lng, lat] = ctx.geometry.coordinates as [number, number];
    store.addNeighbour({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      position: [lng, lat],
      label: s(v.label),
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const household: FieldSchema = {
  title: 'Steward / household',
  fields: [
    { name: 'label', label: 'Label', type: 'text', placeholder: 'Main household' },
    { name: 'householdSize', label: 'Household size', type: 'number', min: 0 },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { label: '', householdSize: '', notes: '' },
  loadDefaults: (id) => {
    const rec = useHumanContextStore.getState().households.find((h) => h.id === id);
    if (!rec) return null;
    return {
      label: rec.label ?? '',
      householdSize: rec.householdSize ?? '',
      notes: rec.notes ?? '',
    };
  },
  save: (v, ctx) => {
    const store = useHumanContextStore.getState();
    const householdSize = n(v.householdSize);
    if (ctx.existingId) {
      store.updateHousehold(ctx.existingId, {
        label: s(v.label),
        householdSize: householdSize ?? undefined,
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'Point') return;
    const [lng, lat] = ctx.geometry.coordinates as [number, number];
    store.addHousehold({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      position: [lng, lat],
      label: s(v.label),
      householdSize: householdSize ?? undefined,
      notes: s(v.notes),
      createdAt: nowIso(),
    });
    // Unification (2026-05-13): the Steward / household pin is now the
    // single surface for placing the Mollison Zone 0 anchor. Mirror the
    // dropped point into homesteadStore so HomesteadMarker, zone rings,
    // sectors, and sun/wind wedges all pick it up without changes.
    useHomesteadStore.getState().set(ctx.projectId, [lng, lat]);
  },
};

const accessRoad: FieldSchema = {
  title: 'Access road',
  fields: [
    {
      name: 'kind',
      label: 'Kind',
      type: 'select',
      options: [
        { value: 'public', label: 'Public' },
        { value: 'private', label: 'Private' },
        { value: 'footpath', label: 'Footpath' },
      ],
    },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { kind: 'private', notes: '' },
  loadDefaults: (id) => {
    const rec = useHumanContextStore.getState().accessRoads.find((r) => r.id === id);
    if (!rec) return null;
    return { kind: rec.kind, notes: rec.notes ?? '' };
  },
  save: (v, ctx) => {
    const store = useHumanContextStore.getState();
    if (ctx.existingId) {
      store.updateAccessRoad(ctx.existingId, {
        kind: v.kind as 'public' | 'private' | 'footpath',
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'LineString') return;
    const lengthM = turf.length(turf.lineString(ctx.geometry.coordinates), {
      units: 'meters',
    });
    store.addAccessRoad({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      lengthM,
      kind: v.kind as 'public' | 'private' | 'footpath',
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const frostPocket: FieldSchema = {
  title: 'Frost pocket',
  fields: [
    {
      name: 'severity',
      label: 'Severity',
      type: 'select',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'med', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'catastrophic', label: 'Catastrophic' },
      ],
    },
    { name: 'description', label: 'Notes', type: 'textarea' },
  ],
  defaults: { severity: 'med', description: '' },
  loadDefaults: (id) => {
    const rec = useExternalForcesStore.getState().hazards.find((h) => h.id === id);
    if (!rec) return null;
    return { severity: rec.severity ?? 'med', description: rec.description ?? '' };
  },
  save: (v, ctx) => {
    const store = useExternalForcesStore.getState();
    if (ctx.existingId) {
      store.updateHazard(ctx.existingId, {
        severity: v.severity as 'low' | 'med' | 'high' | 'catastrophic',
        description: s(v.description),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'Polygon') return;
    store.addHazard({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      type: 'frost',
      date: new Date().toISOString().slice(0, 10),
      severity: v.severity as 'low' | 'med' | 'high' | 'catastrophic',
      geometry: ctx.geometry,
      description: s(v.description),
      createdAt: nowIso(),
    });
  },
};

const HAZARD_OPTIONS = [
  { value: 'flood', label: 'Flood' },
  { value: 'wildfire', label: 'Wildfire' },
  { value: 'hurricane', label: 'Hurricane' },
  { value: 'tornado', label: 'Tornado' },
  { value: 'ice_storm', label: 'Ice storm' },
  { value: 'blizzard', label: 'Blizzard' },
  { value: 'lightning', label: 'Lightning' },
  { value: 'earthquake', label: 'Earthquake' },
  { value: 'drought', label: 'Drought' },
  { value: 'frost', label: 'Frost' },
  { value: 'other', label: 'Other' },
];

const hazardZone: FieldSchema = {
  title: 'Hazard zone',
  fields: [
    { name: 'type', label: 'Type', type: 'select', options: HAZARD_OPTIONS },
    {
      name: 'severity',
      label: 'Severity',
      type: 'select',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'med', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'catastrophic', label: 'Catastrophic' },
      ],
    },
    { name: 'date', label: 'Observed', type: 'date' },
    { name: 'description', label: 'Notes / mitigation', type: 'textarea' },
  ],
  defaults: {
    type: 'flood',
    severity: 'med',
    date: new Date().toISOString().slice(0, 10),
    description: '',
  },
  loadDefaults: (id) => {
    const rec = useExternalForcesStore.getState().hazards.find((h) => h.id === id);
    if (!rec) return null;
    return {
      type: rec.type,
      severity: rec.severity ?? 'med',
      date: rec.date,
      description: rec.description ?? '',
    };
  },
  save: (v, ctx) => {
    const store = useExternalForcesStore.getState();
    if (ctx.existingId) {
      store.updateHazard(ctx.existingId, {
        type: v.type as never,
        severity: v.severity as 'low' | 'med' | 'high' | 'catastrophic',
        date: String(v.date),
        description: s(v.description),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'Polygon') return;
    store.addHazard({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      type: v.type as never,
      severity: v.severity as 'low' | 'med' | 'high' | 'catastrophic',
      date: String(v.date),
      geometry: ctx.geometry,
      description: s(v.description),
      createdAt: nowIso(),
    });
  },
};

const contourLine: FieldSchema = {
  title: 'Contour line',
  fields: [
    { name: 'elevationM', label: 'Elevation (m)', type: 'number', step: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { elevationM: '', notes: '' },
  loadDefaults: (id) => {
    const rec = useTopographyStore.getState().contours.find((c) => c.id === id);
    if (!rec) return null;
    return { elevationM: rec.elevationM ?? '', notes: rec.notes ?? '' };
  },
  save: (v, ctx) => {
    const store = useTopographyStore.getState();
    const elevationM = n(v.elevationM);
    if (ctx.existingId) {
      store.updateContour(ctx.existingId, {
        elevationM: elevationM ?? undefined,
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'LineString') return;
    store.addContour({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      elevationM: elevationM ?? undefined,
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const highPoint: FieldSchema = {
  title: 'Elevation point',
  fields: [
    {
      name: 'kind',
      label: 'Kind',
      type: 'select',
      options: [
        { value: 'high', label: 'Highest' },
        { value: 'low', label: 'Lowest' },
      ],
    },
    { name: 'label', label: 'Label', type: 'text', placeholder: 'Ridge top' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { kind: 'high', label: '', notes: '' },
  loadDefaults: (id) => {
    const rec = useTopographyStore.getState().highPoints.find((p) => p.id === id);
    if (!rec) return null;
    return { kind: rec.kind, label: rec.label ?? '', notes: rec.notes ?? '' };
  },
  save: (v, ctx) => {
    const store = useTopographyStore.getState();
    if (ctx.existingId) {
      store.updateHighPoint(ctx.existingId, {
        kind: v.kind as 'high' | 'low',
        label: s(v.label),
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'Point') return;
    const [lng, lat] = ctx.geometry.coordinates as [number, number];
    store.addHighPoint({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      position: [lng, lat],
      kind: v.kind as 'high' | 'low',
      label: s(v.label),
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const drainageLine: FieldSchema = {
  title: 'Drainage line',
  fields: [
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Where water collects, exits…' },
  ],
  defaults: { notes: '' },
  loadDefaults: (id) => {
    const rec = useTopographyStore.getState().drainageLines.find((d) => d.id === id);
    if (!rec) return null;
    return { notes: rec.notes ?? '' };
  },
  save: (v, ctx) => {
    const store = useTopographyStore.getState();
    if (ctx.existingId) {
      store.updateDrainageLine(ctx.existingId, { notes: s(v.notes) });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'LineString') return;
    store.addDrainageLine({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const erosionFlag: FieldSchema = {
  title: 'Erosion flag',
  fields: [
    {
      name: 'severity',
      label: 'Severity',
      type: 'select',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
      ],
    },
    {
      name: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'sheet', label: 'Sheet' },
        { value: 'rill', label: 'Rill' },
        { value: 'gully', label: 'Gully' },
        { value: 'bank', label: 'Bank' },
      ],
    },
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Cause, extent, after-rain behaviour…' },
  ],
  defaults: { severity: 'medium', type: 'sheet', notes: '' },
  loadDefaults: (id) => {
    const rec = useTopographyStore.getState().erosionFlags.find((e) => e.id === id);
    if (!rec) return null;
    return { severity: rec.severity, type: rec.type, notes: rec.notes ?? '' };
  },
  save: (v, ctx) => {
    const store = useTopographyStore.getState();
    if (ctx.existingId) {
      store.updateErosionFlag(ctx.existingId, {
        severity: v.severity as 'low' | 'medium' | 'high',
        type: v.type as 'sheet' | 'rill' | 'gully' | 'bank',
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'Point') return;
    const [lng, lat] = ctx.geometry.coordinates as [number, number];
    store.addErosionFlag({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      position: [lng, lat],
      severity: v.severity as 'low' | 'medium' | 'high',
      type: v.type as 'sheet' | 'rill' | 'gully' | 'bank',
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const runoffPath: FieldSchema = {
  title: 'Runoff path',
  fields: [
    { name: 'from', label: 'From', type: 'text', placeholder: 'Ridge, roof, road…' },
    { name: 'to', label: 'To', type: 'text', placeholder: 'Swale, pond, boundary…' },
    {
      name: 'flowCondition',
      label: 'Flow condition',
      type: 'select',
      options: [
        { value: 'dry', label: 'Dry' },
        { value: 'light', label: 'Light' },
        { value: 'active', label: 'Active' },
        { value: 'severe', label: 'Severe' },
      ],
    },
    { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Linked rainfall event, observed depth…' },
  ],
  defaults: { from: '', to: '', flowCondition: 'active', notes: '' },
  loadDefaults: (id) => {
    const rec = useTopographyStore.getState().runoffPaths.find((r) => r.id === id);
    if (!rec) return null;
    return {
      from: rec.from ?? '',
      to: rec.to ?? '',
      flowCondition: rec.flowCondition,
      notes: rec.notes ?? '',
    };
  },
  save: (v, ctx) => {
    const store = useTopographyStore.getState();
    if (ctx.existingId) {
      store.updateRunoffPath(ctx.existingId, {
        from: s(v.from),
        to: s(v.to),
        flowCondition: v.flowCondition as 'dry' | 'light' | 'active' | 'severe',
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'LineString') return;
    store.addRunoffPath({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      from: s(v.from),
      to: s(v.to),
      flowCondition: v.flowCondition as 'dry' | 'light' | 'active' | 'severe',
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const watercourse: FieldSchema = {
  title: 'Watercourse',
  fields: [
    {
      name: 'kind',
      label: 'Kind',
      type: 'select',
      options: [
        { value: 'stream', label: 'Stream' },
        { value: 'creek', label: 'Creek' },
        { value: 'ditch', label: 'Ditch' },
        { value: 'other', label: 'Other' },
      ],
    },
    { name: 'perennial', label: 'Perennial (year-round)', type: 'checkbox' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { kind: 'stream', perennial: true, notes: '' },
  loadDefaults: (id) => {
    const rec = useWaterSystemsStore.getState().watercourses.find((w) => w.id === id);
    if (!rec) return null;
    return { kind: rec.kind, perennial: rec.perennial, notes: rec.notes ?? '' };
  },
  save: (v, ctx) => {
    const store = useWaterSystemsStore.getState();
    if (ctx.existingId) {
      store.updateWatercourse(ctx.existingId, {
        kind: v.kind as 'stream' | 'creek' | 'ditch' | 'other',
        perennial: Boolean(v.perennial),
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'LineString') return;
    store.addWatercourse({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      kind: v.kind as 'stream' | 'creek' | 'ditch' | 'other',
      perennial: Boolean(v.perennial),
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const waterbody: FieldSchema = {
  title: 'Waterbody',
  fields: [
    {
      name: 'kind',
      label: 'Kind',
      type: 'select',
      options: [
        { value: 'lake', label: 'Lake' },
        { value: 'pond', label: 'Pond' },
        { value: 'wetland', label: 'Wetland' },
        { value: 'reservoir', label: 'Reservoir' },
        { value: 'other', label: 'Other' },
      ],
    },
    { name: 'name', label: 'Name', type: 'text', placeholder: 'North pond' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { kind: 'pond', name: '', notes: '' },
  loadDefaults: (id) => {
    const rec = useWaterSystemsStore.getState().waterbodies.find((w) => w.id === id);
    if (!rec) return null;
    return {
      kind: rec.kind,
      name: rec.name ?? '',
      notes: rec.notes ?? '',
    };
  },
  save: (v, ctx) => {
    const store = useWaterSystemsStore.getState();
    if (ctx.existingId) {
      store.updateWaterbody(ctx.existingId, {
        kind: v.kind as 'lake' | 'pond' | 'wetland' | 'reservoir' | 'other',
        name: s(v.name),
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'Polygon') return;
    store.addWaterbody({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      kind: v.kind as 'lake' | 'pond' | 'wetland' | 'reservoir' | 'other',
      name: s(v.name),
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const SUCCESSION_OPTIONS = (
  Object.keys(SUCCESSION_STAGE_LABELS) as SuccessionStage[]
).map((k) => ({ value: k, label: SUCCESSION_STAGE_LABELS[k] }));

const GROUND_COVER_OPTIONS = (
  Object.keys(GROUND_COVER_LABELS) as GroundCoverState[]
).map((k) => ({ value: k, label: GROUND_COVER_LABELS[k] }));

const vegetation: FieldSchema = {
  title: 'Vegetation & cover',
  fields: [
    {
      name: 'successionStage',
      label: 'Succession stage',
      type: 'select',
      options: SUCCESSION_OPTIONS,
    },
    {
      name: 'groundCover',
      label: 'Ground cover',
      type: 'select',
      options: GROUND_COVER_OPTIONS,
    },
    { name: 'label', label: 'Label', type: 'text', placeholder: 'Mature forest' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: {
    successionStage: 'mid',
    groundCover: 'sparse-grasses',
    label: '',
    notes: '',
  },
  loadDefaults: (id) => {
    const rec = useVegetationStore.getState().patches.find((p) => p.id === id);
    if (!rec) return null;
    return {
      successionStage: rec.successionStage,
      groundCover: rec.groundCover,
      label: rec.label ?? '',
      notes: rec.notes ?? '',
    };
  },
  save: (v, ctx) => {
    const store = useVegetationStore.getState();
    if (ctx.existingId) {
      store.updatePatch(ctx.existingId, {
        successionStage: v.successionStage as SuccessionStage,
        groundCover: v.groundCover as GroundCoverState,
        label: s(v.label),
        notes: s(v.notes),
      });
      return;
    }
    if (
      !ctx.geometry ||
      (ctx.geometry.type !== 'Polygon' && ctx.geometry.type !== 'MultiPolygon')
    )
      return;
    store.addPatch({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      successionStage: v.successionStage as SuccessionStage,
      groundCover: v.groundCover as GroundCoverState,
      label: s(v.label),
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const pasture: FieldSchema = {
  title: 'Pasture / paddock',
  fields: [
    {
      name: 'kind',
      label: 'Kind',
      type: 'select',
      options: [
        { value: 'paddock', label: 'Paddock (fenced)' },
        { value: 'open-pasture', label: 'Open pasture' },
        { value: 'hayfield', label: 'Hayfield' },
      ],
    },
    { name: 'label', label: 'Label', type: 'text', placeholder: 'North paddock' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { kind: 'paddock', label: '', notes: '' },
  loadDefaults: (id) => {
    const rec = usePastureStore.getState().pastures.find((p) => p.id === id);
    if (!rec) return null;
    return {
      kind: rec.kind,
      label: rec.label ?? '',
      notes: rec.notes ?? '',
    };
  },
  save: (v, ctx) => {
    const store = usePastureStore.getState();
    if (ctx.existingId) {
      store.updatePasture(ctx.existingId, {
        kind: v.kind as PastureKind,
        label: s(v.label),
        notes: s(v.notes),
      });
      return;
    }
    if (
      !ctx.geometry ||
      (ctx.geometry.type !== 'Polygon' && ctx.geometry.type !== 'MultiPolygon')
    )
      return;
    store.addPasture({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      kind: v.kind as PastureKind,
      label: s(v.label),
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const CONVENTIONAL_CROP_KIND_OPTIONS = [
  { value: 'annual-row', label: 'Annual row crop' },
  { value: 'perennial-monoculture', label: 'Perennial monoculture' },
  { value: 'cover-cropped', label: 'Cover-cropped' },
  { value: 'fallow', label: 'Fallow' },
];

const COMPACTION_OPTIONS = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'none', label: 'None' },
  { value: 'mild', label: 'Mild' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'severe', label: 'Severe' },
];

const INPUTS_OPTIONS = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'none', label: 'None' },
  { value: 'synthetic', label: 'Synthetic' },
  { value: 'organic', label: 'Organic' },
  { value: 'mixed', label: 'Mixed' },
];

const TILLAGE_OPTIONS = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'no-till', label: 'No-till' },
  { value: 'reduced', label: 'Reduced' },
  { value: 'conventional', label: 'Conventional' },
  { value: 'intensive', label: 'Intensive' },
];

const IRRIGATION_OPTIONS = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'none', label: 'None' },
  { value: 'rainfed', label: 'Rainfed' },
  { value: 'drip', label: 'Drip' },
  { value: 'sprinkler', label: 'Sprinkler' },
  { value: 'flood', label: 'Flood' },
];

const conventionalCrop: FieldSchema = {
  title: 'Conventional crop',
  fields: [
    { name: 'kind', label: 'Kind', type: 'select', options: CONVENTIONAL_CROP_KIND_OPTIONS },
    { name: 'primaryCrop', label: 'Primary crop', type: 'text', placeholder: 'Corn / Soy-wheat rotation' },
    { name: 'compaction', label: 'Soil compaction', type: 'select', options: COMPACTION_OPTIONS },
    { name: 'inputs', label: 'Inputs', type: 'select', options: INPUTS_OPTIONS },
    { name: 'tillage', label: 'Tillage', type: 'select', options: TILLAGE_OPTIONS },
    { name: 'irrigation', label: 'Irrigation', type: 'select', options: IRRIGATION_OPTIONS },
    { name: 'lastPlanted', label: 'Last planted', type: 'date' },
    { name: 'rotationNotes', label: 'Rotation notes', type: 'textarea', placeholder: 'Years, sequence, cover crops…' },
    { name: 'label', label: 'Label', type: 'text', placeholder: 'East field' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: {
    kind: 'annual-row',
    primaryCrop: '',
    compaction: 'unknown',
    inputs: 'unknown',
    tillage: 'unknown',
    irrigation: 'unknown',
    lastPlanted: '',
    rotationNotes: '',
    label: '',
    notes: '',
  },
  loadDefaults: (id) => {
    const rec = useConventionalCropStore
      .getState()
      .conventionalCrops.find((c) => c.id === id);
    if (!rec) return null;
    return {
      kind: rec.kind,
      primaryCrop: rec.primaryCrop ?? '',
      compaction: rec.compaction ?? 'unknown',
      inputs: rec.inputs ?? 'unknown',
      tillage: rec.tillage ?? 'unknown',
      irrigation: rec.irrigation ?? 'unknown',
      lastPlanted: rec.lastPlanted ?? '',
      rotationNotes: rec.rotationNotes ?? '',
      label: rec.label ?? '',
      notes: rec.notes ?? '',
    };
  },
  save: (v, ctx) => {
    const store = useConventionalCropStore.getState();
    const patch = {
      kind: v.kind as ConventionalCropKind,
      primaryCrop: s(v.primaryCrop),
      compaction: v.compaction as CompactionLevel,
      inputs: v.inputs as InputRegime,
      tillage: v.tillage as TillageRegime,
      irrigation: v.irrigation as IrrigationRegime,
      lastPlanted: s(v.lastPlanted),
      rotationNotes: s(v.rotationNotes),
      label: s(v.label),
      notes: s(v.notes),
    };
    if (ctx.existingId) {
      store.updateConventionalCrop(ctx.existingId, patch);
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'Polygon') return;
    store.addConventionalCrop({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      ...patch,
      createdAt: nowIso(),
    });
  },
};

const soilSample: FieldSchema = {
  title: 'Soil sample',
  fields: [
    { name: 'label', label: 'Label', type: 'text', placeholder: 'North paddock topsoil' },
    { name: 'sampleDate', label: 'Sample date', type: 'date' },
    {
      name: 'depth',
      label: 'Depth',
      type: 'select',
      options: [
        { value: '0_5cm', label: '0–5 cm' },
        { value: '5_15cm', label: '5–15 cm' },
        { value: '15_30cm', label: '15–30 cm' },
        { value: '30_60cm', label: '30–60 cm' },
        { value: '60_100cm', label: '60–100 cm' },
        { value: 'unknown', label: 'Unknown' },
      ],
    },
    { name: 'ph', label: 'pH', type: 'number', min: 0, max: 14, step: 0.1 },
    { name: 'organicMatterPct', label: 'Organic matter %', type: 'number', min: 0, max: 100, step: 0.1 },
    {
      name: 'texture',
      label: 'Texture class',
      type: 'select',
      options: [
        { value: '', label: '—' },
        { value: 'sand', label: 'Sand' },
        { value: 'loamy_sand', label: 'Loamy sand' },
        { value: 'sandy_loam', label: 'Sandy loam' },
        { value: 'loam', label: 'Loam' },
        { value: 'silt_loam', label: 'Silt loam' },
        { value: 'silt', label: 'Silt' },
        { value: 'sandy_clay_loam', label: 'Sandy clay loam' },
        { value: 'clay_loam', label: 'Clay loam' },
        { value: 'silty_clay_loam', label: 'Silty clay loam' },
        { value: 'sandy_clay', label: 'Sandy clay' },
        { value: 'silty_clay', label: 'Silty clay' },
        { value: 'clay', label: 'Clay' },
      ],
    },
    { name: 'cecMeq100g', label: 'CEC (meq/100g)', type: 'number', min: 0, step: 0.1 },
    { name: 'ecDsM', label: 'EC (dS/m)', type: 'number', min: 0, step: 0.01 },
    { name: 'bulkDensityGCm3', label: 'Bulk density (g/cm³)', type: 'number', min: 0, step: 0.01 },
    {
      name: 'biologicalActivity',
      label: 'Biological activity',
      type: 'select',
      options: [
        { value: 'unknown', label: 'Unknown' },
        { value: 'none', label: 'None' },
        { value: 'low', label: 'Low' },
        { value: 'moderate', label: 'Moderate' },
        { value: 'high', label: 'High' },
      ],
    },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: {
    label: 'Soil test pit',
    sampleDate: new Date().toISOString().slice(0, 10),
    depth: '0_5cm',
    ph: '',
    organicMatterPct: '',
    texture: '',
    cecMeq100g: '',
    ecDsM: '',
    bulkDensityGCm3: '',
    biologicalActivity: 'unknown',
    notes: '',
  },
  loadDefaults: (id) => {
    const rec = useSoilSampleStore.getState().samples.find((s) => s.id === id);
    if (!rec) return null;
    return {
      label: rec.label,
      sampleDate: rec.sampleDate,
      depth: rec.depth,
      ph: rec.ph ?? '',
      organicMatterPct: rec.organicMatterPct ?? '',
      texture: rec.texture ?? '',
      cecMeq100g: rec.cecMeq100g ?? '',
      ecDsM: rec.ecDsM ?? '',
      bulkDensityGCm3: rec.bulkDensityGCm3 ?? '',
      biologicalActivity: rec.biologicalActivity,
      notes: rec.notes,
    };
  },
  save: (v, ctx) => {
    const store = useSoilSampleStore.getState();
    const baseFields = {
      label: (v.label as string) || 'Soil test pit',
      sampleDate: String(v.sampleDate),
      depth: v.depth as never,
      ph: n(v.ph),
      organicMatterPct: n(v.organicMatterPct),
      texture: (v.texture as string) ? (v.texture as never) : null,
      cecMeq100g: n(v.cecMeq100g),
      ecDsM: n(v.ecDsM),
      bulkDensityGCm3: n(v.bulkDensityGCm3),
      biologicalActivity: v.biologicalActivity as never,
      notes: typeof v.notes === 'string' ? v.notes : '',
    };
    if (ctx.existingId) {
      store.updateSample(ctx.existingId, baseFields);
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'Point') return;
    const [lng, lat] = ctx.geometry.coordinates as [number, number];
    const t = nowIso();
    store.addSample({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      ...baseFields,
      location: [lng, lat],
      npkPpm: null,
      lab: null,
      createdAt: t,
      updatedAt: t,
    });
  },
};

const swotTag: FieldSchema = {
  title: 'SWOT tag',
  fields: [
    { name: 'title', label: 'Title', type: 'text', placeholder: 'One-line label' },
    { name: 'body', label: 'Description', type: 'textarea' },
  ],
  defaults: { title: '', body: '' },
  loadDefaults: (id) => {
    const rec = useSwotStore.getState().swot.find((e) => e.id === id);
    if (!rec) return null;
    return { title: rec.title, body: rec.body ?? '' };
  },
  save: (v, ctx) => {
    const store = useSwotStore.getState();
    if (ctx.existingId) {
      store.updateSwot(ctx.existingId, {
        title: (v.title as string) || 'SWOT tag',
        body: s(v.body),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'Point') return;
    if (!ctx.bucket) return;
    const [lng, lat] = ctx.geometry.coordinates as [number, number];
    store.addSwot({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      bucket: ctx.bucket,
      title: (v.title as string) || 'SWOT tag',
      body: s(v.body),
      position: [lng, lat],
      createdAt: nowIso(),
    });
  },
};

/**
 * Sector schema — edit-only.
 *
 * Creates happen in `SunWindWedgeTool` directly (the create flow needs the
 * homestead-fallback apex, type-specific defaults, and `addSector` call,
 * none of which fit cleanly into the `save(values, ctx)` shape that takes
 * a single `geometry`). The schema only services edit mode: form load
 * reads from `externalForcesStore.sectors`, save patches via
 * `updateSector`. The on-map drag handles in `<AnnotationSectorHandles>`
 * also call `updateSector` so live drags and form edits agree.
 */
const sector: FieldSchema = {
  title: 'Sector',
  fields: [
    {
      name: 'bearingDeg',
      label: 'Bearing (° from N)',
      type: 'number',
      min: 0,
      max: 360,
      step: 1,
    },
    {
      name: 'arcDeg',
      label: 'Arc width (°)',
      type: 'number',
      min: 10,
      max: 350,
      step: 1,
    },
    {
      name: 'intensity',
      label: 'Intensity',
      type: 'select',
      options: [
        { value: '', label: '—' },
        { value: 'low', label: 'Low' },
        { value: 'med', label: 'Medium' },
        { value: 'high', label: 'High' },
      ],
    },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { bearingDeg: 180, arcDeg: 90, intensity: '', notes: '' },
  loadDefaults: (id) => {
    const rec = useExternalForcesStore.getState().sectors.find((x) => x.id === id);
    if (!rec) return null;
    return {
      bearingDeg: rec.bearingDeg,
      arcDeg: rec.arcDeg,
      intensity: rec.intensity ?? '',
      notes: rec.notes ?? '',
    };
  },
  save: (v, ctx) => {
    if (!ctx.existingId) return; // Creates handled by SunWindWedgeTool.
    const store = useExternalForcesStore.getState();
    const bearing = n(v.bearingDeg);
    const arc = n(v.arcDeg);
    const intensityRaw = typeof v.intensity === 'string' ? v.intensity : '';
    const intensity =
      intensityRaw === 'low' || intensityRaw === 'med' || intensityRaw === 'high'
        ? intensityRaw
        : undefined;
    store.updateSector(ctx.existingId, {
      ...(bearing !== null ? { bearingDeg: ((bearing % 360) + 360) % 360 } : {}),
      ...(arc !== null ? { arcDeg: Math.max(10, Math.min(350, arc)) } : {}),
      intensity,
      notes: s(v.notes),
    });
  },
};

// ── Built Environment ──────────────────────────────────────────────────
//
// Phase 4.4 (2026-05-10): the eight BE schemas below now serve **create-mode
// only**. Edit-mode for BE entities is intercepted in `SelectionFloater.onEdit`
// → `openBeInlineEditByObserveKind` → floating `<InlineFeaturePopover>` (Plan
// parity). The slide-up never opens for BE edits anymore. Field shapes still
// match `beSchemaRegistry.ts` so create + edit stay 1:1 visually.

const building: FieldSchema = {
  title: 'Building',
  fields: [
    { name: 'subtype', label: 'Subtype', type: 'select', options: BE_BUILDING_SUBTYPE_OPTIONS },
    { name: 'label', label: 'Label', type: 'text', placeholder: 'Main house' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { subtype: 'residence', label: '', notes: '' },
  loadDefaults: (id) => {
    const rec = useBuiltEnvironmentStore.getState().buildings.find((b) => b.id === id);
    if (!rec) return null;
    return { subtype: rec.subtype, label: rec.label ?? '', notes: rec.notes ?? '' };
  },
  save: (v, ctx) => {
    const store = useBuiltEnvironmentStore.getState();
    if (ctx.existingId) {
      store.updateBuilding(ctx.existingId, {
        subtype: v.subtype as BuildingSubtype,
        label: s(v.label),
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'Polygon') return;
    let areaM2: number | undefined;
    try {
      areaM2 = turf.area(turf.polygon(ctx.geometry.coordinates));
    } catch {
      areaM2 = undefined;
    }
    store.addBuilding({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      subtype: v.subtype as BuildingSubtype,
      label: s(v.label),
      notes: s(v.notes),
      areaM2,
      createdAt: nowIso(),
    });
  },
};

const well: FieldSchema = {
  title: 'Well',
  fields: [
    { name: 'kind', label: 'Kind', type: 'select', options: BE_WELL_KIND_OPTIONS },
    { name: 'depthM', label: 'Depth (m)', type: 'number', min: 0, step: 0.5 },
    { name: 'flowLpm', label: 'Flow (L/min)', type: 'number', min: 0, step: 1 },
    { name: 'label', label: 'Label', type: 'text', placeholder: 'North well' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { kind: 'unknown', depthM: '', flowLpm: '', label: '', notes: '' },
  loadDefaults: (id) => {
    const rec = useBuiltEnvironmentStore.getState().wells.find((w) => w.id === id);
    if (!rec) return null;
    return {
      kind: rec.kind,
      depthM: rec.depthM ?? '',
      flowLpm: rec.flowLpm ?? '',
      label: rec.label ?? '',
      notes: rec.notes ?? '',
    };
  },
  save: (v, ctx) => {
    const store = useBuiltEnvironmentStore.getState();
    const depthM = n(v.depthM);
    const flowLpm = n(v.flowLpm);
    if (ctx.existingId) {
      store.updateWell(ctx.existingId, {
        kind: v.kind as WellKind,
        depthM: depthM ?? undefined,
        flowLpm: flowLpm ?? undefined,
        label: s(v.label),
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'Point') return;
    const [lng, lat] = ctx.geometry.coordinates as [number, number];
    store.addWell({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      position: [lng, lat],
      kind: v.kind as WellKind,
      depthM: depthM ?? undefined,
      flowLpm: flowLpm ?? undefined,
      label: s(v.label),
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const septic: FieldSchema = {
  title: 'Septic / leach field',
  fields: [
    { name: 'kind', label: 'Kind', type: 'select', options: BE_SEPTIC_SUBTYPE_OPTIONS },
    { name: 'label', label: 'Label', type: 'text' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { kind: 'tank', label: '', notes: '' },
  loadDefaults: (id) => {
    const rec = useBuiltEnvironmentStore.getState().septics.find((sp) => sp.id === id);
    if (!rec) return null;
    return { kind: rec.kind, label: rec.label ?? '', notes: rec.notes ?? '' };
  },
  save: (v, ctx) => {
    const store = useBuiltEnvironmentStore.getState();
    if (ctx.existingId) {
      store.updateSeptic(ctx.existingId, {
        kind: v.kind as SepticKind,
        label: s(v.label),
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'Polygon') return;
    let areaM2: number | undefined;
    try {
      areaM2 = turf.area(turf.polygon(ctx.geometry.coordinates));
    } catch {
      areaM2 = undefined;
    }
    store.addSeptic({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      kind: v.kind as SepticKind,
      label: s(v.label),
      notes: s(v.notes),
      areaM2,
      createdAt: nowIso(),
    });
  },
};

const powerLine: FieldSchema = {
  title: 'Power line',
  fields: [
    { name: 'placement', label: 'Placement', type: 'select', options: BE_POWER_LINE_PLACEMENT_OPTIONS },
    { name: 'label', label: 'Label', type: 'text' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { placement: 'overhead', label: '', notes: '' },
  loadDefaults: (id) => {
    const rec = useBuiltEnvironmentStore.getState().powerLines.find((p) => p.id === id);
    if (!rec) return null;
    return {
      placement: rec.placement,
      label: rec.label ?? '',
      notes: rec.notes ?? '',
    };
  },
  save: (v, ctx) => {
    const store = useBuiltEnvironmentStore.getState();
    if (ctx.existingId) {
      store.updatePowerLine(ctx.existingId, {
        placement: v.placement as PowerLinePlacement,
        label: s(v.label),
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'LineString') return;
    const lengthM = turf.length(turf.lineString(ctx.geometry.coordinates), {
      units: 'meters',
    });
    store.addPowerLine({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      placement: v.placement as PowerLinePlacement,
      lengthM,
      label: s(v.label),
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const buriedUtility: FieldSchema = {
  title: 'Buried utility',
  fields: [
    { name: 'kind', label: 'Kind', type: 'select', options: BE_BURIED_UTILITY_SUBTYPE_OPTIONS },
    { name: 'label', label: 'Label', type: 'text' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { kind: 'water_main', label: '', notes: '' },
  loadDefaults: (id) => {
    const rec = useBuiltEnvironmentStore
      .getState()
      .buriedUtilities.find((u) => u.id === id);
    if (!rec) return null;
    return { kind: rec.kind, label: rec.label ?? '', notes: rec.notes ?? '' };
  },
  save: (v, ctx) => {
    const store = useBuiltEnvironmentStore.getState();
    if (ctx.existingId) {
      store.updateBuriedUtility(ctx.existingId, {
        kind: v.kind as BuriedUtilityKind,
        label: s(v.label),
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'LineString') return;
    const lengthM = turf.length(turf.lineString(ctx.geometry.coordinates), {
      units: 'meters',
    });
    store.addBuriedUtility({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      kind: v.kind as BuriedUtilityKind,
      lengthM,
      label: s(v.label),
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const fence: FieldSchema = {
  title: 'Fence',
  fields: [
    { name: 'kind', label: 'Kind', type: 'select', options: BE_FENCE_SUBTYPE_OPTIONS },
    { name: 'label', label: 'Label', type: 'text' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { kind: 'page_wire', label: '', notes: '' },
  loadDefaults: (id) => {
    const rec = useBuiltEnvironmentStore.getState().fences.find((f) => f.id === id);
    if (!rec) return null;
    return { kind: rec.kind, label: rec.label ?? '', notes: rec.notes ?? '' };
  },
  save: (v, ctx) => {
    const store = useBuiltEnvironmentStore.getState();
    if (ctx.existingId) {
      store.updateFence(ctx.existingId, {
        kind: v.kind as FenceKind,
        label: s(v.label),
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'LineString') return;
    const lengthM = turf.length(turf.lineString(ctx.geometry.coordinates), {
      units: 'meters',
    });
    store.addFence({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      kind: v.kind as FenceKind,
      lengthM,
      label: s(v.label),
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const gate: FieldSchema = {
  title: 'Gate',
  fields: [
    { name: 'label', label: 'Label', type: 'text', placeholder: 'Main gate' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { label: '', notes: '' },
  loadDefaults: (id) => {
    const rec = useBuiltEnvironmentStore.getState().gates.find((g) => g.id === id);
    if (!rec) return null;
    return { label: rec.label ?? '', notes: rec.notes ?? '' };
  },
  save: (v, ctx) => {
    const store = useBuiltEnvironmentStore.getState();
    if (ctx.existingId) {
      store.updateGate(ctx.existingId, {
        label: s(v.label),
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'Point') return;
    const [lng, lat] = ctx.geometry.coordinates as [number, number];
    store.addGate({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      position: [lng, lat],
      label: s(v.label),
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const existingDriveway: FieldSchema = {
  title: 'Existing driveway',
  fields: [
    { name: 'surface', label: 'Surface', type: 'select', options: BE_DRIVEWAY_SURFACE_OPTIONS },
    { name: 'label', label: 'Label', type: 'text' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { surface: 'gravel', label: '', notes: '' },
  loadDefaults: (id) => {
    const rec = useBuiltEnvironmentStore
      .getState()
      .existingDriveways.find((d) => d.id === id);
    if (!rec) return null;
    return {
      surface: rec.surface,
      label: rec.label ?? '',
      notes: rec.notes ?? '',
    };
  },
  save: (v, ctx) => {
    const store = useBuiltEnvironmentStore.getState();
    if (ctx.existingId) {
      store.updateExistingDriveway(ctx.existingId, {
        surface: v.surface as DrivewaySurface,
        label: s(v.label),
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'LineString') return;
    const lengthM = turf.length(turf.lineString(ctx.geometry.coordinates), {
      units: 'meters',
    });
    store.addExistingDriveway({
      id: ctx.newId ?? crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      surface: v.surface as DrivewaySurface,
      lengthM,
      label: s(v.label),
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

export const FIELD_SCHEMAS: Record<AnnotationKind, FieldSchema> = {
  neighbourPin,
  household,
  accessRoad,
  frostPocket,
  hazardZone,
  contourLine,
  highPoint,
  drainageLine,
  erosionFlag,
  runoffPath,
  watercourse,
  waterbody,
  vegetation,
  pasture,
  conventionalCrop,
  soilSample,
  swotTag,
  sector,
  building,
  well,
  septic,
  powerLine,
  buriedUtility,
  fence,
  gate,
  existingDriveway,
};

/**
 * FIELD_REMOVERS — companion dispatch table to FIELD_SCHEMAS. Maps each
 * AnnotationKind to its namespace store's remove fn. Used by the
 * shared `<AnnotationFormSlideUp>` when an active form carries
 * `discardOnCancel: true` (set by post-draw flows): Cancel then deletes
 * the provisional stub `createWithDefaults` wrote, instead of leaving a
 * default-labeled phantom in the namespace store.
 *
 * The `Record<AnnotationKind, …>` shape acts as an exhaustiveness check:
 * adding a new kind to AnnotationKind without a remover is a build
 * error. frostPocket reuses externalForces' `removeHazard` because its
 * data lives in the hazards collection (see schema above).
 */
export const FIELD_REMOVERS: Readonly<Record<AnnotationKind, (id: string) => void>> = {
  neighbourPin: (id) => useHumanContextStore.getState().removeNeighbour(id),
  household: (id) => useHumanContextStore.getState().removeHousehold(id),
  accessRoad: (id) => useHumanContextStore.getState().removeAccessRoad(id),
  frostPocket: (id) => useExternalForcesStore.getState().removeHazard(id),
  hazardZone: (id) => useExternalForcesStore.getState().removeHazard(id),
  contourLine: (id) => useTopographyStore.getState().removeContour(id),
  highPoint: (id) => useTopographyStore.getState().removeHighPoint(id),
  drainageLine: (id) => useTopographyStore.getState().removeDrainageLine(id),
  erosionFlag: (id) => useTopographyStore.getState().removeErosionFlag(id),
  runoffPath: (id) => useTopographyStore.getState().removeRunoffPath(id),
  watercourse: (id) => useWaterSystemsStore.getState().removeWatercourse(id),
  waterbody: (id) => useWaterSystemsStore.getState().removeWaterbody(id),
  vegetation: (id) => useVegetationStore.getState().removePatch(id),
  pasture: (id) => usePastureStore.getState().removePasture(id),
  conventionalCrop: (id) =>
    useConventionalCropStore.getState().removeConventionalCrop(id),
  soilSample: (id) => useSoilSampleStore.getState().deleteSample(id),
  swotTag: (id) => useSwotStore.getState().removeSwot(id),
  sector: (id) => useExternalForcesStore.getState().removeSector(id),
  building: (id) => useBuiltEnvironmentStore.getState().removeBuilding(id),
  well: (id) => useBuiltEnvironmentStore.getState().removeWell(id),
  septic: (id) => useBuiltEnvironmentStore.getState().removeSeptic(id),
  powerLine: (id) => useBuiltEnvironmentStore.getState().removePowerLine(id),
  buriedUtility: (id) => useBuiltEnvironmentStore.getState().removeBuriedUtility(id),
  fence: (id) => useBuiltEnvironmentStore.getState().removeFence(id),
  gate: (id) => useBuiltEnvironmentStore.getState().removeGate(id),
  existingDriveway: (id) => useBuiltEnvironmentStore.getState().removeExistingDriveway(id),
};
