import { z } from 'zod';
import { VisionProfile } from './visionProfile.schema.js';
import { ProjectTypeRecord } from './plan/projectTypeTaxonomy.schema.js';

// 'INTL' is the catch-all bucket for projects outside US/CA coverage.
// Adapter registry routes INTL → NasaPowerAdapter for climate; other Tier-1
// layers fall through to ManualFlagAdapter until a global source is wired.
// DB CHECK constraint (migration 011) enforces this enum at the storage layer.
export const Country = z.enum(['US', 'CA', 'INTL']);
export type Country = z.infer<typeof Country>;

export const ProjectStatus = z.enum(['active', 'archived', 'shared', 'candidate']);

/**
 * Long-tail property metadata captured by the intake wizard.
 *
 * Stored as a single `projects.metadata` jsonb column (migration 012).
 * Shape is validated here at the application boundary; the DB does not
 * enforce it. Promote any field to a dedicated column once query
 * patterns demand indexing or FKs.
 */
/**
 * Free-text soil observations captured by the intake wizard before a
 * site visit. These sit alongside (not instead of) SSURGO / SoilGrids
 * adapter output — the dashboard surfaces both, clearly labelled.
 */
export const SoilNotes = z.object({
  ph: z.string().max(200).optional(),
  organicMatter: z.string().max(200).optional(),
  compaction: z.string().max(500).optional(),
  biologicalActivity: z.string().max(500).optional(),
}).strict();
export type SoilNotes = z.infer<typeof SoilNotes>;

export const QueuedTeamInvite = z.object({
  name: z.string().max(200).optional(),
  email: z.string().email().max(200),
  role: z.enum(['team_member', 'contractor', 'landowner', 'reviewer']),
  queuedAt: z.string().datetime(),
});
export type QueuedTeamInvite = z.infer<typeof QueuedTeamInvite>;

export const ProjectMetadata = z.object({
  climateRegion: z.string().max(100).optional(),
  bioregion: z.string().max(100).optional(),
  county: z.string().max(100).optional(),
  legalDescription: z.string().max(2000).optional(),
  fieldObservations: z.string().max(5000).optional(),
  restrictionsCovenants: z.string().max(2000).optional(),
  mapProjection: z.string().max(200).optional(),
  centerLat: z.number().min(-90).max(90).optional(),
  centerLng: z.number().min(-180).max(180).optional(),
  soilNotes: SoilNotes.optional(),
  // Climate characterisation (Tier 1 pipeline / ECCC normals)
  hardinessZone: z.string().max(10).optional(),
  annualPrecipMm: z.number().optional(),
  frostFreeDays: z.number().optional(),
  lastFrostAvg: z.string().max(20).optional(),
  firstFallFrostAvg: z.string().max(20).optional(),
  avgDailySolarKwhM2: z.number().optional(),
  prevailingWindDir: z.string().max(20).optional(),
  climateNormals: z.string().max(100).optional(),
  // Human-context fields captured by intake wizard / steward survey.
  // `stewardName` is the legacy single-steward convenience (still read by the
  // atlas-ui StewardSurveyPage); `stewardNames` is the denormalized roster of
  // all stewards on the project (multi-steward model). Keep both in sync.
  stewardName: z.string().max(200).optional(),
  stewardNames: z.array(z.string().max(200)).max(50).optional(),
  visionStatement: z.string().max(2000).optional(),
  // OBSERVE sector wedge outer radius in metres. Falls back to
  // DEFAULT_SECTOR_RADIUS_M (250) when unset. 5 km cap is a sanity
  // ceiling well past any plausible permaculture-scale parcel.
  sectorRadiusM: z.number().positive().max(5000).optional(),
  // Steward's design-horizon year for the temporal slider. The TemporalScrubSlider
  // "↺" chip snaps the year cursor to this value. Default lives in
  // `getDesignHorizon` (20 years) so a future change is one line.
  designHorizonYears: z.number().int().min(1).max(50).optional(),
  // Needs & Yields graph-edge authoring (Rec #1 closeout, 2026-05-13).
  // `designStatus` defaults to 'draft' via getDesignStatus accessor.
  // The 'draft' → 'ready-for-review' transition is gated by
  // canAdvanceToReadyForReview unless allowOrphanOutputs is true.
  // 'approved' enum value is reserved for a later review-workflow slice.
  designStatus: z.enum(['draft', 'ready-for-review', 'approved']).optional(),
  allowOrphanOutputs: z.boolean().optional(),
  // Stage Zero Vision Builder output — structured land-vision profile that
  // frames the downstream OBSERVE / PLAN / ACT stages. See
  // visionProfile.schema.ts. Authored incrementally (autosave + resume).
  visionProfile: VisionProfile.optional(),
  // Project Creation Wizard state (Phase 2 / Slice 2.1). `in_progress` marks
  // a draft created by Step 1 "Next" but not yet through the completion
  // screen; `complete` flips on Step 3 finish. `wizardLastStep` is the
  // resume cursor for `/v3/project/$id/wizard/$step` deep-link recovery.
  wizardStatus: z.enum(['in_progress', 'complete']).optional(),
  wizardLastStep: z.enum(['site', 'vision', 'team']).optional(),
  // Per-type objective-model selection (OLOS Project-Type + Secondary-Layer
  // Spec v1.2). Written incrementally by Wizard Step 2 (primary + optional
  // compatible secondaries + tension acknowledgements) and read by the
  // resolution engine at completion to seed the per-project objective set.
  // Additive + passthrough — lives in the metadata jsonb, no migration.
  projectTypeRecord: ProjectTypeRecord.optional(),
  // Project Creation Wizard Step 3 (Phase 2 / Slice 2.3). Captures the
  // primary steward identity plus a queue of pending invites. Sends are
  // deferred to Phase 6's notification architecture — for now the queue
  // is durable but inert so the wizard can hand off cleanly. The Stratum 1
  // bridge extension (Slice 2.4) reads this shape to satisfy
  // `s1-stewardship-c1` / `c2`.
  team: z
    .object({
      primarySteward: z
        .object({
          name: z.string().max(200).optional(),
          email: z.string().email().max(200).optional(),
        })
        .optional(),
      coStewards: z
        .array(
          z.object({
            name: z.string().max(200).optional(),
            email: z.string().email().max(200).optional(),
          }),
        )
        .max(50)
        .optional(),
      queuedInvites: z.array(QueuedTeamInvite).max(50).optional(),
    })
    .optional(),
  // OLOS Observe Dashboard share-link index (Phase 4 / Slice 4.1). Tokens
  // also live in the per-project `presentationShareStore`; the metadata
  // copy is the sync-mirrorable record so a share generated on one
  // device resolves on another without standing up a server endpoint.
  // Additive + passthrough — no migration.
  presentationShares: z
    .array(
      z.object({
        token: z.string().min(8).max(64),
        createdAt: z.string().datetime(),
        expiresAt: z.string().datetime().nullable(),
        expiry: z.enum(['7d', '30d', '90d', 'permanent']),
        sections: z
          .array(
            z.enum([
              'site_overview',
              'current_conditions',
              'ecological_trajectory',
              'evidence_library',
            ]),
          )
          .default([]),
      }),
    )
    .max(200)
    .optional(),
}).passthrough();
export type ProjectMetadata = z.infer<typeof ProjectMetadata>;

