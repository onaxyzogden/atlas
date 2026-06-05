/**
 * autoObservationNeeds — §5c "system-generated needs". Observe should notice
 * where attention is owed and raise a need *itself*, without anyone authoring
 * it. Two live signals already exist in the codebase and are only read here:
 *
 *   1. COVERAGE GAPS — a domain with zero field records (`useEvidenceCounts`
 *      row `n === 0`). "Nothing observed here yet — start the baseline."
 *   2. STALE DATA — a layer whose time-decayed evidence has fallen back to
 *      `unverified` (`computeFieldVerification` / `useFieldVerification`).
 *      "This was verified once; the observation has aged out — re-verify."
 *
 * Auto-needs are DERIVED, not persisted: they are recomputed each render from
 * the signals and merged into the shared catalog by `useObservationNeeds`. Only
 * their run-state persists (the existing `byProject` slice), keyed by a
 * deterministic id so a recorded/dismissed auto-need stays cleared across
 * reloads. Suppression of cleared auto-needs happens at the DISPLAY layer via
 * `isDismissedAutoNeed` — never inside the hook — so the singular need resolver
 * (Capture Workspace) keeps resolving the id while it is being recorded.
 *
 * Everything here is pure: no store, no React, no `crypto` — ids are
 * deterministic, so callers don't mint them. This keeps the detectors trivially
 * unit-testable.
 */

import type { LayerType, LayerFieldVerification } from '@ogden/shared';
import type { ObserveModule } from '../observe/types.js';
import {
  minimalCapturePackage,
  type ObservationNeed,
  type ObservationNeedPriority,
  type ObservationNeedRun,
  type ObservationNeedTarget,
} from './observationNeed.js';

/** Fallback site centre (MTC) when there are no needs to average a centre from. */
export const SITE_FALLBACK_CENTER: [number, number] = [-78.2, 44.5];

/** The shape `useEvidenceCounts` rows must expose for gap detection. */
export interface CoverageRow {
  key: string;
  label: string;
  module: ObserveModule;
  n: number;
}

/** What `buildAutoNeed` needs to mint one system-raised need. */
export interface AutoNeedSpec {
  /** Deterministic id (e.g. `auto-gap-water-mtc`), so run-state persists. */
  id: string;
  projectId: string;
  module: ObserveModule;
  target: ObservationNeedTarget;
  title: string;
  reason: string;
  priority?: ObservationNeedPriority;
  trigger?: string;
}

/**
 * Build one system-raised `ObservationNeed` (`origin: 'auto'`) from a spec. It
 * opens with the same minimal one-note capture package as a hand-raised need,
 * so it is not instantly recordable and lands the steward in a clean workspace.
 *
 * Pure — the caller supplies the deterministic id — so it is unit-testable.
 */
export function buildAutoNeed(spec: AutoNeedSpec): ObservationNeed {
  return {
    id: spec.id,
    projectId: spec.projectId,
    stage: 'observe',
    module: spec.module,
    title: spec.title,
    target: spec.target,
    ...minimalCapturePackage(),
    priority: spec.priority ?? 'medium',
    origin: 'auto',
    reason: spec.reason,
    ...(spec.trigger ? { trigger: spec.trigger } : {}),
  };
}

/**
 * COVERAGE GAPS — one auto-need per domain that has zero field records. The
 * row's `module` drives the dot colour, tool rail, and deep-link module; the
 * id is `auto-gap-<rowKey>-<projectId>` so a recorded/dismissed gap need stays
 * cleared even though the row still reads `n === 0` until the first record.
 */
export function detectCoverageGapNeeds(
  projectId: string,
  rows: CoverageRow[],
  center: [number, number],
): ObservationNeed[] {
  return rows
    .filter((r) => r.n === 0)
    .map((r) =>
      buildAutoNeed({
        id: `auto-gap-${r.key}-${projectId}`,
        projectId,
        module: r.module,
        target: { center },
        title: `Start observing: ${r.label}`,
        reason: `No ${r.label.toLowerCase()} recorded yet — capture a baseline observation.`,
      }),
    );
}

