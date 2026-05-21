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

import type {
  BuiltEnvironmentEntity,
  BuiltEnvironmentState,
} from '@ogden/shared';
import { getBuiltEnvironmentKind } from '@ogden/shared';
import type { InlineFormPayload, FieldSpec } from '../draw/inlineFormStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';
import { createFootprintPolygon } from '../../../features/structures/footprints.js';
import {
  BUILDING_SUBTYPE_OPTIONS as BE_BUILDING_SUBTYPE_OPTIONS,
  BUILDING_PHASE_OPTIONS as BE_BUILDING_PHASE_OPTIONS,
  WELL_KIND_OPTIONS as BE_WELL_KIND_OPTIONS,
  SEPTIC_SUBTYPE_OPTIONS as BE_SEPTIC_SUBTYPE_OPTIONS,
  POWER_LINE_PLACEMENT_OPTIONS as BE_POWER_LINE_PLACEMENT_OPTIONS,
  BURIED_UTILITY_SUBTYPE_OPTIONS as BE_BURIED_UTILITY_SUBTYPE_OPTIONS,
  FENCE_SUBTYPE_OPTIONS as BE_FENCE_SUBTYPE_OPTIONS,
  DRIVEWAY_SURFACE_OPTIONS as BE_DRIVEWAY_SURFACE_OPTIONS,
} from '../../builtEnvironment/schemas/beSchemaRegistry.js';
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
import { computePaddockRecommendedStocking } from '../../../features/livestock/livestockAnalysis.js';
import { LIVESTOCK_SPECIES } from '../../../features/livestock/speciesData.js';
import {
  type FertilityInfra,
  type FertilityInfraType,
} from '../../../store/closedLoopStore.js';
import { type Guild } from '../../../store/polycultureStore.js';
import { resolveValidPresets, findGuildPreset } from '../../../data/guildPresets.js';
import { PLANT_DATABASE } from '../../../data/plantCatalog.js';
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
  MATERIAL_KIND_CONFIG,
  type MaterialFlow,
  type MaterialKind,
} from '../../../store/closedLoopStore.js';
import type { FlowEndpointOption } from '../../../features/plan/useFlowEndpointOptions.js';
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
import type { DesignElement } from '../../../store/designElementsStore.js';
import { TREE_PLANTING_KINDS } from '../../../features/vegetation/treePlantingSpineSync.js';

// ---------- Silvopasture re-pin (shared) ----------
//
// Optional host selector appended to the crop / paddock / guild edit
// schemas so a member can be explicitly re-pinned to a silvopasture
// host (or set back to `Auto (spatial)` = unpinned). Options come from
// `listHostsForSelection(resolveSilvopastureHosts(...))` at the call
// site (the builders stay pure / store-free). When the host list is
// empty the field is omitted entirely.

export type SilvopastureHostOption = { value: string; label: string };

function silvopastureField(hostOptions: SilvopastureHostOption[]): FieldSpec[] {
  if (hostOptions.length === 0) return [];
  return [
    {
      key: 'silvopastureId',
      label: 'Silvopasture host',
      kind: 'select',
      options: [{ value: '', label: 'Auto (spatial)' }, ...hostOptions],
    },
  ];
}