// 14-type OLOS taxonomy (Project-Type + Secondary-Layer Spec v1.2; livestock_operation
// added 2026-06-03) plus the `moontrance` identity sentinel — kept so historical
// OGDEN-template projects still validate, but never offered in the wizard (which
// reads PROJECT_TYPES).
// The 14 catalogue ids live in ProjectTypeId (projectTypeTaxonomy.schema.ts);
// a sync test asserts ProjectType is the superset. Legacy values
// (retreat_center / educational_farm / multi_enterprise) are backfilled by
// migration 046 to agritourism / education / regenerative_farm respectively.
export const ProjectType = z.enum([
  'homestead',
  'regenerative_farm',
  'market_garden',
  'orchard_food_forest',
  'silvopasture',
  'ecovillage',
  'agritourism',
  'education',
  'conservation',
  'off_grid',
  'wellness',
  'nursery',
  'residential',
  'livestock_operation',
  'moontrance',       // OGDEN identity template (sentinel; not in ProjectTypeId)
]);
export type ProjectType = z.infer<typeof ProjectType>;

// Shape-only GeoJSON validation for parcel boundaries. Rejects malformed /
// non-GeoJSON bodies at the API boundary so the backend never feeds junk to
// PostGIS. Coordinate arithmetic is left to PostGIS — this only asserts the
// structural shape (type discriminants + coordinate/feature arrays present).
const GeoJsonPosition = z.array(z.number()).min(2);
const PolygonGeom = z.object({
  type: z.literal('Polygon'),
  coordinates: z.array(z.array(GeoJsonPosition)),
});
const MultiPolygonGeom = z.object({
  type: z.literal('MultiPolygon'),
  coordinates: z.array(z.array(z.array(GeoJsonPosition))),
});
const PolygonalGeom = z.union([PolygonGeom, MultiPolygonGeom]);
const GeoJsonFeature = z.object({
  type: z.literal('Feature'),
  geometry: PolygonalGeom.nullable(),
});
const GeoJsonFeatureCollection = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(GeoJsonFeature),
});
export const ParcelBoundaryGeojson = z.union([
  GeoJsonFeatureCollection,
  GeoJsonFeature,
  PolygonalGeom,
]);
export type ParcelBoundaryGeojson = z.infer<typeof ParcelBoundaryGeojson>;

export const CreateProjectInput = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  address: z.string().max(500).optional(),
  parcelId: z.string().max(100).optional(),
  projectType: ProjectType.optional(),
  country: Country.default('US'),
  provinceState: z.string().max(10).optional(),
  units: z.enum(['metric', 'imperial']).default('metric'),
  metadata: ProjectMetadata.optional(),
  // Phase 4.5 — explicit workspace attach. When omitted, the server falls
  // back to the caller's default org (set at register-time by Prong 1).
  // Membership-checked server-side: caller must be a member of the org.
  orgId: z.string().uuid().optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;

export const UpdateProjectInput = CreateProjectInput.partial().extend({
  parcelBoundaryGeojson: ParcelBoundaryGeojson.optional(),
  ownerNotes: z.string().max(5000).optional(),
  zoningNotes: z.string().max(2000).optional(),
  accessNotes: z.string().max(2000).optional(),
  waterRightsNotes: z.string().max(2000).optional(),
  metadata: ProjectMetadata.optional(),
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectInput>;

export const ProjectSummary = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  status: ProjectStatus,
  projectType: ProjectType.nullable(),
  country: Country,
  provinceState: z.string().nullable(),
  conservationAuthId: z.string().nullable(),
  address: z.string().nullable(),
  parcelId: z.string().nullable(),
  acreage: z.number().nullable(),
  dataCompletenessScore: z.number().nullable(),
  hasParcelBoundary: z.boolean(),
  candidateOf: z.string().uuid().nullable().optional(),
  // Builtin sample project flag (migration 017). Read-only for every
  // account; the system user is the sole owner.
  isBuiltin: z.boolean().default(false),
  metadata: ProjectMetadata.nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ProjectSummary = z.infer<typeof ProjectSummary>;
