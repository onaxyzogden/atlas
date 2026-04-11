/**
 * Enterprise detector — identifies revenue-generating enterprise types
 * from the combination of placed features on the map.
 */

import type { AllFeaturesInput, EnterpriseType } from './types.js';

const M2_PER_ACRE = 4047;

const GUEST_STRUCTURE_TYPES = new Set(['cabin', 'yurt', 'tent_glamping']);
const GATHERING_STRUCTURE_TYPES = new Set(['pavilion', 'fire_circle', 'lookout']);

export function detectEnterprises(
  zones: AllFeaturesInput['zones'],
  structures: AllFeaturesInput['structures'],
  paddocks: AllFeaturesInput['paddocks'],
  crops: AllFeaturesInput['crops'],
): EnterpriseType[] {
  const enterprises: EnterpriseType[] = [];

  // Livestock: any paddock with species assigned
  if (paddocks.some((p) => p.species.length > 0)) {
    enterprises.push('livestock');
  }

  // Orchard: crop areas of type orchard or food_forest
  if (crops.some((c) => c.type === 'orchard' || c.type === 'food_forest')) {
    enterprises.push('orchard');
  }

  // Market garden: crop areas of type market_garden, garden_bed, or row_crop
  if (crops.some((c) => c.type === 'market_garden' || c.type === 'garden_bed' || c.type === 'row_crop')) {
    enterprises.push('market_garden');
  }

  // Retreat: retreat zone + guest accommodation structure
  const hasRetreatZone = zones.some((z) => z.category === 'retreat');
  const hasGuestStructure = structures.some((s) => GUEST_STRUCTURE_TYPES.has(s.type));
  if (hasRetreatZone && hasGuestStructure) {
    enterprises.push('retreat');
  }

  // Education: education zone + classroom structure
  const hasEducationZone = zones.some((z) => z.category === 'education');
  const hasClassroom = structures.some((s) => s.type === 'classroom');
  if (hasEducationZone && hasClassroom) {
    enterprises.push('education');
  }

  // Agritourism: commons zone + gathering structure
  const hasCommonsZone = zones.some((z) => z.category === 'commons');
  const hasGatheringStructure = structures.some((s) => GATHERING_STRUCTURE_TYPES.has(s.type));
  if (hasCommonsZone && hasGatheringStructure) {
    enterprises.push('agritourism');
  }

  // Carbon: conservation zone > 5 acres
  const hasLargeConservation = zones.some(
    (z) => z.category === 'conservation' && z.areaM2 > 5 * M2_PER_ACRE,
  );
  if (hasLargeConservation) {
    enterprises.push('carbon');
  }

  // Grants: any agricultural or conservation zone present
  const hasAgriOrConservation = zones.some(
    (z) => z.category === 'food_production' || z.category === 'livestock' || z.category === 'conservation',
  );
  if (hasAgriOrConservation || paddocks.length > 0 || crops.length > 0) {
    enterprises.push('grants');
  }

  return enterprises;
}

/**
 * Count the number of revenue-generating units for a given enterprise.
 * Used to scale revenue benchmarks by actual feature quantities.
 */
export function countEnterpriseUnits(
  enterprise: EnterpriseType,
  input: AllFeaturesInput,
): number {
  switch (enterprise) {
    case 'livestock': {
      // Total paddock area in hectares
      const totalM2 = input.paddocks
        .filter((p) => p.species.length > 0)
        .reduce((sum, p) => sum + p.areaM2, 0);
      return totalM2 / 10000; // hectares
    }
    case 'orchard': {
      const totalM2 = input.crops
        .filter((c) => c.type === 'orchard' || c.type === 'food_forest')
        .reduce((sum, c) => sum + c.areaM2, 0);
      return totalM2 / M2_PER_ACRE; // acres
    }
    case 'market_garden': {
      const totalM2 = input.crops
        .filter((c) => c.type === 'market_garden' || c.type === 'garden_bed' || c.type === 'row_crop')
        .reduce((sum, c) => sum + c.areaM2, 0);
      return totalM2 / M2_PER_ACRE; // acres
    }
    case 'retreat': {
      return input.structures.filter((s) => GUEST_STRUCTURE_TYPES.has(s.type)).length; // cabins
    }
    case 'education': {
      return input.structures.filter((s) => s.type === 'classroom').length; // classrooms
    }
    case 'agritourism': {
      return input.structures.filter((s) => GATHERING_STRUCTURE_TYPES.has(s.type)).length; // venues
    }
    case 'carbon': {
      const totalM2 = input.zones
        .filter((z) => z.category === 'conservation')
        .reduce((sum, z) => sum + z.areaM2, 0);
      return totalM2 / M2_PER_ACRE; // acres
    }
    case 'grants':
      return 1; // per project
    default:
      return 0;
  }
}
