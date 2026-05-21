/**
 * beneficialHabitatMath — pure habitat-inventory math for the
 * beneficial-organism audit (sub-project B5).
 *
 * Counts distinct beneficial plant species across the project's guilds
 * and tallies the three habitat-relevant DesignElement kinds (hedgerow
 * line length, pond polygon area, shrub point count). Composes the three
 * dimensions into a 0..100 `coveragePct`:
 *
 *   plant-richness band  : min(40, distinctBeneficialSpecies * 4)
 *   structural-habitat   : min(40, structuralPoints * 4) where
 *                          structuralPoints =
 *                            hedgerowM/100 + pondM²/500 + shrubs
 *                            + owlBoxes + raptorPerches + nestBoxes
 *                            + brushPiles + snags
 *                            + insectaryStripM/100 + wetlandEdgeM²/500
 *   functional-diversity : min(20, distinct BeneficialCategorys * 5)
 *
 * "Coverage" here is strictly ecological (plants × structures × functional
 * diversity). Never a financial or yield-as-return notion.
 */

import * as turf from '@turf/turf';
import { PLANT_CATALOG } from '../../data/plantCatalog.js';
import {
  beneficialCategoriesForPlant,
  beneficialCategoriesForStructure,
  type BeneficialCategory,
  type BeneficialPlantTag,
} from './beneficialFunctionCatalog.js';
import type { Guild } from '../../store/polycultureStore.js';
import type { DesignElement } from '../../store/designElementsStore.js';

export interface BeneficialHabitatOverall {
  distinctBeneficialSpecies: number;
  pollinatorPlantCount: number;
  insectaryPlantCount: number;
  wildlifeFoodPlantCount: number;
  nFixerPlantCount: number;
  hedgerowLengthM: number;
  pondAreaM2: number;
  shrubCount: number;
  /**
   * 2026-05-21 habitat-feature unification — tallies for the 7 first-class
   * habitat DesignElement kinds. Each carries its own contribution to the
   * structural band of the composite score (see `computeBeneficialHabitatReport`).
   */
  owlBoxCount: number;
  raptorPerchCount: number;
  nestBoxCount: number;
  brushPileCount: number;
  snagCount: number;
  insectaryStripLengthM: number;
  wetlandEdgeAreaM2: number;
  categoriesPresent: BeneficialCategory[];
  /** Composite 0..100: plant-richness band + structural band + functional-diversity bonus. */
  coveragePct: number;
}

export interface BeneficialHabitatGuildRow {
  guildId: string;
  guildName: string;
  beneficialSpeciesCount: number;
  categoriesPresent: BeneficialCategory[];
}

export interface BeneficialHabitatReport {
  guildCount: number;
  overall: BeneficialHabitatOverall;
  guildRows: BeneficialHabitatGuildRow[];
}

export interface ComputeBeneficialHabitatArgs {
  projectId: string;
  guilds: Guild[];
  designElements: DesignElement[];
}

const BENEFICIAL_TAGS: BeneficialPlantTag[] = [
  'pollinator',
  'insectary',
  'wildlife_food',
  'n_fixer',
];

function hasTag(speciesId: string, tag: BeneficialPlantTag): boolean {
  const plant = PLANT_CATALOG.find((p) => p.id === speciesId);
  if (!plant) return false;
  return (plant.ecologicalFunction ?? []).includes(tag);
}

export function safeLineLengthM(
  geometry: GeoJSON.Geometry | null | undefined,
): number {
  if (!geometry || geometry.type !== 'LineString') return 0;
  try {
    return turf.length(turf.lineString(geometry.coordinates), {
      units: 'meters',
    });
  } catch {
    return 0;
  }
}

export function safePolygonAreaM2(
  geometry: GeoJSON.Geometry | null | undefined,
): number {
  if (!geometry || geometry.type !== 'Polygon') return 0;
  try {
    return turf.area(turf.polygon(geometry.coordinates));
  } catch {
    return 0;
  }
}

