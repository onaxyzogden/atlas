// observationLogRecord.schema.ts
//
// ObservationLogRecord: an immutable, append-only ledger row written each time a
// steward CLOSES an ObjectiveReviewFlag (resolve or dismiss). It is the
// historical substrate the (separate, later) chronic co-occurrence detector
// reads to reconstruct which protocol-signatures co-deviated across cycles.
//
// Per-flag-closure grain by design: this record carries ONLY the facts of one
// flag's closure -- NO cluster/signature is precomputed here. Cluster semantics
// stay derived in the detector (record observations, derive verdicts on read).
//
// PERSISTED -> validated: zod schema, mirroring reviewFlag.schema.ts (contrast
// CoOccurrenceCluster, a never-persisted derived interface).
//
// NAMED ObservationLogRecord (not ObservationRecord) to avoid a TS2308 barrel
// collision with schemas/olos/observationRecord.schema.ts, which already exports
// an unrelated ObservationRecord (the Observe-objective output concept).

import { z } from 'zod';
import { SeasonName } from './protocol.schema.js';
import { FlagDepth, type ObjectiveReviewFlag } from './reviewFlag.schema.js';
import { temporalBucketKey } from '../../constants/protocol/deviationPolicy.js';

/** How a flag left the open set. Distinct steward judgments (see reviewFlag). */
export const ObservationCloseKind = z.enum(['resolved', 'dismissed']);
export type ObservationCloseKind = z.infer<typeof ObservationCloseKind>;

export const ObservationLogRecordSchema = z.object({
  /** Stable unique id, one per CLOSURE event (caller-generated). */
  id: z.string(),
  /** The project this closure belongs to. */
  projectId: z.string(),
  /** The flag that closed (NOT unique across records: a reopened flag recloses). */
  flagId: z.string(),
  /** The protocol template that authored the deviated flag. */
  sourceTemplateId: z.string(),
  /** The objective the deviated flag targeted. */
  objectiveId: z.string(),
  /** temporalBucketKey(season, cycleNumber) -- the grouping axis for the detector. */
  bucketKey: z.string(),
  /** Season of the flag's window, if any. */
  season: SeasonName.optional(),
  /** Rotation/observation cycle of the flag's window, if any. */
  cycleNumber: z.number().int().nonnegative().optional(),
  /** Structural depth of the deviated flag. */
  depth: FlagDepth,
  /** Direction/sign of the deviation. */
  deviationSign: z.enum(['over', 'under', 'existential']),
  /** ISO-8601: when the flag was originally raised (copied from the flag). */
  raisedAt: z.string().min(1),
  /** ISO-8601: when the steward closed it. */
  closedAt: z.string().min(1),
  /** Whether the closure was a resolve or a dismiss. */
  closeKind: ObservationCloseKind,
});
export type ObservationLogRecord = z.infer<typeof ObservationLogRecordSchema>;

/**
 * Pure builder: derive a closure record from the flag being closed. Store-free
 * and side-effect-free so the emission layer stays trivially testable. The
 * caller supplies closedAt (the same ISO stamp written to the flag) and a
 * unique id (crypto.randomUUID() at the call site).
 */
export function buildObservationLogRecord(
  flag: ObjectiveReviewFlag,
  closeKind: ObservationCloseKind,
  closedAt: string,
  id: string,
): ObservationLogRecord {
  const season = flag.window.season;
  const cycleNumber = flag.window.cycleNumber;
  return {
    id,
    projectId: flag.projectId,
    flagId: flag.id,
    sourceTemplateId: flag.sourceTemplateId,
    objectiveId: flag.objectiveId,
    bucketKey: temporalBucketKey(season, cycleNumber),
    ...(season !== undefined ? { season } : {}),
    ...(cycleNumber !== undefined ? { cycleNumber } : {}),
    depth: flag.depth,
    deviationSign: flag.deviationSign,
    raisedAt: flag.raisedAt,
    closedAt,
    closeKind,
  };
}
