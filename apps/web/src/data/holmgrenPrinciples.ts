/**
 * Holmgren's twelve permaculture-design principles.
 *
 * Source: David Holmgren, "Permaculture: Principles & Pathways Beyond
 * Sustainability" (2002). The twelve are the canonical Stage-2 (PLAN)
 * verification rubric per the regenerative-design Planning spec.
 *
 * Stable identifiers (`p1` … `p12`) are used as keys in
 * `principleCheckStore.byProject[projectId]` — never renumber.
 */

export interface HolmgrenPrinciple {
  id: string;
  number: number;
  title: string;
  prompt: string;
  example: string;
}

export const HOLMGREN_PRINCIPLES: HolmgrenPrinciple[] = [
  {
    id: 'p1',
    number: 1,
    title: 'Observe and interact',
    prompt: 'What patterns did you observe before designing? Which design choices respond directly to those observations?',
    example: 'Sited the orchard south of the windbreak after seeing winter prevailing-wind damage on the existing nut trees.',
  },
  {
    id: 'p2',
    number: 2,
    title: 'Catch and store energy',
    prompt: 'How does the design capture flows that are abundant now (sun, water, biomass, social momentum) for use when they are scarce?',
    example: 'Cisterns + swales hold winter rain into the dry season; passive-solar greenhouse banks heat for spring starts.',
  },
  {
    id: 'p3',
    number: 3,
    title: 'Obtain a yield',
    prompt: 'What tangible yields does the design produce in the short, medium, and long term?',
    example: 'Year-1 annual veg, year-3 berry harvests, year-7 nut + timber, ongoing fuel + fodder.',
  },
  {
    id: 'p4',
    number: 4,
    title: 'Apply self-regulation and accept feedback',
    prompt: 'What feedback loops are built in? How will the design self-correct when assumptions prove wrong?',
    example: 'Annual yield log + soil-test cadence flags depleted blocks before they crash.',
  },
  {
    id: 'p5',
    number: 5,
    title: 'Use and value renewable resources and services',
    prompt: 'Where does the design substitute renewable flows for non-renewable inputs?',
    example: 'Animal traction + hand tools instead of small tractor for Z1 beds; on-site biomass mulch instead of imported wood chip.',
  },
  {
    id: 'p6',
    number: 6,
    title: 'Produce no waste',
    prompt: 'How are waste streams from each subsystem captured as inputs to another?',
    example: 'Kitchen scraps → chickens → compost → orchard; greywater → reed bed → fruit-tree irrigation.',
  },
  {
    id: 'p7',
    number: 7,
    title: 'Design from patterns to details',
    prompt: 'What landscape, climate, or social patterns drove the broad layout before any element was placed?',
    example: 'Mainframe contours dictated swale lines; sun sectors set Z1/Z2 placement; daily-use frequency set path widths.',
  },
  {
    id: 'p8',
    number: 8,
    title: 'Integrate rather than segregate',
    prompt: 'Which elements perform multiple functions and which functions are supported by multiple elements?',
    example: 'Hedgerow = windbreak + wildlife corridor + forage + fuel; water = stored in pond + cistern + soil + tank.',
  },
  {
    id: 'p9',
    number: 9,
    title: 'Use small and slow solutions',
    prompt: 'Where does the design choose human-scale, locally-maintainable solutions over large engineered ones?',
    example: 'Many small cisterns near demand points instead of one large dam; hand-dug swales instead of contracted earthworks.',
  },
  {
    id: 'p10',
    number: 10,
    title: 'Use and value diversity',
    prompt: 'Where does diversity (species, age class, social roles, income) provide resilience to shocks?',
    example: 'Polyculture orchard with 12 species + 3 age classes survives a single-pest outbreak that would wipe a monocrop.',
  },
  {
    id: 'p11',
    number: 11,
    title: 'Use edges and value the marginal',
    prompt: 'Which design decisions deliberately concentrate productivity at edges (forest/field, water/land, seasons)?',
    example: 'Keyhole beds maximise tending edge; pond margins planted with riparian guild; shoulder-season cover crops.',
  },
  {
    id: 'p12',
    number: 12,
    title: 'Creatively use and respond to change',
    prompt: 'How does the design anticipate change (climate, succession, household needs) rather than freezing one moment in time?',
    example: 'Phased succession: pioneer N-fixers shaded out by long-lived natives over 15 years; phasing matrix updates yearly.',
  },
];
