/**
 * useEffectiveHomestead — single read path for the Mollison Zone 0 anchor.
 *
 * Resolves the per-project anchor in this order:
 *
 *   1. Explicit — `homesteadStore.byProject[projectId]` (steward placed it).
 *   2. Derived — when (1) is unset and exactly one existing residence-kind
 *      BE entity is on the parcel, fall back to the centroid of that
 *      polygon. Never written to `homesteadStore`.
 *   3. None — zero or multiple residences exist; consumers stay disabled.
 *
 * Per ADR `wiki/decisions/2026-05-13-atlas-residence-zone0-derivation.md`
 * (Option C). The hook is the *only* point where derivation happens — every
 * consumer (ObserveTools gate, PermacultureZoneTool, AnnotationSectorHandles,
 * SunWindWedgeTool, …) reads through this so the policy can't drift.
 *
 * Telemetry: callers may pass `recordGateFlip` to emit a
 * `homestead_gate_flip` event whenever the resolved availability changes.
 * The hook itself never logs; the consumer wires the side effect.
 */

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import { RESIDENCE_KINDS } from '@ogden/shared';
import type {
  BuiltEnvironmentEntity,
  BuiltEnvironmentGeometry,
} from '@ogden/shared';
import { useHomesteadStore } from '../../../store/homesteadStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';

export type EffectiveHomesteadSource = 'explicit' | 'derived' | 'none';

export interface EffectiveHomestead {
  /** `[lng, lat]` or null when no anchor can be resolved. */
  point: [number, number] | null;
  /** Where the point came from — drives telemetry + downstream UI. */
  source: EffectiveHomesteadSource;
  /**
   * When source === 'derived', the residence entity the centroid was derived
   * from. Lets a consumer surface labels (e.g. "Anchored at Farmhouse") or
   * detect store-level edits.
   */
  derivedFrom: BuiltEnvironmentEntity | null;
}

const polygonCentroid = (
  geom: BuiltEnvironmentGeometry,
): [number, number] | null => {
  if (geom.type !== 'Polygon') return null;
  const c = turf.centroid(turf.polygon(geom.coordinates));
  const [lng, lat] = c.geometry.coordinates as [number, number];
  return [lng, lat];
};

/**
 * Imperative twin of `useEffectiveHomestead` for non-React callers
 * (pointer handlers, store subscriptions). Same resolution policy — keep
 * the two in lockstep so consumers cannot drift.
 */
export function resolveEffectiveHomestead(
  projectId: string,
): EffectiveHomestead {
  const explicit = useHomesteadStore.getState().byProject[projectId];
  if (explicit) {
    return { point: explicit, source: 'explicit', derivedFrom: null };
  }
  const entities = useBuiltEnvironmentStoreV2.getState().entities;
  const candidates = entities.filter(
    (e) =>
      e.projectId === projectId &&
      e.state === 'existing' &&
      RESIDENCE_KINDS.has(e.kind),
  );
  if (candidates.length !== 1) {
    return { point: null, source: 'none', derivedFrom: null };
  }
  const dwelling = candidates[0]!;
  if (dwelling.geometry.type !== 'Polygon') {
    return { point: null, source: 'none', derivedFrom: null };
  }
  const c = turf.centroid(turf.polygon(dwelling.geometry.coordinates));
  const [lng, lat] = c.geometry.coordinates as [number, number];
  return { point: [lng, lat], source: 'derived', derivedFrom: dwelling };
}

export function useEffectiveHomestead(projectId: string): EffectiveHomestead {
  const explicit = useHomesteadStore((s) => s.byProject[projectId]);
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);

  return useMemo<EffectiveHomestead>(() => {
    if (explicit) {
      return { point: explicit, source: 'explicit', derivedFrom: null };
    }
    const candidates = entities.filter(
      (e) =>
        e.projectId === projectId &&
        e.state === 'existing' &&
        RESIDENCE_KINDS.has(e.kind),
    );
    if (candidates.length !== 1) {
      return { point: null, source: 'none', derivedFrom: null };
    }
    const dwelling = candidates[0]!;
    const centroid = polygonCentroid(dwelling.geometry);
    if (!centroid) {
      return { point: null, source: 'none', derivedFrom: null };
    }
    return { point: centroid, source: 'derived', derivedFrom: dwelling };
  }, [explicit, entities, projectId]);
}
