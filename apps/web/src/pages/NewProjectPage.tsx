/**
 * NewProjectPage — multi-step property intake wizard.
 *
 * Steps:
 *   1. Name & Type — project name, type, country, units
 *   2. Location — address, parcel ID, GPS coordinates
 *   3. Boundary — draw on map or import file (KML/GeoJSON/Shapefile)
 *   4. Notes & Attachments — owner notes, zoning, photos, documents
 */

import { useState } from 'react';
import type { Country } from '@ogden/shared';
import { StepIndicator } from '../components/ui/index.js';
import StepBasicInfo from '../features/project/wizard/StepBasicInfo.js';
import StepLocation from '../features/project/wizard/StepLocation.js';
import StepBoundary from '../features/project/wizard/StepBoundary.js';
import StepNotes from '../features/project/wizard/StepNotes.js';
import styles from './NewProjectPage.module.css';

export interface WizardData {
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

const STEPS = [
  { label: 'Name & Type', component: StepBasicInfo },
  { label: 'Location', component: StepLocation },
  { label: 'Boundary', component: StepBoundary },
  { label: 'Notes', component: StepNotes },
] as const;

/** Map STEPS to the shape expected by StepIndicator */
const STEP_IDS = STEPS.map((s, i) => ({ id: String(i), label: s.label }));

export default function NewProjectPage() {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<WizardData>(INITIAL_DATA);

  const StepComponent = STEPS[step]!.component;
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;
  const isBoundaryStep = step === 2;

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
