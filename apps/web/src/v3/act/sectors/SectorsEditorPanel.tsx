/**
 * SectorsEditorPanel - Act right-rail takeover for full CRUD on a project's
 * external-force sectors. Opened by clicking the floating `SectorCompassOverlay`
 * HUD on the Act map (via `useActSectorsEditorStore`); `ActTierShell` renders it
 * in the `rightBody` slot in place of the Dashboard/Objective view.
 *
 * Reuses the shared sectors data layer end-to-end (`useExternalForcesStore`):
 * the same store the Observe `SectorCompassDetail` editor and the compass HUD
 * read, so edits here update the HUD live. Manual sectors are editable
 * (bearing / type / arc / intensity / remove + add); the auto-derived
 * wind/solar "computed climate layers" are listed read-only for reference,
 * mirroring the Observe detail table.
 */

import { useMemo, useState } from 'react';
import { Compass } from 'lucide-react';
import {
  useExternalForcesStore,
  type SectorArrow,
} from '../../../store/externalForcesStore.js';
import { newAnnotationId } from '../../../store/site-annotations.js';
import { useV3Project } from '../../data/useV3Project.js';
import { computedSectorRows } from '../../observe/modules/sectors-zones/derivations.js';
import { polygonCentroid } from '../../observe/modules/macroclimate-hazards/derivations.js';
import { useActSectorsEditorStore } from './actSectorsEditorStore.js';
import card from '../../_shared/stageCard/stageCard.module.css';
import styles from './SectorsEditorPanel.module.css';

type SectorTypeKey = SectorArrow['type'];
type SectorIntensityKey = NonNullable<SectorArrow['intensity']>;

const SECTOR_TYPE_LABELS: Record<SectorTypeKey, string> = {
  sun_summer: 'Summer sun',
  sun_winter: 'Winter sun',
  wind_prevailing: 'Prevailing wind',
  wind_storm: 'Storm wind',
  fire: 'Wildfire / hazard',
  noise: 'Road & noise',
  wildlife: 'Wildlife corridor',
  view: 'Views',
};

const INTENSITY_LABELS: Record<SectorIntensityKey, string> = {
  high: 'High',
  med: 'Medium',
  low: 'Low',
};

const SECTOR_TYPE_ENTRIES = Object.entries(SECTOR_TYPE_LABELS) as Array<[SectorTypeKey, string]>;
const INTENSITY_ENTRIES = Object.entries(INTENSITY_LABELS) as Array<[SectorIntensityKey, string]>;

// Compact, theme-matching inline controls so editable cells fit the narrow rail.
const cellControlStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(0,0,0,0.25)',
  color: 'inherit',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 4,
  padding: '2px 6px',
  fontSize: 12,
};

const numberInputStyle: React.CSSProperties = {
  ...cellControlStyle,
  width: 56,
};

const removeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'rgba(232,220,200,0.55)',
  cursor: 'pointer',
  fontSize: 16,
  lineHeight: 1,
  padding: '0 4px',
};

const computedDividerStyle: React.CSSProperties = {
  color: 'rgba(232,220,200,0.5)',
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  paddingTop: 12,
};

const computedRowStyle: React.CSSProperties = {
  color: 'rgba(232,220,200,0.55)',
};

interface Props {
  projectId: string;
}

