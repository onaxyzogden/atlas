/**
 * Field-verification types — a SECOND, distinct uncertainty axis that sits
 * alongside source-`confidence` (see ../schemas/confidence.schema.ts) without
 * ever being merged into it.
 *
 * Source confidence answers "how authoritative is the dataset behind this
 * layer?" (USGS vs. inference). Field verification answers a different,
 * complementary question: "has a steward actually been on the ground here,
 * recently and repeatedly, and does that observation speak to this layer?"
 *
 * The two are kept separate on purpose: an eyeballed reading must never
 * masquerade as USGS authority, and a high-authority dataset that has never
 * been ground-truthed is still unverified in the field. Honesty about
 * uncertainty is structural in this codebase — this axis extends that, it
 * does not dilute it.
 *
 * This module is pure and turf-free (mirrors confidence.schema.ts). The
 * geometry/React glue lives in apps/web/src/lib/fieldVerification/.
 */

import type { LayerType } from '../constants/dataSources.js';

/** Field-verification level for a data layer, in ascending strength.
 *  Deliberately a 3-tier ordinal so it reads next to ConfidenceLevel without
 *  being confused for it. */
export type VerificationLevel = 'unverified' | 'corroborated' | 'verified';

/** The vocabulary of observation topics v1 understands. A topic is what a
 *  field record is *about*; `TOPIC_TO_LAYERS` maps each to the data layer(s)
 *  it can speak to. `'soil-sample'` is emitted for soil-sample records; the
 *  rest mirror `TransectMonitoringKind` (apps/web monitoringTransectStore). */
export type ObservationTopic =
  | 'soil-sample'
  | 'soil-health'
  | 'water-quality'
  | 'invasives'
  | 'indicator-species'
  | 'wildlife'
  | 'general';

/** A single field observation reduced to the minimum the verification math
 *  needs: what it's about and when it happened. Geometry is handled by the
 *  web zone builder, not here. */
export interface RawObservation {
  topic: ObservationTopic;
  /** ISO date-time or `YYYY-MM-DD`. Parsed via `new Date(...)`. */
  observedAt: string;
}

/** Aggregated field-verification standing for one data layer across the whole
 *  parcel. This is the authoritative per-layer readout shown in badges/widgets. */
export interface LayerFieldVerification {
  layerType: LayerType;
  level: VerificationLevel;
  /** Sum of time-decayed observation weights mapped to this layer. */
  weight: number;
  /** Count of contributing observations (pre-decay). */
  observationCount: number;
  /** ISO date-time of the most-recent contributing observation, or null. */
  lastObservedAt: string | null;
}
