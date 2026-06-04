// proofSchemas.ts
//
// Seed catalog of proof schemas (one entry per task category called out
// by OLOS Act Command Center Spec v1 §3.3). Each schema lists the
// minimum-required slots a field action of that category needs before
// the Submit Task button enables. Stewards can always attach additional
// above-minimum evidence via "Add more evidence" (spec §3.4); those
// attachments do NOT belong here.
//
// Authoring convention (mirrors the OLOS objectives catalogue):
//   - Slot ids are kebab-case and globally unique inside their schema.
//   - Slot label ≤ ~24 chars (mobile slot header).
//   - Instruction ≤ ~60 chars (single-line on a 320px viewport).
//   - All copy is ASCII (no curly quotes, no em-dashes — the operating
//     covenant for user-facing strings).
//
// Adding a new category: append a new entry below, then write a Vitest
// spec asserting it parses against ProofSchemaSchema (the smoke test in
// fieldActionStatus.test.ts walks the catalog and validates each row).

import type {
  ProofSchema,
  ProofSchemaSlot,
} from '../../schemas/fieldAction/proofSchema.schema.js';

export const FIELD_ACTION_PROOF_SCHEMAS: readonly ProofSchema[] = [
  {
    id: 'earthworks-implementation',
    taskCategory: 'earthworks-implementation',
    title: 'Earthworks implementation',
    description:
      'Before-and-after photos plus a GPS trace of the worked area.',
    slots: [
      {
        id: 'photo-before-1',
        proofType: 'photo',
        label: 'Before photo 1',
        instruction: 'Wide shot of the area before any work begins.',
        required: true,
        kind: 'before',
      },
      {
        id: 'photo-before-2',
        proofType: 'photo',
        label: 'Before photo 2',
        instruction: 'Close shot showing existing conditions.',
        required: true,
        kind: 'before',
      },
      {
        id: 'photo-after-1',
        proofType: 'photo',
        label: 'After photo 1',
        instruction: 'Wide shot of the finished work.',
        required: true,
        kind: 'after',
      },
      {
        id: 'photo-after-2',
        proofType: 'photo',
        label: 'After photo 2',
        instruction: 'Close shot of the new feature.',
        required: true,
        kind: 'after',
      },
      {
        id: 'gps-trace',
        proofType: 'gps_trace',
        label: 'Walk the worked area',
        instruction:
          'Trace the perimeter of the worked area while walking.',
        required: true,
      },
    ],
  },
  {
    id: 'vegetation-survey',
    taskCategory: 'vegetation-survey',
    title: 'Vegetation survey',
    description: 'Pin the location and capture identifying photos plus notes.',
    slots: [
      {
        id: 'gps-point',
        proofType: 'gps_point',
        label: 'Survey point',
        instruction: 'Drop a pin at the survey location.',
        required: true,
      },
      {
        id: 'photo-habit',
        proofType: 'photo',
        label: 'Whole plant photo',
        instruction: 'Frame the full growth habit.',
        required: true,
      },
      {
        id: 'photo-leaf',
        proofType: 'photo',
        label: 'Leaf or fruit close-up',
        instruction: 'Close shot of leaf, fruit, or flower.',
        required: true,
      },
      {
        id: 'note',
        proofType: 'note',
        label: 'Field notes',
        instruction: 'Species ID, vigour, neighbours, anything notable.',
        required: true,
      },
    ],
  },
  {
    id: 'vegetation-planting',
    taskCategory: 'vegetation-planting',
    title: 'Planting',
    description: 'Confirm what was planted, where, and how many.',
    slots: [
      {
        id: 'gps-point',
        proofType: 'gps_point',
        label: 'Planting location',
        instruction: 'Drop a pin where the planting starts.',
        required: true,
      },
      {
        id: 'photo-installed',
        proofType: 'photo',
        label: 'Installed photo',
        instruction: 'Show the finished planting in place.',
        required: true,
      },
      {
        id: 'count',
        proofType: 'measurement',
        label: 'Count planted',
        instruction: 'How many were actually planted.',
        required: true,
        measurementUnit: 'count',
      },
    ],
  },
  {
    id: 'water-test',
    taskCategory: 'water-test',
    title: 'Water or soil test',
    description: 'Jar test, infiltration test, pH, or similar logged result.',
    slots: [
      {
        id: 'logged-result',
        proofType: 'logged_result',
        label: 'Test result',
        instruction: 'Fill in the test form.',
        required: true,
        kind: 'jar-test',
      },
      {
        id: 'photo-sample',
        proofType: 'photo',
        label: 'Sample photo',
        instruction: 'Photo of the sample or apparatus.',
        required: true,
      },
    ],
  },
  {
    id: 'infrastructure-build',
    taskCategory: 'infrastructure-build',
    title: 'Infrastructure build',
    description:
      'Before-and-after plus a critical dimension measurement of the build.',
    slots: [
      {
        id: 'photo-before-1',
        proofType: 'photo',
        label: 'Before photo 1',
        instruction: 'Wide shot before work begins.',
        required: true,
        kind: 'before',
      },
      {
        id: 'photo-before-2',
        proofType: 'photo',
        label: 'Before photo 2',
        instruction: 'Close shot of existing conditions.',
        required: true,
        kind: 'before',
      },
      {
        id: 'photo-after-1',
        proofType: 'photo',
        label: 'After photo 1',
        instruction: 'Wide shot of the finished build.',
        required: true,
        kind: 'after',
      },
      {
        id: 'photo-after-2',
        proofType: 'photo',
        label: 'After photo 2',
        instruction: 'Detail shot of the finished build.',
        required: true,
        kind: 'after',
      },
      {
        id: 'measurement',
        proofType: 'measurement',
        label: 'Key dimension',
        instruction: 'Critical built dimension (length, height, etc).',
        required: true,
        measurementUnit: 'm',
      },
    ],
  },
  {
    id: 'livestock-move',
    taskCategory: 'livestock-move',
    title: 'Livestock move',
    description: 'Confirm head count moved and the destination location.',
    slots: [
      {
        id: 'gps-point',
        proofType: 'gps_point',
        label: 'Destination pin',
        instruction: 'Drop a pin where the animals were moved to.',
        required: true,
      },
      {
        id: 'photo-arrival',
        proofType: 'photo',
        label: 'Arrival photo',
        instruction: 'Show the animals settled in the new location.',
        required: true,
      },
      {
        id: 'head-count',
        proofType: 'measurement',
        label: 'Head count',
        instruction: 'How many head were moved.',
        required: true,
        measurementUnit: 'head',
      },
    ],
  },
  {
    id: 'maintenance-inspection',
    taskCategory: 'maintenance-inspection',
    title: 'Maintenance inspection',
    description: 'Confirm the inspection happened with a photo and note.',
    slots: [
      {
        id: 'photo',
        proofType: 'photo',
        label: 'Inspection photo',
        instruction: 'One photo showing current condition.',
        required: true,
      },
      {
        id: 'note',
        proofType: 'note',
        label: 'Inspection note',
        instruction: 'What you saw and whether action is needed.',
        required: true,
      },
    ],
  },
  {
    id: 'harvest-log',
    taskCategory: 'harvest-log',
    title: 'Harvest log',
    description: 'Yield amount plus a photo of the haul.',
    slots: [
      {
        id: 'yield',
        proofType: 'measurement',
        label: 'Yield',
        instruction: 'Amount harvested.',
        required: true,
        measurementUnit: 'kg',
      },
      {
        id: 'photo-harvest',
        proofType: 'photo',
        label: 'Harvest photo',
        instruction: 'Photo of the harvested produce.',
        required: true,
      },
    ],
  },
  {
    id: 'generic-fallback',
    taskCategory: 'generic-fallback',
    title: 'Generic field action',
    description: 'Default proof minimum when no specific category applies.',
    slots: [
      {
        id: 'photo',
        proofType: 'photo',
        label: 'Photo evidence',
        instruction: 'One photo showing the work or finding.',
        required: true,
      },
      {
        id: 'note',
        proofType: 'note',
        label: 'Note',
        instruction: 'Brief description of what happened.',
        required: true,
      },
    ],
  },
  {
    id: 'divergence-minimum',
    taskCategory: 'divergence',
    title: 'Reality Diverges',
    description:
      'Minimum evidence the steward attaches when capturing a divergence.',
    slots: [
      {
        id: 'photo',
        proofType: 'photo',
        label: 'Divergence photo',
        instruction: 'Show what you found on the ground.',
        required: true,
      },
      {
        id: 'note',
        proofType: 'note',
        label: 'What changed',
        instruction: 'One or two sentences on the mismatch with the plan.',
        required: true,
      },
      {
        id: 'gps-point',
        proofType: 'gps_point',
        label: 'Location',
        instruction: 'Drop a pin where the divergence occurred.',
        required: false,
      },
    ],
  },
] as const;

