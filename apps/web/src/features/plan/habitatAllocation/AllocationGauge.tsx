/**
 * Allocation gauge — a horizontal bar of allocated habitat share with
 * the goal-tree target marked, a per-category stacked breakdown, and an
 * on-track / under verdict chip. Pure presentational.
 */

import { ZONE_CATEGORY_CONFIG } from '../../../store/zoneStore.js';
import type { ZoneCategory } from '../../../store/zoneStore.js';
import { m2ToHa, type HabitatAllocation } from './allocate.js';

const VERDICT_META: Record<
  HabitatAllocation['verdict'],
  { label: string; color: string; bg: string }
> = {
  'on-track': { label: 'On track', color: '#bdf0d4', bg: 'rgba(127,209,174,0.16)' },
  under: { label: 'Under target', color: '#f0c0b0', bg: 'rgba(217,139,111,0.16)' },
  'no-parcel': {
    label: 'Set parcel size',
    color: 'rgba(232,220,200,0.6)',
    bg: 'rgba(255,255,255,0.04)',
  },
};

export default function AllocationGauge({ a }: { a: HabitatAllocation }) {
  const m = VERDICT_META[a.verdict];
  const cats = Object.entries(a.perCategory) as [ZoneCategory, number][];
  // Bar spans 0 → max(target, allocated) so an over-allocated parcel
  // still shows the target marker inside the track.
  const scaleMax = Math.max(a.targetPct, a.allocatedPct, 1) * 1.1;
  const allocW = Math.min(100, (a.allocatedPct / scaleMax) * 100);
  const targetX = Math.min(100, (a.targetPct / scaleMax) * 100);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 28, fontWeight: 700, color: '#e8dcc8' }}>
          {a.allocatedPct.toFixed(1)}
          <span style={{ fontSize: 14, opacity: 0.6 }}>% of parcel</span>
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 9px',
            borderRadius: 999,
            color: m.color,
            background: m.bg,
            whiteSpace: 'nowrap',
          }}
        >
          {m.label}
        </span>
      </div>

      <div
        style={{
          position: 'relative',
          height: 22,
          borderRadius: 6,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${allocW}%`,
            height: '100%',
            background:
              a.verdict === 'under'
                ? 'rgba(217,139,111,0.55)'
                : 'rgba(79,176,165,0.6)',
            transition: 'width 200ms',
          }}
        />
        {a.verdict !== 'no-parcel' && (
          <div
            title={`Target ${a.targetPct}%`}
            style={{
              position: 'absolute',
              top: -2,
              bottom: -2,
              left: `${targetX}%`,
              width: 2,
              background: '#e6c34a',
            }}
          />
        )}
      </div>

      <p
        style={{
          fontSize: 12,
          color: 'rgba(232,220,200,0.6)',
          margin: '8px 0 0',
          lineHeight: 1.5,
        }}
      >
        Target {a.targetPct}% ·{' '}
        {a.parcelM2 != null
          ? `parcel ${m2ToHa(a.parcelM2)} ha · habitat ${m2ToHa(a.allocatedM2)} ha`
          : 'parcel size unknown — set acreage on the project'}
        {a.gapM2 != null && a.gapM2 > 0 && (
          <> · short by {m2ToHa(a.gapM2)} ha to hit target</>
        )}
      </p>

      {cats.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: 'rgba(232,220,200,0.45)',
              marginBottom: 6,
            }}
          >
            By category
          </div>
          {cats
            .sort((x, y) => y[1] - x[1])
            .map(([cat, area]) => (
              <div
                key={cat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 12,
                  color: 'rgba(232,220,200,0.75)',
                  padding: '3px 0',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span
                    style={{
                      width: 9,
                      height: 9,
                      borderRadius: 2,
                      background: ZONE_CATEGORY_CONFIG[cat].color,
                    }}
                  />
                  {ZONE_CATEGORY_CONFIG[cat].label}
                </span>
                <span>{m2ToHa(area)} ha</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
