/**
 * commitDrafts — the only impure step of the Auto-Design pipeline.
 *
 * `runAutoDesign` is pure: it returns `DraftShape[]` and scheduled tasks
 * but writes nothing. This module takes that output and materialises it
 * into the two design stores as *draft* rows (`draft: true` +
 * `generationId` + `draftClass`), so the existing canvas layers render
 * them dashed and `generatorDraftStore`'s commit/discard verbs can
 * promote or cascade-delete them by generation.
 *
 * Routing:
 *   - livestock tile-strip interventions  → `livestockStore` Paddock rows
 *   - permanent-perimeter-fence (edge)    → `livestockStore` FenceLine
 *   - everything else                     → `landDesignStore` DesignElement
 *
 * The intervention → kind/category/class table is data (below), mirroring
 * the catalog's own `designLayer`. Structure-class kinds are written to
 * `landDesignStore` for the draft-review MVP rather than the V2 structure
 * store — drafts never leave review without an explicit Accept, and
 * Phase 2 (per ADR 2026-05-14) re-homes accepted structures into V2.
 *
 * Spec: wiki/decisions/2026-05-14-auto-design-pipeline.md.
 */

import { useLandDesignStore } from '../../../../store/landDesignStore.js';
import {
  useLivestockStore,
  type Paddock,
  type FenceLine,
  type LivestockSpecies,
} from '../../../../store/livestockStore.js';
import { useGeneratorDraftStore } from '../../../../store/generatorDraftStore.js';
import type { DesignElement } from '../../../../store/designElementsStore.js';
import type { DesignCategory } from '../../canvas/elementCatalog.js';
import type { PhaseKey } from '../../types.js';
import { getIntervention } from '../../data/interventionCatalog.js';
import type { AutoDesignResult } from './runAutoDesign.js';

type Target = 'paddock' | 'fence' | 'element';

interface InterventionMapping {
  target: Target;
  /** elementCatalog kind (when target === 'element'). */
  kind?: string;
  /** DesignElement category (when target === 'element'). */
  category?: DesignCategory;
  /** DraftReviewBar feature-class bucket. */
  draftClass: string;
  /** Default livestock species (when target === 'paddock'). */
  species?: LivestockSpecies[];
}

/**
 * Per-intervention routing. Keyed by catalog id; `draftClass` mirrors the
 * catalog's `designLayer` where present. Interventions with no
 * geometryTemplate (e.g. parcel-assessment) never produce drafts so they
 * are absent here. Unknown ids fall back to a generic vegetation element.
 */
const MAPPING: Record<string, InterventionMapping> = {
  'keyline-access-track': {
    target: 'element',
    kind: 'road',
    category: 'access',
    draftClass: 'access',
  },
  'swale-system': {
    target: 'element',
    kind: 'swale',
    category: 'earthworks',
    draftClass: 'water',
  },
  'earthen-pond': {
    target: 'element',
    kind: 'pond',
    category: 'water',
    draftClass: 'water',
  },
  'roof-catchment-tanks': {
    target: 'element',
    kind: 'water-tank',
    category: 'structure',
    draftClass: 'water',
  },
  'cover-crop-rebuild': {
    target: 'element',
    kind: 'pasture-mix',
    category: 'vegetation',
    draftClass: 'vegetation',
  },
  'compost-system': {
    target: 'element',
    kind: 'compost',
    category: 'structure',
    draftClass: 'structures',
  },
  'kitchen-garden': {
    target: 'element',
    kind: 'raised-bed',
    category: 'vegetation',
    draftClass: 'vegetation',
  },
  'food-forest': {
    target: 'element',
    kind: 'orchard',
    category: 'vegetation',
    draftClass: 'vegetation',
  },
  'poultry-coop': {
    target: 'element',
    kind: 'shed',
    category: 'structure',
    draftClass: 'structures',
  },
  'small-ruminant-paddock': {
    target: 'paddock',
    draftClass: 'livestock',
    species: ['sheep'],
  },
  'permanent-perimeter-fence': {
    target: 'fence',
    draftClass: 'livestock',
  },
  'cattle-rotational-grazing': {
    target: 'paddock',
    draftClass: 'livestock',
    species: ['cattle'],
  },
  'paddock-water-network': {
    target: 'element',
    kind: 'water-tank',
    category: 'structure',
    draftClass: 'water',
  },
  'livestock-shelter-windbreak': {
    target: 'element',
    kind: 'hedgerow',
    category: 'vegetation',
    draftClass: 'vegetation',
  },
  'pasture-renovation-overseed': {
    target: 'element',
    kind: 'pasture-mix',
    category: 'vegetation',
    draftClass: 'vegetation',
  },
  'coppice-woodlot': {
    target: 'element',
    kind: 'orchard',
    category: 'vegetation',
    draftClass: 'vegetation',
  },
  'solar-pv': {
    target: 'element',
    kind: 'shed',
    category: 'structure',
    draftClass: 'structures',
  },
  'orchard-block': {
    target: 'element',
    kind: 'orchard',
    category: 'vegetation',
    draftClass: 'vegetation',
  },
  'value-add-kitchen': {
    target: 'element',
    kind: 'shed',
    category: 'structure',
    draftClass: 'structures',
  },
};

