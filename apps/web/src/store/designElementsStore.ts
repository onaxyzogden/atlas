/**
 * designElementsStore — type-only module exporting the canonical
 * `DesignElement` interface used across Plan-stage code.
 *
 * History: this file used to host a V1 facade (`useDesignElementsStore`)
 * that merged V2 structure-class entities with a module-private
 * non-structure store. The facade retired on 2026-05-12 once every
 * production reader and writer migrated to the selector library
 * (`builtEnvironmentSelectors.ts`) and the non-structure side extracted
 * to `landDesignStore.ts`. See the 2026-05-12 entries in `wiki/log.md`
 * for the full migration arc and the BE V2 unification ADR
 * (`wiki/decisions/2026-05-10-atlas-built-environment-unification.md`).
 *
 * The `DesignElement` type continues to live here as its canonical home —
 * imported by the selector library, landDesignStore, plan-canvas layers,
 * and a couple of plan cards.
 */

import type { DesignCategory } from '../v3/plan/canvas/elementCatalog.js';
import type { PhaseKey, PlanView } from '../v3/plan/types.js';

export interface DesignElement {
  id: string;
  category: DesignCategory;
  /** Stable element kind (`paddock`, `pond`, `barn`, …) — keys into elementCatalog. */
  kind: string;
  /** Drawn geometry; geometry.type matches the element spec. */
  geometry: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon;
  /** Yeomans phase the element belongs to (defaults from catalog). */
  phase: PhaseKey;
  /** Display label, e.g. `Paddock A`. Auto-assigned letter for polygons. */
  label?: string;
  /** Computed once on draw for polygons (acres). */
  acreage?: number;
  /**
   * Buried-utility conflicts captured at draw-time when the element's
   * geometry intersected the 3 m buffer around an OBSERVE-recorded
   * BuriedUtility. Persisted with a paired `utilityAcknowledgment`
   * free-text statement from the steward. See ADR
   * `2026-05-10-plan-earthwork-utility-veto.md`.
   *
   * Only carried on non-structure kinds with `earthworkDepthCm > 30`
   * (pond, swale, road today). Structure-class entities route through
   * `builtEnvironmentStoreV2` and don't carry this field today —
   * footings are scoped out of the current veto.
   */
  utilityConflicts?: { id: string; kind: string }[];
  utilityAcknowledgment?: string;
  createdAt: string;
  /**
   * Plan view in which this element was authored. Drives per-view visibility
   * and editability:
   *   - `current`: appears (read-only) on every non-Current view too, unless
   *     listed in `hiddenInViews`.
   *   - non-`current`: appears (editable) only on that view.
   *
   * Records persisted before this field existed migrate to `'current'`.
   */
  view?: PlanView;
  /** Non-Current views in which a `view==='current'` element is hidden. */
  hiddenInViews?: PlanView[];
  /**
   * Optional encoded host id (`<source>:<rawId>`, see
   * `features/agroforestry/silvopastureHosts.ts`) pinning this design
   * element to a specific silvopasture polygon. Used only when
   * `kind === 'orchard'`; ignored on other kinds.
   */
  silvopastureId?: string;
  /**
   * Auto-Design draft plumbing (ADR 2026-05-14). When `true` this element
   * was emitted by `runAutoDesign` and is awaiting steward review on the
   * DraftReviewBar — rendered dashed/translucent and excluded from normal
   * consuming selectors by default. `generationId` links it to one
   * generation run for cascade accept/discard; `draftClass` is the
   * feature-class bucket ("livestock" | "water" | "trees" | …) the
   * DraftReviewBar groups by. Absent on hand-drawn elements.
   */
  draft?: boolean;
  generationId?: string;
  draftClass?: string;
  /**
   * Steward-side display flag set by the PlacedFeaturesCard visibility
   * toggle. When `true`, canvas layers suppress this element; the row
   * still appears in the inventory (dimmed) so the steward can toggle
   * it back on. Independent of `hiddenInViews` (per-view authoring
   * filter) — `hidden` hides everywhere.
   */
  hidden?: boolean;
}
