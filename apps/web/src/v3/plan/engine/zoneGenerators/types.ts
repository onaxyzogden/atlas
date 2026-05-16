/**
 * Zone-generator seam — the durable shape behind ring-seeding.
 *
 * A generator is a PURE function: (context) → draft `LandZone[]`. It
 * never touches the store. The caller `addZone`s the result, so every
 * generated zone rides the existing `temporal` (undo) store and the
 * existing draw/edit tools with zero new editor code. Ring-seeding is
 * the first generator; parcel-fill / template / AI generators plug into
 * the same interface and the same provisional review surface later.
 */

import type { LandZone } from '../../../../store/zoneStore.js';

export interface ZoneGeneratorContext {
  projectId: string;
  /** Project parcel boundary (clip target). Null when undrawn. */
  parcelBoundary: GeoJSON.FeatureCollection | null;
  /** Zones already in the store for this project. */
  existingZones: LandZone[];
  /**
   * Goal-tree archetype (e.g. `'regenerative-farm'`). Reserved as the
   * archetype-bias hook; v1 generators use the Z-level default category
   * (single source of truth in `Z_TO_CATEGORIES`) and ignore it rather
   * than fabricating a parallel archetype→category table.
   */
  archetype?: string;
}

export interface ZoneGeneratorAvailability {
  ok: boolean;
  /** Steward-facing reason when `ok` is false. */
  reason?: string;
}

export interface ZoneGenerator {
  id: string;
  label: string;
  /** One-line description for the trigger affordance. */
  describe: string;
  /** Cheap precondition check — drives enabled/disabled + tooltip. */
  canRun(ctx: ZoneGeneratorContext): ZoneGeneratorAvailability;
  /** Pure: returns store-ready draft zones (provenance pre-tagged). */
  generate(ctx: ZoneGeneratorContext): LandZone[];
}
