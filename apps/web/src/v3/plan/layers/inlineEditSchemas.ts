/**
 * inlineEditSchemas — per-kind builders that produce an `InlineFormPayload`
 * (minus the anchor) for editing a placed Plan-stage feature.
 *
 * Mirrors the field schemas already present in each draw tool's
 * `onComplete` so a click-to-edit on a placed feature behaves the same as
 * the post-draw popover.
 *
 * Each builder calls the matching store's `update*` mutator on Save.
 * `onCancel` is a no-op — the record already exists; cancelling the edit
 * just closes the popover. (Contrast the draw-tool flow, where Cancel
 * deletes the just-drawn skeleton.)
 */

import type { InlineFormPayload } from '../draw/inlineFormStore.js';
import {
  ZONE_CATEGORY_CONFIG,
  type LandZone,
  type ZoneCategory,
} from '../../../store/zoneStore.js';
import {
  PATH_TYPE_CONFIG,
  type DesignPath,
  type PathType,
} from '../../../store/pathStore.js';
import { type CropArea, type CropAreaType } from '../../../store/cropStore.js';
import {
  type FenceType,
  type LivestockSpecies,
  type Paddock,
  type PastureQuality,
} from '../../../store/livestockStore.js';
import {
  type FertilityInfra,
  type FertilityInfraType,
} from '../../../store/closedLoopStore.js';
import { type Guild } from '../../../store/polycultureStore.js';
import {
  type CatchmentSurface,
  type StorageNodeKind,
  type WaterNode,
} from '../../../store/waterSystemsStore.js';
import {
  UTILITY_RUN_CONFIG,
  type UtilityRun,
  type UtilityRunKind,
} from '../../../store/utilityRunStore.js';
import {
  SETBACK_PURPOSE_CONFIG,
  type SetbackPurpose,
  type SetbackRing,
} from '../../../store/setbackStore.js';
import {
  FLOW_KIND_CONFIG,
  type FlowConnector,
  type FlowKind,
} from '../../../store/flowConnectorStore.js';
import {
  TRANSECT_CADENCE_LABEL,
  TRANSECT_MONITORING_CONFIG,
  type MonitoringTransect,
  type TransectCadence,
  type TransectMonitoringKind,
} from '../../../store/monitoringTransectStore.js';
import {
  DEFAULT_COEFF,
  STORAGE_LABEL,
  SURFACE_LABEL,
} from '../cards/water-management/waterMath.js';

// ---------- Zone ----------

const ZONE_CATEGORY_OPTIONS: { value: ZoneCategory; label: string }[] = (
  Object.keys(ZONE_CATEGORY_CONFIG) as ZoneCategory[]
).map((k) => ({ value: k, label: ZONE_CATEGORY_CONFIG[k].label }));

const Z_OPTIONS = [
  { value: '0', label: 'Z0 — Home centre' },
  { value: '1', label: 'Z1 — Daily touch' },
  { value: '2', label: 'Z2 — Weekly touch' },
  { value: '3', label: 'Z3 — Main crops / orchard' },
  { value: '4', label: 'Z4 — Forage / managed' },
  { value: '5', label: 'Z5 — Wilderness' },
];

export function buildZoneEditSchema(
  z: LandZone,
  updateZone: (id: string, updates: Partial<LandZone>) => void,
): Omit<InlineFormPayload, 'anchor'> {
  return {
    title: 'Edit zone',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true },
      {
        key: 'category',
        label: 'Category',
        kind: 'select',
        required: true,
        options: ZONE_CATEGORY_OPTIONS,
      },
      {
        key: 'permacultureZone',
        label: 'Z-level',
        kind: 'select',
        required: true,
        options: Z_OPTIONS,
      },
    ],
    initial: {
      name: z.name,
      category: z.category,
      permacultureZone: String(z.permacultureZone ?? 2),
    },
    onSave: (values) => {
      const cat = values.category as ZoneCategory;
      const zNum = Number(values.permacultureZone);
      updateZone(z.id, {
        name: String(values.name ?? z.name).trim() || z.name,
        category: cat,
        color: ZONE_CATEGORY_CONFIG[cat].color,
        permacultureZone: (Number.isFinite(zNum)
          ? Math.max(0, Math.min(5, Math.round(zNum)))
          : 2) as 0 | 1 | 2 | 3 | 4 | 5,
      });
    },
    onCancel: () => {
      /* no-op — record already exists */
    },
  };
}

