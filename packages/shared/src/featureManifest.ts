/**
 * Feature manifest — single source of truth for the 30 feature sections.
 *
 * Consumed by:
 *   - UI chrome (nav, coming-soon banners, feature cards) via
 *     `isFeatureVisible()` helper.
 *   - API feature-gate plugin (`fastify.requirePhase(tag)`) to 404 routes
 *     whose section is beyond the configured `ATLAS_PHASE_MAX`.
 *
 * Phase tags follow the sectioned feature spec (see
 * `feature-sections-1-30-the-stateless-lollipop.md`):
 *   P1 — core intake / must-have for first usable build
 *   P2 — advanced imports, templates, comparison tooling
 *   P3 — collaboration, portal, external stakeholders
 *   P4 — mature AI/automation / cross-project intelligence
 *   MT — OGDEN Moontrance identity features (separate timeline)
 *
 * Section status is informational only; the source of truth for "is this
 * wired up" remains the routes + components themselves. The manifest is
 * for tagging and gating, not progress tracking.
 */

export type PhaseTag = 'P1' | 'P2' | 'P3' | 'P4' | 'MT' | 'FUTURE';

export type SectionStatus = 'done' | 'partial' | 'stub' | 'planned';

export interface FeatureItem {
  /** Stable key, e.g. 'import-kml'. Kebab-case. */
  key: string;
  /** Human-readable label from the feature spec. */
  label: string;
  phase: PhaseTag;
  status: SectionStatus;
}

export interface FeatureSection {
  /** 1-30 per the sectioned spec. */
  id: number;
  /** Kebab-case slug, used for route prefixes and feature-folder names. */
  slug: string;
  /** Section title from the spec. */
  name: string;
  /** Union of phase tags across this section's items. */
  phases: PhaseTag[];
  status: SectionStatus;
  features: FeatureItem[];
}

/**
 * Ordinal ranking used by `phaseAtMost()` for `ATLAS_PHASE_MAX` gating.
 * MT and FUTURE sit off the P-tag ordinal scale. Both require their own
 * flag (`ATLAS_MOONTRANCE`, `ATLAS_FUTURE`) — phaseAtMost rejects them
 * unless explicitly allowed.
 */
const PHASE_ORDER: Record<PhaseTag, number> = {
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
  MT: 99,
  FUTURE: 98,
};

