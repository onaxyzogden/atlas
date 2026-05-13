/**
 * TemporalScrubSlider — bottom-centre canvas chrome that lets the
 * steward scrub Year 1..50 to preview canopy maturity. Renders always
 * (no tool gating) so a steward can scrub at any point. Reads/writes
 * `useTemporalScrubStore`. The "design horizon" chip snaps the cursor
 * to the project's `designHorizonYears` (default 20).
 *
 * Mounted in `PlanLayout` between `PlanStampToast` (bottom: 88) and
 * `StampModePicker` (bottom: 132).
 */

import { useCallback } from 'react';
import { useTemporalScrubStore } from './temporalScrubStore.js';
import { useProjectStore, getDesignHorizon } from '../../../store/projectStore.js';

const TICKS = [1, 5, 15, 30, 50];

export default function TemporalScrubSlider() {
  const currentYear = useTemporalScrubStore((s) => s.currentYear);
  const setYear = useTemporalScrubStore((s) => s.setYear);
  const project = useProjectStore((s) => s.activeProject);
  const horizon = project ? getDesignHorizon(project) : 20;

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setYear(Number(e.target.value));
    },
    [setYear],
  );

  const snapToHorizon = useCallback(() => {
    setYear(horizon);
  }, [setYear, horizon]);

  return (
    <div
      role="group"
      aria-label="Design year scrubber"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 92,
        transform: 'translateX(-50%)',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        padding: '6px 10px',
        borderRadius: 12,
        background: 'rgba(12, 14, 10, 0.78)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.22)',
        zIndex: 50,
        minWidth: 280,
      }}
    >
      <div
        style={{
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 11,
          color: '#ddd1b4',
        }}
      >
        <span style={{ color: '#c4a265', fontWeight: 600 }}>
          Year {currentYear}
        </span>
        <button
          type="button"
          onClick={snapToHorizon}
          aria-label={`Snap to design horizon (Year ${horizon})`}
          title={`Design horizon: Year ${horizon}`}
          style={{
            background: 'transparent',
            border: '1px solid rgba(196, 162, 101, 0.28)',
            color: '#ddd1b4',
            borderRadius: 6,
            padding: '2px 6px',
            fontSize: 10,
            cursor: 'pointer',
          }}
        >
          ↺ Year {horizon}
        </button>
      </div>
      <input
        type="range"
        min={1}
        max={50}
        step={1}
        value={currentYear}
        onChange={onChange}
        aria-label="Design year"
        aria-valuetext={`Year ${currentYear}`}
        style={{
          width: '100%',
          accentColor: '#c4a265',
          margin: 0,
        }}
      />
      <div
        style={{
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between',
          fontSize: 9,
          color: 'rgba(221, 209, 180, 0.55)',
        }}
        aria-hidden
      >
        {TICKS.map((y) => (
          <span key={y}>{y}</span>
        ))}
      </div>
    </div>
  );
}
