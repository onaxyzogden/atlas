import type { SeededProtocolMap } from './types.js';

/**
 * Seeded protocols for homestead-specific objectives.
 * Values are IDs from HOMESTEAD_PRIMARY_PROTOCOLS (constants/protocol/catalogues/homestead.ts).
 * Also includes additional seedings for universal objectives that have a stronger
 * homestead-specific companion (e.g. s1-vision gains hs-household-labour-balance).
 */
export const HOMESTEAD_SEEDED_PROTOCOLS: SeededProtocolMap = {
  // Universal objectives — homestead additions
  's1-vision': [
    'hs-household-labour-balance',
  ],

  // Homestead primary objectives
  'hms-s1-household-needs': [
    'hs-household-labour-balance',
  ],
  'hms-s2-resource-flows': [
    'hs-household-water-test',
  ],
  'hms-s3-water-quality': [
    'hs-household-water-test',
  ],
  'hms-s4-food-production-strategy': [
    'hs-home-food-production-gap',
    'hs-preserved-food-stock',
  ],
  'hms-s4-energy-shelter-resilience': [
    'hs-heating-fuel-reserve',
  ],
  'hms-s5-food-zones-layout': [
    'hs-home-food-production-gap',
  ],
  'hms-s5-energy-shelter-systems': [
    'hs-rainwater-tank-reserve',
    'hs-heating-fuel-reserve',
  ],
  'hms-s5-animal-husbandry': [
    'hs-small-livestock-welfare',
  ],
  'hms-s6-self-sufficiency-feedback': [
    'hs-home-food-production-gap',
    'hs-preserved-food-stock',
    'hs-small-livestock-welfare',
  ],
  'hms-s7-provision-phasing': [
    'hs-heating-fuel-reserve',
    'hs-rainwater-tank-reserve',
  ],
  'hms-s7-adaptive-management': [
    'hs-household-labour-balance',
  ],
};