const BY_ID: Map<string, ProofSchema> = new Map(
  FIELD_ACTION_PROOF_SCHEMAS.map((s) => [s.id, s]),
);

/** Look up a seeded proof schema by id. Returns undefined for unknown ids. */
export function getProofSchema(id: string): ProofSchema | undefined {
  return BY_ID.get(id);
}

/** All required slots for a given proof schema id; empty array if unknown. */
export function requiredSlotsFor(id: string): readonly string[] {
  const schema = BY_ID.get(id);
  if (!schema) return [];
  return schema.slots.filter((s) => s.required).map((s) => s.id);
}

// Index of every slot that declares a measurementBinding, keyed by slotId.
// A proof item carries only slotId (the projected ObserveDataPoint has no
// proofSchemaId), so the Observe read-side resolves slotId -> slot here. slotId
// is not globally unique across schemas, but slots carrying a binding are
// authored with globally-unique ids; if two ever collide the later wins.
const BOUND_SLOTS_BY_ID: Map<string, ProofSchemaSlot> = new Map();
for (const schema of FIELD_ACTION_PROOF_SCHEMAS) {
  for (const slot of schema.slots) {
    if (slot.measurementBinding) BOUND_SLOTS_BY_ID.set(slot.id, slot);
  }
}

/**
 * Resolve a measurement-bound slot by slotId, for the Observe lens read-side
 * builder. Returns undefined for ids that carry no binding (the common case).
 */
export function getMeasurementSlot(slotId: string): ProofSchemaSlot | undefined {
  return BOUND_SLOTS_BY_ID.get(slotId);
}