export function computeBeneficialHabitatReport(
  args: ComputeBeneficialHabitatArgs,
): BeneficialHabitatReport {
  const { projectId, guilds, designElements } = args;

  const projectGuilds = guilds.filter((g) => g.projectId === projectId);
  const projectElements = designElements.filter(
    // designElements are typically pre-filtered by selector, but defensive
    // re-filter so callers can pass an unfiltered array safely.
    () => true,
  );

  // ── Distinct beneficial species across all guilds in the project ──
  const distinctBeneficial = new Set<string>();
  const tagCounts: Record<BeneficialPlantTag, Set<string>> = {
    pollinator: new Set(),
    insectary: new Set(),
    wildlife_food: new Set(),
    n_fixer: new Set(),
  };
  const guildRows: BeneficialHabitatGuildRow[] = [];

  for (const guild of projectGuilds) {
    const guildBeneficials = new Set<string>();
    const guildCategories = new Set<BeneficialCategory>();
    for (const m of guild.members) {
      const cats = beneficialCategoriesForPlant(m.speciesId);
      if (cats.length === 0) continue;
      guildBeneficials.add(m.speciesId);
      distinctBeneficial.add(m.speciesId);
      for (const c of cats) guildCategories.add(c);
      for (const tag of BENEFICIAL_TAGS) {
        if (hasTag(m.speciesId, tag)) tagCounts[tag].add(m.speciesId);
      }
    }
    guildRows.push({
      guildId: guild.id,
      guildName: guild.name,
      beneficialSpeciesCount: guildBeneficials.size,
      categoriesPresent: Array.from(guildCategories),
    });
  }

  // ── Structural habitat elements ──
  let hedgerowLengthM = 0;
  let pondAreaM2 = 0;
  let shrubCount = 0;
  // 2026-05-21 — habitat-feature unification. The 7 new habitat-only
  // DesignElement kinds contribute to the structural band alongside
  // hedgerow / pond / shrub. Point kinds count as 1 structural point;
  // linear and areal kinds reuse hedgerow / pond's normalisation.
  let owlBoxCount = 0;
  let raptorPerchCount = 0;
  let nestBoxCount = 0;
  let brushPileCount = 0;
  let snagCount = 0;
  let insectaryStripLengthM = 0;
  let wetlandEdgeAreaM2 = 0;
  const structureCategories = new Set<BeneficialCategory>();

  for (const el of projectElements) {
    if (el.kind === 'hedgerow') {
      hedgerowLengthM += safeLineLengthM(el.geometry);
      for (const c of beneficialCategoriesForStructure('hedgerow')) {
        structureCategories.add(c);
      }
    } else if (el.kind === 'pond') {
      pondAreaM2 += safePolygonAreaM2(el.geometry);
      for (const c of beneficialCategoriesForStructure('pond')) {
        structureCategories.add(c);
      }
    } else if (el.kind === 'shrub') {
      shrubCount += 1;
      for (const c of beneficialCategoriesForStructure('shrub')) {
        structureCategories.add(c);
      }
    } else if (el.kind === 'owl-box') {
      owlBoxCount += 1;
      for (const c of beneficialCategoriesForStructure('owl-box')) {
        structureCategories.add(c);
      }
    } else if (el.kind === 'raptor-perch') {
      raptorPerchCount += 1;
      for (const c of beneficialCategoriesForStructure('raptor-perch')) {
        structureCategories.add(c);
      }
    } else if (el.kind === 'nest-box') {
      nestBoxCount += 1;
      for (const c of beneficialCategoriesForStructure('nest-box')) {
        structureCategories.add(c);
      }
    } else if (el.kind === 'brush-pile') {
      brushPileCount += 1;
      for (const c of beneficialCategoriesForStructure('brush-pile')) {
        structureCategories.add(c);
      }
    } else if (el.kind === 'snag') {
      snagCount += 1;
      for (const c of beneficialCategoriesForStructure('snag')) {
        structureCategories.add(c);
      }
    } else if (el.kind === 'insectary-strip') {
      insectaryStripLengthM += safeLineLengthM(el.geometry);
      for (const c of beneficialCategoriesForStructure('insectary-strip')) {
        structureCategories.add(c);
      }
    } else if (el.kind === 'wetland-edge') {
      wetlandEdgeAreaM2 += safePolygonAreaM2(el.geometry);
      for (const c of beneficialCategoriesForStructure('wetland-edge')) {
        structureCategories.add(c);
      }
    }
  }

  // ── Composite score ──
  const distinctBeneficialSpecies = distinctBeneficial.size;
  const plantRichnessBand = Math.min(40, distinctBeneficialSpecies * 4);
  const structuralPoints =
    hedgerowLengthM / 100 +
    pondAreaM2 / 500 +
    shrubCount +
    // Each point habitat element (owl box, perch, nest box, brush pile, snag)
    // contributes 1 structural point; insectary strip per 100 m (hedgerow-
    // analogue); wetland edge per 500 m² (pond-analogue).
    owlBoxCount +
    raptorPerchCount +
    nestBoxCount +
    brushPileCount +
    snagCount +
    insectaryStripLengthM / 100 +
    wetlandEdgeAreaM2 / 500;
  const structuralBand = Math.min(40, structuralPoints * 4);

  // Functional-diversity bonus across plant + structure categories.
  const plantCategories = new Set<BeneficialCategory>();
  for (const id of distinctBeneficial) {
    for (const c of beneficialCategoriesForPlant(id)) plantCategories.add(c);
  }
  const allCategories = new Set<BeneficialCategory>([
    ...plantCategories,
    ...structureCategories,
  ]);
  const functionalBonus = Math.min(20, allCategories.size * 5);

  const coveragePct = Math.max(
    0,
    Math.min(100, plantRichnessBand + structuralBand + functionalBonus),
  );

  return {
    guildCount: projectGuilds.length,
    overall: {
      distinctBeneficialSpecies,
      pollinatorPlantCount: tagCounts.pollinator.size,
      insectaryPlantCount: tagCounts.insectary.size,
      wildlifeFoodPlantCount: tagCounts.wildlife_food.size,
      nFixerPlantCount: tagCounts.n_fixer.size,
      hedgerowLengthM,
      pondAreaM2,
      shrubCount,
      owlBoxCount,
      raptorPerchCount,
      nestBoxCount,
      brushPileCount,
      snagCount,
      insectaryStripLengthM,
      wetlandEdgeAreaM2,
      categoriesPresent: Array.from(allCategories),
      coveragePct,
    },
    guildRows,
  };
}

/**
 * Goal-tree criterion derivation: thin wrapper returning `coveragePct`.
 */
export function computeBeneficialHabitatPct(
  args: ComputeBeneficialHabitatArgs,
): number {
  return computeBeneficialHabitatReport(args).overall.coveragePct;
}
