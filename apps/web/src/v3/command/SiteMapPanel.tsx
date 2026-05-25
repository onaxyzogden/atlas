/**
 * SiteMapPanel — the aggregate site map for the Command Centre, filling the
 * centre of the dashboard shell.
 *
 * Embeds the standalone DiagnoseMap read-only (no draw host / tool overlays),
 * fit to the project boundary when present, falling back to the project centre.
 * Plots the (already-filtered) observation needs as launchable markers, overlays
 * a "Filtered to <module>" chip when a module lens is active, and a colour-key
 * legend. Marker + boundary visibility are driven by the sidebar layer toggles.
 */

import { Filter } from 'lucide-react';
import { useV3Project } from '../data/useV3Project.js';
import DiagnoseMap from '../components/DiagnoseMap.js';
import CaptureMapMarkers from './CaptureMapMarkers.js';
import ObserveMapLegend from './ObserveMapLegend.js';
import { OBSERVE_MODULE_LABEL, type ObserveModule } from '../observe/types.js';
import type { ObservationNeedView } from '../observation-needs/useObservationNeeds.js';
import css from './ObserveCommandCentrePage.module.css';

/** Last-resort centre when a project carries neither boundary nor centre. */
const FALLBACK_CENTROID: [number, number] = [-78.2, 44.5];

interface Props {
  projectId: string;
  views?: ObservationNeedView[];
  activeModule: ObserveModule | null;
  showBoundary: boolean;
  showMarkers: boolean;
  onSelectObjective?: (needId: string) => void;
}

export default function SiteMapPanel({
  projectId,
  views,
  activeModule,
  showBoundary,
  showMarkers,
  onSelectObjective,
}: Props) {
  const project = useV3Project(projectId);
  const centroid = project?.location.center ?? FALLBACK_CENTROID;
  const boundary = project?.location.boundary;

  return (
    <section className={css.mapRegion} aria-label="Full site map">
      {activeModule && (
        <span className={css.filteredChip}>
          <Filter size={13} strokeWidth={2} /> Filtered to{' '}
          {OBSERVE_MODULE_LABEL[activeModule]}
        </span>
      )}
      <div className={css.mapFill}>
        <DiagnoseMap
          centroid={centroid}
          boundary={showBoundary ? boundary : undefined}
        >
          {({ map }) =>
            showMarkers && views && views.length > 0 ? (
              <CaptureMapMarkers
                map={map}
                views={views}
                onSelect={onSelectObjective}
              />
            ) : null
          }
        </DiagnoseMap>
      </div>
      <ObserveMapLegend active={activeModule} />
    </section>
  );
}
