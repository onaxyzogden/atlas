/**
 * Habitat-feature D1 predecessor projection (Slice 8-B of the 2026-05-21
 * habitat-feature unification). Mirrors `coverCropDependencyGraph` shape:
 * a pure helper that turns the steward-named
 * `habitatMetadata.hostTreeFeatureId` linkage into per-WorkItem
 * `dependsOnAuto` edges, without forcing a spine push.
 *
 * Edge rule: a habitat feature with a `hostTreeFeatureId` pointing at a
 * placed vegetation-category point DesignElement (oak-tree / pine-tree /
 * apple-tree / shrub) emits a single auto-edge:
 *
 *   `hf__<habitatElId>`  →  depends on  →  `tree__<hostId>`
 *
 * Otherwise the auto-edge set is empty. Missing host, non-vegetation
 * host, non-tree-kind host, or non-point host all silently collapse to
 * "no edge" — the habitat WorkItem stays valid, just unblocked.
 *
 * Stewardship sovereignty: the steward names the host; the system never
 * auto-infers one. The seeder validates the target's category + kind
 * before projecting the edge.
 *
 * Covenant: strictly D1 work-tracking. No riba / gharar / CSRA / salam /
 * investor / financing / cost-of-capital semantics.
 */

import type { DesignElement } from '../../store/designElementsStore.js';
import {
  TREE_PLANTING_KINDS,
  treePlantingProvenanceId,
} from '../vegetation/treePlantingSpineSync.js';
import {
  HABITAT_FEATURE_KINDS,
  habitatFeatureProvenanceId,
} from './habitatFeatureSpineSync.js';

function isTreePlantingKind(kind: string): boolean {
  return (TREE_PLANTING_KINDS as readonly string[]).includes(kind);
}

function isHabitatFeatureKind(kind: string): boolean {
  return (HABITAT_FEATURE_KINDS as readonly string[]).includes(kind);
}

/**
 * Pure: build a `Map<habitatWorkItemId, dependsOnAuto[]>` from the
 * placed DesignElements. Habitat features without a resolvable host
 * are omitted from the map entirely (caller defaults to `[]`).
 */
export function seedHabitatFeatureDependencies(args: {
  designElements: DesignElement[];
}): Map<string, string[]> {
  const { designElements } = args;
  const elById = new Map(designElements.map((e) => [e.id, e]));
  const out = new Map<string, string[]>();
  for (const el of designElements) {
    if (!isHabitatFeatureKind(el.kind)) continue;
    const hostId = el.habitatMetadata?.hostTreeFeatureId;
    if (!hostId) continue;
    const host = elById.get(hostId);
    if (!host) continue;
    if (host.category !== 'vegetation') continue;
    if (!isTreePlantingKind(host.kind)) continue;
    if (host.geometry.type !== 'Point') continue;
    out.set(habitatFeatureProvenanceId(el.id), [treePlantingProvenanceId(host.id)]);
  }
  return out;
}
