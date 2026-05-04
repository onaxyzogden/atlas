/**
 * SectorCompassCard — Phase 4e OBSERVE surface (Module 5).
 *
 * Circular SVG editor for off-site influence vectors (sun summer/winter,
 * prevailing wind, storm wind, fire approach, noise, wildlife corridors,
 * key views). Persists arrows via useExternalForcesStore. The same store
 * drives `features/map/SectorOverlay`, which projects each wedge onto the
 * MapView canvas — this surface is the editor; the map shows the overlay
 * read-only via `SectorOverlayToggle`.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useExternalForcesStore } from '../../store/externalForcesStore.js';
import { newAnnotationId, type SectorArrow, type SectorType, type SectorIntensity } from '../../store/site-annotations.js';
import compassStyles from './SectorCompassCard.module.css';
import shared from './StewardSurveyCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SECTOR_TYPES: Array<{ value: SectorType; label: string; color: string }> = [
  { value: 'sun_summer',       label: 'Sun (summer)',       color: 'rgba(240, 195, 80, 0.55)' },
  { value: 'sun_winter',       label: 'Sun (winter)',       color: 'rgba(240, 230, 120, 0.5)' },
  { value: 'wind_prevailing',  label: 'Wind (prevailing)',  color: 'rgba(120, 190, 220, 0.5)' },
  { value: 'wind_storm',       label: 'Wind (storm)',       color: 'rgba(200, 80, 100, 0.55)' },
  { value: 'fire',             label: 'Fire approach',      color: 'rgba(220, 100, 70, 0.55)' },
  { value: 'noise',            label: 'Noise',              color: 'rgba(180, 120, 200, 0.5)' },
  { value: 'wildlife',         label: 'Wildlife corridor',  color: 'rgba(120, 200, 130, 0.5)' },
  { value: 'view',             label: 'View / vista',       color: 'rgba(180, 180, 180, 0.5)' },
];

const INTENSITIES: SectorIntensity[] = ['low', 'med', 'high'];

const COMPASS_SIZE = 360;
const CX = COMPASS_SIZE / 2;
const CY = COMPASS_SIZE / 2;
const RADIUS = COMPASS_SIZE / 2 - 30;

/** Convert a compass bearing (deg from N, clockwise) + radius to SVG x/y. */
function polar(bearingDeg: number, r: number): { x: number; y: number } {
  // Compass: N=0, E=90, S=180, W=270 (clockwise).
  // SVG: x = right, y = down. Convert with rad = (bearing − 90) in standard math.
  const rad = ((bearingDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

/** Build an SVG arc path for a sector wedge. */
function wedgePath(bearingDeg: number, arcDeg: number): string {
  const half = arcDeg / 2;
  const start = polar(bearingDeg - half, RADIUS);
  const end = polar(bearingDeg + half, RADIUS);
  const largeArc = arcDeg > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
}

export default function SectorCompassCard({ project }: Props) {
  const allSectors = useExternalForcesStore((s) => s.sectors);
  const addSector = useExternalForcesStore((s) => s.addSector);
  const updateSector = useExternalForcesStore((s) => s.updateSector);
  const removeSector = useExternalForcesStore((s) => s.removeSector);

  const sectors = useMemo(
    () => allSectors.filter((s) => s.projectId === project.id),
    [allSectors, project.id],
  );

  const [draftType, setDraftType] = useState<SectorType>('wind_prevailing');

  function addArrow() {
    const arrow: SectorArrow = {
      id: newAnnotationId('sec'),
      projectId: project.id,
      type: draftType,
      bearingDeg: 270, // default to W
      arcDeg: 60,
      intensity: 'med',
    };
    addSector(arrow);
  }

  return (
    <div className={compassStyles.page}>
      <header className={compassStyles.hero}>
        <span className={compassStyles.heroTag}>Module 5 · Sectors</span>
        <h1 className={compassStyles.title}>Sector Compass</h1>
        <p className={compassStyles.lede}>
          Map the off-site influences that shape design choices: where summer and
          winter sun arrive, the prevailing and storm winds, fire approach, noise
          sources, wildlife corridors, and key views. Bearings are degrees from
          North (0° = N, 90° = E).
        </p>
      </header>

      <div className={compassStyles.layout}>
        <div className={compassStyles.compassWrap}>
          <svg
            className={compassStyles.compass}
            viewBox={`0 0 ${COMPASS_SIZE} ${COMPASS_SIZE}`}
            role="img"
            aria-label="Sector compass overlay"
          >
            {/* Outer ring */}
            <circle cx={CX} cy={CY} r={RADIUS} fill="rgba(0,0,0,0.25)" stroke="rgba(255,255,255,0.18)" />
            {/* Cardinal labels */}
            {[
              { label: 'N', bearing: 0 },
              { label: 'E', bearing: 90 },
              { label: 'S', bearing: 180 },
              { label: 'W', bearing: 270 },
            ].map((c) => {
              const p = polar(c.bearing, RADIUS + 16);
              return (
                <text
                  key={c.label}
                  x={p.x}
                  y={p.y + 4}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight={700}
                  fill="rgba(232,220,200,0.7)"
                >
                  {c.label}
                </text>
              );
            })}
            {/* Cross-hairs */}
            <line x1={CX} y1={CY - RADIUS} x2={CX} y2={CY + RADIUS} stroke="rgba(255,255,255,0.08)" />
            <line x1={CX - RADIUS} y1={CY} x2={CX + RADIUS} y2={CY} stroke="rgba(255,255,255,0.08)" />

            {/* Sector wedges */}
            {sectors.map((s) => {
              const meta = SECTOR_TYPES.find((t) => t.value === s.type);
              return (
                <path
                  key={s.id}
                  d={wedgePath(s.bearingDeg, s.arcDeg)}
                  fill={meta?.color ?? 'rgba(255,255,255,0.2)'}
                  stroke="rgba(255,255,255,0.15)"
                />
              );
            })}

            {/* Centre dot */}
            <circle cx={CX} cy={CY} r={4} fill="rgba(var(--color-gold-rgb), 0.9)" />
          </svg>
        </div>

        <div className={compassStyles.editor}>
          <div className={shared.field} style={{ marginBottom: 12 }}>
            <label htmlFor="sec-type">Add sector</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                id="sec-type"
                value={draftType}
                onChange={(e) => setDraftType(e.target.value as SectorType)}
                style={{ flex: 1 }}
              >
                {SECTOR_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <button type="button" className={shared.addBtn} style={{ marginTop: 0, width: 'auto' }} onClick={addArrow}>
                +
              </button>
            </div>
          </div>

          {sectors.length === 0 ? (
            <p style={{ fontSize: 12, color: 'rgba(232,220,200,0.5)', fontStyle: 'italic' }}>
              No sectors placed yet. Pick a type above and press +.
            </p>
          ) : (
            sectors.map((s) => (
              <div key={s.id} className={compassStyles.sectorRow}>
                <select
                  value={s.type}
                  onChange={(e) => updateSector(s.id, { type: e.target.value as SectorType })}
                >
                  {SECTOR_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0} max={359}
                  title="Bearing (°)"
                  value={s.bearingDeg}
                  onChange={(e) =>
                    updateSector(s.id, { bearingDeg: Math.max(0, Math.min(359, Number(e.target.value) || 0)) })
                  }
                />
                <input
                  type="number"
                  min={5} max={360}
                  title="Arc width (°)"
                  value={s.arcDeg}
                  onChange={(e) =>
                    updateSector(s.id, { arcDeg: Math.max(5, Math.min(360, Number(e.target.value) || 5)) })
                  }
                />
                <select
                  value={s.intensity ?? 'med'}
                  onChange={(e) => updateSector(s.id, { intensity: e.target.value as SectorIntensity })}
                  title="Intensity"
                >
                  {INTENSITIES.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
                <button type="button" className={shared.removeBtn} onClick={() => removeSector(s.id)}>
                  ×
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
