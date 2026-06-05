// Hand-authored Y5/Y8 trajectory anchors. Derived from wiki/entities/three-streams-farm.md
// canon milestones + MDPI Apricot Lane Y5/Y9 sampling pattern. NOT modelled data.
export type ProjectedPoint = { phase: 'Y5'|'Y8'; date: string; value: number };
export type ProjectedSeries = { metric: string; unit: string; points: ProjectedPoint[] };

export const PROJECTED_SERIES: ProjectedSeries[] = [
  { metric: 'soil_organic_matter', unit: '% OM',
    points: [{ phase: 'Y5', date: '2029-04-15', value: 3.6 }, { phase: 'Y8', date: '2032-04-15', value: 4.8 }] },
  { metric: 'bird_species_richness', unit: 'species',
    points: [{ phase: 'Y5', date: '2029-04-15', value: 28 }, { phase: 'Y8', date: '2032-04-15', value: 42 }] },
  { metric: 'infiltration_rate_mm_per_hr', unit: 'mm/hr',
    points: [{ phase: 'Y5', date: '2029-04-15', value: 45 }, { phase: 'Y8', date: '2032-04-15', value: 65 }] },
  { metric: 'pollinator_visitation', unit: 'visits/min/transect',
    points: [{ phase: 'Y5', date: '2029-04-15', value: 22 }, { phase: 'Y8', date: '2032-04-15', value: 35 }] },
];
