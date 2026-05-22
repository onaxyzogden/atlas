/**
 * Collect the provenance citations behind a project's stewardship-program
 * cost rollup. Each habitat / agroforestry / tree-planting catalog entry
 * carries a `sources: *Source[]` array (NRCS practice codes + extension-org
 * references); this module normalizes those three structurally-parallel
 * source shapes into a single `Citation` form and gathers the deduped set
 * for the kinds the steward has actually placed.
 *
 * Only catalogs that contributed a placed element are cited — an empty
 * agroforestry program contributes no agroforestry citations. Cover-crop
 * costs carry no `*Source[]` array (they cite via a flat `citation` string in
 * the cover-crop catalog) and are intentionally out of scope here.
 *
 * Pure — no store reads, all dependencies injected. Mirrors the join walk in
 * `computeStewardshipProgramsCashflow` so the citations track the same set of
 * placed elements the costs are derived from.
 */

import type { WorkItem } from '@ogden/shared';
import type { DesignElement } from '../../store/designElementsStore.js';
import {
  HABITAT_FEATURE_CATALOG,
  type HabitatFeatureCatalogEntry,
  type HabitatSource,
} from '../biodiversity/habitatFeatureCatalog.js';
import {
  AGROFORESTRY_CATALOG,
  type AgroforestryCatalogEntry,
  type AgroforestrySource,
} from '../vegetation/agroforestryCatalog.js';
import {
  TREE_PLANTING_CATALOG,
  type TreePlantingCatalogEntry,
  type TreePlantingSource,
} from '../vegetation/treePlantingCatalog.js';

/** Normalized citation shape across all three stewardship catalogs. */
export interface Citation {
  /** NRCS conservation-practice standard, or an extension-org reference. */
  kind: 'nrcs-practice' | 'extension';
  /** Practice code (NRCS) or org slug (extension) — the short pill label. */
  label: string;
  /** The full human-readable reference string. */
  ref: string;
}

type AnySource = HabitatSource | AgroforestrySource | TreePlantingSource;

function normalizeSource(src: AnySource): Citation {
  if (src.kind === 'nrcs-practice') {
    return { kind: 'nrcs-practice', label: src.code, ref: src.ref };
  }
  return { kind: 'extension', label: src.org, ref: src.ref };
}

export function collectStewardshipCitations(args: {
  projectId: string;
  items: WorkItem[];
  designElements: DesignElement[];
  habitatCatalog?: readonly HabitatFeatureCatalogEntry[];
  agroforestryCatalog?: readonly AgroforestryCatalogEntry[];
  treePlantingCatalog?: readonly TreePlantingCatalogEntry[];
}): Citation[] {
  const { projectId, items, designElements } = args;
  const habitatCatalog = args.habitatCatalog ?? HABITAT_FEATURE_CATALOG;
  const agroforestryCatalog = args.agroforestryCatalog ?? AGROFORESTRY_CATALOG;
  const treePlantingCatalog = args.treePlantingCatalog ?? TREE_PLANTING_CATALOG;

  const elById = new Map(designElements.map((e) => [e.id, e]));
  const seen = new Set<string>();
  const out: Citation[] = [];

  const push = (src: AnySource) => {
    const c = normalizeSource(src);
    const key = `${c.kind}::${c.ref}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(c);
  };

  for (const it of items) {
    if (it.projectId !== projectId) continue;

    if (it.source === 'habitat-feature' && it.generatedFromHabitatElement) {
      const el = elById.get(it.generatedFromHabitatElement);
      const entry = el && habitatCatalog.find((e) => e.kind === el.kind);
      if (entry) entry.sources.forEach(push);
    } else if (it.source === 'agroforestry' && it.generatedFromAgroforestryElement) {
      const el = elById.get(it.generatedFromAgroforestryElement);
      const entry = el && agroforestryCatalog.find((e) => e.kind === el.kind);
      if (entry) entry.sources.forEach(push);
    } else if (it.source === 'tree-planting' && it.generatedFromTreeElement) {
      const el = elById.get(it.generatedFromTreeElement);
      const entry = el && treePlantingCatalog.find((e) => e.kind === el.kind);
      if (entry) entry.sources.forEach(push);
    }
  }

  return out;
}
