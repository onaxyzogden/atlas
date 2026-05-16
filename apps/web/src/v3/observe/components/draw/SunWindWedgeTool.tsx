/**
 * SunWindWedgeTool — adds a SectorArrow (bearing + arc) to externalForcesStore.
 *
 * Not a MapboxDraw tool: sectors are angular wedges anchored at the homestead
 * (or parcel centroid as fallback). The wedge **type** is fixed by which
 * toolbar button the steward clicked (one button per `SectorType`); this
 * popover only collects bearing, arc width, intensity, and optional
 * click-to-seed bearing from the map.
 */

import { useEffect, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  useExternalForcesStore,
  type SectorType,
  type SectorIntensity,
} from '../../../../store/externalForcesStore.js';
import { useMapToolStore } from '../measure/useMapToolStore.js';
import { useEffectiveHomestead } from '../../hooks/useEffectiveHomestead.js';
import { bearingFromPoints } from '../../utils/sectorMath.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
  sectorType: SectorType;
}

const TYPE_LABEL: Record<SectorType, string> = {
  sun_summer: 'Sun (summer)',
  sun_winter: 'Sun (winter)',
  wind_prevailing: 'Wind (prevailing)',
  wind_storm: 'Wind (storm)',
  fire: 'Fire approach',
  noise: 'Noise',
  wildlife: 'Wildlife corridor',
  view: 'View',
};

/**
 * Per-type sensible starting bearing/arc so the popover feels pre-tuned for
 * the chosen sector. Bearings assume Northern-hemisphere conventions; the
 * steward can always adjust before saving.
 */
const TYPE_DEFAULTS: Record<
  SectorType,
  { bearingDeg: number; arcDeg: number }
> = {
  sun_summer: { bearingDeg: 180, arcDeg: 120 },
  sun_winter: { bearingDeg: 180, arcDeg: 60 },
  wind_prevailing: { bearingDeg: 270, arcDeg: 60 },
  wind_storm: { bearingDeg: 315, arcDeg: 90 },
  fire: { bearingDeg: 270, arcDeg: 90 },
  noise: { bearingDeg: 0, arcDeg: 45 },
  wildlife: { bearingDeg: 0, arcDeg: 30 },
  view: { bearingDeg: 0, arcDeg: 60 },
};

export default function SunWindWedgeTool({
  map,
  projectId,
  sectorType,
}: Props) {
  const addSector = useExternalForcesStore((s) => s.addSector);
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  // Reads through the effective hook so the wedge anchors at a single
  // existing residence when no explicit homestead is placed (ADR
  // wiki/decisions/2026-05-13-atlas-residence-zone0-derivation.md).
  const { point: homestead } = useEffectiveHomestead(projectId);

  const defaults = TYPE_DEFAULTS[sectorType];
  const [bearingDeg, setBearingDeg] = useState(defaults.bearingDeg);
  const [arcDeg, setArcDeg] = useState(defaults.arcDeg);
  const [intensity, setIntensity] = useState<SectorIntensity>('med');
  const [seedingFromMap, setSeedingFromMap] = useState(false);

  // Re-seed bearing/arc when the steward switches sector buttons without
  // closing the popover (parent remounts via a different `sectorType` prop,
  // but in case React re-uses the instance, this keeps the form aligned).
  useEffect(() => {
    setBearingDeg(defaults.bearingDeg);
    setArcDeg(defaults.arcDeg);
  }, [sectorType, defaults.bearingDeg, defaults.arcDeg]);

  // Click-to-seed bearing: when active, the next map click computes the
  // bearing from the homestead (or map center) to the click point.
  useEffect(() => {
    if (!seedingFromMap) return;
    // Cursor is owned by useMapCursor — this popover's activeTool starts
    // with 'observe.' so drawArmed → 'crosshair' is computed there.
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
      map.off('click', onClick);
    };
  }, [seedingFromMap, map, homestead]);

  const onSave = () => {
    addSector({
      id: crypto.randomUUID(),
      projectId,
      type: sectorType,
      bearingDeg,
      arcDeg,
      intensity,
    });
    setActiveTool(null);
  };

  const label = TYPE_LABEL[sectorType];

  return (
    <div className={css.popover} role="dialog" aria-label={`${label} sector`}>
      <span className={css.title}>{label} sector</span>
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