export default function SectorsEditorPanel({ projectId }: Props) {
  const project = useV3Project(projectId);
  const close = useActSectorsEditorStore((s) => s.close);

  const allSectors = useExternalForcesStore((s) => s.sectors);
  const addSector = useExternalForcesStore((s) => s.addSector);
  const updateSector = useExternalForcesStore((s) => s.updateSector);
  const removeSector = useExternalForcesStore((s) => s.removeSector);
  const sectors = useMemo(
    () => allSectors.filter((s) => s.projectId === projectId),
    [allSectors, projectId],
  );

  const [draftType, setDraftType] = useState<SectorTypeKey>('wind_prevailing');

  const centroidTuple = useMemo<[number, number] | null>(() => {
    const c = polygonCentroid(project?.location?.boundary);
    return c ? [c.lng, c.lat] : null;
  }, [project?.location?.boundary]);

  const computedRows = useMemo(() => computedSectorRows(centroidTuple), [centroidTuple]);

  const handleAddSector = () => {
    addSector({
      id: newAnnotationId('sec'),
      projectId,
      type: draftType,
      bearingDeg: 270,
      arcDeg: 60,
      intensity: 'med',
    });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>
          <Compass aria-hidden="true" size={14} />
          Sectors
          {sectors.length > 0 ? <span className={styles.count}>{sectors.length}</span> : null}
        </span>
        <button type="button" className={styles.doneBtn} onClick={close}>
          Done
        </button>
      </div>

      {sectors.length === 0 ? (
        <p className={styles.empty}>No sectors yet — add one below.</p>
      ) : null}

      {sectors.length > 0 || computedRows.length > 0 ? (
        <table className={card.table}>
          <thead>
            <tr>
              <th>Bearing</th>
              <th>Sector</th>
              <th>Arc</th>
              <th>Intensity</th>
              <th aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {sectors.map((s) => {
              const intensity = s.intensity ?? 'low';
              return (
                <tr key={s.id}>
                  <td>
                    <input
                      type="number"
                      min={0}
                      max={359}
                      value={s.bearingDeg}
                      aria-label="Bearing in degrees"
                      style={numberInputStyle}
                      onChange={(e) =>
                        updateSector(s.id, {
                          bearingDeg: Math.max(0, Math.min(359, Number(e.target.value) || 0)),
                        })
                      }
                    />
                    {'°'}
                  </td>
                  <td>
                    <select
                      value={s.type}
                      aria-label="Sector type"
                      style={cellControlStyle}
                      onChange={(e) =>
                        updateSector(s.id, { type: e.target.value as SectorTypeKey })
                      }
                    >
                      {SECTOR_TYPE_ENTRIES.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      min={1}
                      max={360}
                      value={s.arcDeg}
                      aria-label="Arc width in degrees"
                      style={numberInputStyle}
                      onChange={(e) =>
                        updateSector(s.id, {
                          arcDeg: Math.max(1, Math.min(360, Number(e.target.value) || 1)),
                        })
                      }
                    />
                    {'°'}
                  </td>
                  <td>
                    <select
                      value={intensity}
                      aria-label="Intensity"
                      style={cellControlStyle}
                      onChange={(e) =>
                        updateSector(s.id, { intensity: e.target.value as SectorIntensityKey })
                      }
                    >
                      {INTENSITY_ENTRIES.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      style={removeBtnStyle}
                      aria-label="Remove sector"
                      title="Remove sector"
                      onClick={() => removeSector(s.id)}
                    >
                      {'×'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {computedRows.length > 0 ? (
              <>
                <tr>
                  <td colSpan={5} style={computedDividerStyle}>
                    Computed climate layers · auto-derived, read-only
                  </td>
                </tr>
                {computedRows.map((row) => (
                  <tr key={row.id} style={computedRowStyle}>
                    <td>{row.bearing}</td>
                    <td>{row.label}</td>
                    <td>{'—'}</td>
                    <td>{row.strength}</td>
                    <td />
                  </tr>
                ))}
              </>
            ) : null}
          </tbody>
        </table>
      ) : null}

      <div className={styles.addRow}>
        <select
          value={draftType}
          aria-label="New sector type"
          style={{ ...cellControlStyle, width: 'auto', flex: '0 1 200px' }}
          onChange={(e) => setDraftType(e.target.value as SectorTypeKey)}
        >
          {SECTOR_TYPE_ENTRIES.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button type="button" className={card.btn} onClick={handleAddSector}>
          + Add sector
        </button>
      </div>
    </div>
  );
}