function silvopastureSavePatch(
  hostOptions: SilvopastureHostOption[],
  values: Record<string, unknown>,
): { silvopastureId?: string } {
  if (hostOptions.length === 0) return {};
  const raw = String(values.silvopastureId ?? '').trim();
  return { silvopastureId: raw || undefined };
}

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
  hostOptions: SilvopastureHostOption[] = [],
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
      ...silvopastureField(hostOptions),
    ],
    initial: {
      name: c.name,
      type: c.type,
      waterDemand: c.waterDemand,
      irrigationType: c.irrigationType,
      silvopastureId: c.silvopastureId ?? '',
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
        ...silvopastureSavePatch(hostOptions, values),
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

/**
 * Format the area-based stocking recommendation for a paddock. Reuses the
 * canonical `computePaddockRecommendedStocking` head/ha formula (pasture-
 * quality multiplier × species `typicalStocking`) and multiplies by paddock
 * area to surface a concrete total. Returns `''` when pasture quality is
 * unassessed so the field renders its placeholder.
 */
function formatPaddockStockingRecommendation(
  species: LivestockSpecies,
  pastureQuality: PastureQuality | undefined,
  areaM2: number,
): string {
  if (!pastureQuality) return '';
  const perHa = computePaddockRecommendedStocking({
    species: [species],
    pastureQuality,
  } as Paddock);
  if (perHa <= 0) return '';
  const areaHa = areaM2 / 10_000;
  const total = Math.round(perHa * areaHa);
  const unit = LIVESTOCK_SPECIES[species]?.stockingUnit ?? 'head';
  return `${total} ${unit} (${perHa}/ha)`;
}

export function buildPaddockEditSchema(
  pd: Paddock,
  updatePaddock: (id: string, updates: Partial<Paddock>) => void,
  hostOptions: SilvopastureHostOption[] = [],
): Omit<InlineFormPayload, 'anchor'> {
  const primarySpecies = (pd.species?.[0] ?? 'sheep') as LivestockSpecies;
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
        key: 'pastureQuality',
        label: 'Pasture quality',
        kind: 'select',
        options: [
          { value: '', label: '— not assessed —' },
          ...PASTURE_QUALITY_OPTIONS,
        ],
      },
      {
        key: 'stockingRecommendation',
        label: 'Recommended for this paddock',
        kind: 'text',
        readonly: true,
        placeholder: 'pick pasture quality',
      },
      {
        key: 'stockingDensity',
        label: 'Stocking (head/ha)',
        kind: 'text',
        placeholder: 'e.g. 12',
      },
      ...silvopastureField(hostOptions),
    ],
    initial: {
      name: pd.name ?? 'Paddock',
      species: primarySpecies,
      fencing: pd.fencing ?? 'electric',
      pastureQuality: pd.pastureQuality ?? '',
      stockingRecommendation: formatPaddockStockingRecommendation(
        primarySpecies,
        pd.pastureQuality,
        pd.areaM2,
      ),
      stockingDensity:
        pd.stockingDensity == null ? '' : String(pd.stockingDensity),
      silvopastureId: pd.silvopastureId ?? '',
    },
    onValuesChange: (next, _prev, changed) => {
      if (changed.key !== 'species' && changed.key !== 'pastureQuality') {
        return null;
      }
      const sp = String(next.species ?? primarySpecies) as LivestockSpecies;
      const pqRaw = String(next.pastureQuality ?? '').trim();
      const pq: PastureQuality | undefined =
        pqRaw === 'poor' || pqRaw === 'fair' || pqRaw === 'good' || pqRaw === 'excellent'
          ? pqRaw
          : undefined;
      return {
        stockingRecommendation: formatPaddockStockingRecommendation(
          sp,
          pq,
          pd.areaM2,
        ),
      };
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
        ...silvopastureSavePatch(hostOptions, values),
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
// On-map quick-edit for a placed guild. Mirrors GuildTool's first-placement
// popover: the steward can pick a guild template (from `guildPresets.ts`),
// rename, swap the anchor species, and edit notes. Picking a template
// autofills `name` + `anchorSpeciesId` reactively (only when those fields
// still hold their previous-preset/initial values — manual edits are
// preserved) and replaces `members[]` wholesale on save. Layer-by-layer
// member composition still lives in the slide-up GuildSpatialBuilderCard;
// the template picker here is the bulk-reset escape hatch.

const GUILD_PRESET_OPTIONS = resolveValidPresets().map((p) => ({
  value: p.id,
  label: p.name,
}));

const GUILD_ANCHOR_OPTIONS = PLANT_DATABASE
  .filter((p) => p.layer === 'canopy' || p.layer === 'sub_canopy')
  .map((p) => ({
    value: p.id,
    label: `${p.commonName} (${p.layer === 'canopy' ? 'Canopy' : 'Sub-canopy'})`,
  }));

export function buildGuildEditSchema(
  g: Guild,
  updateGuild: (id: string, updates: Partial<Guild>) => void,
  hostOptions: SilvopastureHostOption[] = [],
): Omit<InlineFormPayload, 'anchor'> {
  // Per-popover scratchpad — same idempotent guard as GuildTool. Tracks the
  // most recently autofilled values so the reactive hook only overwrites
  // name/anchor that the steward hasn't manually edited since the last
  // preset switch.
  let lastAutofilled = { name: g.name, anchorSpeciesId: g.anchorSpeciesId };

  return {
    title: 'Edit guild',
    fields: [
      {
        key: 'preset',
        label: 'Apply a template (optional)',
        kind: 'select',
        options: GUILD_PRESET_OPTIONS,
      },
      { key: 'name', label: 'Name', kind: 'text', required: true },
      {
        key: 'anchorSpeciesId',
        label: 'Anchor species',
        kind: 'select',
        options: GUILD_ANCHOR_OPTIONS,
      },
      {
        key: 'notes',
        label: 'Notes',
        kind: 'text',
        placeholder: 'e.g. north hedgerow',
      },
      ...silvopastureField(hostOptions),
    ],
    initial: {
      preset: '',
      name: g.name,
      anchorSpeciesId: g.anchorSpeciesId,
      notes: g.notes ?? '',
      silvopastureId: g.silvopastureId ?? '',
    },
    onValuesChange: (_next, prev, changed) => {
      if (changed.key !== 'preset') return;
      const presetId = String(changed.value);
      if (!presetId) return; // cleared back to blank — leave fields as-is
      const preset = findGuildPreset(presetId);
      if (!preset) return;
      const patch: Record<string, string> = {};
      if (prev.name === lastAutofilled.name) {
        patch.name = preset.name;
      }
      if (prev.anchorSpeciesId === lastAutofilled.anchorSpeciesId) {
        patch.anchorSpeciesId = preset.anchorSpeciesId;
      }
      lastAutofilled = {
        name: preset.name,
        anchorSpeciesId: preset.anchorSpeciesId,
      };
      return patch;
    },
    onSave: (values) => {
      const presetId = String(values.preset ?? '');
      const preset = presetId ? findGuildPreset(presetId) : undefined;
      const typedNotes = String(values.notes ?? '').trim();
      updateGuild(g.id, {
        name: String(values.name ?? g.name).trim() || g.name,
        anchorSpeciesId: String(values.anchorSpeciesId ?? g.anchorSpeciesId),
        notes: typedNotes || undefined,
        ...silvopastureSavePatch(hostOptions, values),
        ...(preset
          ? {
              members: preset.members,
              // Only fall back to the preset's seed note when the steward
              // didn't type their own — never clobber user-authored notes.
              ...(!typedNotes && preset.notes ? { notes: preset.notes } : {}),
            }
          : {}),
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

const FLOW_KIND_OPTIONS: { value: MaterialKind; label: string }[] = (
  Object.keys(MATERIAL_KIND_CONFIG) as MaterialKind[]
).map((k) => ({ value: k, label: MATERIAL_KIND_CONFIG[k].label }));

export function buildFlowConnectorEditSchema(
  c: MaterialFlow,
  updateFlow: (id: string, patch: Partial<MaterialFlow>) => void,
  endpointOptions: FlowEndpointOption[] = [],
): Omit<InlineFormPayload, 'anchor'> {
  const endpointSelect = [
    { value: '', label: '— none —' },
    ...endpointOptions.map((o) => ({ value: o.id, label: o.label })),
  ];
  const labelFor = (id: string): string | undefined =>
    endpointOptions.find((o) => o.id === id)?.label;
  return {
    title: 'Edit flow connector',
    fields: [
      { key: 'label', label: 'Name', kind: 'text', required: true },
      {
        key: 'materialKind',
        label: 'Flow',
        kind: 'select',
        required: true,
        options: FLOW_KIND_OPTIONS,
      },
      {
        key: 'sourceId',
        label: 'From',
        kind: 'select',
        options: endpointSelect,
      },
      {
        key: 'sinkId',
        label: 'To',
        kind: 'select',
        options: endpointSelect,
      },
    ],
    initial: {
      label: c.label,
      materialKind: c.materialKind,
      sourceId: c.sourceId ?? '',
      sinkId: c.sinkId ?? '',
    },
    onSave: (values) => {
      const nextKind = values.materialKind as MaterialKind;
      const sourceId = String(values.sourceId ?? '') || null;
      const sinkId = String(values.sinkId ?? '') || null;
      updateFlow(c.id, {
        label: String(values.label ?? c.label).trim() || c.label,
        materialKind: nextKind,
        color: MATERIAL_KIND_CONFIG[nextKind].color,
        sourceId,
        sinkId,
        sourceLabel: sourceId ? labelFor(sourceId) : undefined,
        sinkLabel: sinkId ? labelFor(sinkId) : undefined,
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

// ---------- Building (Built Environment V2) ----------
//
// Phase 2: a Building footprint placed by Observe (and visible across all
// Plan views) becomes editable inline from the Plan stage. The schema
// covers the full 8-field set Observe captures, writing back to the
// unified `builtEnvironmentStoreV2`. When rotation or footprint dims
// change, the polygon geometry is regenerated around the existing
// centroid via `createFootprintPolygon` so the visible footprint follows
// the form.
//
// This is the templated pattern for the remaining seven built-env kinds.

// Plan-side option arrays prepend an empty sentinel ("— unspecified —" /
// "Unassigned") because we're editing existing records that may not have
// a subtype/phase set. The four real values for each enum live in the
// canonical registry at `v3/builtEnvironment/schemas/beSchemaRegistry`.
const BUILDING_SUBTYPE_OPTIONS = [
  { value: '', label: '— unspecified —' },
  ...BE_BUILDING_SUBTYPE_OPTIONS,
];

const BUILDING_PHASE_OPTIONS = [
  { value: '', label: 'Unassigned' },
  ...BE_BUILDING_PHASE_OPTIONS,
];

/**
 * Centroid of a polygon's outer ring (mean of vertices, excluding the
 * closing duplicate). Good enough for re-anchoring a footprint when the
 * steward tweaks rotation / width / depth.
 */
function polygonCentroid(polygon: { coordinates: number[][][] }): [number, number] {
  const ring = polygon.coordinates[0] ?? [];
  const first = ring[0];
  const last = ring[ring.length - 1];
  const verts =
    ring.length > 1 &&
    first !== undefined &&
    last !== undefined &&
    first[0] === last[0] &&
    first[1] === last[1]
      ? ring.slice(0, -1)
      : ring;
  let sx = 0;
  let sy = 0;
  for (const v of verts) {
    sx += v[0] ?? 0;
    sy += v[1] ?? 0;
  }
  const n = verts.length || 1;
  return [sx / n, sy / n];
}

export function buildBuildingEditSchema(
  b: BuiltEnvironmentEntity,
): Omit<InlineFormPayload, 'anchor'> {
  const exist = b.existing ?? {};
  const prop = b.proposed ?? {};
  return {
    title: 'Edit building',
    fields: [
      { key: 'label', label: 'Name', kind: 'text', required: true },
      {
        key: 'subtype',
        label: 'Subtype',
        kind: 'select',
        options: BUILDING_SUBTYPE_OPTIONS,
      },
      {
        key: 'phase',
        label: 'Phase',
        kind: 'select',
        options: BUILDING_PHASE_OPTIONS,
      },
      { key: 'rotationDeg', label: 'Rotation', kind: 'number', suffix: '°' },
      { key: 'widthM',      label: 'Width',    kind: 'number', suffix: 'm' },
      { key: 'depthM',      label: 'Depth',    kind: 'number', suffix: 'm' },
      { key: 'heightM',     label: 'Height',   kind: 'number', suffix: 'm' },
      {
        key: 'notes',
        label: 'Notes',
        kind: 'textarea',
        placeholder: 'Free-form notes…',
      },
    ],
    initial: {
      label:       b.label ?? '',
      subtype:     exist.subtype ?? '',
      phase:       prop.phase ?? '',
      rotationDeg: prop.rotationDeg ?? 0,
      widthM:      prop.widthM ?? '',
      depthM:      prop.depthM ?? '',
      heightM:     prop.heightM ?? '',
      notes:       b.notes ?? '',
    },
    onSave: (values) => {
      const store = useBuiltEnvironmentStoreV2.getState();
      const label = String(values.label ?? '').trim() || (b.label ?? 'Building');
      const subtypeRaw = String(values.subtype ?? '').trim();
      const phaseRaw = String(values.phase ?? '').trim();
      const notesRaw = String(values.notes ?? '').trim();

      const rotRaw = Number(values.rotationDeg);
      const widthRaw = Number(values.widthM);
      const depthRaw = Number(values.depthM);
      const heightRaw = Number(values.heightM);

      const rotationDeg: number | undefined = Number.isFinite(rotRaw)
        ? rotRaw
        : prop.rotationDeg;
      const widthM: number | undefined =
        Number.isFinite(widthRaw) && widthRaw > 0 ? widthRaw : prop.widthM;
      const depthM: number | undefined =
        Number.isFinite(depthRaw) && depthRaw > 0 ? depthRaw : prop.depthM;
      const heightM: number | undefined =
        Number.isFinite(heightRaw) && heightRaw >= 0 ? heightRaw : prop.heightM;

      store.updateMetadata(b.id, {
        label,
        notes: notesRaw || undefined,
        existing: { subtype: subtypeRaw || undefined },
        proposed: {
          phase: phaseRaw || undefined,
          rotationDeg,
          widthM,
          depthM,
          heightM,
        },
      });

      // Regenerate footprint polygon when rotation/dims changed and we
      // have a polygon geometry + both dimensions to draw one.
      const rotChanged = rotationDeg !== prop.rotationDeg;
      const wChanged = widthM !== prop.widthM;
      const dChanged = depthM !== prop.depthM;
      if (
        (rotChanged || wChanged || dChanged) &&
        b.geometry.type === 'Polygon' &&
        typeof widthM === 'number' &&
        typeof depthM === 'number' &&
        widthM > 0 &&
        depthM > 0
      ) {
        const center = polygonCentroid(b.geometry);
        const nextPoly = createFootprintPolygon(
          center,
          widthM,
          depthM,
          rotationDeg ?? 0,
        );
        store.updateGeometry(b.id, nextPoly);
      }
    },
    onCancel: () => {
      /* no-op — record already exists */
    },
  };
}

// ---------- Well (Built Environment V2) ----------
//
// Phase 2 — follow-on to Buildings. Wells are Point geometries, so no
// footprint regeneration is needed; the popover is a pure metadata edit
// over the well's `existing` block (kind / depth / flow) plus the
// shared `label` + `notes`. Schema fields match the legacy Observe
// `well` field-schema (kind/depthM/flowLpm/label/notes) so the inline
// form on Plan and the slide-up form on Observe stay 1:1.

const WELL_KIND_OPTIONS = BE_WELL_KIND_OPTIONS;

export function buildWellEditSchema(
  w: BuiltEnvironmentEntity,
): Omit<InlineFormPayload, 'anchor'> {
  const exist = w.existing ?? {};
  return {
    title: 'Edit well',
    fields: [
      { key: 'label', label: 'Label', kind: 'text', placeholder: 'North well' },
      {
        key: 'kind',
        label: 'Kind',
        kind: 'select',
        required: true,
        options: WELL_KIND_OPTIONS,
      },
      { key: 'depthM',  label: 'Depth', kind: 'number', suffix: 'm' },
      { key: 'flowLpm', label: 'Flow',  kind: 'number', suffix: 'L/min' },
      {
        key: 'notes',
        label: 'Notes',
        kind: 'textarea',
        placeholder: 'Free-form notes…',
      },
    ],
    initial: {
      label:   w.label ?? '',
      kind:    exist.subtype ?? 'unknown',
      depthM:  exist.depthM ?? '',
      flowLpm: exist.flowLpm ?? '',
      notes:   w.notes ?? '',
    },
    onSave: (values) => {
      const store = useBuiltEnvironmentStoreV2.getState();
      const label = String(values.label ?? '').trim();
      const kindRaw = String(values.kind ?? '').trim() || 'unknown';
      const notesRaw = String(values.notes ?? '').trim();

      const depthRaw = Number(values.depthM);
      const flowRaw = Number(values.flowLpm);
      const depthM =
        Number.isFinite(depthRaw) && depthRaw >= 0 ? depthRaw : undefined;
      const flowLpm =
        Number.isFinite(flowRaw) && flowRaw >= 0 ? flowRaw : undefined;

      store.updateMetadata(w.id, {
        label: label || undefined,
        notes: notesRaw || undefined,
        existing: {
          subtype: kindRaw,
          depthM,
          flowLpm,
        },
      });
    },
    onCancel: () => {
      /* no-op — record already exists */
    },
  };
}

// ---------- Septic (Built Environment V2) ----------
//
// Polygon geometry; pure metadata edit (kind + label + notes). The
// drawn polygon stands as-is — no auto-regeneration on field changes
// (contrast Buildings, which redraw on rotation/dim edits).

const SEPTIC_KIND_OPTIONS = BE_SEPTIC_SUBTYPE_OPTIONS;

export function buildSepticEditSchema(
  sp: BuiltEnvironmentEntity,
): Omit<InlineFormPayload, 'anchor'> {
  const exist = sp.existing ?? {};
  return {
    title: 'Edit septic',
    fields: [
      {
        key: 'kind',
        label: 'Kind',
        kind: 'select',
        required: true,
        options: SEPTIC_KIND_OPTIONS,
      },
      { key: 'label', label: 'Label', kind: 'text' },
      {
        key: 'notes',
        label: 'Notes',
        kind: 'textarea',
        placeholder: 'Free-form notes…',
      },
    ],
    initial: {
      kind:  exist.subtype ?? 'tank',
      label: sp.label ?? '',
      notes: sp.notes ?? '',
    },
    onSave: (values) => {
      const store = useBuiltEnvironmentStoreV2.getState();
      const kindRaw = String(values.kind ?? '').trim() || 'tank';
      const label = String(values.label ?? '').trim();
      const notesRaw = String(values.notes ?? '').trim();
      store.updateMetadata(sp.id, {
        label: label || undefined,
        notes: notesRaw || undefined,
        existing: { subtype: kindRaw },
      });
    },
    onCancel: () => {
      /* no-op — record already exists */
    },
  };
}

// ---------- Power line (Built Environment V2) ----------
//
// LineString geometry; metadata edit only — geometry stands as drawn.
// Uses the typed `existing.placement` enum on V2 ExistingMetadata
// rather than the free-form `subtype` slot (PowerLine is the only
// built-env kind with a typed placement axis).

const POWER_LINE_PLACEMENT_OPTIONS = BE_POWER_LINE_PLACEMENT_OPTIONS;

export function buildPowerLineEditSchema(
  pl: BuiltEnvironmentEntity,
): Omit<InlineFormPayload, 'anchor'> {
  const exist = pl.existing ?? {};
  return {
    title: 'Edit power line',
    fields: [
      {
        key: 'placement',
        label: 'Placement',
        kind: 'select',
        required: true,
        options: POWER_LINE_PLACEMENT_OPTIONS,
      },
      {
        key: 'widthM',
        label: 'Width',
        kind: 'number',
        suffix: 'm',
        placeholder: '0.2',
      },
      { key: 'label', label: 'Label', kind: 'text' },
      {
        key: 'notes',
        label: 'Notes',
        kind: 'textarea',
        placeholder: 'Free-form notes…',
      },
    ],
    initial: {
      placement: exist.placement ?? 'overhead',
      widthM:    exist.widthM ?? '',
      label:     pl.label ?? '',
      notes:     pl.notes ?? '',
    },
    onSave: (values) => {
      const store = useBuiltEnvironmentStoreV2.getState();
      const placement: 'overhead' | 'buried' =
        values.placement === 'buried' ? 'buried' : 'overhead';
      const label = String(values.label ?? '').trim();
      const notesRaw = String(values.notes ?? '').trim();
      const widthMRaw = Number(values.widthM);
      const widthM =
        Number.isFinite(widthMRaw) && widthMRaw > 0 ? widthMRaw : undefined;
      store.updateMetadata(pl.id, {
        label: label || undefined,
        notes: notesRaw || undefined,
        existing: { placement, widthM },
      });
    },
    onCancel: () => {
      /* no-op — record already exists */
    },
  };
}

// ---------- Buried utility (Built Environment V2) ----------
//
// LineString; metadata edit only. Subtype values mirror the legacy
// `BuriedUtilityKind` enum and round-trip via `existing.subtype`.

const BURIED_UTILITY_SUBTYPE_OPTIONS = BE_BURIED_UTILITY_SUBTYPE_OPTIONS;

export function buildBuriedUtilityEditSchema(
  bu: BuiltEnvironmentEntity,
): Omit<InlineFormPayload, 'anchor'> {
  const exist = bu.existing ?? {};
  return {
    title: 'Edit buried utility',
    fields: [
      {
        key: 'subtype',
        label: 'Kind',
        kind: 'select',
        required: true,
        options: BURIED_UTILITY_SUBTYPE_OPTIONS,
      },
      {
        key: 'widthM',
        label: 'Width',
        kind: 'number',
        suffix: 'm',
        placeholder: '0.3',
      },
      { key: 'label', label: 'Label', kind: 'text' },
      {
        key: 'notes',
        label: 'Notes',
        kind: 'textarea',
        placeholder: 'Free-form notes…',
      },
    ],
    initial: {
      subtype: exist.subtype ?? 'water_main',
      widthM:  exist.widthM ?? '',
      label:   bu.label ?? '',
      notes:   bu.notes ?? '',
    },
    onSave: (values) => {
      const store = useBuiltEnvironmentStoreV2.getState();
      const subtype = String(values.subtype ?? 'water_main');
      const label = String(values.label ?? '').trim();
      const notesRaw = String(values.notes ?? '').trim();
      const widthMRaw = Number(values.widthM);
      const widthM =
        Number.isFinite(widthMRaw) && widthMRaw > 0 ? widthMRaw : undefined;
      store.updateMetadata(bu.id, {
        label: label || undefined,
        notes: notesRaw || undefined,
        existing: { subtype, widthM },
      });
    },
    onCancel: () => {
      /* no-op — record already exists */
    },
  };
}

// ---------- Fence (Built Environment V2) ----------
//
// LineString; metadata edit only. Subtype mirrors the legacy
// `FenceKind` enum.

const FENCE_SUBTYPE_OPTIONS = BE_FENCE_SUBTYPE_OPTIONS;

export function buildFenceEditSchema(
  f: BuiltEnvironmentEntity,
): Omit<InlineFormPayload, 'anchor'> {
  const exist = f.existing ?? {};
  return {
    title: 'Edit fence',
    fields: [
      {
        key: 'subtype',
        label: 'Kind',
        kind: 'select',
        required: true,
        options: FENCE_SUBTYPE_OPTIONS,
      },
      {
        key: 'widthM',
        label: 'Width',
        kind: 'number',
        suffix: 'm',
        placeholder: '0.1',
      },
      { key: 'label', label: 'Label', kind: 'text' },
      {
        key: 'notes',
        label: 'Notes',
        kind: 'textarea',
        placeholder: 'Free-form notes…',
      },
    ],
    initial: {
      subtype: exist.subtype ?? 'page_wire',
      widthM:  exist.widthM ?? '',
      label:   f.label ?? '',
      notes:   f.notes ?? '',
    },
    onSave: (values) => {
      const store = useBuiltEnvironmentStoreV2.getState();
      const subtype = String(values.subtype ?? 'page_wire');
      const label = String(values.label ?? '').trim();
      const notesRaw = String(values.notes ?? '').trim();
      const widthMRaw = Number(values.widthM);
      const widthM =
        Number.isFinite(widthMRaw) && widthMRaw > 0 ? widthMRaw : undefined;
      store.updateMetadata(f.id, {
        label: label || undefined,
        notes: notesRaw || undefined,
        existing: { subtype, widthM },
      });
    },
    onCancel: () => {
      /* no-op — record already exists */
    },
  };
}

// ---------- Gate (Built Environment V2) ----------
//
// Point; metadata edit only — gate has no enum axis, just label + notes.

export function buildGateEditSchema(
  g: BuiltEnvironmentEntity,
): Omit<InlineFormPayload, 'anchor'> {
  return {
    title: 'Edit gate',
    fields: [
      { key: 'label', label: 'Label', kind: 'text' },
      {
        key: 'notes',
        label: 'Notes',
        kind: 'textarea',
        placeholder: 'Free-form notes…',
      },
    ],
    initial: {
      label: g.label ?? '',
      notes: g.notes ?? '',
    },
    onSave: (values) => {
      const store = useBuiltEnvironmentStoreV2.getState();
      const label = String(values.label ?? '').trim();
      const notesRaw = String(values.notes ?? '').trim();
      store.updateMetadata(g.id, {
        label: label || undefined,
        notes: notesRaw || undefined,
      });
    },
    onCancel: () => {
      /* no-op — record already exists */
    },
  };
}

// ---------- Driveway (Built Environment V2) ----------
//
// LineString; surface enum mirrors the legacy `DrivewaySurface`.

const DRIVEWAY_SURFACE_OPTIONS = BE_DRIVEWAY_SURFACE_OPTIONS;

export function buildDrivewayEditSchema(
  dw: BuiltEnvironmentEntity,
): Omit<InlineFormPayload, 'anchor'> {
  const exist = dw.existing ?? {};
  return {
    title: 'Edit driveway',
    fields: [
      {
        key: 'surface',
        label: 'Surface',
        kind: 'select',
        required: true,
        options: DRIVEWAY_SURFACE_OPTIONS,
      },
      {
        key: 'widthM',
        label: 'Width',
        kind: 'number',
        suffix: 'm',
        placeholder: '3.5',
      },
      { key: 'label', label: 'Label', kind: 'text' },
      {
        key: 'notes',
        label: 'Notes',
        kind: 'textarea',
        placeholder: 'Free-form notes…',
      },
    ],
    initial: {
      surface: exist.surface ?? 'gravel',
      widthM:  exist.widthM ?? '',
      label:   dw.label ?? '',
      notes:   dw.notes ?? '',
    },
    onSave: (values) => {
      const store = useBuiltEnvironmentStoreV2.getState();
      const surface = String(values.surface ?? 'gravel');
      const label = String(values.label ?? '').trim();
      const notesRaw = String(values.notes ?? '').trim();
      const widthMRaw = Number(values.widthM);
      const widthM =
        Number.isFinite(widthMRaw) && widthMRaw > 0 ? widthMRaw : undefined;
      store.updateMetadata(dw.id, {
        label: label || undefined,
        notes: notesRaw || undefined,
        existing: { surface, widthM },
      });
    },
    onCancel: () => {
      /* no-op — record already exists */
    },
  };
}

// ---------- Generic V2 Built-Environment kind (Phase 5.2.B) ----------
//
// Floor schema for the 23 BE kinds without a bespoke `buildXxxEditSchema`
// (cabin, yurt, prayer-pavilion, barn, greenhouse, …). Provides the
// minimum useful affordances: state toggle (existing ↔ proposed), label,
// notes. Per-kind subtype enrichment (e.g. `barn.type = dairy|hay|...`)
// can land later by adding a builder to `SCHEMA_BUILDERS` in
// `openBeInlineEdit.ts`; until then this builder is the dispatch fallback.

export function buildGenericBeEditSchema(
  e: BuiltEnvironmentEntity,
): Omit<InlineFormPayload, 'anchor'> {
  const spec = getBuiltEnvironmentKind(e.kind);
  const label = spec?.label ?? e.kind;
  const isGlb = spec?.renderMode === 'glb';
  const prop = e.proposed ?? {};
  return {
    title: `Edit ${label}`,
    fields: [
      {
        key: 'state',
        label: 'State',
        kind: 'select',
        required: true,
        options: [
          { value: 'existing', label: 'Existing' },
          { value: 'proposed', label: 'Proposed' },
        ],
      },
      { key: 'label', label: 'Label', kind: 'text' },
      {
        key: 'notes',
        label: 'Notes',
        kind: 'textarea',
        placeholder: 'Free-form notes…',
      },
      ...(isGlb
        ? ([
            { key: 'rotationDeg', label: 'Rotation', kind: 'number', suffix: '°' },
            { key: 'scaleMul',    label: 'Scale',    kind: 'number', suffix: '×', placeholder: '1.0' },
          ] as const)
        : []),
    ],
    initial: {
      state: e.state,
      label: e.label ?? '',
      notes: e.notes ?? '',
      rotationDeg: prop.rotationDeg ?? 0,
      scaleMul: prop.scaleMul ?? 1,
    },
    onSave: (values) => {
      const store = useBuiltEnvironmentStoreV2.getState();
      const labelStr = String(values.label ?? '').trim();
      const notesStr = String(values.notes ?? '').trim();
      const nextState = String(values.state ?? e.state) as BuiltEnvironmentState;

      let proposedPatch: { rotationDeg?: number; scaleMul?: number } | undefined;
      if (isGlb) {
        const rotRaw = Number(values.rotationDeg);
        const scaleRaw = Number(values.scaleMul);
        proposedPatch = {
          rotationDeg: Number.isFinite(rotRaw) ? rotRaw : prop.rotationDeg,
          scaleMul:
            Number.isFinite(scaleRaw) && scaleRaw > 0 ? scaleRaw : prop.scaleMul,
        };
      }

      store.updateMetadata(e.id, {
        label: labelStr || undefined,
        notes: notesStr || undefined,
        ...(proposedPatch ? { proposed: proposedPatch } : {}),
      });
      if (nextState !== e.state) {
        store.setState(e.id, nextState);
      }
    },
    onCancel: () => {
      /* no-op — record already exists */
    },
  };
}

// ---------- Habitat feature (Slice 8-E) ----------
//
// Inline editor for placed habitat-category DesignElements. The picker
// surfaces `habitatMetadata.hostTreeFeatureId` for mount-on-tree kinds
// (owl-box / raptor-perch / nest-box / snag) so the steward can wire the
// host that the spine seeder will project into `dependsOnAuto`.
//
// Per-kind dimension fields mirror Slice 2's draw-tool popover:
//   - owl-box / nest-box → mountingHeightM
//   - raptor-perch       → heightM
//   - snag               → approxHeightM + cavityCount
// Universal label + notes. Other habitat kinds (brush-pile, insectary-
// strip, wetland-edge) get only label + notes (no host).
//
// Save deep-patches `habitatMetadata` immutably and collapses fully-empty
// metadata back to undefined so downstream consumers see a clean shape.

/** Habitat kinds that mount on a host tree. Picker hides for non-members. */
export const HOST_BEARING_HABITAT_KINDS: ReadonlySet<string> = new Set([
  'owl-box',
  'raptor-perch',
  'nest-box',
  'snag',
]);

export function habitatKindAcceptsHost(kind: string): boolean {
  return HOST_BEARING_HABITAT_KINDS.has(kind);
}

function humanTreeKind(kind: string): string {
  switch (kind) {
    case 'oak-tree':   return 'Oak';
    case 'pine-tree':  return 'Pine';
    case 'apple-tree': return 'Apple';
    case 'shrub':      return 'Shrub';
    default:           return kind;
  }
}

/** Vegetation-category point trees that qualify as habitat hosts. */
export function listHabitatHostCandidates(
  designElements: readonly DesignElement[],
): { value: string; label: string }[] {
  return designElements
    .filter(
      (el) =>
        el.category === 'vegetation' &&
        el.geometry.type === 'Point' &&
        (TREE_PLANTING_KINDS as readonly string[]).includes(el.kind),
    )
    .map((el) => ({
      value: el.id,
      label: `${humanTreeKind(el.kind)}${el.label ? ` — ${el.label}` : ''}`,
    }));
}

const HABITAT_KIND_TITLE: Record<string, string> = {
  'owl-box':         'Edit owl box',
  'raptor-perch':    'Edit raptor perch',
  'nest-box':        'Edit nest box',
  'brush-pile':      'Edit brush pile',
  'snag':            'Edit snag',
  'insectary-strip': 'Edit insectary strip',
  'wetland-edge':    'Edit wetland edge',
};

export function buildHabitatFeatureEditSchema(
  el: DesignElement,
  projectId: string,
  updateElement: (
    projectId: string,
    id: string,
    patch: Partial<Omit<DesignElement, 'id'>>,
  ) => void,
  designElements: readonly DesignElement[],
): Omit<InlineFormPayload, 'anchor'> {
  const md = el.habitatMetadata ?? {};
  const acceptsHost = habitatKindAcceptsHost(el.kind);
  const candidates = acceptsHost ? listHabitatHostCandidates(designElements) : [];
  const hostHasCandidates = candidates.length > 0;

  const fields: FieldSpec[] = [];

  // --- Per-kind dimension fields ---
  if (el.kind === 'owl-box' || el.kind === 'nest-box') {
    fields.push({
      key: 'mountingHeightM',
      label: 'Mounting height',
      kind: 'number',
      suffix: 'm',
      placeholder: '3.0',
    });
  } else if (el.kind === 'raptor-perch') {
    fields.push({
      key: 'heightM',
      label: 'Height',
      kind: 'number',
      suffix: 'm',
      placeholder: '4.0',
    });
  } else if (el.kind === 'snag') {
    fields.push(
      {
        key: 'approxHeightM',
        label: 'Approx. height',
        kind: 'number',
        suffix: 'm',
        placeholder: '8.0',
      },
      {
        key: 'cavityCount',
        label: 'Cavity count',
        kind: 'number',
        placeholder: '0',
      },
    );
  } else if (el.kind === 'insectary-strip') {
    // LineString habitat kind — real-world strip width (metres). Persists to
    // the DesignElement top-level `widthM`, not habitatMetadata, so the
    // width-aware line paint in DesignElementLayers can read it.
    fields.push({
      key: 'widthM',
      label: 'Width',
      kind: 'number',
      suffix: 'm',
      placeholder: '1.2',
    });
  }

  // --- Host-tree picker (mount-on-tree kinds only) ---
  if (acceptsHost) {
    if (hostHasCandidates) {
      fields.push({
        key: 'hostTreeFeatureId',
        label: 'Host tree',
        kind: 'select',
        options: [{ value: '', label: '(no host)' }, ...candidates],
      });
    } else {
      fields.push({
        key: 'hostTreeFeatureId',
        label: 'Host tree',
        kind: 'select',
        readonly: true,
        options: [
          {
            value: '',
            label: 'Place an oak / pine / apple / shrub point first.',
          },
        ],
      });
    }
  }

  // --- Universal label + notes ---
  fields.push(
    { key: 'label', label: 'Label', kind: 'text' },
    {
      key: 'notes',
      label: 'Notes',
      kind: 'textarea',
      placeholder: 'Free-form notes…',
    },
  );

  const initial: Record<string, string | number> = {
    label: el.label ?? '',
    notes: md.notes ?? '',
  };
  if (el.kind === 'owl-box' || el.kind === 'nest-box') {
    initial.mountingHeightM = md.mountingHeightM ?? '';
  } else if (el.kind === 'raptor-perch') {
    initial.heightM = md.heightM ?? '';
  } else if (el.kind === 'snag') {
    initial.approxHeightM = md.approxHeightM ?? '';
    initial.cavityCount = md.cavityCount ?? '';
  } else if (el.kind === 'insectary-strip') {
    initial.widthM = el.widthM ?? '';
  }
  if (acceptsHost) {
    initial.hostTreeFeatureId = md.hostTreeFeatureId ?? '';
  }

  return {
    title: HABITAT_KIND_TITLE[el.kind] ?? 'Edit habitat feature',
    fields,
    initial,
    onSave: (values) => {
      const labelStr = String(values.label ?? '').trim();
      const notesStr = String(values.notes ?? '').trim();

      const nextMd: NonNullable<DesignElement['habitatMetadata']> = { ...md };

      if (el.kind === 'owl-box' || el.kind === 'nest-box') {
        const raw = Number(values.mountingHeightM);
        if (Number.isFinite(raw) && raw > 0) nextMd.mountingHeightM = raw;
        else delete nextMd.mountingHeightM;
      } else if (el.kind === 'raptor-perch') {
        const raw = Number(values.heightM);
        if (Number.isFinite(raw) && raw > 0) nextMd.heightM = raw;
        else delete nextMd.heightM;
      } else if (el.kind === 'snag') {
        const rawH = Number(values.approxHeightM);
        if (Number.isFinite(rawH) && rawH > 0) nextMd.approxHeightM = rawH;
        else delete nextMd.approxHeightM;
        const rawC = Number(values.cavityCount);
        if (Number.isFinite(rawC) && rawC >= 0) nextMd.cavityCount = rawC;
        else delete nextMd.cavityCount;
      }

      if (acceptsHost) {
        const raw = String(values.hostTreeFeatureId ?? '').trim();
        if (raw) nextMd.hostTreeFeatureId = raw;
        else delete nextMd.hostTreeFeatureId;
      }

      if (notesStr) nextMd.notes = notesStr;
      else delete nextMd.notes;

      const cleanedMd = Object.keys(nextMd).length > 0 ? nextMd : undefined;

      const patch: Partial<Omit<DesignElement, 'id'>> = {
        label: labelStr || undefined,
        habitatMetadata: cleanedMd,
      };

      if (el.kind === 'insectary-strip') {
        const rawW = Number(values.widthM);
        patch.widthM =
          Number.isFinite(rawW) && rawW > 0 ? rawW : undefined;
      }

      updateElement(projectId, el.id, patch);
    },
    onCancel: () => {
      /* no-op — record already exists */
    },
  };
}