// ---------- Crop ----------

const CROP_TYPE_OPTIONS: { value: CropAreaType; label: string }[] = [
  { value: 'orchard',           label: 'Orchard' },
  { value: 'food_forest',       label: 'Food forest' },
  { value: 'row_crop',          label: 'Row crop' },
  { value: 'garden_bed',        label: 'Garden bed' },
  { value: 'market_garden',     label: 'Market garden' },
  { value: 'silvopasture',      label: 'Silvopasture' },
  { value: 'windbreak',         label: 'Windbreak' },
  { value: 'shelterbelt',       label: 'Shelterbelt' },
  { value: 'nursery',           label: 'Nursery' },
  { value: 'pollinator_strip',  label: 'Pollinator strip' },
];

const CROP_TYPE_COLOR: Record<CropAreaType, string> = {
  orchard:          '#7aae3c',
  food_forest:      '#3d8a3d',
  row_crop:         '#c0a85c',
  garden_bed:       '#9bc15a',
  market_garden:    '#d6b85a',
  silvopasture:     '#6b9b6b',
  windbreak:        '#5d8a8d',
  shelterbelt:      '#7c9b7c',
  nursery:          '#a8c97f',
  pollinator_strip: '#d68bd0',
};

const CROP_WATER_OPTIONS = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
];

const CROP_IRRIGATION_OPTIONS = [
  { value: 'rain_fed',  label: 'Rain-fed' },
  { value: 'drip',      label: 'Drip' },
  { value: 'sprinkler', label: 'Sprinkler' },
  { value: 'flood',     label: 'Flood' },
  { value: 'none',      label: 'None' },
];

export function buildCropEditSchema(
  c: CropArea,
  updateCropArea: (id: string, updates: Partial<CropArea>) => void,
): Omit<InlineFormPayload, 'anchor'> {
  return {
    title: 'Edit crop area',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true },
      {
        key: 'type',
        label: 'Type',
        kind: 'select',
        required: true,
        options: CROP_TYPE_OPTIONS,
      },
      {
        key: 'waterDemand',
        label: 'Water demand',
        kind: 'select',
        required: true,
        options: CROP_WATER_OPTIONS,
      },
      {
        key: 'irrigationType',
        label: 'Irrigation',
        kind: 'select',
        required: true,
        options: CROP_IRRIGATION_OPTIONS,
      },
    ],
    initial: {
      name: c.name,
      type: c.type,
      waterDemand: c.waterDemand,
      irrigationType: c.irrigationType,
    },
    onSave: (values) => {
      const t = values.type as CropAreaType;
      updateCropArea(c.id, {
        name: String(values.name ?? c.name).trim() || c.name,
        type: t,
        color: CROP_TYPE_COLOR[t] ?? CROP_TYPE_COLOR.orchard,
        waterDemand: values.waterDemand as 'low' | 'medium' | 'high',
        irrigationType: values.irrigationType as
          | 'drip'
          | 'sprinkler'
          | 'flood'
          | 'rain_fed'
          | 'none',
      });
    },
    onCancel: () => {
      /* no-op */
    },
  };
}

// ---------- Paddock ----------

const PADDOCK_SPECIES_OPTIONS: { value: LivestockSpecies; label: string }[] = [
  { value: 'sheep',       label: 'Sheep' },
  { value: 'cattle',      label: 'Cattle' },
  { value: 'goats',       label: 'Goats' },
  { value: 'poultry',     label: 'Poultry' },
  { value: 'pigs',        label: 'Pigs' },
  { value: 'horses',      label: 'Horses' },
  { value: 'ducks_geese', label: 'Ducks & geese' },
  { value: 'rabbits',     label: 'Rabbits' },
  { value: 'bees',        label: 'Bees' },
];

