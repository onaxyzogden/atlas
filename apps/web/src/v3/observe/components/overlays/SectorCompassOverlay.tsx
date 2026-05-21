/**
 * SectorCompassOverlay — fixed bottom-right HUD on the Observe map.
 *
 * Replaces the per-group MapLibre sector fill/line/symbol layers with a
 * single compass-rose summary widget. Layers computed wind petals + solar
 * arcs + the steward's manual sector arrows around the project centroid
 * (same data the Sectors & Zones slideup renders).
 *
 * Visibility:
 *   - Hidden entirely when the matrix legend `sectors` toggle is off.
 *   - Returns null when there is neither a centroid nor any manual sector
 *     (nothing to draw).
 *
 * Read-only display: clicks pass through to the card itself only.
 */

import { useMemo } from 'react';
import { useExternalForcesStore } from '../../../../store/externalForcesStore.js';
import { useMatrixTogglesStore } from '../../../../store/matrixTogglesStore.js';
import { useV3Project } from '../../../data/useV3Project.js';
import { useHomesteadStore } from '../../../../store/homesteadStore.js';
import { polygonCentroid } from '../../modules/macroclimate-hazards/derivations.js';
import SectorCompassDiagram from '../../modules/sectors-zones/SectorCompassDiagram.js';
import css from './SectorCompassOverlay.module.css';

interface Props {
  projectId: string | null;
}

export default function SectorCompassOverlay({ projectId }: Props) {
  const id = projectId ?? 'mtc';
  const project = useV3Project(id);
  const sectorsVisible = useMatrixTogglesStore((s) => s.sectors);

  const allSectors = useExternalForcesStore((s) => s.sectors);
  const sectors = useMemo(
    () => allSectors.filter((s) => s.projectId === id),
    [allSectors, id],
  );

  const homesteadByProject = useHomesteadStore((s) => s.byProject);
  const homestead = homesteadByProject[id];

  const centroidTuple = useMemo<[number, number] | null>(() => {
    const c = polygonCentroid(project?.location?.boundary);
    if (c) return [c.lng, c.lat];
    if (homestead) return homestead;
    return null;
  }, [project?.location?.boundary, homestead]);

  if (!sectorsVisible) return null;
  if (!centroidTuple && sectors.length === 0) return null;

  return (
    <div className={css.dock} aria-hidden={false}>
      <div className={css.card}>
        <span className={css.label}>Sector compass</span>
        <SectorCompassDiagram
          centroid={centroidTuple}
          sectors={sectors}
          compact
          className={css.svg}
        />
      </div>
    </div>
  );
}
