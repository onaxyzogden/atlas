/**
 * SiteOverviewSection — Section 1 of Presentation Mode (OLOS Observe
 * Dashboard Spec §6.1). Project name, acreage, country, and steward
 * (read-only). Boundary is summarised in text — the live map view stays
 * inside the dashboard; the presentation surface keeps to value-only
 * fields so the share viewer never has to mount Mapbox.
 */

import type { LocalProject } from '../../../../store/projectStore.js';
import css from './SectionCommon.module.css';

interface Props {
  project: LocalProject;
}

function describeSteward(project: LocalProject): string {
  const steward = project.metadata?.team?.primarySteward;
  if (!steward) return 'Not yet assigned';
  const name = steward.name?.trim();
  const email = steward.email?.trim();
  if (name && email) return `${name} (${email})`;
  return name || email || 'Not yet assigned';
}

function describeBoundary(project: LocalProject): string {
  if (!project.hasParcelBoundary) return 'No boundary captured yet';
  if (project.acreage == null) return 'Boundary captured (acreage pending)';
  const acres = project.acreage;
  if (project.units === 'metric') {
    const hectares = acres * 0.404686;
    return `${hectares.toFixed(2)} ha (${acres.toFixed(2)} acres)`;
  }
  return `${acres.toFixed(2)} acres`;
}

export default function SiteOverviewSection({ project }: Props) {
  return (
    <section className={css.section} aria-labelledby="presentation-site-overview">
      <h2 id="presentation-site-overview" className={css.heading}>
        Site overview
      </h2>
      <dl className={css.fieldList}>
        <div className={css.field}>
          <dt className={css.term}>Project</dt>
          <dd className={css.value}>{project.name}</dd>
        </div>
        <div className={css.field}>
          <dt className={css.term}>Country</dt>
          <dd className={css.value}>{project.country || '-'}</dd>
        </div>
        <div className={css.field}>
          <dt className={css.term}>Boundary</dt>
          <dd className={css.value}>{describeBoundary(project)}</dd>
        </div>
        <div className={css.field}>
          <dt className={css.term}>Steward</dt>
          <dd className={css.value}>{describeSteward(project)}</dd>
        </div>
        {project.visionStatement && (
          <div className={css.field}>
            <dt className={css.term}>Vision</dt>
            <dd className={css.value}>{project.visionStatement}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
