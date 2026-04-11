/**
 * Test helpers — factories for AllFeaturesInput and SiteContext.
 */

import type { AllFeaturesInput, SiteContext } from '../../features/financial/engine/types.js';
import { DEFAULT_SITE_CONTEXT } from '../../features/financial/engine/types.js';

/** Empty AllFeaturesInput */
export function emptyInput(): AllFeaturesInput {
  return {
    zones: [],
    structures: [],
    paddocks: [],
    paths: [],
    utilities: [],
    crops: [],
  };
}

/** Default test SiteContext */
export function defaultSiteContext(overrides?: Partial<SiteContext>): SiteContext {
  return { ...DEFAULT_SITE_CONTEXT, ...overrides };
}

/** Regenerative farm scenario — livestock paddocks, orchard, conservation */
export function regenerativeFarmScenario(): AllFeaturesInput {
  return {
    zones: [
      { id: 'z1', projectId: 'p1', name: 'Food Production', category: 'food_production', areaM2: 20000 },
      { id: 'z2', projectId: 'p1', name: 'Livestock Zone', category: 'livestock', areaM2: 40000 },
      { id: 'z3', projectId: 'p1', name: 'Conservation Area', category: 'conservation', areaM2: 30000 },
      { id: 'z4', projectId: 'p1', name: 'Habitation', category: 'habitation', areaM2: 5000 },
    ],
    structures: [
      { id: 's1', projectId: 'p1', name: 'Main Barn', type: 'barn', phase: 'Phase 1' },
      { id: 's2', projectId: 'p1', name: 'Workshop', type: 'workshop', phase: 'Phase 1' },
      { id: 's3', projectId: 'p1', name: 'Storage', type: 'storage', phase: 'Phase 2' },
    ],
    paddocks: [
      { id: 'pd1', projectId: 'p1', name: 'Paddock A', areaM2: 20000, fencing: 'electric', species: ['cattle'], phase: 'Phase 1' },
      { id: 'pd2', projectId: 'p1', name: 'Paddock B', areaM2: 20000, fencing: 'post_wire', species: ['sheep'], phase: 'Phase 2' },
    ],
    paths: [
      { id: 'pt1', projectId: 'p1', name: 'Main Road', type: 'main_road', lengthM: 500, phase: 'Phase 1' },
    ],
    utilities: [
      { id: 'u1', projectId: 'p1', name: 'Well Pump', type: 'well_pump', phase: 'Phase 1' },
      { id: 'u2', projectId: 'p1', name: 'Solar Panel', type: 'solar_panel', phase: 'Phase 1' },
    ],
    crops: [
      { id: 'c1', projectId: 'p1', name: 'Orchard', type: 'orchard', areaM2: 8000, phase: 'Phase 2' },
      { id: 'c2', projectId: 'p1', name: 'Market Garden', type: 'market_garden', areaM2: 4000, phase: 'Phase 1' },
    ],
  };
}

/** Retreat center scenario — cabins, retreat zone, spiritual zone */
export function retreatCenterScenario(): AllFeaturesInput {
  return {
    zones: [
      { id: 'z1', projectId: 'p1', name: 'Retreat Zone', category: 'retreat', areaM2: 15000 },
      { id: 'z2', projectId: 'p1', name: 'Spiritual Zone', category: 'spiritual', areaM2: 5000 },
      { id: 'z3', projectId: 'p1', name: 'Commons', category: 'commons', areaM2: 8000 },
      { id: 'z4', projectId: 'p1', name: 'Education Zone', category: 'education', areaM2: 3000 },
      { id: 'z5', projectId: 'p1', name: 'Conservation', category: 'conservation', areaM2: 25000 },
    ],
    structures: [
      { id: 's1', projectId: 'p1', name: 'Cabin 1', type: 'cabin', phase: 'Phase 1' },
      { id: 's2', projectId: 'p1', name: 'Cabin 2', type: 'cabin', phase: 'Phase 1' },
      { id: 's3', projectId: 'p1', name: 'Cabin 3', type: 'cabin', phase: 'Phase 2' },
      { id: 's4', projectId: 'p1', name: 'Prayer Space', type: 'prayer_space', phase: 'Phase 1' },
      { id: 's5', projectId: 'p1', name: 'Bathhouse', type: 'bathhouse', phase: 'Phase 1' },
      { id: 's6', projectId: 'p1', name: 'Pavilion', type: 'pavilion', phase: 'Phase 1' },
      { id: 's7', projectId: 'p1', name: 'Classroom', type: 'classroom', phase: 'Phase 2' },
      { id: 's8', projectId: 'p1', name: 'Fire Circle', type: 'fire_circle', phase: 'Phase 1' },
    ],
    paddocks: [],
    paths: [
      { id: 'pt1', projectId: 'p1', name: 'Walking Trail', type: 'trail', lengthM: 800, phase: 'Phase 1' },
    ],
    utilities: [
      { id: 'u1', projectId: 'p1', name: 'Septic', type: 'septic', phase: 'Phase 1' },
      { id: 'u2', projectId: 'p1', name: 'Solar', type: 'solar_panel', phase: 'Phase 1' },
    ],
    crops: [],
  };
}

/** Minimal scenario — single zone, single structure */
export function minimalScenario(): AllFeaturesInput {
  return {
    zones: [
      { id: 'z1', projectId: 'p1', name: 'Main Zone', category: 'habitation', areaM2: 5000 },
    ],
    structures: [
      { id: 's1', projectId: 'p1', name: 'Cabin', type: 'cabin', phase: 'Phase 1' },
    ],
    paddocks: [],
    paths: [],
    utilities: [],
    crops: [],
  };
}