const PADDOCK_FENCE_OPTIONS: { value: FenceType; label: string }[] = [
  { value: 'electric',    label: 'Electric' },
  { value: 'post_wire',   label: 'Post & wire' },
  { value: 'post_rail',   label: 'Post & rail' },
  { value: 'woven_wire',  label: 'Woven wire' },
  { value: 'temporary',   label: 'Temporary' },
  { value: 'none',        label: 'None' },
];

const PADDOCK_SPECIES_COLOR: Record<LivestockSpecies, string> = {
  sheep:       '#c8a97a',
  cattle:      '#a07050',
  goats:       '#b58c5e',
  poultry:     '#d6a35a',
  pigs:        '#9b8a7a',
  horses:      '#6b5a45',
  ducks_geese: '#c8b070',
  rabbits:     '#a0a08a',
  bees:        '#d4b94a',
};

const PASTURE_QUALITY_OPTIONS: { value: PastureQuality; label: string }[] = [
  { value: 'poor',      label: 'Poor (~0.7 AUE/ha)' },
  { value: 'fair',      label: 'Fair (~1.2 AUE/ha)' },
  { value: 'good',      label: 'Good (~2.5 AUE/ha)' },
  { value: 'excellent', label: 'Excellent (3.7+ AUE/ha)' },
];

export function buildPaddockEditSchema(
  pd: Paddock,
  updatePaddock: (id: string, updates: Partial<Paddock>) => void,
): Omit<InlineFormPayload, 'anchor'> {
  const primarySpecies = (pd.species[0] ?? 'sheep') as LivestockSpecies;
  return {
    title: 'Edit paddock',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true },
      {
        key: 'species',
        label: 'Primary species',
        kind: 'select',
        required: true,
        options: PADDOCK_SPECIES_OPTIONS,
      },
      {
        key: 'fencing',
        label: 'Fencing',
        kind: 'select',
        required: true,
        options: PADDOCK_FENCE_OPTIONS,
      },
      {
        key: 'stockingDensity',
        label: 'Stocking (head/ha)',
        kind: 'text',
        placeholder: 'e.g. 12',
      },
      {
        key: 'pastureQuality',
        label: 'Pasture quality',
        kind: 'select',
        options: [
          { value: '', label: '— not assessed —' },
          ...PASTURE_QUALITY_OPTIONS,
        ],
      },
    ],
    initial: {
      name: pd.name,
      species: primarySpecies,
      fencing: pd.fencing,
      stockingDensity:
        pd.stockingDensity == null ? '' : String(pd.stockingDensity),
      pastureQuality: pd.pastureQuality ?? '',
    },
    onSave: (values) => {
      const sp = values.species as LivestockSpecies;
      const raw = String(values.stockingDensity ?? '').trim();
      const density =
        raw === '' ? null : Number.isFinite(Number(raw)) ? Number(raw) : null;
      const pqRaw = String(values.pastureQuality ?? '').trim();
      const pq: PastureQuality | undefined =
        pqRaw === 'poor' || pqRaw === 'fair' || pqRaw === 'good' || pqRaw === 'excellent'
          ? pqRaw
          : undefined;
      updatePaddock(pd.id, {
        name: String(values.name ?? pd.name).trim() || pd.name,
        color: PADDOCK_SPECIES_COLOR[sp] ?? PADDOCK_SPECIES_COLOR.sheep,
        species: [sp],
        fencing: values.fencing as FenceType,
        stockingDensity: density,
        pastureQuality: pq,
      });
    },
    onCancel: () => {
      /* no-op */
    },
  };
}

// ---------- Path ----------

const PATH_TYPE_OPTIONS: { value: PathType; label: string }[] = (
  Object.keys(PATH_TYPE_CONFIG) as PathType[]
).map((k) => ({ value: k, label: PATH_TYPE_CONFIG[k].label }));

