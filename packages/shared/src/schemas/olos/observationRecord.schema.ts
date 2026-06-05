// observationRecord.schema.ts
//
// ObservationRecord — the output of an Observe Objective. Documents *what
// is*: a summary of conditions, constraints, unknowns, flags, an optional
// location footprint, and a stage-allowed status. Plan Objectives consume
// these as required inputs via the handoff packet.

import { z } from 'zod';
import { ObserveStatus } from './status.schema.js';
import { GeoJSONGeometrySchema } from './geometry.schema.js';

export const ObservationEvidenceRefSchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    'photo',
    'note',
    'measurement',
    'document',
    'audio',
    'video',
    'external-link',
    'test-result',
  ]),
  uri: z.string().optional(),
  caption: z.string().optional(),
  capturedAt: z.string().datetime().optional(),
  capturedBy: z.string().optional(),
});
export type ObservationEvidenceRef = z.infer<
  typeof ObservationEvidenceRefSchema
>;

export const ObservationRecordSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  objectiveId: z.string().min(1),
  status: ObserveStatus,
  summary: z.string().default(''),
  constraints: z.string().default(''),
  unknowns: z.string().default(''),
  flags: z.array(z.string()).default([]),
  evidenceRefs: z.array(ObservationEvidenceRefSchema).default([]),
  locationGeometry: GeoJSONGeometrySchema.optional(),
  recordedBy: z.string().optional(),
  recordedAt: z.string().datetime(),
  recommendedNextReview: z.string().datetime().optional(),
});
export type ObservationRecord = z.infer<typeof ObservationRecordSchema>;
