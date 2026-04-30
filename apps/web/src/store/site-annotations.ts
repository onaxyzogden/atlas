/**
 * Site Annotations — type-only barrel + shared id helper.
 *
 * Re-exports the canonical types from the 7 Scholar-aligned namespace
 * stores so consumers can `import type { HazardEvent } from
 * '../../store/site-annotations'` without coupling to a specific store
 * file. Hooks are NOT re-exported through this barrel — consumers import
 * each hook directly to keep the dependency graph explicit.
 *
 * See ADR 2026-04-30-site-annotations-store-scholar-aligned-namespaces.md.
 */

// External Forces
export type {
  HazardType,
  HazardSeverity,
  HazardEvent,
  SectorType,
  SectorIntensity,
  SectorArrow,
} from './externalForcesStore.js';

// Topography
export type {
  VerticalElementType,
  StandaloneVerticalMarker,
  TransectVerticalRefKind,
  TransectVerticalRef,
  Transect,
} from './topographyStore.js';

// Ecology
export type {
  TrophicLevel,
  SuccessionStage,
  EcologyObservation,
} from './ecologyStore.js';

// Water Systems
export type {
  EarthworkType,
  Earthwork,
  StorageInfraType,
  StorageInfra,
} from './waterSystemsStore.js';

// Polyculture
export type {
  GuildLayer,
  GuildMember,
  Guild,
  SpeciesPick,
} from './polycultureStore.js';

// Closed-Loop
export type {
  WasteResourceType,
  WasteVector,
  WasteVectorRun,
  FertilityInfraType,
  FertilityInfra,
} from './closedLoopStore.js';

// SWOT
export type { SwotBucket, SwotEntry } from './swotStore.js';

/**
 * Shared id helper for user-authored annotations. Relocated verbatim from
 * the legacy `siteAnnotationsStore.ts`.
 */
export function newAnnotationId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
