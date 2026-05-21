/**
 * NewProjectPage — multi-step property intake wizard.
 *
 * Steps:
 *   0. (Optional) Template — choose a public template or start blank
 *   1. Name & Type — project name, type, country, units
 *   2. Location — address, parcel ID, GPS coordinates
 *   3. Boundary — draw on map or import file (KML/GeoJSON/Shapefile)
 *   4. Notes & Attachments — owner notes, zoning, photos, documents
 *
 * Step 0 is auto-skipped when the URL carries a `prefillTemplate`
 * search-param (the showcase ContactCTA + the /register tier paths
 * thread it through). When skipped, the wizard starts on StepBasicInfo.
 */

import { useMemo, useState } from 'react';
import { useSearch } from '@tanstack/react-router';
import type { Country } from '@ogden/shared';
import { StepIndicator } from '../components/ui/index.js';
import StepTemplate from '../features/project/wizard/StepTemplate.js';
import StepBasicInfo from '../features/project/wizard/StepBasicInfo.js';
import StepLocation from '../features/project/wizard/StepLocation.js';
import StepBoundary from '../features/project/wizard/StepBoundary.js';
import StepNotes from '../features/project/wizard/StepNotes.js';
import styles from './NewProjectPage.module.css';

export interface WizardData {
  // Step 0 — template selection (optional)
  templateSlug?: string;
  drawFirst?: boolean;
  fullSetup?: boolean;
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

const INITIAL_DATA: WizardData = {
  templateSlug: undefined,
  drawFirst: false,
  fullSetup: false,
  name: '',
  projectType: '',
  country: 'US',
  units: 'metric',
  description: '',
  address: '',
  parcelId: '',
  provinceState: '',
  centerLat: '',
  centerLng: '',
  parcelBoundaryGeojson: null,
  ownerNotes: '',
  zoningNotes: '',
  accessNotes: '',
  waterRightsNotes: '',
  climateRegion: '',
  bioregion: '',
  county: '',
  legalDescription: '',
  fieldObservations: '',
  restrictionsCovenants: '',
  mapProjection: '',
  soilPh: '',
  soilOrganicMatter: '',
  soilCompaction: '',
  soilBiologicalActivity: '',
};

interface NewProjectSearch {
  prefillTemplate?: string;
  drawFirst?: boolean | string;
  fullSetup?: boolean | string;
}

export default function NewProjectPage() {
  const search = useSearch({ strict: false }) as NewProjectSearch;

  // Tier-aware initialisation: if the /register handoff (or a deep link)
  // pre-fills a template, skip the template-picker step entirely.
  const prefillTemplate =
    typeof search.prefillTemplate === 'string' && search.prefillTemplate
      ? search.prefillTemplate
      : undefined;
  const drawFirst =
    search.drawFirst === true || search.drawFirst === 'true';
  const fullSetup =
    search.fullSetup === true || search.fullSetup === 'true';

  const initialData: WizardData = useMemo(
    () => ({
      ...INITIAL_DATA,
      templateSlug: prefillTemplate,
      drawFirst,
      fullSetup,
      // Friendly default name when arriving from the showcase ContactCTA.
      name:
        prefillTemplate === 'ecosystem-farm'
          ? INITIAL_DATA.name || 'My Ecosystem Farm'
          : INITIAL_DATA.name,
    }),
    [prefillTemplate, drawFirst, fullSetup],
  );

  const STEPS = useMemo(() => {
    const baseSteps = [
      { label: 'Name & Type', component: StepBasicInfo },
      { label: 'Location', component: StepLocation },
      { label: 'Boundary', component: StepBoundary },
      { label: 'Notes', component: StepNotes },
    ] as const;
    // Skip the template picker when the URL already pinned a template.
    if (prefillTemplate) return baseSteps;
    return [
      { label: 'Template', component: StepTemplate },
      ...baseSteps,
    ] as const;
  }, [prefillTemplate]);

  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(initialData);

  const StepComponent = STEPS[step]!.component;
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  // The boundary step occupies the third-from-last slot regardless of
  // whether the template picker is mounted.
  const isBoundaryStep =
    STEPS[step]!.component === StepBoundary;

  const STEP_IDS = STEPS.map((s, i) => ({ id: String(i), label: s.label }));
  const completedSteps = STEP_IDS.filter((_, i) => i < step).map((s) => s.id);

  const updateData = (updates: Partial<WizardData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleStepClick = (stepId: string) => {
    const idx = Number(stepId);
    if (idx <= step) setStep(idx);
  };

  return (
    <div className={styles.page}>
      {/* Header: title + step indicator */}
      <div className={styles.header}>
        <h1 className={styles.title}>Create New Project</h1>
        <StepIndicator
          steps={STEP_IDS}
          currentStep={String(step)}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
          className={styles.stepIndicator}
        />
      </div>

      {/* Step content */}
      <div className={isBoundaryStep ? styles.contentExpanded : styles.content}>
        <div className={isBoundaryStep ? styles.cardExpanded : styles.card}>
          <StepComponent
            data={data}
            updateData={updateData}
            onNext={goNext}
            onBack={goBack}
            isFirst={isFirst}
            isLast={isLast}
          />
        </div>
      </div>

      {/* Navigation is handled by each step's WizardNav component */}
    </div>
  );
}
