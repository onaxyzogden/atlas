/**
 * beSchemaRegistry — canonical per-kind field catalog for the eight
 * built-environment kinds (Phase 4.4 of the BE V2 unification).
 *
 * Two adapters consume this registry:
 *
 *   - `apps/web/src/v3/plan/layers/inlineEditSchemas.ts` — Plan-stage
 *     inline-edit popovers ( `<InlineFeaturePopover>` ). Reads
 *     `coreFields ∪ planOnlyFields`, binds save → V2 `updateMetadata`.
 *
 *   - `apps/web/src/v3/observe/components/draw/annotationFieldSchemas.ts`
 *     — Observe-stage slide-up forms ( `<AnnotationFormSlideUp>` ). Reads
 *     `coreFields` only, binds save → V1 facade `add*` / `update*`.
 *
 * Why a registry at all?  Before Phase 4.4 the dropdown enums, field
 * labels, and defaults were duplicated across the two files — already
 * drifted in two places ( Driveway surfaces, BuriedUtility key name ).
 * Centralizing the catalog stops that drift; centralizing save would
 * have required collapsing two persistence paths ( V1 facade vs V2
 * direct ), which is Phase 5 territory.
 *
 * Vocabulary canonicalization
 * ---------------------------
 *   - field identifier: `key`  ( Plan's vocabulary; Observe uses
 *     `name`. The Observe adapter renames at runtime.)
 *   - "kind" axis for BuriedUtility / Fence / Septic: `subtype`
 *     ( matches V2 `existing.subtype`. Observe historically used
 *     `kind` but writes to the same V2 slot via the facade.)
 *   - Driveway surface enum: Plan's richer enum is canonical
 *     ( gravel | asphalt | concrete | dirt | other ).
 *     Observe's old enum was a subset (`paved` was the
 *     conflated label for asphalt+concrete).
 */

/** V2 entity kinds covered by this registry. Matches
 *  `BuiltEnvironmentEntity['kind']` from `@ogden/shared`. */
export type BeKind =
  | 'building'
  | 'well'
  | 'septic'
  | 'power-line'
  | 'buried-utility'
  | 'fence'
  | 'gate'
  | 'driveway';

/** A select-option pair. */
export interface BeOption {
  value: string;
  label: string;
}

/** Supported form field shapes. Superset of Plan's `FieldSpec` and
 *  Observe's `FieldDef` — adapters narrow to their own form type. */
export type BeField =
  | {
      key: string;
      label: string;
      kind: 'text' | 'textarea';
      placeholder?: string;
      required?: boolean;
    }
  | {
      key: string;
      label: string;
      kind: 'number';
      placeholder?: string;
      suffix?: string;
      min?: number;
      max?: number;
      step?: number;
    }
  | {
      key: string;
      label: string;
      kind: 'select';
      options: BeOption[];
      required?: boolean;
    };

/** Per-kind schema entry. */
export interface BeSchema {
  /** V2 entity kind, mirrored as a field for safer lookup. */
  kind: BeKind;
  /** Human-readable form title. Observe and Plan may prepend "Edit ". */
  title: string;
  /** Fields rendered on both Observe and Plan. */
  coreFields: BeField[];
  /** Fields rendered only on Plan (proposed-state design intent — phase,
   *  rotation, dimensions for Building). Empty for kinds without a Plan
   *  extension. */
  planOnlyFields: BeField[];
  /** Default values for create-mode (Observe). Keyed by `key`. */
  defaults: Record<string, string | number | ''>;
}

// ---------- Shared option enums ----------

export const BUILDING_SUBTYPE_OPTIONS: BeOption[] = [
  { value: 'residence',     label: 'Residence' },
  { value: 'outbuilding',   label: 'Outbuilding' },
  { value: 'agricultural',  label: 'Agricultural' },
  { value: 'other',         label: 'Other' },
];

