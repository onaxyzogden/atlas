import type { Country } from '@ogden/shared';

/**
 * Shared form state for the legacy multi-step property wizard (Step0–Step4).
 *
 * These components are no longer mounted (project creation is now the
 * name-only intake in NewProjectPage, with boundary capture deferred to
 * OBSERVE), but are preserved on disk for reuse in later stages. The
 * interface lived in NewProjectPage until that page was simplified; it now
 * lives here so the wizard remains self-contained.
 */
export interface WizardData {
  // Step 0 — template selection (optional)
  templateSlug?: string;
  drawFirst?: boolean;
  fullSetup?: boolean;
  // Workspace (organization) context — populated from ?orgId search param,
  // user's defaultOrgId, or the OrganizationSwitcherModal pick.
  orgId?: string;
  // Step 1
  name: string;
  projectType: string;
  country: Country;
  units: 'metric' | 'imperial';
  description: string;
  // Step 2
  address: string;
  parcelId: string;
  provinceState: string;
  centerLat: string;
  centerLng: string;
  // Step 3
  parcelBoundaryGeojson: unknown | null;
  // Step 4
  ownerNotes: string;
  zoningNotes: string;
  accessNotes: string;
  waterRightsNotes: string;
  // Step 4 — long-tail metadata (persisted to projects.metadata jsonb)
  climateRegion: string;
  bioregion: string;
  county: string;
  legalDescription: string;
  fieldObservations: string;
  restrictionsCovenants: string;
  mapProjection: string;
  // Step 4 — soil notes (persisted to projects.metadata.soilNotes jsonb)
  soilPh: string;
  soilOrganicMatter: string;
  soilCompaction: string;
  soilBiologicalActivity: string;
}

export interface WizardStepProps {
  data: WizardData;
  updateData: (updates: Partial<WizardData>) => void;
  onNext: () => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
}
