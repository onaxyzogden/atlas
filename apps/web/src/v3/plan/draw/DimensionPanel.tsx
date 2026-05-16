/**
 * DimensionPanel — mode + shape picker and parametric inputs rendered inside
 * each opting tool's popover. Reads/writes the singleton `dimensionDrawStore`.
 *
 * `allowedShapes` lets each tool restrict the shape set:
 *  - StructureTool          → ['rect']
 *  - Rect/circle polygons   → ['rect', 'circle']
 *  - BufferRingTool         → ['circle']
 *  - Line tools (incl swale)→ ['line']
 */

import { useEffect } from 'react';
import {
  useDimensionDrawStore,
  metersToFeet,
  feetToMeters,
  type DimensionShape,
  type DimensionUnit,
} from './dimensionDrawStore.js';
import css from '../../observe/components/draw/ObserveDrawHost.module.css';

interface Props {
  allowedShapes: ReadonlyArray<DimensionShape>;
}

const SHAPE_LABEL: Record<DimensionShape, string> = {
  rect: 'Rect',
  circle: 'Circle',
  line: 'Line',
};

function displayValue(meters: number, unit: DimensionUnit): string {
  if (!Number.isFinite(meters)) return '';
  const v = unit === 'ft' ? metersToFeet(meters) : meters;
  return v.toFixed(unit === 'ft' ? 1 : 2);
}

function parseInput(raw: string, unit: DimensionUnit): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return unit === 'ft' ? feetToMeters(n) : n;
}

export default function DimensionPanel({ allowedShapes }: Props) {
  const mode = useDimensionDrawStore((s) => s.mode);
  const shape = useDimensionDrawStore((s) => s.shape);
  const unit = useDimensionDrawStore((s) => s.unit);
  const widthM = useDimensionDrawStore((s) => s.widthM);
  const depthM = useDimensionDrawStore((s) => s.depthM);
  const radiusM = useDimensionDrawStore((s) => s.radiusM);
  const lengthM = useDimensionDrawStore((s) => s.lengthM);
  const bearingDeg = useDimensionDrawStore((s) => s.bearingDeg);
  const rotationDeg = useDimensionDrawStore((s) => s.rotationDeg);
  const setMode = useDimensionDrawStore((s) => s.setMode);
  const setShape = useDimensionDrawStore((s) => s.setShape);
  const setUnit = useDimensionDrawStore((s) => s.setUnit);
  const setValues = useDimensionDrawStore((s) => s.setValues);

  // Snap shape into the allowed set whenever the tool changes.
  useEffect(() => {
    if (!allowedShapes.includes(shape)) {
      setShape(allowedShapes[0]!);
    }
  }, [allowedShapes, shape, setShape]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className={css.row}>
        <button
          type="button"
          className={mode === 'freehand' ? css.primaryBtn : css.secondaryBtn}
          onClick={() => setMode('freehand')}
        >
          Freehand
        </button>
        <button
          type="button"
          className={mode === 'dimensions' ? css.primaryBtn : css.secondaryBtn}
          onClick={() => setMode('dimensions')}
        >
          Dimensions
        </button>
      </div>

      {mode === 'dimensions' && (
        <>
          {allowedShapes.length > 1 && (
            <div className={css.row}>
              {allowedShapes.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={shape === s ? css.primaryBtn : css.secondaryBtn}
                  onClick={() => setShape(s)}
                >
                  {SHAPE_LABEL[s]}
                </button>
              ))}
            </div>
          )}

          <div className={css.row}>
            <span className={css.fieldLabel}>Unit</span>
            <button
              type="button"
              className={unit === 'm' ? css.primaryBtn : css.secondaryBtn}
              onClick={() => setUnit('m')}
            >
              m
            </button>
            <button
              type="button"
              className={unit === 'ft' ? css.primaryBtn : css.secondaryBtn}
              onClick={() => setUnit('ft')}
            >
              ft
            </button>
          </div>

          {shape === 'rect' && (
            <>
              <NumberRow
                label="Width"
                meters={widthM}
                unit={unit}
                onChange={(m) => setValues({ widthM: m })}
              />
              <NumberRow
                label="Depth"
                meters={depthM}
                unit={unit}
                onChange={(m) => setValues({ depthM: m })}
              />
              <NumberRow
                label="Rotation"
                meters={rotationDeg}
                unit="deg"
                onChange={(deg) => setValues({ rotationDeg: deg })}
              />
            </>
          )}

          {shape === 'circle' && (
            <NumberRow
              label="Radius"
              meters={radiusM}
              unit={unit}
              onChange={(m) => setValues({ radiusM: m })}
            />
          )}

          {shape === 'line' && (
            <>
              <NumberRow
                label="Length"
                meters={lengthM}
                unit={unit}
                onChange={(m) => setValues({ lengthM: m })}
              />
              <NumberRow
                label="Bearing"
                meters={bearingDeg}
                unit="deg"
                onChange={(deg) => setValues({ bearingDeg: deg })}
              />
            </>
          )}

          <span className={css.hint}>
            Click on the map to drop the feature at the cursor.
          </span>
        </>
      )}
    </div>
  );
}

interface NumberRowProps {
  label: string;
  /**
   * Raw value in metres for `m`/`ft` rows, or degrees for the `'deg'` rows
   * (rotation, bearing). The label `unit` controls render+parse only.
   */
  meters: number;
  unit: DimensionUnit | 'deg';
  onChange: (meters: number) => void;
}

function NumberRow({ label, meters, unit, onChange }: NumberRowProps) {
  const isAngle = unit === 'deg';
  const display = isAngle
    ? Number.isFinite(meters) ? String(meters) : ''
    : displayValue(meters, unit);
  return (
    <div className={css.row}>
      <span className={css.fieldLabel} style={{ minWidth: 56 }}>{label}</span>
      <input
        className={css.input}
        type="number"
        step={isAngle ? 1 : 0.1}
        value={display}
        onChange={(e) => {
          if (isAngle) {
            const n = Number(e.target.value);
            onChange(Number.isFinite(n) ? n : 0);
          } else {
            onChange(parseInput(e.target.value, unit));
          }
        }}
      />
      <span className={css.fieldLabel}>{isAngle ? '°' : unit}</span>
    </div>
  );
}