/**
 * Which Observe module owns each verifiable data layer. The field-verification
 * axis only ever surfaces `soils` / `watershed` / `wetlands_flood` / `land_cover`
 * today (the two observation stores feed those via `TOPIC_TO_LAYERS`), but the
 * map is widened defensively so any future `LayerType` resolves sensibly; the
 * default catches anything unmapped.
 */
const LAYER_TO_MODULE: Partial<Record<LayerType, ObserveModule>> = {
  elevation: 'topography',
  soils: 'hydrology',
  watershed: 'hydrology',
  wetlands_flood: 'hydrology',
  land_cover: 'hydrology',
  watershed_derived: 'hydrology',
  groundwater: 'hydrology',
  water_quality: 'hydrology',
  soil_regeneration: 'hydrology',
  biodiversity: 'hydrology',
  critical_habitat: 'hydrology',
  climate: 'climate',
  microclimate: 'climate',
  storm_events: 'climate',
  zoning: 'access-circulation',
};

const DEFAULT_STALE_MODULE: ObserveModule = 'hydrology';

/** Human-readable layer names for the auto-need title/reason. */
const LAYER_LABEL: Partial<Record<LayerType, string>> = {
  soils: 'Soil',
  watershed: 'Watershed',
  wetlands_flood: 'Wetlands & flood',
  land_cover: 'Land cover',
};

/** Title-case a raw `LayerType` token as a fallback label (`land_cover` → `Land cover`). */
function layerLabel(layer: LayerType): string {
  if (LAYER_LABEL[layer]) return LAYER_LABEL[layer] as string;
  const spaced = layer.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * STALE DATA — one auto-need per layer whose decayed evidence has dropped back
 * to `unverified`. `perLayer` only contains layers that *have* observations, so
 * a stale layer is one that was verified once and has aged out. The id is
 * `auto-stale-<layerType>-<projectId>`.
 */
export function detectStaleNeeds(
  projectId: string,
  perLayer: LayerFieldVerification[],
  center: [number, number],
): ObservationNeed[] {
  return perLayer
    .filter((l) => l.level === 'unverified')
    .map((l) => {
      const label = layerLabel(l.layerType);
      return buildAutoNeed({
        id: `auto-stale-${l.layerType}-${projectId}`,
        projectId,
        module: LAYER_TO_MODULE[l.layerType] ?? DEFAULT_STALE_MODULE,
        target: { center },
        title: `Re-verify ${label}`,
        reason: `${label} data has aged past its half-life — re-verify it on the ground.`,
        trigger: 'field verification decayed to unverified',
      });
    });
}

/**
 * Mean centre of a set of needs (or any centred targets), falling back to the
 * site centre when there are none. Keeps an auto-need's marker inside the site
 * rather than at an arbitrary point.
 */
export function meanCenter(
  needs: ReadonlyArray<{ target: { center: [number, number] } }>,
  fallback: [number, number] = SITE_FALLBACK_CENTER,
): [number, number] {
  if (needs.length === 0) return fallback;
  const sx = needs.reduce((a, n) => a + n.target.center[0], 0);
  const sy = needs.reduce((a, n) => a + n.target.center[1], 0);
  return [sx / needs.length, sy / needs.length];
}

/**
 * An auto-need is "dismissed" once its observation is recorded OR a steward
 * explicitly dismisses it (which sets `resolved`). Applied at the display layer
 * (panel grid + map markers) so cleared auto-needs disappear while their id
 * still resolves for any in-flight Capture Workspace. Pure, structural param so
 * this module stays free of the hook (no import cycle).
 */
export function isDismissedAutoNeed(view: {
  objective: Pick<ObservationNeed, 'origin'>;
  run: Pick<ObservationNeedRun, 'status'>;
}): boolean {
  return (
    view.objective.origin === 'auto' &&
    (view.run.status === 'recorded' || view.run.status === 'resolved')
  );
}
