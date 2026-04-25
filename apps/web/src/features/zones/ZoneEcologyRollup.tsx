/**
 * ZoneEcologyRollup — §7 dashboard card that summarizes invasive pressure
 * and succession stage across all zones in the active project.
 *
 * Renders two stacked horizontal bar rows (pressure and stage), each broken
 * down by acres-per-band with a legend and an "untagged" bucket for zones
 * the steward hasn't classified yet. Pure presentation — zone tags drive
 * the surface, no scoring engine involvement.
 *
 * Spec: §7 `invasive-succession-mapping` (featureManifest).
 */

import { useMemo } from 'react';
import {
  useZoneStore,
  INVASIVE_PRESSURE_LABELS,
  INVASIVE_PRESSURE_COLORS,
  SUCCESSION_STAGE_LABELS,
  SUCCESSION_STAGE_COLORS,
  type InvasivePressure,
  type SuccessionStage,
} from '../../store/zoneStore.js';
import css from './ZoneEcologyRollup.module.css';

interface Props {
  projectId: string;
}

const M2_PER_ACRE = 4046.8564224;

export default function ZoneEcologyRollup({ projectId }: Props) {
  const allZones = useZoneStore((s) => s.zones);

  const { totalAc, pressure, stage, zoneCount } = useMemo(() => {
    const zones = allZones.filter((z) => z.projectId === projectId);

    const total = zones.reduce((sum, z) => sum + (z.areaM2 ?? 0), 0) / M2_PER_ACRE;

    const pressureAc: Record<InvasivePressure | 'untagged', number> = {
      none: 0,
      low: 0,
      medium: 0,
      high: 0,
      untagged: 0,
    };
    const stageAc: Record<SuccessionStage | 'untagged', number> = {
      bare: 0,
      pioneer: 0,
      mid: 0,
      climax: 0,
      untagged: 0,
    };

    for (const z of zones) {
      const ac = (z.areaM2 ?? 0) / M2_PER_ACRE;
      if (z.invasivePressure) pressureAc[z.invasivePressure] += ac;
      else pressureAc.untagged += ac;
      if (z.successionStage) stageAc[z.successionStage] += ac;
      else stageAc.untagged += ac;
    }

    return { totalAc: total, pressure: pressureAc, stage: stageAc, zoneCount: zones.length };
  }, [allZones, projectId]);

  if (zoneCount === 0) {
    return (
      <div className={css.section}>
        <h3 className={css.sectionLabel}>ECOLOGICAL CONDITION TAGS</h3>
        <div className={css.empty}>
          No zones drawn yet. Once you have zones on the map, use the "Tag"
          button on each zone to mark invasive pressure and succession stage;
          this card will roll them up by acreage.
        </div>
      </div>
    );
  }

  return (
    <div className={css.section}>
      <h3 className={css.sectionLabel}>ECOLOGICAL CONDITION TAGS</h3>

      <div className={css.block}>
        <div className={css.blockHeader}>
          <span className={css.blockTitle}>Invasive pressure</span>
          <span className={css.blockMeta}>{zoneCount} zones \u00B7 {totalAc.toFixed(1)} ac total</span>
        </div>
        <StackedBar
          total={totalAc}
          segments={[
            { key: 'none', label: INVASIVE_PRESSURE_LABELS.none, acres: pressure.none, color: INVASIVE_PRESSURE_COLORS.none },
            { key: 'low', label: INVASIVE_PRESSURE_LABELS.low, acres: pressure.low, color: INVASIVE_PRESSURE_COLORS.low },
            { key: 'medium', label: INVASIVE_PRESSURE_LABELS.medium, acres: pressure.medium, color: INVASIVE_PRESSURE_COLORS.medium },
            { key: 'high', label: INVASIVE_PRESSURE_LABELS.high, acres: pressure.high, color: INVASIVE_PRESSURE_COLORS.high },
            { key: 'untagged', label: 'Untagged', acres: pressure.untagged, color: 'rgba(255,255,255,0.08)' },
          ]}
        />
      </div>

      <div className={css.block}>
        <div className={css.blockHeader}>
          <span className={css.blockTitle}>Succession stage</span>
          <span className={css.blockMeta}>Bare \u2192 Climax</span>
        </div>
        <StackedBar
          total={totalAc}
          segments={[
            { key: 'bare', label: SUCCESSION_STAGE_LABELS.bare, acres: stage.bare, color: SUCCESSION_STAGE_COLORS.bare },
            { key: 'pioneer', label: SUCCESSION_STAGE_LABELS.pioneer, acres: stage.pioneer, color: SUCCESSION_STAGE_COLORS.pioneer },
            { key: 'mid', label: SUCCESSION_STAGE_LABELS.mid, acres: stage.mid, color: SUCCESSION_STAGE_COLORS.mid },
            { key: 'climax', label: SUCCESSION_STAGE_LABELS.climax, acres: stage.climax, color: SUCCESSION_STAGE_COLORS.climax },
            { key: 'untagged', label: 'Untagged', acres: stage.untagged, color: 'rgba(255,255,255,0.08)' },
          ]}
        />
      </div>

      <div className={css.hint}>
        Tags are captured from the Zones panel on the map view — use the
        "Tag" button next to each zone. This rollup updates live.
      </div>
    </div>
  );
}

// ─── Stacked bar ──────────────────────────────────────────────────────

interface Segment {
  key: string;
  label: string;
  acres: number;
  color: string;
}

function StackedBar({ total, segments }: { total: number; segments: Segment[] }) {
  // Defensive: if total is 0 we still need to render a hairline placeholder
  // so the card doesn't collapse visually.
  const safeTotal = total > 0 ? total : 1;
  return (
    <div>
      <div className={css.barTrack}>
        {segments.map((seg) =>
          seg.acres > 0 ? (
            <div
              key={seg.key}
              className={css.barSeg}
              style={{
                width: `${(seg.acres / safeTotal) * 100}%`,
                background: seg.color,
              }}
              title={`${seg.label}: ${seg.acres.toFixed(1)} ac`}
            />
          ) : null,
        )}
      </div>
      <div className={css.legend}>
        {segments.map((seg) => (
          <div key={seg.key} className={css.legendRow}>
            <span className={css.legendSwatch} style={{ background: seg.color }} />
            <span className={css.legendLabel}>{seg.label}</span>
            <span className={css.legendValue}>
              {seg.acres.toFixed(1)} ac
              {total > 0 ? ` (${((seg.acres / total) * 100).toFixed(0)}%)` : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