const PATH_FREQUENCY_OPTIONS: {
  value: NonNullable<DesignPath['usageFrequency']>;
  label: string;
}[] = [
  { value: 'daily',      label: 'Daily' },
  { value: 'weekly',     label: 'Weekly' },
  { value: 'occasional', label: 'Occasional' },
  { value: 'rare',       label: 'Rare' },
];

export function buildPathEditSchema(
  p: DesignPath,
  updatePath: (id: string, updates: Partial<DesignPath>) => void,
): Omit<InlineFormPayload, 'anchor'> {
  return {
    title: 'Edit path',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true },
      {
        key: 'type',
        label: 'Type',
        kind: 'select',
        required: true,
        options: PATH_TYPE_OPTIONS,
      },
      {
        key: 'usageFrequency',
        label: 'Frequency',
        kind: 'select',
        required: true,
        options: PATH_FREQUENCY_OPTIONS,
      },
    ],
    initial: {
      name: p.name,
      type: p.type,
      usageFrequency: p.usageFrequency ?? 'weekly',
    },
    onSave: (values) => {
      const t = values.type as PathType;
      updatePath(p.id, {
        name: String(values.name ?? p.name).trim() || p.name,
        type: t,
        color: PATH_TYPE_CONFIG[t].color,
        usageFrequency: values.usageFrequency as DesignPath['usageFrequency'],
      });
    },
    onCancel: () => {
      /* no-op */
    },
  };
}

// ---------- Fertility ----------

const FERTILITY_TYPE_OPTIONS: { value: FertilityInfraType; label: string }[] = [
  { value: 'composter',           label: 'Composter' },
  { value: 'hugelkultur',         label: 'Hugelkultur' },
  { value: 'biochar',             label: 'Biochar kiln' },
  { value: 'worm_bin',            label: 'Worm bin' },
  { value: 'cover_crop',          label: 'Cover crop' },
  { value: 'chop_and_drop',       label: 'Chop & drop' },
  { value: 'dynamic_accumulator', label: 'Dynamic accumulator' },
  { value: 'rotational_grazing',  label: 'Rotational grazing' },
];

export function buildFertilityEditSchema(
  f: FertilityInfra,
  updateFertilityInfra: (id: string, updates: Partial<FertilityInfra>) => void,
): Omit<InlineFormPayload, 'anchor'> {
  return {
    title: 'Edit fertility unit',
    fields: [
      {
        key: 'type',
        label: 'Type',
        kind: 'select',
        required: true,
        options: FERTILITY_TYPE_OPTIONS,
      },
      {
        key: 'scaleNote',
        label: 'Scale',
        kind: 'text',
        placeholder: 'e.g. 3 m³ pile',
      },
    ],
    initial: { type: f.type, scaleNote: f.scaleNote ?? '' },
    onSave: (values) => {
      updateFertilityInfra(f.id, {
        type: values.type as FertilityInfraType,
        scaleNote: String(values.scaleNote ?? '').trim() || undefined,
      });
    },
    onCancel: () => {
      /* no-op */
    },
  };
}

// ---------- Guild ----------
//
// On-map quick-edit for a placed guild. Member composition + anchor species
// stays in the slide-up GuildSpatialBuilderCard (the canvas is not the right
// surface for editing 7 plant layers); the popover only exposes the two
// fields a steward typically wants when they tap a guild marker on the map.

export function buildGuildEditSchema(
  g: Guild,
  updateGuild: (id: string, updates: Partial<Guild>) => void,
): Omit<InlineFormPayload, 'anchor'> {
  return {
    title: 'Edit guild',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true },
      {
        key: 'notes',
        label: 'Notes',
        kind: 'text',
        placeholder: 'e.g. north hedgerow',
      },
    ],
    initial: { name: g.name, notes: g.notes ?? '' },
    onSave: (values) => {
      updateGuild(g.id, {
        name: String(values.name ?? g.name).trim() || g.name,
        notes: String(values.notes ?? '').trim() || undefined,
      });
    },
    onCancel: () => {
      /* no-op */
    },
  };
}

