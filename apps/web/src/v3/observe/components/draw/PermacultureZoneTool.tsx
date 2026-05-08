/**
 * PermacultureZoneTool — adds a six-ring concentric annotation anchored at
 * the homestead point. Mollison Zone 0–5 outer radii (default values reflect
 * common smallholding ranges; the steward can tune them).
 *
 * No MapboxDraw — this is a popover-form-only tool.
 */

import { useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useHomesteadStore } from '../../../../store/homesteadStore.js';
import { useHumanContextStore } from '../../../../store/humanContextStore.js';
import { useMapToolStore } from '../measure/useMapToolStore.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

const DEFAULT_RADII_M: [number, number, number, number, number, number] = [
  10, 30, 80, 200, 500, 1500,
];
const ZONE_LABELS = ['Zone 0', 'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'];

export default function PermacultureZoneTool({ projectId }: Props) {
  const addPermacultureZone = useHumanContextStore(
    (s) => s.addPermacultureZone,
  );
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  const homestead = useHomesteadStore((s) => s.byProject[projectId]);
  const [radii, setRadii] =
    useState<[number, number, number, number, number, number]>(
      DEFAULT_RADII_M,
    );

  const updateRadius = (i: number, v: number) => {
    setRadii((prev) => {
      const next = [...prev] as typeof prev;
      next[i] = v;
      return next;
    });
  };

  const onSave = () => {
    if (!homestead) return;
    addPermacultureZone({
      id: crypto.randomUUID(),
      projectId,
      ringRadiiM: radii,
      anchorPoint: homestead,
      createdAt: new Date().toISOString(),
    });
    setActiveTool(null);
  };

  return (
    <div className={css.popover} role="dialog" aria-label="Permaculture zone">
      <span className={css.title}>Permaculture zones (0–5)</span>
      {!homestead ? (
        <span className={css.hint}>
          Place a homestead anchor first via the map “Place homestead” control.
        </span>
      ) : (
        <>
          <div className={css.radiiGrid}>
            {ZONE_LABELS.map((label, i) => (
              <RadiusRow
                key={label}
                label={label}
                value={radii[i] ?? 0}
                onChange={(v) => updateRadius(i, v)}
              />
            ))}
          </div>
          <div className={css.btnRow}>
            <button
              type="button"
              className={css.secondaryBtn}
              onClick={() => setRadii(DEFAULT_RADII_M)}
            >
              Reset
            </button>
            <button
              type="button"
              className={css.primaryBtn}
              onClick={onSave}
            >
              Save zones
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function RadiusRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <>
      <span className={css.radiiLabel}>{label}</span>
      <input
        className={css.input}
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </>
  );
}
