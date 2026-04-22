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
  // Sections 2-30 are appended here as each section's content is supplied,
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
