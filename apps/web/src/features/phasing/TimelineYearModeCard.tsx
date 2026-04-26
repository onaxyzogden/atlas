/**
 * §19 TimelineYearModeCard — Year 0 / Year 1 / Year 3 / Year 5 / Full Vision
 * scrubber for the phasing dashboard.
 *
 * The phasing surface already lets the steward toggle phase visibility on the
 * map and inspect per-phase rollups. What it doesn\u2019t yet do is answer a
 * different question: "If I freeze the calendar at Year 1, what does this
 * property actually look like?" That\u2019s the year-mode scrubber.
 *
 * The scrubber picks a cutoff year. Phases whose timeframe upper-bound is at
 * or below the cutoff are *live* (built / under build); later phases are
 * *queued*. The card then shows entity counts under both buckets so the
 * steward sees how much of the vision is in motion at the chosen horizon.
 *
 * No map mutation, no shared math \u2014 the cutoff lives entirely in this
 * card\u2019s local state. This is a planning/communication aid, not a
 * filter that hides anything elsewhere.
 *
 * Closes manifest §19 `timeline-slider-year-modes` (P2) partial -> done.
 */

import { useMemo, useState } from 'react';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import css from './TimelineYearModeCard.module.css';

interface Props {
  projectId: string;
}

type YearMode = 0 | 1 | 3 | 5 | 'vision';

interface ModeOption {
  key: YearMode;
  label: string;
  short: string;
  hint: string;
}

const MODE_OPTIONS: ModeOption[] = [
  { key: 0, label: 'Year 0', short: 'Y0', hint: 'Pre-build. Nothing placed yet.' },
  { key: 1, label: 'Year 1', short: 'Y1', hint: 'After the first growing season.' },
  { key: 3, label: 'Year 3', short: 'Y3', hint: 'Mid-build, perennial systems established.' },
  { key: 5, label: 'Year 5', short: 'Y5', hint: 'Most program elements live.' },
  { key: 'vision', label: 'Full Vision', short: '\u221E', hint: 'Every queued phase shipped.' },
];

/**
 * Parse a phase timeframe string like "Year 0-1", "Year 1-3", "Year 5+" into
 * its upper-year bound (Infinity for "+"). Defaults to Infinity on parse fail
 * so an unparseable phase stays in the vision bucket rather than vanishing.
 */
function parseUpperYear(timeframe: string): number {
  const trimmed = timeframe.trim();
  if (/\+\s*$/.test(trimmed)) return Number.POSITIVE_INFINITY;
  const m = trimmed.match(/(\d+)\s*-\s*(\d+)/);
  if (m && m[2]) {
    const n = Number(m[2]);
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
  }
  const single = trimmed.match(/(\d+)/);
  if (single && single[1]) {
    const n = Number(single[1]);
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
  }
  return Number.POSITIVE_INFINITY;
}

