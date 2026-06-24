/**
 * zoneRingConfigStore — per-project, adjustable Mollison ring radii.
 *
 * The home-centre disc + Z1–Z5 outer radii used to be a hard-coded module
 * constant (`ZONE_RING_BANDS` in `zoneRingConstants`). They are now lifted
 * here so a steward can re-size the rings to their land — before placing
 * them (via the seed tool's control panel) and after (via the "Resize
 * rings" inline editor on any seeded ring).
 *
 * This store is the SINGLE source of truth the three consumers read:
 *   - `ringSeedGenerator` (seeds the editable annulus zones),
 *   - `PlanZoneRingsOverlay` (the faint reference rings — they FOLLOW the
 *     custom diameters so guide and seeded zones never drift),
 *   - the after-placement resize editor (`planFeatureActions`).
 *
 * A project with no entry returns `DEFAULT_RING_RADII`, so untouched
 * projects behave exactly as before this feature existed.
 *
 * Persistence: localStorage, keyed by projectId. This IS project-design
 * data (unlike the global view-preference `matrixTogglesStore`), but the
 * v3 demo bundle is client-only, so localStorage is the right tier here;
 * server sync rides the normal project bundle if/when these radii are
 * folded into it.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  DEFAULT_RING_RADII,
  type ZoneRingRadii,
} from '../v3/plan/layers/zoneRingConstants.js';

// Re-export so the radii consumers (seed tool, resize editor, fields) can
// pull the type + the math helpers from this one store module.
export type { ZoneRingRadii };

/** Minimum gap (m) enforced between successive radii so the bands never
 *  collapse or invert — keeps every annulus non-degenerate. */
const MIN_RING_GAP_M = 1;

/**
 * Clamp a radii set to strictly increasing values (home < z1 < … < z5),
 * each at least `MIN_RING_GAP_M` beyond the previous, and floor every
 * value at a sane minimum. Non-finite inputs fall back to the default for
 * that slot so a bad field can't poison the whole set.
 */
export function clampRingRadii(raw: Partial<ZoneRingRadii>): ZoneRingRadii {
  const pick = (v: unknown, fallback: number): number => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };
  const home = Math.max(MIN_RING_GAP_M, pick(raw.homeM, DEFAULT_RING_RADII.homeM));
  const z1 = Math.max(home + MIN_RING_GAP_M, pick(raw.z1M, DEFAULT_RING_RADII.z1M));
  const z2 = Math.max(z1 + MIN_RING_GAP_M, pick(raw.z2M, DEFAULT_RING_RADII.z2M));
  const z3 = Math.max(z2 + MIN_RING_GAP_M, pick(raw.z3M, DEFAULT_RING_RADII.z3M));
  const z4 = Math.max(z3 + MIN_RING_GAP_M, pick(raw.z4M, DEFAULT_RING_RADII.z4M));
  const z5 = Math.max(z4 + MIN_RING_GAP_M, pick(raw.z5M, DEFAULT_RING_RADII.z5M));
  return { homeM: home, z1M: z1, z2M: z2, z3M: z3, z4M: z4, z5M: z5 };
}

/**
 * Uniformly scale a base radii set (default = the Mollison ladder) — the
 * "overall scale" slider's output. Result is monotonic-clamped, so a sane
 * scale always yields a valid set. Per-ring fine edits are applied on top
 * of this, never the reverse.
 */
export function scaleRadii(
  scale: number,
  base: ZoneRingRadii = DEFAULT_RING_RADII,
): ZoneRingRadii {
  const s = Number.isFinite(scale) && scale > 0 ? scale : 1;
  return clampRingRadii({
    homeM: base.homeM * s,
    z1M: base.z1M * s,
    z2M: base.z2M * s,
    z3M: base.z3M * s,
    z4M: base.z4M * s,
    z5M: base.z5M * s,
  });
}

interface ZoneRingConfigState {
  /** Per-project custom radii. Absence ⇒ DEFAULT_RING_RADII. */
  byProject: Record<string, ZoneRingRadii>;
  /** Custom radii for a project, or the default ladder when unset. */
  getRadii: (projectId: string) => ZoneRingRadii;
  /** Persist a project's radii (monotonic-clamped first). */
  setRadii: (projectId: string, radii: Partial<ZoneRingRadii>) => void;
  /** Clear a project's override (revert to the default ladder). */
  resetRadii: (projectId: string) => void;
}

export const useZoneRingConfigStore = create<ZoneRingConfigState>()(
  persist(
    (set, get) => ({
      byProject: {},
      getRadii: (projectId) => get().byProject[projectId] ?? DEFAULT_RING_RADII,
      setRadii: (projectId, radii) =>
        set((s) => ({
          byProject: {
            ...s.byProject,
            [projectId]: clampRingRadii({
              ...(s.byProject[projectId] ?? DEFAULT_RING_RADII),
              ...radii,
            }),
          },
        })),
      resetRadii: (projectId) =>
        set((s) => {
          if (!(projectId in s.byProject)) return s;
          const next = { ...s.byProject };
          delete next[projectId];
          return { byProject: next };
        }),
    }),
    {
      name: 'ogden-atlas-zone-ring-config',
      version: 1,
    },
  ),
);
