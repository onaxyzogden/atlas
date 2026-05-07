/**
 * SunWindWedgeTool — adds a SectorArrow (bearing + arc) to externalForcesStore.
 *
 * Not a MapboxDraw tool: sectors are angular wedges anchored at the homestead
 * (or parcel centroid as fallback). Steward picks type/intensity/arc width and
 * either types a bearing or click-seeds it from the map (cursor crosshair on
 * the canvas).
 */

import { useEffect, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  useExternalForcesStore,
  type SectorType,
  type SectorIntensity,
} from '../../../../store/externalForcesStore.js';
import { useHomesteadStore } from '../../../../store/homesteadStore.js';
import { useMapToolStore } from '../measure/useMapToolStore.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const SECTOR_OPTIONS: { value: SectorType; label: string }[] = [
  { value: 'sun_summer', label: 'Sun (summer)' },
  { value: 'sun_winter', label: 'Sun (winter)' },
  { value: 'wind_prevailing', label: 'Wind (prevailing)' },
  { value: 'wind_storm', label: 'Wind (storm)' },
  { value: 'fire', label: 'Fire approach' },
  { value: 'noise', label: 'Noise' },
  { value: 'wildlife', label: 'Wildlife corridor' },
  { value: 'view', label: 'View' },
];

function bearingFromPoints(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
): number {
  const φ1 = (fromLat * Math.PI) / 180;
  const φ2 = (toLat * Math.PI) / 180;
  const Δλ = ((toLng - fromLng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

export default function SunWindWedgeTool({ map, projectId }: Props) {
  const addSector = useExternalForcesStore((s) => s.addSector);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const homestead = useHomesteadStore((s) => s.byProject[projectId]);

  const [type, setType] = useState<SectorType>('wind_prevailing');
  const [bearingDeg, setBearingDeg] = useState(270);
  const [arcDeg, setArcDeg] = useState(60);
  const [intensity, setIntensity] = useState<SectorIntensity>('med');
  const [seedingFromMap, setSeedingFromMap] = useState(false);

  // Click-to-seed bearing: when active, the next map click computes the
  // bearing from the homestead (or map center) to the click point.
  useEffect(() => {
    if (!seedingFromMap) return;
    const canvas = map.getCanvas();
    const prevCursor = canvas.style.cursor;
    canvas.style.cursor = 'crosshair';
    const onClick = (e: maplibregl.MapMouseEvent) => {
      const center = map.getCenter();
      const fromLng = homestead?.[0] ?? center.lng;
      const fromLat = homestead?.[1] ?? center.lat;
      const b = bearingFromPoints(fromLng, fromLat, e.lngLat.lng, e.lngLat.lat);
      setBearingDeg(Math.round(b));
      setSeedingFromMap(false);
    };
    map.once('click', onClick);
    return () => {
      canvas.style.cursor = prevCursor;
      map.off('click', onClick);
    };
  }, [seedingFromMap, map, homestead]);

  const onSave = () => {
    addSector({
      id: crypto.randomUUID(),
      projectId,
      type,
      bearingDeg,
      arcDeg,
      intensity,
    });
    setActiveTool(null);
  };

  return (
    <div className={css.popover} role="dialog" aria-label="Sun/wind wedge">
      <span className={css.title}>Sun / wind wedge</span>
      <div className={css.row}>
        <span className={css.fieldLabel}>Type</span>
        <select
          className={css.select}
          value={type}
          onChange={(e) => setType(e.target.value as SectorType)}
        >
          {SECTOR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className={css.row}>
        <span className={css.fieldLabel}>Bearing</span>
        <input
          className={css.input}
          type="number"
          min={0}
          max={359}
          value={bearingDeg}
          onChange={(e) => setBearingDeg(Number(e.target.value) || 0)}
        />
        <span style={{ fontSize: 11, opacity: 0.7 }}>°N</span>
      </div>
      <div className={css.row}>
        <span className={css.fieldLabel}>Arc</span>
        <input
          className={css.input}
          type="number"
          min={5}
          max={180}
          value={arcDeg}
          onChange={(e) => setArcDeg(Number(e.target.value) || 0)}
        />
        <span style={{ fontSize: 11, opacity: 0.7 }}>°</span>
      </div>
      <div className={css.row}>
        <span className={css.fieldLabel}>Intensity</span>
        <select
          className={css.select}
          value={intensity}
          onChange={(e) => setIntensity(e.target.value as SectorIntensity)}
        >
          <option value="low">Low</option>
          <option value="med">Medium</option>
          <option value="high">High</option>
        </select>
      </div>
      <div className={css.btnRow}>
        <button
          type="button"
          className={css.secondaryBtn}
          onClick={() => setSeedingFromMap((p) => !p)}
        >
          {seedingFromMap ? 'Click map…' : 'Seed bearing from map'}
        </button>
        <button type="button" className={css.primaryBtn} onClick={onSave}>
          Save sector
        </button>
      </div>
      {!homestead && (
        <span className={css.hint}>
          Tip: place a homestead first so the sector anchors at Zone 0.
        </span>
      )}
    </div>
  );
}