export const FEATURE_SECTIONS: readonly FeatureSection[] = [
  {
    id: 1,
    slug: 'project-intake',
    name: 'Project Creation & Property Intake',
    phases: ['P1', 'P2'],
    status: 'done',
    features: [
      { key: 'create-project', label: 'Create new project', phase: 'P1', status: 'done' },
      { key: 'project-dashboard', label: 'Project dashboard', phase: 'P1', status: 'done' },
      { key: 'address-parcel-gps', label: 'Property address, parcel ID, GPS coordinate input', phase: 'P1', status: 'done' },
      { key: 'draw-import-boundary', label: 'Draw / import parcel boundary', phase: 'P1', status: 'done' },
      { key: 'import-kml-kmz-geojson-shp', label: 'Import KML / KMZ / GeoJSON / Shapefile data', phase: 'P1', status: 'done' },
      { key: 'upload-title-survey-siteplan', label: 'Upload title map / survey / site plan', phase: 'P1', status: 'done' },
      { key: 'import-drone-ortho-terrain', label: 'Import drone, orthomosaic, terrain model imagery', phase: 'P2', status: 'planned' },
      { key: 'assign-type-intent', label: 'Assign project type and design intent', phase: 'P1', status: 'done' },
      { key: 'owner-stakeholder-notes', label: 'Save owner / stakeholder notes', phase: 'P1', status: 'partial' },
      { key: 'attach-media', label: 'Attach photos, videos, documents, site notes', phase: 'P1', status: 'done' },
      { key: 'field-observations-legal', label: 'Add field observations and legal description', phase: 'P1', status: 'partial' },
      { key: 'zoning-utility-notes', label: 'Add zoning, municipal, access, utility notes', phase: 'P1', status: 'partial' },
      { key: 'restrictions-covenants', label: 'Add restrictions / covenants notes', phase: 'P1', status: 'partial' },
      { key: 'climate-bioregion-county', label: 'Add climate region, bioregion, county metadata', phase: 'P1', status: 'partial' },
      { key: 'units-projection', label: 'Set units and map projection', phase: 'P1', status: 'done' },
      { key: 'project-permissions', label: 'Set project permissions', phase: 'P1', status: 'done' },
      { key: 'autosave-versions', label: 'Auto-save and version snapshots', phase: 'P1', status: 'done' },
      { key: 'restore-previous', label: 'Restore previous project state', phase: 'P2', status: 'partial' },
      { key: 'save-candidates', label: 'Save multiple candidate properties', phase: 'P2', status: 'planned' },
      { key: 'compare-candidates', label: 'Compare candidate properties side by side', phase: 'P2', status: 'planned' },
      { key: 'duplicate-from-template', label: 'Duplicate project from template', phase: 'P2', status: 'planned' },
    ],
  },
  {
    id: 2,
    slug: 'basemap-terrain',
    name: 'Base Map, Imagery & Terrain Visualization',
    phases: ['P1', 'P2'],
    status: 'partial',
    features: [
      { key: 'basemap-style-switcher', label: 'Satellite, aerial, topographic, street, hybrid map views', phase: 'P1', status: 'partial' },
      { key: 'terrain-contour-hillshade', label: 'Terrain mesh, contour line, elevation shading, hillshade rendering', phase: 'P1', status: 'partial' },
      { key: 'slope-aspect-heatmaps', label: 'Slope and aspect heatmaps', phase: 'P1', status: 'planned' },
      { key: 'map-mode-2d', label: '2D map mode', phase: 'P1', status: 'partial' },
      { key: 'map-mode-2-5d-3d', label: '2.5D tilted and full 3D terrain modes', phase: 'P2', status: 'partial' },
      { key: 'vector-overlays-parcel-road-water-building', label: 'Parcel boundary, road, waterbody, building footprint overlays', phase: 'P1', status: 'planned' },
      { key: 'measure-distance-area-elevation', label: 'Distance, area, elevation measurement tools', phase: 'P1', status: 'partial' },
      { key: 'cross-section-profile', label: 'Cross-section profile tool', phase: 'P2', status: 'planned' },
      { key: 'line-of-sight-viewshed', label: 'Line-of-sight and viewshed analysis tools', phase: 'P2', status: 'planned' },
      { key: 'layer-visibility-order-opacity', label: 'Layer visibility toggles, ordering, opacity controls', phase: 'P1', status: 'partial' },
      { key: 'historical-imagery', label: 'Historical imagery layers', phase: 'P2', status: 'planned' },
      { key: 'split-screen-compare', label: 'Split screen and before/after compare modes', phase: 'P2', status: 'planned' },
    ],
  },
  {
    id: 3,
    slug: 'site-data-layers',
    name: 'Site Data Layers & Environmental Inputs',
    phases: ['P1', 'P2'],
    status: 'partial',
    features: [
      { key: 'elevation-slope-aspect-curvature', label: 'Elevation, slope, aspect, curvature data (USGS 3DEP — Tier 1)', phase: 'P1', status: 'done' },
      { key: 'watershed-drainage-network', label: 'Watershed boundary and drainage network (NHD — Tier 1)', phase: 'P1', status: 'partial' },
      { key: 'soil-survey-ssurgo', label: 'Soil survey, texture, drainage class layers (SSURGO — Tier 1)', phase: 'P1', status: 'partial' },
      { key: 'wetland-floodplain-overlays', label: 'Wetland and floodplain overlays (NWI, FEMA — Tier 1)', phase: 'P1', status: 'partial' },
      { key: 'landcover-vegetation-nlcd', label: 'Land cover and vegetation classification (NLCD — Tier 1)', phase: 'P1', status: 'partial' },
      { key: 'climate-normals-noaa', label: 'Climate normals, precipitation, temperature, frost risk (NOAA — Tier 1)', phase: 'P1', status: 'partial' },
      { key: 'drone-ortho-terrain', label: 'User-uploaded drone imagery, orthomosaic, terrain model (Tier 2)', phase: 'P2', status: 'planned' },
      { key: 'manual-soil-water-tests', label: 'Manual soil test entry, water test data (Tier 2)', phase: 'P2', status: 'planned' },
      { key: 'geological-bedrock-notes', label: 'Geological substrate, bedrock depth notes', phase: 'P2', status: 'planned' },
      { key: 'solar-wind-fire', label: 'Solar radiation, wind rose, fire risk layers', phase: 'P2', status: 'planned' },
      { key: 'habitat-wildlife-corridors', label: 'Habitat, wildlife corridor, protected species notes', phase: 'P2', status: 'planned' },
      { key: 'adjacent-landuse-utilities', label: 'Adjacent land use, infrastructure proximity, utility network notes', phase: 'P2', status: 'planned' },
      { key: 'legal-setback-easement-zoning', label: 'Legal setback, easement, municipal zoning overlays (see Section 0e)', phase: 'P1', status: 'partial' },
      { key: 'data-completeness-score', label: 'Data Completeness Score on project dashboard', phase: 'P1', status: 'done' },
    ],
  },
  {
    id: 4,
    slug: 'site-assessment',
    name: 'Site Assessment & Diagnostic Atlas',
    phases: ['P1', 'P2'],
    status: 'partial',
    features: [
      { key: 'automated-site-summary', label: 'Automated site summary with data source attribution', phase: 'P1', status: 'done' },
      { key: 'suitability-regen-buildability-scores', label: 'Property suitability, regenerative potential, buildability scores (with confidence indicators)', phase: 'P1', status: 'done' },
      { key: 'water-ag-habitat-scores', label: 'Water resilience, agricultural suitability, habitat sensitivity scores', phase: 'P1', status: 'done' },
      { key: 'risk-opportunity-limitation-summaries', label: 'Risk summary, opportunity summary, limitation summary', phase: 'P1', status: 'partial' },
      { key: 'steep-slope-flood-frost-wind-detection', label: 'Steep slope, flood-prone area, frost pocket, wind exposure detection', phase: 'P1', status: 'done' },
      { key: 'sun-trap-dry-wet-erosion-compaction', label: 'Sun trap, dry/wet zone, erosion hotspot, compaction risk identification', phase: 'P2', status: 'partial' },
      { key: 'natural-shelter-solar-exposure', label: 'Natural shelter zone and solar exposure analysis', phase: 'P2', status: 'partial' },
      { key: 'microclimate-cold-air-drainage', label: 'Microclimate and cold-air drainage analysis', phase: 'P2', status: 'done' },
      { key: 'candidate-zones-pond-swale-keyline-orchard-grazing-structure', label: 'Pond, swale, keyline, orchard, grazing, structure candidate zones', phase: 'P2', status: 'partial' },
      { key: 'restoration-priority-regeneration-sequence', label: 'Restoration priority map and regeneration sequence suggestion', phase: 'P2', status: 'partial' },
      { key: 'what-this-land-wants', label: "'What this land wants' summary (AI)", phase: 'P2', status: 'partial' },
      { key: 'threats-and-leverage-interventions', label: "'Main threats to success' and 'Highest leverage interventions' summaries", phase: 'P2', status: 'partial' },
    ],
  },
  {
    id: 5,
    slug: 'hydrology-water',
    name: 'Hydrology & Water Systems Planning',
    phases: ['P1', 'P2'],
    status: 'partial',
    features: [
      { key: 'water-flow-runoff-visualization', label: 'Water flow visualization, surface runoff paths', phase: 'P1', status: 'partial' },
      { key: 'watershed-delineation', label: 'Watershed delineation, catchment area identification', phase: 'P1', status: 'partial' },
      { key: 'drainage-line-flood-accumulation', label: 'Drainage line extraction, flood accumulation simulation', phase: 'P1', status: 'partial' },
      { key: 'pond-swale-berm-check-dam-suggestions', label: 'Pond, swale, berm, check dam placement suggestions', phase: 'P2', status: 'partial' },
      { key: 'overflow-spillway-planning', label: 'Overflow route visualization, spillway planning', phase: 'P2', status: 'planned' },
      { key: 'roof-catchment-rainwater-storage', label: 'Roof catchment calculation, rainwater storage sizing', phase: 'P2', status: 'planned' },
      { key: 'gravity-irrigation-trough-livestock-water', label: 'Gravity-fed irrigation, trough location, livestock water access planning', phase: 'P2', status: 'planned' },
      { key: 'wetland-riparian-planning', label: 'Wetland restoration and riparian buffer planning', phase: 'P2', status: 'planned' },
      { key: 'water-budget-seasonal-storage', label: 'Water budget calculator, seasonal storage estimates', phase: 'P2', status: 'planned' },
      { key: 'water-retention-drought-storm-scores', label: 'Water retention score, drought and storm resilience scores', phase: 'P2', status: 'planned' },
      { key: 'water-phasing-dependency-mapping', label: 'Water system phasing and dependency mapping', phase: 'P2', status: 'planned' },
    ],
  },
  {
    id: 6,
    slug: 'climate-analysis',
    name: 'Solar, Wind & Climate Analysis',
    phases: ['P1', 'P2'],
    status: 'partial',
    features: [
      { key: 'sun-path-visualization', label: 'Sun path visualization, seasonal sun angle simulation', phase: 'P1', status: 'planned' },
      { key: 'shade-solar-exposure-heatmap', label: 'Shade analysis, solar exposure heatmap', phase: 'P1', status: 'planned' },
      { key: 'structure-tree-shadow-casting', label: 'Structure and tree shadow casting', phase: 'P2', status: 'planned' },
      { key: 'solar-panel-placement-zones', label: 'Best solar panel placement zones', phase: 'P2', status: 'planned' },
      { key: 'passive-solar-building-siting', label: 'Passive solar building siting analysis', phase: 'P2', status: 'planned' },
      { key: 'prevailing-wind-shelter', label: 'Prevailing wind visualization, wind shelter analysis', phase: 'P1', status: 'partial' },
      { key: 'windbreak-ventilation-corridors', label: 'Windbreak opportunity zones, cold wind exposure, ventilation corridor mapping', phase: 'P2', status: 'planned' },
      { key: 'frost-pocket-heat-sink', label: 'Frost pocket mapping, heat sink identification', phase: 'P2', status: 'done' },
      { key: 'seasonal-comfort-outdoor-seasonality', label: 'Seasonal comfort map, outdoor use seasonality map', phase: 'P2', status: 'planned' },
      { key: 'microclimate-adaptation-recommendations', label: 'Microclimate opportunity map, climate adaptation recommendations', phase: 'P2', status: 'partial' },
    ],
  },
  {
    id: 7,
    slug: 'soil-ecology',
    name: 'Soil, Ecology & Regeneration Diagnostics',
    phases: ['P1', 'P2'],
    status: 'partial',
    features: [
      { key: 'soil-type-drainage-ssurgo', label: 'Soil type visualization and drainage classification (from SSURGO)', phase: 'P1', status: 'partial' },
      { key: 'ph-organic-compaction-notes', label: 'pH, organic matter, compaction notes fields', phase: 'P1', status: 'partial' },
      { key: 'manual-soil-test-entry', label: 'Manual soil test entry, biological activity notes', phase: 'P2', status: 'planned' },
      { key: 'soil-restoration-opportunity-map', label: 'Soil restoration opportunity map, disturbed land recovery zones', phase: 'P2', status: 'partial' },
      { key: 'mulching-compost-covercrop-zones', label: 'Mulching priority, compost application, cover crop opportunity zones', phase: 'P2', status: 'planned' },
      { key: 'silvopasture-foodforest-regen-zones', label: 'Silvopasture, food forest, forest regeneration candidate zones', phase: 'P2', status: 'planned' },
      { key: 'native-pollinator-biodiversity', label: 'Native planting, pollinator habitat, biodiversity corridor planning', phase: 'P2', status: 'planned' },
      { key: 'invasive-succession-mapping', label: 'Invasive pressure notes, succession stage mapping', phase: 'P2', status: 'planned' },
      { key: 'carbon-sequestration-potential', label: 'Carbon sequestration potential map', phase: 'P2', status: 'planned' },
      { key: 'regen-stage-intervention-log', label: 'Regeneration stage tagging, intervention log, before/after comparison', phase: 'P2', status: 'planned' },
    ],
  },
  {
    id: 8,
    slug: 'zoning-allocation',
    name: 'Land Use Zoning & Functional Allocation',
    phases: ['P1', 'P2', 'MT'],
    status: 'partial',
    features: [
      { key: 'draw-custom-zones-naming-color', label: 'Draw custom zones, zone naming and color coding', phase: 'P1', status: 'partial' },
      { key: 'zone-categories-primary-secondary', label: 'Zone categories, primary/secondary use designation', phase: 'P1', status: 'partial' },
      { key: 'zone-sizing-calculator', label: 'Zone sizing calculator', phase: 'P1', status: 'partial' },
      { key: 'auto-suggest-zones', label: 'Auto-suggest zones based on site analysis', phase: 'P2', status: 'partial' },
      { key: 'zone-overlap-conflict-adjacency', label: 'Zone overlap, conflict, and adjacency analysis', phase: 'P2', status: 'partial' },
      { key: 'habitation-food-livestock-commons-planning', label: 'Habitation, food production, livestock, commons zone planning', phase: 'P1', status: 'partial' },
      { key: 'prayer-spiritual-zone-planning', label: 'Prayer / spiritual zone planning', phase: 'MT', status: 'partial' },
      { key: 'quiet-contemplation-zone-planning', label: 'Quiet contemplation zone planning', phase: 'MT', status: 'partial' },
      { key: 'guest-retreat-education-event-parking', label: 'Guest / retreat, education, event, parking zone planning', phase: 'P2', status: 'partial' },
      { key: 'women-family-privacy-planning', label: 'Women / family privacy planning (where relevant to program design)', phase: 'MT', status: 'planned' },
      { key: 'mens-cohort-activity-zone-planning', label: "Men's cohort activity zone planning", phase: 'MT', status: 'planned' },
      { key: 'service-maintenance-expansion-preservation', label: 'Service, maintenance, future expansion, preservation zone planning', phase: 'P2', status: 'partial' },
      { key: 'seasonal-temporary-phased-use-zones', label: 'Seasonal, temporary, phased use zones', phase: 'P2', status: 'planned' },
      { key: 'land-allocation-summary-report', label: 'Land allocation summary report', phase: 'P2', status: 'partial' },
    ],
  },
  {
    id: 9,
    slug: 'structures-buildings',
    name: 'Structures & Built Environment Planning',
    phases: ['P2', 'P3', 'MT'],
    status: 'partial',
    features: [
      { key: 'place-rotate-resize-structures', label: 'Place, rotate, resize structures on map', phase: 'P2', status: 'partial' },
      { key: 'structure-type-footprint-library', label: 'Structure type assignment, building footprint library', phase: 'P2', status: 'partial' },
      { key: 'earthship-cabin-yurt-pavilion-greenhouse-barn-workshop', label: 'Earthship, cabin, yurt, pavilion, greenhouse, barn, workshop placement', phase: 'P2', status: 'partial' },
      { key: 'prayer-bathhouse-classroom-placement', label: 'Prayer space, bathhouse, classroom placement', phase: 'MT', status: 'partial' },
      { key: 'storage-shelter-compost-pumphouse-placement', label: 'Storage, animal shelter, compost, water/pump house placement', phase: 'P2', status: 'planned' },
      { key: 'tent-glamping-gathering-firecircle-lookout', label: 'Tent / glamping layout, outdoor gathering, fire circle, lookout placement', phase: 'P2', status: 'planned' },
      { key: 'setback-slope-solar-orientation-warnings', label: 'Setback warning, slope warning, solar orientation guide', phase: 'P3', status: 'planned' },
      { key: 'wind-view-privacy-noise-analysis', label: 'Wind shelter, view preservation, privacy, noise exposure analysis', phase: 'P3', status: 'planned' },
      { key: 'walkability-water-zone-relationship-checks', label: 'Walkability, relationship-to-water, relationship-to-zones checks', phase: 'P3', status: 'planned' },
      { key: 'structure-dependency-build-order', label: 'Structure dependency and build order logic', phase: 'P3', status: 'planned' },
      { key: 'infrastructure-cost-placeholder-per-structure', label: 'Infrastructure requirement summary, cost placeholder per structure', phase: 'P2', status: 'planned' },
      { key: 'alternate-footprint-options', label: 'Alternate footprint options', phase: 'P3', status: 'planned' },
    ],
  },
  {
    id: 10,
    slug: 'access-circulation',
    name: 'Access, Circulation & Movement Systems',
    phases: ['P2', 'P3', 'MT'],
    status: 'partial',
    features: [
      { key: 'main-secondary-emergency-service-access', label: 'Main, secondary, emergency, service access planning', phase: 'P2', status: 'partial' },
      { key: 'pedestrian-trail-vehicle-farm-lane', label: 'Pedestrian path, trail, vehicle route, farm lane planning', phase: 'P2', status: 'partial' },
      { key: 'animal-corridor-grazing-route', label: 'Animal movement corridor, grazing route planning', phase: 'P2', status: 'partial' },
      { key: 'accessible-route-planning', label: 'Accessible route planning', phase: 'P2', status: 'planned' },
      { key: 'route-slope-conflict-detection', label: 'Route slope analysis, conflict detection', phase: 'P3', status: 'partial' },
      { key: 'public-private-circulation-layers', label: 'Public vs private circulation layers', phase: 'P2', status: 'planned' },
      { key: 'arrival-sequence-design', label: 'Arrival sequence design (guest experience path)', phase: 'MT', status: 'partial' },
      { key: 'parking-turning-delivery-checks', label: 'Parking capacity, turning radius, delivery access checks', phase: 'P3', status: 'planned' },
      { key: 'quiet-circulation-routes', label: 'Quiet circulation routes', phase: 'MT', status: 'partial' },
      { key: 'event-flow-night-lighting-safety', label: 'Event flow, night lighting route, safety and visibility checks', phase: 'P3', status: 'planned' },
      { key: 'wayfinding-system-planning', label: 'Wayfinding system planning', phase: 'P3', status: 'planned' },
    ],
  },
  {
    id: 12,
    slug: 'crops-agroforestry',
    name: 'Crop, Orchard & Agroforestry Design',
    phases: ['P2', 'P3'],
    status: 'partial',
    features: [
      { key: 'orchard-row-garden-foodforest-placement', label: 'Orchard, row crop, garden bed, food forest placement planning', phase: 'P2', status: 'partial' },
      { key: 'agroforestry-windbreak-shelterbelt-silvopasture', label: 'Agroforestry band, windbreak, shelterbelt, silvopasture planning', phase: 'P2', status: 'partial' },
      { key: 'pollinator-strip-companion-zone-notes', label: 'Pollinator strip, companion planting zone notes', phase: 'P2', status: 'partial' },
      { key: 'tree-spacing-calculator', label: 'Tree spacing calculator', phase: 'P2', status: 'partial' },
      { key: 'canopy-maturity-root-overlap', label: 'Canopy maturity simulation, root zone overlap visualization', phase: 'P3', status: 'planned' },
      { key: 'shade-succession-forecasting', label: 'Shade succession forecasting', phase: 'P3', status: 'planned' },
      { key: 'frost-safe-orchard-drainage-placement', label: 'Frost-safe orchard zone detection, drainage-sensitive placement', phase: 'P2', status: 'partial' },
      { key: 'species-suitability-water-demand', label: 'Species suitability notes, water-demand classification', phase: 'P2', status: 'partial' },
      { key: 'access-harvest-irrigation-tie-in', label: 'Access-to-harvest and irrigation tie-in planning', phase: 'P2', status: 'planned' },
      { key: 'nursery-compost-proximity', label: 'Nursery zone, compost proximity planning', phase: 'P2', status: 'partial' },
      { key: 'seasonal-productivity-multilayer', label: 'Seasonal productivity map, multi-layer planting visualization', phase: 'P3', status: 'planned' },
      { key: 'year-to-maturity-yield-placeholder', label: 'Year-to-maturity phasing, yield placeholder estimates', phase: 'P3', status: 'partial' },
    ],
  },
  {
    id: 13,
    slug: 'utilities-energy',
    name: 'Utilities, Energy & Support Systems',
    phases: ['P2', 'P3'],
    status: 'partial',
    features: [
      { key: 'solar-battery-generator-placement', label: 'Solar array, battery/power room, generator backup placement', phase: 'P2', status: 'partial' },
      { key: 'water-tank-well-greywater-planning', label: 'Water tank, well/pump, greywater zone planning', phase: 'P2', status: 'partial' },
      { key: 'blackwater-septic-toilet', label: 'Blackwater / composting toilet, septic note layer', phase: 'P2', status: 'partial' },
      { key: 'rain-catchment-corridor-lighting', label: 'Rain catchment tie-in, utility corridor, lighting zone planning', phase: 'P2', status: 'partial' },
      { key: 'firewood-waste-compost-biochar', label: 'Firewood flow, waste sorting, compost, biochar station planning', phase: 'P2', status: 'partial' },
      { key: 'tool-maintenance-laundry', label: 'Tool storage, maintenance yard, laundry/wash station planning', phase: 'P2', status: 'partial' },
      { key: 'energy-demand-notes', label: 'Energy demand placeholder notes, utility dependency mapping', phase: 'P3', status: 'planned' },
      { key: 'off-grid-readiness-redundancy', label: 'Off-grid readiness score, redundancy planning', phase: 'P3', status: 'partial' },
      { key: 'utility-phasing', label: 'Utility phasing', phase: 'P2', status: 'partial' },
    ],
  },
  {
    id: 26,
    slug: 'admin-governance',
    name: 'Administration, Governance & Data Integrity',
    phases: ['P1', 'P2'],
    status: 'partial',
    features: [
      { key: 'user-management', label: 'User management', phase: 'P1', status: 'partial' },
      { key: 'workspace-management', label: 'Workspace management', phase: 'P1', status: 'partial' },
      { key: 'organization-settings', label: 'Organization settings', phase: 'P1', status: 'partial' },
      { key: 'access-controls', label: 'Access controls', phase: 'P1', status: 'done' },
      { key: 'project-ownership-transfer', label: 'Project ownership transfer', phase: 'P1', status: 'planned' },
      { key: 'backup-and-restore', label: 'Backup and restore', phase: 'P1', status: 'planned' },
      { key: 'audit-log', label: 'Audit log', phase: 'P1', status: 'partial' },
      { key: 'data-provenance-notes', label: 'Data provenance notes', phase: 'P2', status: 'planned' },
      { key: 'source-citation-tracking', label: 'Source citation tracking', phase: 'P2', status: 'planned' },
      { key: 'assumption-tracking', label: 'Assumption tracking', phase: 'P2', status: 'planned' },
      { key: 'confidence-rating-per-analysis', label: 'Confidence rating per analysis', phase: 'P2', status: 'done' },
      { key: 'incomplete-data-warnings', label: 'Incomplete-data warnings', phase: 'P2', status: 'partial' },
      { key: 'manual-override-logging', label: 'Manual override logging', phase: 'P2', status: 'planned' },
      { key: 'qa-checklist', label: 'QA checklist', phase: 'P2', status: 'planned' },
      { key: 'design-review-checklist', label: 'Design review checklist', phase: 'P2', status: 'planned' },
      { key: 'locked-approval-states', label: 'Locked approval states', phase: 'P2', status: 'planned' },
      { key: 'archive-delete-recover-projects', label: 'Archive / delete / recover projects', phase: 'P2', status: 'planned' },
      { key: 'naming-conventions', label: 'Naming conventions', phase: 'P2', status: 'planned' },
      { key: 'metadata-management', label: 'Metadata management', phase: 'P2', status: 'partial' },
    ],
  },
  // Sections 5-25, 27-30 are appended here as each section's content is supplied,
  // via `apps/api/scripts/scaffold-section.ts`. Do not hand-edit stubs in.
];

