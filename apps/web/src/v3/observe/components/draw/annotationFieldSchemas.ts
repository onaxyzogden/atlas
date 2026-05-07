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
import { useTopographyStore } from '../../../../store/topographyStore.js';
import { useExternalForcesStore } from '../../../../store/externalForcesStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { useEcologyStore } from '../../../../store/ecologyStore.js';
import { useSwotStore, type SwotBucket } from '../../../../store/swotStore.js';
import { useSoilSampleStore } from '../../../../store/soilSampleStore.js';

export type AnnotationKind =
  | 'neighbourPin'
  | 'household'
  | 'accessRoad'
  | 'frostPocket'
  | 'hazardZone'
  | 'contourLine'
  | 'highPoint'
  | 'drainageLine'
  | 'watercourse'
  | 'ecologyZone'
  | 'soilSample'
  | 'swotTag';

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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
      projectId: ctx.projectId,
      position: [lng, lat],
      label: s(v.label),
      householdSize: householdSize ?? undefined,
      notes: s(v.notes),
      createdAt: nowIso(),
    });
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
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
      id: crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      kind: v.kind as 'stream' | 'creek' | 'ditch' | 'other',
      perennial: Boolean(v.perennial),
      notes: s(v.notes),
      createdAt: nowIso(),
    });
  },
};

const ecologyZone: FieldSchema = {
  title: 'Ecology zone',
  fields: [
    {
      name: 'dominantStage',
      label: 'Dominant stage',
      type: 'select',
      options: [
        { value: 'disturbed', label: 'Disturbed' },
        { value: 'pioneer', label: 'Pioneer' },
        { value: 'mid', label: 'Mid-succession' },
        { value: 'late', label: 'Late-succession' },
        { value: 'climax', label: 'Climax' },
      ],
    },
    { name: 'label', label: 'Label', type: 'text', placeholder: 'Mature forest' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ],
  defaults: { dominantStage: 'mid', label: '', notes: '' },
  loadDefaults: (id) => {
    const rec = useEcologyStore.getState().ecologyZones.find((z) => z.id === id);
    if (!rec) return null;
    return {
      dominantStage: rec.dominantStage,
      label: rec.label ?? '',
      notes: rec.notes ?? '',
    };
  },
  save: (v, ctx) => {
    const store = useEcologyStore.getState();
    if (ctx.existingId) {
      store.updateEcologyZone(ctx.existingId, {
        dominantStage: v.dominantStage as never,
        label: s(v.label),
        notes: s(v.notes),
      });
      return;
    }
    if (!ctx.geometry || ctx.geometry.type !== 'Polygon') return;
    store.addEcologyZone({
      id: crypto.randomUUID(),
      projectId: ctx.projectId,
      geometry: ctx.geometry,
      dominantStage: v.dominantStage as never,
      label: s(v.label),
      notes: s(v.notes),
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
      projectId: ctx.projectId,
      bucket: ctx.bucket,
      title: (v.title as string) || 'SWOT tag',
      body: s(v.body),
      position: [lng, lat],
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
  watercourse,
  ecologyZone,
  soilSample,
  swotTag,
};
