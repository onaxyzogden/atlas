/**
 * Agroforestry → WorkItem spine write seam (Slice 8-C of the
 * 2026-05-21 habitat-feature unification).
 *
 * Mirrors `habitatFeatureSpineSync` 1:1 (swap source + catalog). One
 * WorkItem per agroforestry DesignElement across three kinds: hedgerow
 * (line, `vegetation` category), orchard (polygon, `grazing`
 * category), silvopasture (polygon, `grazing` category). Source value
 * `'agroforestry'` spans both category partitions as a single
 * semantic umbrella for multi-stem long-lived plantings.
 *
 * Per-element WorkItem:
 *   id:          `agf__<designElement.id>` (stable, idempotent)
 *   source:      'agroforestry'
 *   overridden:  false
 *   title:       "Plant hedgerow" / "Establish orchard" / "Establish silvopasture"
 *   designLayer: 'vegetation'
 *   phaseId:     null (steward override drives declared-phase linkage)
 *
 * D2 (resourcing) + D3 (costing) ship together with this slice: the
 * seeder writes `materialsAuto` (one rolled-up kit line, scaled by
 * geometry), `costRangeAuto` (per-element band scaled by geometry), and
 * `laborHrs` (per-meter or per-m² rate × geometry). Project-wide
 * rollup lives in
 * `agroforestryEconomicsMath.computeAgroforestryProgramEconomics`.
 *
 * Covenant: strictly D0 work-tracking + D2/D3 project-cost surfaces —
 * no riba / gharar / CSRA / salam / investor / financing /
 * cost-of-capital semantics.
 */

import type { WorkItem, MaterialLine, CostRange } from '@ogden/shared';
import type { DesignElement } from '../../store/designElementsStore.js';
import { getDesignElementsForProject } from '../../store/builtEnvironmentSelectors.js';
import { useWorkItemStore } from '../../store/workItemStore.js';
import {
  AGROFORESTRY_CATALOG,
  agroforestryElementScale,
  scaledAgroforestryCostBand,
  scaledAgroforestryMaterials,
  type AgroforestryCatalogEntry,
} from './agroforestryCatalog.js';

/** Three agroforestry kinds the seeder owns. */
export const AGROFORESTRY_KINDS = [
  'hedgerow',
  'orchard',
  'silvopasture',
] as const;

export type AgroforestryKind = (typeof AGROFORESTRY_KINDS)[number];

/** Verb-led title shown on the work-item card. */
const AGROFORESTRY_TITLES: Record<AgroforestryKind, string> = {
  hedgerow: 'Plant hedgerow',
  orchard: 'Establish orchard',
  silvopasture: 'Establish silvopasture',
};

/** Stable composite id: `agf__<designElement.id>`. */
export function agroforestryProvenanceId(designElementId: string): string {
  return `agf__${designElementId}`;
}

function isAgroforestryKind(kind: string): kind is AgroforestryKind {
  return (AGROFORESTRY_KINDS as readonly string[]).includes(kind);
}

/**
 * Geometry guard. Hedgerow must be a LineString; orchard and
 * silvopasture must be Polygons. Misclassified DesignElements (e.g.
 * an orchard accidentally drawn as a line) are silently skipped — the
 * seeder is defensive, not corrective.
 */
function geometryMatchesKind(el: DesignElement, kind: AgroforestryKind): boolean {
  if (kind === 'hedgerow') return el.geometry.type === 'LineString';
  // orchard | silvopasture
  return el.geometry.type === 'Polygon';
}

/**
 * Pure: build the WorkItem set an agroforestry generation would emit
 * for a project. One WorkItem per agroforestry-kind DesignElement.
 * Non-matching geometries are silently filtered (defensive).
 */