/** Phase tags applied to "proposed" buildings to slice the Vision-Layout
 *  timeline. Values are free-form strings (V2 `ProposedMetadata.phase`
 *  is `z.string().max(32).optional()`), but these four are the
 *  canonical set used by the Plan UI today. */
export const BUILDING_PHASE_OPTIONS: BeOption[] = [
  { value: 'phase-1', label: 'Phase 1' },
  { value: 'phase-2', label: 'Phase 2' },
  { value: 'phase-3', label: 'Phase 3' },
  { value: 'phase-4', label: 'Phase 4' },
];

export const WELL_KIND_OPTIONS: BeOption[] = [
  { value: 'drinking',   label: 'Drinking' },
  { value: 'irrigation', label: 'Irrigation' },
  { value: 'unknown',    label: 'Unknown' },
];

export const SEPTIC_SUBTYPE_OPTIONS: BeOption[] = [
  { value: 'tank',        label: 'Tank' },
  { value: 'leach_field', label: 'Leach field' },
  { value: 'cesspool',    label: 'Cesspool' },
  { value: 'other',       label: 'Other' },
];

export const POWER_LINE_PLACEMENT_OPTIONS: BeOption[] = [
  { value: 'overhead', label: 'Overhead' },
  { value: 'buried',   label: 'Buried' },
];

export const BURIED_UTILITY_SUBTYPE_OPTIONS: BeOption[] = [
  { value: 'water_main', label: 'Water main' },
  { value: 'gas',        label: 'Gas' },
  { value: 'fibre',      label: 'Fibre' },
  { value: 'sewer',      label: 'Sewer' },
  { value: 'other',      label: 'Other' },
];

export const FENCE_SUBTYPE_OPTIONS: BeOption[] = [
  { value: 'barbed',    label: 'Barbed' },
  { value: 'page_wire', label: 'Page wire' },
  { value: 'electric',  label: 'Electric' },
  { value: 'privacy',   label: 'Privacy' },
  { value: 'other',     label: 'Other' },
];

/** Unified driveway surfaces. Plan introduced the richer
 *  `asphalt`/`concrete` split while Observe historically used a single
 *  `paved` umbrella. The registry keeps `paved` as a legacy-read value
 *  so dropdowns render correctly against old records, but it's not
 *  offered as a fresh selection — new writes choose asphalt or
 *  concrete. Mirrored in `DrivewaySurface` in
 *  `apps/web/src/store/builtEnvironmentStore.ts`. */
export const DRIVEWAY_SURFACE_OPTIONS: BeOption[] = [
  { value: 'gravel',   label: 'Gravel' },
  { value: 'asphalt',  label: 'Asphalt' },
  { value: 'concrete', label: 'Concrete' },
  { value: 'paved',    label: 'Paved (legacy)' },
  { value: 'dirt',     label: 'Dirt' },
  { value: 'other',    label: 'Other' },
];

// ---------- Per-kind schemas ----------

const buildingSchema: BeSchema = {
  kind: 'building',
  title: 'Building',
  coreFields: [
    { key: 'subtype', label: 'Subtype', kind: 'select', options: BUILDING_SUBTYPE_OPTIONS },
    { key: 'label',   label: 'Label',   kind: 'text', placeholder: 'Main house' },
    { key: 'notes',   label: 'Notes',   kind: 'textarea' },
  ],
  planOnlyFields: [
    { key: 'phase',       label: 'Phase',    kind: 'select', options: BUILDING_PHASE_OPTIONS },
    { key: 'rotationDeg', label: 'Rotation', kind: 'number', suffix: '°' },
    { key: 'widthM',      label: 'Width',    kind: 'number', suffix: 'm' },
    { key: 'depthM',      label: 'Depth',    kind: 'number', suffix: 'm' },
    { key: 'heightM',     label: 'Height',   kind: 'number', suffix: 'm' },
  ],
  defaults: { subtype: 'residence', label: '', notes: '' },
};

