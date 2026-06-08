/**
 * WizardStep1Site — Step 1 of the Project Creation Wizard.
 *
 * Split layout: left-third form (name, country, units, address search),
 * right two-thirds map host with boundary tools. Step 1 "Next" promotes
 * the draft to a real project (createProject + updateProject with the
 * boundary) and routes to /wizard/vision.
 *
 * Required for Next: name (non-empty) AND boundary present.
 *
 * The address search lives in the form column. It needs the live map handle
 * (flyTo + marker), which only exists inside DiagnoseMap's render-prop in
 * WizardSiteMap; WizardMapRegistrar publishes it to wizardMapStore and we
 * read it back here.
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type { Country, ParcelBoundaryGeojson } from '@ogden/shared';
import { useProjectStore } from '../../store/projectStore.js';
import { useAuthStore } from '../../store/authStore.js';
import {
  useProjectWizardStore,
  selectWizardDraft,
  isStep1Ready,
  type WizardUnits,
} from '../../store/projectWizardStore.js';
import { syncProjectNow } from '../../lib/syncService.js';
import { parcelAcres } from '../../lib/geo.js';
import { toast } from '../../components/Toast.js';
import ProjectWizardShell from './ProjectWizardShell.js';
import WizardSiteMap from './WizardSiteMap.js';
import WizardAddressSearch from './WizardAddressSearch.js';
import { useWizardMapStore } from './wizardMapStore.js';
import styles from './WizardStep1Site.module.css';

const COUNTRY_OPTIONS: ReadonlyArray<{ id: Country; label: string }> = [
  { id: 'US', label: 'United States' },
  { id: 'CA', label: 'Canada' },
  { id: 'INTL', label: 'Other' },
];

const UNIT_OPTIONS: ReadonlyArray<{ id: WizardUnits; label: string }> = [
  { id: 'imperial', label: 'Imperial (acres)' },
  { id: 'metric', label: 'Metric (hectares)' },
];

/**
 * LocalProject persists boundaries as FeatureCollection (matches
 * MapToolbar's import contract). The wizard draft holds a
 * ParcelBoundaryGeojson union (Polygon / Feature / FC / etc.) — collapse
 * to a FC here so updateProject and parcelAcreage both receive a
 * well-typed shape.
 */
function toFeatureCollection(
  boundary: ParcelBoundaryGeojson | undefined,
): GeoJSON.FeatureCollection | null {
  if (!boundary) return null;
  const raw = boundary as
    | GeoJSON.Polygon
    | GeoJSON.MultiPolygon
    | GeoJSON.Feature
    | GeoJSON.FeatureCollection;
  if (raw.type === 'FeatureCollection') return raw as GeoJSON.FeatureCollection;
  if (raw.type === 'Feature') {
    const feature = raw as GeoJSON.Feature;
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: feature.properties ?? {},
          geometry: feature.geometry,
        },
      ],
    };
  }
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: raw as GeoJSON.Geometry,
      },
    ],
  };
}

export default function WizardStep1Site() {
  const navigate = useNavigate();
  const draft = useProjectWizardStore(selectWizardDraft);
  const setName = useProjectWizardStore((s) => s.setName);
  const setCountry = useProjectWizardStore((s) => s.setCountry);
  const setUnits = useProjectWizardStore((s) => s.setUnits);
  const setBoundary = useProjectWizardStore((s) => s.setBoundary);
  const clearDraft = useProjectWizardStore((s) => s.clear);

  const createProject = useProjectStore((s) => s.createProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const token = useAuthStore((s) => s.token);

  // Live map handle published by WizardMapRegistrar (inside DiagnoseMap's
  // render-prop). Null until the map mounts; the address search renders only
  // once it is available.
  const wizardMap = useWizardMapStore((s) => s.map);

  const [submitting, setSubmitting] = useState(false);

  const ready = isStep1Ready(draft);
  const hint = !draft.name.trim()
    ? 'Project name required'
    : !draft.draftBoundary
    ? 'Draw, walk, or upload your parcel boundary'
    : 'Ready to continue';

  const handleNext = async () => {
    if (!ready || submitting) return;
    setSubmitting(true);
    try {
      const trimmed = draft.name.trim();
      const project = createProject({
        name: trimmed,
        country: draft.country,
        units: draft.units,
        projectType: draft.projectType,
        metadata: {
          wizardStatus: 'in_progress',
          wizardLastStep: 'site',
        },
      });
      // Persist boundary immediately so a refresh after Next never loses it.
      const fc = toFeatureCollection(draft.draftBoundary);
      const acreage = fc ? parcelAcres(fc) : null;
      updateProject(project.id, {
        parcelBoundaryGeojson: fc,
        hasParcelBoundary: Boolean(fc),
        acreage: acreage ?? undefined,
      });
      // Server mirror through the single canonical sync path (idempotent +
      // in-flight-deduped against the store subscription, so exactly one row is
      // created). Local-first: we still navigate even if the sync fails — the
      // project is already saved on-device and syncQueue will retry — but we no
      // longer swallow the failure silently; the steward gets an honest toast.
      if (token) {
        const result = await syncProjectNow(project.id);
        if (!result.ok && result.error !== 'builtin') {
          toast.error(
            "Saved on this device — couldn't reach the server. It'll sync automatically when you're back online.",
          );
        }
      }
      clearDraft();
      navigate({
        to: '/v3/project/$projectId/wizard/$step',
        params: { projectId: project.id, step: 'vision' },
      });
    } catch (err) {
      console.error('[wizard] step 1 next failed', err);
      toast.error('Could not save your project. Try again.');
      setSubmitting(false);
    }
  };

  return (
    <ProjectWizardShell
      step="site"
      onNext={handleNext}
      nextDisabled={!ready || submitting}
      nextLabel={submitting ? 'Saving...' : 'Next'}
      hint={hint}
    >
      <div className={styles.layout}>
        <aside className={styles.form} aria-label="Site details form">
          <h1 className={styles.title}>Tell us about your land</h1>
          <p className={styles.subtitle}>
            Name the project and trace your parcel. We will use the
            boundary to anchor everything you do next.
          </p>

          <div className={styles.bento}>
            <label className={styles.field}>
              <span className={styles.label}>Project name</span>
              <input
                type="text"
                className={styles.input}
                value={draft.name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Cedar Hollow Farm"
                maxLength={200}
                autoFocus
              />
            </label>
          </div>

          <div className={styles.bento}>
            <label className={styles.field}>
              <span className={styles.label}>Country</span>
              <select
                className={styles.input}
                value={draft.country}
                onChange={(e) => setCountry(e.target.value as Country)}
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            {wizardMap && (
              <div className={styles.field}>
                <span className={styles.label}>Find your property by address</span>
                <WizardAddressSearch map={wizardMap} country={draft.country} />
              </div>
            )}
          </div>

          <div className={styles.bento}>
            <fieldset className={styles.field}>
              <legend className={styles.label}>Units</legend>
              <div className={styles.chipRow}>
                {UNIT_OPTIONS.map((u) => (
                  <button
                    type="button"
                    key={u.id}
                    className={styles.chip}
                    data-selected={draft.units === u.id ? 'true' : 'false'}
                    onClick={() => setUnits(u.id)}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </aside>

        <div className={styles.mapHost}>
          <WizardSiteMap
            boundary={draft.draftBoundary}
            units={draft.units}
            country={draft.country}
            onBoundaryChange={setBoundary}
          />
        </div>
      </div>
    </ProjectWizardShell>
  );
}
