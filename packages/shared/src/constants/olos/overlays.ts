// overlays.ts
//
// The 15 universal overlays defined in the OLOS Observe / Plan / Act
// developer specs (§5 in each). Every Objective binds a default
// OverlayBundle drawn from this set; the map view loads only that bundle
// when a Stage × Domain × Objective is selected.

import type { Overlay, OverlayId } from '../../schemas/olos/overlay.schema.js';

export const UNIVERSAL_OVERLAY_IDS: readonly OverlayId[] = [
  'zones',
  'sectors',
  'contours-landform',
  'water-flow',
  'soil-conditions',
  'ecology-habitat',
  'access-movement',
  'infrastructure-utilities',
  'resource-flows',
  'roles-responsibility',
  'risk-compliance',
  'suitability',
  'stewardship-intensity',
  'monitoring-records',
  'timeline-phasing',
] as const;

export const UNIVERSAL_OVERLAY_LABELS: Record<OverlayId, string> = {
  'zones': 'Zones',
  'sectors': 'Sectors',
  'contours-landform': 'Contours & Landform',
  'water-flow': 'Water Flow',
  'soil-conditions': 'Soil Conditions',
  'ecology-habitat': 'Ecology & Habitat',
  'access-movement': 'Access & Movement',
  'infrastructure-utilities': 'Infrastructure & Utilities',
  'resource-flows': 'Resource Flows',
  'roles-responsibility': 'Roles & Responsibility',
  'risk-compliance': 'Risk & Compliance',
  'suitability': 'Suitability',
  'stewardship-intensity': 'Stewardship Intensity',
  'monitoring-records': 'Monitoring & Records',
  'timeline-phasing': 'Timeline & Phasing',
};

export const UNIVERSAL_OVERLAYS: Record<OverlayId, Overlay> = {
  'zones': {
    id: 'zones',
    name: 'Zones',
    description:
      'Permaculture zones 0-5 by visit frequency and intensity of use.',
    geometryType: 'polygon',
    defaultStyle: {
      fillColor: '#c2e2c2',
      strokeColor: '#3a7a3a',
      strokeWidth: 1,
      opacity: 0.35,
    },
  },
  'sectors': {
    id: 'sectors',
    name: 'Sectors',
    description:
      'External energies entering the site — sun, wind, fire, flood, noise, view.',
    geometryType: 'polygon',
    defaultStyle: {
      fillColor: '#f9d97a',
      strokeColor: '#b88a1a',
      strokeWidth: 1,
      opacity: 0.25,
    },
  },
  'contours-landform': {
    id: 'contours-landform',
    name: 'Contours & Landform',
    description: 'Elevation contours, slope aspect, key landform features.',
    geometryType: 'line',
    defaultStyle: {
      strokeColor: '#8a6a3a',
      strokeWidth: 1,
      opacity: 0.65,
    },
  },
  'water-flow': {
    id: 'water-flow',
    name: 'Water Flow',
    description:
      'Surface flow paths, watercourses, springs, swales, ponds, infiltration zones.',
    geometryType: 'mixed',
    defaultStyle: {
      strokeColor: '#2a6ab0',
      fillColor: '#9ec5f0',
      strokeWidth: 1.5,
      opacity: 0.55,
    },
  },
  'soil-conditions': {
    id: 'soil-conditions',
    name: 'Soil Conditions',
    description:
      'Soil texture, drainage, organic matter, contamination flags, depth.',
    geometryType: 'polygon',
    defaultStyle: {
      fillColor: '#a07a52',
      strokeColor: '#5e4222',
      strokeWidth: 1,
      opacity: 0.4,
    },
  },
  'ecology-habitat': {
    id: 'ecology-habitat',
    name: 'Ecology & Habitat',
    description:
      'Existing vegetation, wildlife corridors, habitat patches, sensitive areas.',
    geometryType: 'mixed',
    defaultStyle: {
      fillColor: '#5fa05f',
      strokeColor: '#2c5e2c',
      strokeWidth: 1,
      opacity: 0.45,
    },
  },
  'access-movement': {
    id: 'access-movement',
    name: 'Access & Movement',
    description:
      'Roads, tracks, paths, gates, vehicle vs foot routing, emergency egress.',
    geometryType: 'line',
    defaultStyle: {
      strokeColor: '#7a5a3a',
      strokeWidth: 2,
      opacity: 0.7,
    },
  },
  'infrastructure-utilities': {
    id: 'infrastructure-utilities',
    name: 'Infrastructure & Utilities',
    description:
      'Buildings, fences, tanks, pipes, electric lines, comms, septic, wells.',
    geometryType: 'mixed',
    defaultStyle: {
      fillColor: '#9e9e9e',
      strokeColor: '#3a3a3a',
      strokeWidth: 1.5,
      opacity: 0.6,
    },
  },
  'resource-flows': {
    id: 'resource-flows',
    name: 'Resource Flows',
    description:
      'Inputs / outputs / cycles — water, energy, nutrients, materials, waste.',
    geometryType: 'mixed',
    defaultStyle: {
      strokeColor: '#b85a4a',
      strokeWidth: 1.5,
      opacity: 0.55,
    },
  },
  'roles-responsibility': {
    id: 'roles-responsibility',
    name: 'Roles & Responsibility',
    description:
      'Who stewards which area or system — role attribution by polygon.',
    geometryType: 'polygon',
    defaultStyle: {
      fillColor: '#c9b8e0',
      strokeColor: '#6a4ea0',
      strokeWidth: 1,
      opacity: 0.35,
    },
  },
  'risk-compliance': {
    id: 'risk-compliance',
    name: 'Risk & Compliance',
    description:
      'Hazards, setbacks, easements, regulated zones, disqualifier flags.',
    geometryType: 'polygon',
    defaultStyle: {
      fillColor: '#e07a7a',
      strokeColor: '#8a2a2a',
      strokeWidth: 1.5,
      opacity: 0.4,
    },
  },
  'suitability': {
    id: 'suitability',
    name: 'Suitability',
    description:
      'Derived layer — composite suitability for an intended use (crops, ponds, dwellings).',
    geometryType: 'raster',
    defaultStyle: {
      opacity: 0.55,
    },
  },
  'stewardship-intensity': {
    id: 'stewardship-intensity',
    name: 'Stewardship Intensity',
    description:
      'How much management each area requires per cycle — informs staffing + budget.',
    geometryType: 'polygon',
    defaultStyle: {
      fillColor: '#f0c878',
      strokeColor: '#8a6a2a',
      strokeWidth: 1,
      opacity: 0.4,
    },
  },
  'monitoring-records': {
    id: 'monitoring-records',
    name: 'Monitoring & Records',
    description:
      'Observation points, sample sites, photo points, sensor locations, proof drops.',
    geometryType: 'point',
    defaultStyle: {
      iconColor: '#2a6a8a',
      opacity: 0.85,
    },
  },
  'timeline-phasing': {
    id: 'timeline-phasing',
    name: 'Timeline & Phasing',
    description:
      'Phase boundaries — what builds first, second, third; rollouts and seasonal windows.',
    geometryType: 'polygon',
    defaultStyle: {
      fillColor: '#b8d9f0',
      strokeColor: '#3a6a9a',
      strokeWidth: 1,
      opacity: 0.35,
    },
  },
};