export function seedAgroforestryWorkItems(args: {
  projectId: string;
  designElements: DesignElement[];
  catalog?: readonly AgroforestryCatalogEntry[];
  now?: () => string;
}): WorkItem[] {
  const { projectId, designElements } = args;
  const catalog = args.catalog ?? AGROFORESTRY_CATALOG;
  const nowFn = args.now ?? (() => new Date().toISOString());
  const created = nowFn();
  const out: WorkItem[] = [];
  for (const el of designElements) {
    if (!isAgroforestryKind(el.kind)) continue;
    if (!geometryMatchesKind(el, el.kind)) continue;
    const entry = catalog.find((e) => e.kind === el.kind);
    let materialsAuto: MaterialLine[] = [];
    let costRangeAuto: CostRange | undefined;
    let laborHrs: number | undefined;
    if (entry) {
      const scale = agroforestryElementScale(el, entry.geometry);
      materialsAuto = scaledAgroforestryMaterials(entry, scale);
      costRangeAuto = scaledAgroforestryCostBand(entry, scale);
      laborHrs = entry.installLaborHrs * scale;
    }
    const item: WorkItem = {
      id: agroforestryProvenanceId(el.id),
      projectId,
      source: 'agroforestry',
      overridden: false,
      generatedFromAgroforestryElement: el.id,
      createdAt: created,
      updatedAt: created,
      title: AGROFORESTRY_TITLES[el.kind],
      designLayer: 'vegetation',
      phaseId: null,
      status: 'todo',
      doneAt: null,
      dependsOn: [],
      dependsOnAuto: [],
      precedesAuto: [],
      materialsAuto,
      equipmentRequiredAuto: [],
      linkedFeatureId: el.id,
      notes: '',
    };
    if (costRangeAuto) item.costRangeAuto = costRangeAuto;
    if (laborHrs !== undefined) item.laborHrs = laborHrs;
    out.push(item);
  }
  return out;
}

/**
 * Pure helper — derive agroforestry-seeded `costRangeAuto` per
 * WorkItem id. Mirrors `seedHabitatFeatureCosts`. Items lacking a
 * catalog entry or a recoverable source DesignElement are omitted.
 */
export function seedAgroforestryCosts(args: {
  items: WorkItem[];
  designElements: DesignElement[];
  catalog?: readonly AgroforestryCatalogEntry[];
}): Map<string, CostRange> {
  const { items, designElements } = args;
  const catalog = args.catalog ?? AGROFORESTRY_CATALOG;
  const elById = new Map(designElements.map((e) => [e.id, e]));
  const out = new Map<string, CostRange>();
  for (const it of items) {
    if (it.source !== 'agroforestry') continue;
    const elId = it.generatedFromAgroforestryElement;
    if (!elId) continue;
    const el = elById.get(elId);
    if (!el) continue;
    const entry = catalog.find((e) => e.kind === el.kind);
    if (!entry) continue;
    const scale = agroforestryElementScale(el, entry.geometry);
    out.set(it.id, scaledAgroforestryCostBand(entry, scale));
  }
  return out;
}

/**
 * Pure helper — derive agroforestry-seeded resourcing per WorkItem id.
 * Mirrors `seedHabitatFeatureResources`. Empty `equipment` (hand-tool
 * + bare-root planting, no machinery in the per-element BOM); scaled
 * `materials` array.
 */
export function seedAgroforestryResources(args: {
  items: WorkItem[];
  designElements: DesignElement[];
  catalog?: readonly AgroforestryCatalogEntry[];
}): Map<string, { equipment: string[]; materials: MaterialLine[] }> {
  const { items, designElements } = args;
  const catalog = args.catalog ?? AGROFORESTRY_CATALOG;
  const elById = new Map(designElements.map((e) => [e.id, e]));
  const out = new Map<
    string,
    { equipment: string[]; materials: MaterialLine[] }
  >();
  for (const it of items) {
    if (it.source !== 'agroforestry') continue;
    const elId = it.generatedFromAgroforestryElement;
    if (!elId) continue;
    const el = elById.get(elId);
    if (!el) continue;
    const entry = catalog.find((e) => e.kind === el.kind);
    if (!entry) continue;
    const scale = agroforestryElementScale(el, entry.geometry);
    out.set(it.id, {
      equipment: [],
      materials: scaledAgroforestryMaterials(entry, scale),
    });
  }
  return out;
}

/**
 * Push a fresh agroforestry generation onto the spine. Preserves
 * steward-overridden + every non-agroforestry row (cross-source
 * preservation gate). Mirrors `pushHabitatFeaturesToSpine` shape.
 */
export function pushAgroforestryToSpine(projectId: string): void {
  const designElements = getDesignElementsForProject(projectId);
  const items = seedAgroforestryWorkItems({ projectId, designElements });
  useWorkItemStore.getState().replaceAgroforestryRows(projectId, items);
}