// ---------- Water node ----------
//
// Kind-discriminated edit popover. Each WaterNodeKind exposes only the
// scalar fields that drive its math:
//   - catchment → surface + runoff coeff (area is derived from geometry)
//   - storage   → storage kind + capacity
//   - swale     → width + depth (length is derived from geometry)
//   - sink      → name only
// Overflow targeting + phase/enterprise tagging live in the slide-up
// WaterNetworkCard, which has the full graph context.

const WATER_SURFACE_OPTIONS: { value: CatchmentSurface; label: string }[] = (
  Object.keys(SURFACE_LABEL) as CatchmentSurface[]
).map((k) => ({ value: k, label: SURFACE_LABEL[k] }));

const WATER_STORAGE_OPTIONS: { value: StorageNodeKind; label: string }[] = (
  Object.keys(STORAGE_LABEL) as StorageNodeKind[]
).map((k) => ({ value: k, label: STORAGE_LABEL[k] }));

export function buildWaterNodeEditSchema(
  n: WaterNode,
  updateWaterNode: (id: string, updates: Partial<WaterNode>) => void,
): Omit<InlineFormPayload, 'anchor'> {
  if (n.kind === 'catchment') {
    return {
      title: 'Edit catchment',
      fields: [
        { key: 'name', label: 'Name', kind: 'text', required: true },
        {
          key: 'surface',
          label: 'Surface',
          kind: 'select',
          required: true,
          options: WATER_SURFACE_OPTIONS,
        },
        {
          key: 'runoffCoeff',
          label: 'Runoff coeff',
          kind: 'number',
          required: true,
        },
      ],
      initial: {
        name: n.name,
        surface: n.surface ?? 'metal_roof',
        runoffCoeff:
          n.runoffCoeff ?? DEFAULT_COEFF[n.surface ?? 'metal_roof'],
      },
      onSave: (values) => {
        const nextSurface = values.surface as CatchmentSurface;
        const raw = Number(values.runoffCoeff);
        updateWaterNode(n.id, {
          name: String(values.name ?? n.name).trim() || n.name,
          surface: nextSurface,
          runoffCoeff: Number.isFinite(raw) ? raw : DEFAULT_COEFF[nextSurface],
        });
      },
      onCancel: () => {
        /* no-op */
      },
    };
  }
  if (n.kind === 'storage') {
    return {
      title: 'Edit storage',
      fields: [
        { key: 'name', label: 'Name', kind: 'text', required: true },
        {
          key: 'storageKind',
          label: 'Type',
          kind: 'select',
          required: true,
          options: WATER_STORAGE_OPTIONS,
        },
        {
          key: 'capacityL',
          label: 'Capacity',
          kind: 'number',
          required: true,
          suffix: 'L',
        },
        {
          key: 'householdLpd',
          label: 'Household use',
          kind: 'number',
          suffix: 'L/day',
          placeholder: 'e.g. 600',
        },
        {
          key: 'daysOffGrid',
          label: 'Off-grid days',
          kind: 'number',
          suffix: 'd',
          placeholder: 'e.g. 7',
        },
      ],
      initial: {
        name: n.name,
        storageKind: n.storageKind ?? 'cistern',
        capacityL: n.capacityL ?? 0,
        householdLpd: n.householdLpd ?? '',
        daysOffGrid: n.daysOffGrid ?? '',
      },
      onSave: (values) => {
        const cap = Number(values.capacityL);
        const hh = Number(values.householdLpd);
        const dog = Number(values.daysOffGrid);
        updateWaterNode(n.id, {
          name: String(values.name ?? n.name).trim() || n.name,
          storageKind: values.storageKind as StorageNodeKind,
          capacityL: Number.isFinite(cap) ? cap : 0,
          householdLpd: Number.isFinite(hh) && hh > 0 ? hh : undefined,
          daysOffGrid: Number.isFinite(dog) && dog > 0 ? dog : undefined,
        });
      },
      onCancel: () => {
        /* no-op */
      },
    };
  }
  if (n.kind === 'swale') {
    return {
      title: 'Edit swale',
      fields: [
        { key: 'name', label: 'Name', kind: 'text', required: true },
        {
          key: 'swaleWidthM',
          label: 'Width',
          kind: 'number',
          required: true,
          suffix: 'm',
        },
        {
          key: 'swaleDepthM',
          label: 'Depth',
          kind: 'number',
          required: true,
          suffix: 'm',
        },
      ],
      initial: {
        name: n.name,
        swaleWidthM: n.swaleWidthM ?? 0.6,
        swaleDepthM: n.swaleDepthM ?? 0.4,
      },
      onSave: (values) => {
        const w = Number(values.swaleWidthM);
        const d = Number(values.swaleDepthM);
        updateWaterNode(n.id, {
          name: String(values.name ?? n.name).trim() || n.name,
          swaleWidthM: Number.isFinite(w) ? w : undefined,
          swaleDepthM: Number.isFinite(d) ? d : undefined,
        });
      },
      onCancel: () => {
        /* no-op */
      },
    };
  }
  // sink
  return {
    title: 'Edit sink',
    fields: [{ key: 'name', label: 'Name', kind: 'text', required: true }],
    initial: { name: n.name },
    onSave: (values) => {
      updateWaterNode(n.id, {
        name: String(values.name ?? n.name).trim() || n.name,
      });
    },
    onCancel: () => {
      /* no-op */
    },
  };
}