export default function TimelineYearModeCard({ projectId }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);
  const allCrops = useCropStore((s) => s.cropAreas);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allStructures = useStructureStore((s) => s.structures);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allZones = useZoneStore((s) => s.zones);

  const [mode, setMode] = useState<YearMode>('vision');

  const phases = useMemo(
    () =>
      allPhases
        .filter((p) => p.projectId === projectId)
        .slice()
        .sort((a, b) => a.order - b.order),
    [allPhases, projectId],
  );

  const crops = useMemo(
    () => allCrops.filter((c) => c.projectId === projectId),
    [allCrops, projectId],
  );
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );
  const structures = useMemo(
    () => allStructures.filter((s) => s.projectId === projectId),
    [allStructures, projectId],
  );
  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === projectId),
    [allUtilities, projectId],
  );
  const zones = useMemo(
    () => allZones.filter((z) => z.projectId === projectId),
    [allZones, projectId],
  );

  const cutoffYear = mode === 'vision' ? Number.POSITIVE_INFINITY : Number(mode);

  const phaseRows = useMemo(() => {
    return phases.map((p) => {
      const upper = parseUpperYear(p.timeframe);
      const live = mode === 0 ? false : upper <= cutoffYear;
      const cropCount = crops.filter((c) => c.phase === p.name).length;
      const paddockCount = paddocks.filter((pd) => pd.phase === p.name).length;
      const structureCount = structures.filter((st) => st.phase === p.name).length;
      const utilityCount = utilities.filter((u) => u.phase === p.name).length;
      const total = cropCount + paddockCount + structureCount + utilityCount;
      return {
        id: p.id,
        name: p.name,
        timeframe: p.timeframe,
        color: p.color,
        completed: p.completed,
        live,
        upper,
        total,
        cropCount,
        paddockCount,
        structureCount,
        utilityCount,
      };
    });
  }, [phases, crops, paddocks, structures, utilities, mode, cutoffYear]);

  const livePhaseNames = useMemo(
    () => new Set(phaseRows.filter((r) => r.live).map((r) => r.name)),
    [phaseRows],
  );

  const liveCounts = useMemo(() => {
    const cropCount = crops.filter((c) => livePhaseNames.has(c.phase)).length;
    const paddockCount = paddocks.filter((pd) => livePhaseNames.has(pd.phase)).length;
    const structureCount = structures.filter((st) => livePhaseNames.has(st.phase)).length;
    const utilityCount = utilities.filter((u) => livePhaseNames.has(u.phase)).length;
    // Zones do not carry a phase field on every project — count all zones
    // toward "vision" only, leaving them out of intermediate cutoffs.
    const zoneCount = mode === 'vision' ? zones.length : 0;
    return {
      crops: cropCount,
      paddocks: paddockCount,
      structures: structureCount,
      utilities: utilityCount,
      zones: zoneCount,
    };
  }, [crops, paddocks, structures, utilities, zones, livePhaseNames, mode]);

  const visionCounts = {
    crops: crops.length,
    paddocks: paddocks.length,
    structures: structures.length,
    utilities: utilities.length,
    zones: zones.length,
  };

  const activeMode = MODE_OPTIONS.find((m) => m.key === mode) ?? MODE_OPTIONS[4]!;
  const livePhaseCount = phaseRows.filter((r) => r.live).length;
  const queuedPhaseCount = phaseRows.length - livePhaseCount;

  return (
    <section className={css.card} aria-label="Timeline year-mode scrubber">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Timeline {'\u2014'} Year Modes</h3>
          <p className={css.cardHint}>
            Freeze the calendar at a chosen horizon and see what {'\u2018'}live{'\u2019'} means
            then. Phases whose timeframe ends at or before the cutoff are built; later phases
            stay queued.
          </p>
        </div>
        <span className={css.modeBadge}>SCRUBBER</span>
      </header>

      <div className={css.scrubber} role="tablist" aria-label="Year mode">
        {MODE_OPTIONS.map((opt) => {
          const isActive = opt.key === mode;
          return (
            <button
              key={String(opt.key)}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`${css.scrubberBtn} ${isActive ? css.scrubberBtnActive : ''}`}
              onClick={() => setMode(opt.key)}
              title={opt.hint}
            >
              <span className={css.scrubberShort}>{opt.short}</span>
              <span className={css.scrubberLabel}>{opt.label}</span>
            </button>
          );
        })}
      </div>

      <p className={css.modeHint}>{activeMode.hint}</p>

      <div className={css.statRow}>
        <Stat label="Crops" live={liveCounts.crops} vision={visionCounts.crops} mode={mode} />
        <Stat label="Paddocks" live={liveCounts.paddocks} vision={visionCounts.paddocks} mode={mode} />
        <Stat label="Structures" live={liveCounts.structures} vision={visionCounts.structures} mode={mode} />
        <Stat label="Utilities" live={liveCounts.utilities} vision={visionCounts.utilities} mode={mode} />
        <Stat label="Zones" live={liveCounts.zones} vision={visionCounts.zones} mode={mode} />
      </div>

      {phaseRows.length === 0 ? (
        <div className={css.empty}>No phases defined for this project yet.</div>
      ) : (
        <ul className={css.phaseList}>
          {phaseRows.map((row) => (
            <li
              key={row.id}
              className={`${css.phaseRow} ${row.live ? css.phaseLive : css.phaseQueued}`}
            >
              <span className={css.phaseDot} style={{ background: row.color }} aria-hidden="true" />
              <div className={css.phaseBody}>
                <div className={css.phaseHeader}>
                  <span className={css.phaseName}>{row.name}</span>
                  <span className={css.phaseTimeframe}>{row.timeframe}</span>
                  <span className={css.phaseStatus}>
                    {row.live ? (row.completed ? 'BUILT' : 'LIVE') : 'QUEUED'}
                  </span>
                </div>
                <div className={css.phaseCounts}>
                  {row.total === 0
                    ? <span className={css.phaseEmpty}>nothing placed</span>
                    : (
                      <>
                        {row.cropCount > 0 && <span>{row.cropCount} crops</span>}
                        {row.paddockCount > 0 && <span>{row.paddockCount} paddocks</span>}
                        {row.structureCount > 0 && <span>{row.structureCount} structures</span>}
                        {row.utilityCount > 0 && <span>{row.utilityCount} utilities</span>}
                      </>
                    )
                  }
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className={css.footnote}>
        {livePhaseCount} phase{livePhaseCount === 1 ? '' : 's'} live, {queuedPhaseCount}{' '}
        queued at this horizon. Zones are counted only at Full Vision; intermediate cutoffs
        treat the zoning baseline as already in place.
      </p>
    </section>
  );
}

interface StatProps {
  label: string;
  live: number;
  vision: number;
  mode: YearMode;
}

function Stat({ label, live, vision, mode }: StatProps) {
  const showVision = mode !== 'vision' && vision > 0;
  return (
    <div className={css.stat}>
      <div className={css.statValue}>
        {live}
        {showVision && (
          <span className={css.statVision}>
            {' / '}
            {vision}
          </span>
        )}
      </div>
      <div className={css.statLabel}>{label}</div>
    </div>
  );
}