/** Lookup by section id. */
export function getSection(id: number): FeatureSection | undefined {
  return FEATURE_SECTIONS.find((s) => s.id === id);
}

/** Lookup by slug. */
export function getSectionBySlug(slug: string): FeatureSection | undefined {
  return FEATURE_SECTIONS.find((s) => s.slug === slug);
}

/** Find a feature item across all sections. */
export function getFeature(key: string): FeatureItem | undefined {
  for (const section of FEATURE_SECTIONS) {
    const found = section.features.find((f) => f.key === key);
    if (found) return found;
  }
  return undefined;
}

/**
 * True when `candidate` is at or below `max` in ordinal phase ranking.
 * MT is never included by P-tag max; gate MT separately.
 */
export function phaseAtMost(candidate: PhaseTag, max: PhaseTag): boolean {
  if (candidate === 'MT' || max === 'MT') return candidate === max;
  if (candidate === 'FUTURE' || max === 'FUTURE') return candidate === max;
  return PHASE_ORDER[candidate] <= PHASE_ORDER[max];
}

/**
 * True when a feature key should be visible given a phase ceiling.
 * Unknown keys return `true` — a missing manifest entry should not hide
 * an existing UI surface. This is the safe default during incremental
 * manifest population (Sections 2-30 are added over time).
 */
export function isFeatureVisible(key: string, phaseMax: PhaseTag = 'P4'): boolean {
  const feat = getFeature(key);
  if (!feat) return true;
  return phaseAtMost(feat.phase, phaseMax);
}
