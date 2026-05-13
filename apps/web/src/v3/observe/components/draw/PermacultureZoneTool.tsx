/**
 * PermacultureZoneTool — six-ring concentric Mollison Zones 0–5 anchored at
 * the homestead.
 *
 * Behaviour:
 *   - If a zone already exists for the project, the form pre-fills with its
 *     radii and "Save" updates that record (no duplicate insert).
 *   - While the tool is active, the existing zone exposes draggable Maplibre
 *     markers on the map: the centre anchor relocates the whole stack; one
 *     handle per ring (placed due east of the anchor at the ring's outer
 *     radius) resizes that single ring on dragend.
 */

import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MaplibreMap } from 'maplibre-gl';
import * as turf from '@turf/turf';
import {
  useHumanContextStore,
  type PermacultureZone,
} from '../../../../store/humanContextStore.js';
import { useMapToolStore } from '../measure/useMapToolStore.js';
import { useEffectiveHomestead } from '../../hooks/useEffectiveHomestead.js';
import css from './ObserveDrawHost.module.css';

interface Props {
  map: MaplibreMap;
  projectId: string;
}

type RadiiTuple = [number, number, number, number, number, number];

const DEFAULT_RADII_M: RadiiTuple = [10, 30, 80, 200, 500, 1500];
const ZONE_LABELS = ['Zone 0', 'Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'];

const ANCHOR_COLOR = '#c4a265';
const RING_HANDLE_COLOR = '#5fc7d4';

export default function PermacultureZoneTool({ map, projectId }: Props) {
  const addPermacultureZone = useHumanContextStore(
    (s) => s.addPermacultureZone,
  );
  const updatePermacultureZone = useHumanContextStore(
    (s) => s.updatePermacultureZone,
  );
  const existingZone: PermacultureZone | undefined = useHumanContextStore((s) =>
    s.permacultureZones.find((z) => z.projectId === projectId),
  );
  const setActiveTool = useMapToolStore((s) => s.setActiveTool);
  // Reads through the effective hook so a single existing residence
  // can supply the anchor when no explicit homestead is placed (ADR
  // wiki/decisions/2026-05-13-atlas-residence-zone0-derivation.md).
  const { point: homestead, source: anchorSource } =
    useEffectiveHomestead(projectId);

  const [radii, setRadii] = useState<RadiiTuple>(
    existingZone?.ringRadiiM ?? DEFAULT_RADII_M,
  );

  // Keep the form in sync with store-level edits (e.g. drag updates the radii).
  useEffect(() => {
    if (existingZone) setRadii(existingZone.ringRadiiM);
  }, [existingZone?.id, existingZone?.ringRadiiM]);

  const updateRadius = (i: number, v: number) => {
    setRadii((prev) => {
      const next = [...prev] as RadiiTuple;
      next[i] = v;
      return next;
    });
  };

  const onSave = () => {
    if (existingZone) {
      updatePermacultureZone(existingZone.id, { ringRadiiM: radii });
    } else {
      if (!homestead) return;
      addPermacultureZone({
        id: crypto.randomUUID(),
        projectId,
        ringRadiiM: radii,
        anchorPoint: homestead,
        anchorSource: anchorSource === 'derived' ? 'derived' : 'explicit',
        createdAt: new Date().toISOString(),
      });
    }
    setActiveTool(null);
  };

  // ── Draggable map handles for an existing zone ──────────────────────────
  const updateRef = useRef(updatePermacultureZone);
  updateRef.current = updatePermacultureZone;

  useEffect(() => {
    if (!existingZone) return;
    const zoneId = existingZone.id;
    const anchor = existingZone.anchorPoint;
    const ringRadii = existingZone.ringRadiiM;

    const anchorMarker = new maplibregl.Marker({
      draggable: true,
      color: ANCHOR_COLOR,
    })
      .setLngLat(anchor)
      .addTo(map);
    anchorMarker.on('dragend', () => {
      const ll = anchorMarker.getLngLat();
      updateRef.current(zoneId, { anchorPoint: [ll.lng, ll.lat] });
    });

    const ringMarkers: maplibregl.Marker[] = [];
    ringRadii.forEach((r, i) => {
      if (!r || r <= 0) return;
      const dest = turf.destination(turf.point(anchor), r / 1000, 90, {
        units: 'kilometers',
      });
      const [lng, lat] = dest.geometry.coordinates as [number, number];

      const el = document.createElement('div');
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.background = RING_HANDLE_COLOR;
      el.style.border = '2px solid #1f1d1a';
      el.style.boxShadow = '0 0 0 1px rgba(255,255,255,0.6)';
      el.style.cursor = 'ew-resize';
      el.title = `${ZONE_LABELS[i]} — drag to resize`;

      const m = new maplibregl.Marker({ element: el, draggable: true })
        .setLngLat([lng, lat])
        .addTo(map);
      m.on('dragend', () => {
        const ll = m.getLngLat();
        const distM =
          turf.distance(
            turf.point(anchor),
            turf.point([ll.lng, ll.lat]),
            { units: 'kilometers' },
          ) * 1000;
        const next = [...ringRadii] as RadiiTuple;
        next[i] = Math.max(0, Math.round(distM));
        updateRef.current(zoneId, { ringRadiiM: next });
      });
      ringMarkers.push(m);
    });

    return () => {
      anchorMarker.remove();
      ringMarkers.forEach((m) => m.remove());
    };
  }, [
    map,
    existingZone?.id,
    existingZone?.anchorPoint?.[0],
    existingZone?.anchorPoint?.[1],
    existingZone?.ringRadiiM[0],
    existingZone?.ringRadiiM[1],
    existingZone?.ringRadiiM[2],
    existingZone?.ringRadiiM[3],
    existingZone?.ringRadiiM[4],
    existingZone?.ringRadiiM[5],
  ]);

  const canSave = !!existingZone || !!homestead;
  const helperText = !existingZone && !homestead
    ? 'Place a homestead anchor first via the map "Place homestead" control.'
    : null;

  return (
    <div className={css.popover} role="dialog" aria-label="Permaculture zone">
      <span className={css.title}>
        {existingZone ? 'Permaculture zones (edit)' : 'Permaculture zones (0–5)'}
      </span>
      {helperText ? (
        <span className={css.hint}>{helperText}</span>
      ) : (
        <>
          {existingZone ? (
            <span className={css.hint}>
              Drag the gold pin to relocate the centre, or the teal handles
              east of the anchor to resize each ring.
            </span>
          ) : null}
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
              disabled={!canSave}
            >
              {existingZone ? 'Save changes' : 'Save zones'}
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