const wellSchema: BeSchema = {
  kind: 'well',
  title: 'Well',
  coreFields: [
    { key: 'subtype', label: 'Kind',         kind: 'select', options: WELL_KIND_OPTIONS },
    { key: 'depthM',  label: 'Depth (m)',    kind: 'number', min: 0, step: 0.5 },
    { key: 'flowLpm', label: 'Flow (L/min)', kind: 'number', min: 0, step: 1 },
    { key: 'label',   label: 'Label',        kind: 'text', placeholder: 'North well' },
    { key: 'notes',   label: 'Notes',        kind: 'textarea' },
  ],
  planOnlyFields: [],
  defaults: { subtype: 'unknown', depthM: '', flowLpm: '', label: '', notes: '' },
};

const septicSchema: BeSchema = {
  kind: 'septic',
  title: 'Septic / leach field',
  coreFields: [
    { key: 'subtype', label: 'Kind',  kind: 'select', options: SEPTIC_SUBTYPE_OPTIONS },
    { key: 'label',   label: 'Label', kind: 'text' },
    { key: 'notes',   label: 'Notes', kind: 'textarea' },
  ],
  planOnlyFields: [],
  defaults: { subtype: 'tank', label: '', notes: '' },
};

const powerLineSchema: BeSchema = {
  kind: 'power-line',
  title: 'Power line',
  coreFields: [
    { key: 'placement', label: 'Placement', kind: 'select', options: POWER_LINE_PLACEMENT_OPTIONS },
    { key: 'label',     label: 'Label',     kind: 'text' },
    { key: 'notes',     label: 'Notes',     kind: 'textarea' },
  ],
  planOnlyFields: [],
  defaults: { placement: 'overhead', label: '', notes: '' },
};

const buriedUtilitySchema: BeSchema = {
  kind: 'buried-utility',
  title: 'Buried utility',
  coreFields: [
    { key: 'subtype', label: 'Kind',  kind: 'select', options: BURIED_UTILITY_SUBTYPE_OPTIONS },
    { key: 'label',   label: 'Label', kind: 'text' },
    { key: 'notes',   label: 'Notes', kind: 'textarea' },
  ],
  planOnlyFields: [],
  defaults: { subtype: 'water_main', label: '', notes: '' },
};

const fenceSchema: BeSchema = {
  kind: 'fence',
  title: 'Fence',
  coreFields: [
    { key: 'subtype', label: 'Kind',  kind: 'select', options: FENCE_SUBTYPE_OPTIONS },
    { key: 'label',   label: 'Label', kind: 'text' },
    { key: 'notes',   label: 'Notes', kind: 'textarea' },
  ],
  planOnlyFields: [],
  defaults: { subtype: 'page_wire', label: '', notes: '' },
};

const gateSchema: BeSchema = {
  kind: 'gate',
  title: 'Gate',
  coreFields: [
    { key: 'label', label: 'Label', kind: 'text', placeholder: 'Main gate' },
    { key: 'notes', label: 'Notes', kind: 'textarea' },
  ],
  planOnlyFields: [],
  defaults: { label: '', notes: '' },
};

const drivewaySchema: BeSchema = {
  kind: 'driveway',
  title: 'Driveway',
  coreFields: [
    { key: 'surface', label: 'Surface', kind: 'select', options: DRIVEWAY_SURFACE_OPTIONS },
    { key: 'label',   label: 'Label',   kind: 'text' },
    { key: 'notes',   label: 'Notes',   kind: 'textarea' },
  ],
  planOnlyFields: [],
  defaults: { surface: 'gravel', label: '', notes: '' },
};

/** Single source of truth for the eight BE kinds. */
export const BE_SCHEMA_REGISTRY: Record<BeKind, BeSchema> = {
  'building':        buildingSchema,
  'well':            wellSchema,
  'septic':          septicSchema,
  'power-line':      powerLineSchema,
  'buried-utility':  buriedUtilitySchema,
  'fence':           fenceSchema,
  'gate':            gateSchema,
  'driveway':        drivewaySchema,
};
