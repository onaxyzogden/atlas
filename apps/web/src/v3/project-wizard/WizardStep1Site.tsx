/**
 * WizardStep1Site — Step 1 of the Project Creation Wizard.
 *
 * Split layout: left-third form (name, country, units, projectType),
 * right two-thirds map host with boundary tools. Step 1 "Next" promotes
 * the draft to a real project (createProject + updateProject with the
 * boundary) and routes to /wizard/vision.
 *
 * Required for Next: name (non-empty) AND boundary present. ProjectType
 * is optional — defaults to undefined at the API.
 */

import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import type {
  Country,
  ParcelBoundaryGeojson,
  ProjectType,
} from '@ogden/shared';
import { useProjectStore } from '../../store/projectStore.js';
import { useAuthStore } from '../../store/authStore.js';
import {
  useProjectWizardStore,
  selectWizardDraft,
  isStep1Ready,
  type WizardUnits,
} from '../../store/projectWizardStore.js';
import { api } from '../../lib/apiClient.js';
import { parcelAcreage } from '../../lib/geo.js';
import { toast } from '../../components/Toast.js';
import ProjectWizardShell from './ProjectWizardShell.js';
import WizardSiteMap from './WizardSiteMap.js';
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

const PROJECT_TYPE_OPTIONS: ReadonlyArray<{ id: ProjectType; label: string }> = [
  { id: 'regenerative_farm', label: 'Regenerative farm' },
  { id: 'homestead', label: 'Homestead' },
  { id: 'educational_farm', label: 'Educational farm' },
  { id: 'retreat_center', label: 'Retreat center' },
  { id: 'conservation', label: 'Conservation' },
  { id: 'multi_enterprise', label: 'Multi-enterprise' },
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
  const setProjectType = useProjectWizardStore((s) => s.setProjectType);
  const setBoundary = useProjectWizardStore((s) => s.setBoundary);
  const clearDraft = useProjectWizardStore((s) => s.clear);

  const createProject = useProjectStore((s) => s.createProject);
  const updateProject = useProjectStore((s) => s.updateProject);
  const token = useAuthStore((s) => s.token);

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
      const acreage = fc ? parcelAcreage(fc, draft.units) : null;
      updateProject(project.id, {
        parcelBoundaryGeojson: fc,
        hasParcelBoundary: Boolean(fc),
        acreage: acreage ?? undefined,
      });
      // Best-effort server mirror; offline path silently skips.
      if (token) {
        try {
          const { data: serverProject } = await api.projects.create({
            name: trimmed,
            country: draft.country,
            units: draft.units,
            projectType: draft.projectType,
          });
          updateProject(project.id, { serverId: serverProject.id });
        } catch {
          /* offline — local-only is fine */
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

          <fieldset className={styles.field}>
            <legend className={styles.label}>Project type (optional)</legend>
            <div className={styles.chipRow}>
              {PROJECT_TYPE_OPTIONS.map((p) => {
                const selected = draft.projectType === p.id;
                return (
                  <button
                    type="button"
                    key={p.id}
                    className={styles.chip}
                    data-selected={selected ? 'true' : 'false'}
                    onClick={() =>
                      setProjectType(selected ? undefined : p.id)
                    }
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </fieldset>
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