const FALLBACK: InterventionMapping = {
  target: 'element',
  kind: 'shrub',
  category: 'vegetation',
  draftClass: 'vegetation',
};

/**
 * Materialise a generation's drafts into the design stores and open it on
 * the DraftReviewBar. Returns the count written per store for the caller's
 * status line. Idempotent only at the generation level — calling twice
 * with the same generationId double-writes; callers use a fresh id.
 */
export function commitDrafts(
  projectId: string,
  result: AutoDesignResult,
): { elements: number; paddocks: number; fences: number } {
  const land = useLandDesignStore.getState();
  const ls = useLivestockStore.getState();
  const now = new Date().toISOString();

  const elements: DesignElement[] = [];
  let paddocks = 0;
  let fences = 0;
  let paddockLetter = 0;

  for (const d of result.drafts) {
    const intervention = getIntervention(d.interventionId);
    const map = MAPPING[d.interventionId] ?? FALLBACK;
    const phase = (intervention?.yeomansPhase ?? 'soil') as PhaseKey;

    if (map.target === 'paddock' && d.geometry.type === 'Polygon') {
      const name = `Paddock ${String.fromCharCode(65 + (paddockLetter % 26))}`;
      paddockLetter += 1;
      const paddock: Paddock = {
        id: d.id,
        projectId,
        name,
        color: '#7cb342',
        geometry: d.geometry,
        areaM2: d.areaM2,
        grazingCellGroup: d.generationId,
        species: map.species ?? [],
        stockingDensity: null,
        fencing: 'temporary',
        guestSafeBuffer: false,
        waterPointNote: '',
        shelterNote: '',
        phase,
        notes: 'Auto-Design draft',
        draft: true,
        generationId: d.generationId,
        createdAt: now,
        updatedAt: now,
      };
      ls.addPaddock(paddock);
      paddocks += 1;
      continue;
    }

    if (map.target === 'fence' && d.geometry.type === 'LineString') {
      const fence: FenceLine = {
        id: d.id,
        projectId,
        name: 'Perimeter fence',
        geometry: d.geometry,
        fenceType: 'woven_wire',
        mobility: 'permanent',
        draft: true,
        generationId: d.generationId,
        phase,
        notes: 'Auto-Design draft',
        createdAt: now,
        updatedAt: now,
      };
      ls.addFenceLine(fence);
      fences += 1;
      continue;
    }

    elements.push({
      id: d.id,
      category: map.category ?? 'vegetation',
      kind: map.kind ?? 'shrub',
      geometry: d.geometry,
      phase,
      acreage: d.areaM2 > 0 ? d.areaM2 / 4046.8564224 : undefined,
      createdAt: now,
      view: 'current',
      draft: true,
      generationId: d.generationId,
      draftClass: map.draftClass,
    });
  }

  if (elements.length) land.addMany(projectId, elements);
  useGeneratorDraftStore
    .getState()
    .beginGeneration(projectId, result.generationId);

  return { elements: elements.length, paddocks, fences };
}
