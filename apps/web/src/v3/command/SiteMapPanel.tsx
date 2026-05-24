/**
 * SiteMapPanel — the aggregate "full site map" for the Command Centre.
 *
 * Embeds the standalone DiagnoseMap read-only (no draw host / tool overlays),
 * fit to the project boundary when present, falling back to the project centre.
 * Gives the steward the whole parcel in one frame alongside the summary panels.
 */

import { useV3Project } from '../data/useV3Project.js';
import DiagnoseMap from '../components/DiagnoseMap.js';
import css from './ObserveCommandCentrePage.module.css';

/** Last-resort centre when a project carries neither boundary nor centre. */
const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];

interface Props {
  projectId: string;
}

export default function SiteMapPanel({ projectId }: Props) {
  const project = useV3Project(projectId);
  const centroid = project?.location.center ?? FALLBACK_CENTROID;
  const boundary = project?.location.boundary;

  return (
    <section className={`${css.panel} ${css.mapPanel}`} aria-label="Full site map">
      <p className="eyebrow">Full site map</p>
      <div className={css.mapFrame}>
        <DiagnoseMap centroid={centroid} boundary={boundary} />
      </div>
    </section>
  );
}