// ---------- Utility run ----------

const UTILITY_KIND_OPTIONS: { value: UtilityRunKind; label: string }[] = (
  Object.keys(UTILITY_RUN_CONFIG) as UtilityRunKind[]
).map((k) => ({ value: k, label: UTILITY_RUN_CONFIG[k].label }));

export function buildUtilityRunEditSchema(
  r: UtilityRun,
  updateRun: (id: string, patch: Partial<UtilityRun>) => void,
): Omit<InlineFormPayload, 'anchor'> {
  return {
    title: 'Edit utility run',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true },
      {
        key: 'kind',
        label: 'Kind',
        kind: 'select',
        required: true,
        options: UTILITY_KIND_OPTIONS,
      },
    ],
    initial: { name: r.name, kind: r.kind },
    onSave: (values) => {
      const nextKind = values.kind as UtilityRunKind;
      updateRun(r.id, {
        name: String(values.name ?? r.name).trim() || r.name,
        kind: nextKind,
        color: UTILITY_RUN_CONFIG[nextKind].color,
      });
    },
    onCancel: () => {
      /* no-op */
    },
  };
}

// ---------- Setback ring ----------
//
// Editing a setback ring re-anchors it to its source feature's *current*
// position when the steward saves — even if they didn't change the
// distance, since the source may have moved since the ring was placed.
// `rebuffer` is supplied by the caller (PlanDataLayers) and closes over
// the live source geometry; if the source has been deleted, it returns
// undefined and we keep the existing materialised geometry.

const SETBACK_PURPOSE_OPTIONS: { value: SetbackPurpose; label: string }[] = (
  Object.keys(SETBACK_PURPOSE_CONFIG) as SetbackPurpose[]
).map((k) => ({ value: k, label: SETBACK_PURPOSE_CONFIG[k].label }));

export function buildSetbackRingEditSchema(
  r: SetbackRing,
  updateRing: (id: string, patch: Partial<SetbackRing>) => void,
  rebuffer: (
    distanceM: number,
  ) => GeoJSON.Polygon | GeoJSON.MultiPolygon | undefined,
): Omit<InlineFormPayload, 'anchor'> {
  return {
    title: 'Edit setback ring',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true },
      {
        key: 'purpose',
        label: 'Purpose',
        kind: 'select',
        required: true,
        options: SETBACK_PURPOSE_OPTIONS,
      },
      {
        key: 'distanceM',
        label: 'Distance',
        kind: 'number',
        required: true,
        suffix: 'm',
      },
    ],
    initial: {
      name: r.name,
      purpose: r.purpose,
      distanceM: r.distanceM,
    },
    onSave: (values) => {
      const nextPurpose = values.purpose as SetbackPurpose;
      const rawDist = Number(values.distanceM);
      const distanceM =
        Number.isFinite(rawDist) && rawDist > 0 ? rawDist : r.distanceM;
      const nextGeom = rebuffer(distanceM);
      updateRing(r.id, {
        name: String(values.name ?? r.name).trim() || r.name,
        purpose: nextPurpose,
        distanceM,
        color: SETBACK_PURPOSE_CONFIG[nextPurpose].color,
        ...(nextGeom ? { geometry: nextGeom } : {}),
      });
    },
    onCancel: () => {
      /* no-op */
    },
  };
}

