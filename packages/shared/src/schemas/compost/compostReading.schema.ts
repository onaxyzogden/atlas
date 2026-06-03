// compostReading.schema.ts
//
// CompostReading — a single time-stamped probe reading for a compost pile.
// This is the heart of the thermophilic-composting vertical: the Act stage
// appends readings, and the Observe stage renders the thermal curve, phase
// detection, and pathogen-kill proof from the full series.
//
// Modelled on the OLOS ProofRecord (schemas/olos/proofRecord.schema.ts):
// a measurement value + capture timestamp + optional geotagged photo. The
// `source` discriminator distinguishes manual entry from a remote sensor;
// `deviceId` is populated only when source === 'sensor' (Phase 4).
//
// Temperatures are canonical Celsius. Pathogen-kill threshold is 55 deg C;
// thermophilic band is roughly 45-71 deg C.

import { z } from 'zod';

export const CompostReadingSource = z.enum([
  'manual',
  'sensor',
]);
export type CompostReadingSource = z.infer<typeof CompostReadingSource>;

export const CompostReadingSchema = z.object({
  id: z.string().min(1),
  pileId: z.string().min(1),
  tempC: z.number().min(-20).max(120),
  moisturePct: z.number().min(0).max(100).optional(),
  turned: z.boolean().default(false),
  note: z.string().optional(),
  source: CompostReadingSource.default('manual'),
  deviceId: z.string().optional(),
  proofPhotoUri: z.string().optional(),
  capturedAt: z.string().datetime(),
  recordedBy: z.string().optional(),
});
export type CompostReading = z.infer<typeof CompostReadingSchema>;
