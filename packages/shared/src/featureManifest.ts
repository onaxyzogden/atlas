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