// ---------- Flow connector ----------

const FLOW_KIND_OPTIONS: { value: FlowKind; label: string }[] = (
  Object.keys(FLOW_KIND_CONFIG) as FlowKind[]
).map((k) => ({ value: k, label: FLOW_KIND_CONFIG[k].label }));

export function buildFlowConnectorEditSchema(
  c: FlowConnector,
  updateConnector: (id: string, patch: Partial<FlowConnector>) => void,
): Omit<InlineFormPayload, 'anchor'> {
  return {
    title: 'Edit flow connector',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true },
      {
        key: 'flowKind',
        label: 'Flow',
        kind: 'select',
        required: true,
        options: FLOW_KIND_OPTIONS,
      },
      {
        key: 'fromName',
        label: 'From',
        kind: 'text',
        placeholder: 'e.g., Kitchen scraps',
      },
      {
        key: 'toName',
        label: 'To',
        kind: 'text',
        placeholder: 'e.g., Orchard guild',
      },
    ],
    initial: {
      name: c.name,
      flowKind: c.flowKind,
      fromName: c.fromName ?? '',
      toName: c.toName ?? '',
    },
    onSave: (values) => {
      const nextKind = values.flowKind as FlowKind;
      updateConnector(c.id, {
        name: String(values.name ?? c.name).trim() || c.name,
        flowKind: nextKind,
        color: FLOW_KIND_CONFIG[nextKind].color,
        fromName: String(values.fromName ?? '').trim() || undefined,
        toName: String(values.toName ?? '').trim() || undefined,
      });
    },
    onCancel: () => {
      /* no-op */
    },
  };
}

// ---------- Monitoring transect ----------

const TRANSECT_KIND_OPTIONS: {
  value: TransectMonitoringKind;
  label: string;
}[] = (
  Object.keys(TRANSECT_MONITORING_CONFIG) as TransectMonitoringKind[]
).map((k) => ({ value: k, label: TRANSECT_MONITORING_CONFIG[k].label }));

const TRANSECT_CADENCE_OPTIONS: { value: TransectCadence; label: string }[] = (
  Object.keys(TRANSECT_CADENCE_LABEL) as TransectCadence[]
).map((c) => ({ value: c, label: TRANSECT_CADENCE_LABEL[c] }));

export function buildMonitoringTransectEditSchema(
  t: MonitoringTransect,
  updateTransect: (id: string, patch: Partial<MonitoringTransect>) => void,
): Omit<InlineFormPayload, 'anchor'> {
  return {
    title: 'Edit monitoring transect',
    fields: [
      { key: 'name', label: 'Name', kind: 'text', required: true },
      {
        key: 'monitoringKind',
        label: 'Tracking',
        kind: 'select',
        required: true,
        options: TRANSECT_KIND_OPTIONS,
      },
      {
        key: 'cadence',
        label: 'Cadence',
        kind: 'select',
        required: true,
        options: TRANSECT_CADENCE_OPTIONS,
      },
    ],
    initial: {
      name: t.name,
      monitoringKind: t.monitoringKind,
      cadence: t.cadence,
    },
    onSave: (values) => {
      const nextKind = values.monitoringKind as TransectMonitoringKind;
      const nextCadence = values.cadence as TransectCadence;
      updateTransect(t.id, {
        name: String(values.name ?? t.name).trim() || t.name,
        monitoringKind: nextKind,
        color: TRANSECT_MONITORING_CONFIG[nextKind].color,
        cadence: nextCadence,
      });
    },
    onCancel: () => {
      /* no-op */
    },
  };
}
