/**
 * §D.4 JCurveChart — cumulative net cashflow + natural-capital appreciation.
 *
 * Pure-SVG consumer that visualises the Apricot-Lane Phase 3 J-curve. The
 * primary y-axis is the D.1 `TransitionYear[]` cumulative net cashflow
 * (regeneration spend in early years, then ramp-up). The optional
 * secondary y-axis is the D.3-derived cumulative natural-capital
 * appreciation (SOM × $/tC, via `naturalCapitalAppreciationByYear`). The
 * trough year and breakeven crossing (from `jCurveTrough`) anchor the
 * narrative bridge from regeneration spend to natural-capital
 * appreciation.
 *
 * Covenant: appreciation of stewarded land value, not investor yield.
 * Labels stay neutral — no ROI / advance-purchase / yield framing.
 * See [[fiqh-csra-erased-2026-05-04]].
 *
 * House-style choice: pure SVG (no chart library), mirroring
 * `OperatingRunwayCard` — `role="img"` + `aria-label` + paired
 * CSS-module legend. Trivial to PNG-serialise for the D.7 PDF embed.
 */

import { useMemo } from 'react';
import {
  jCurveTrough,
  type TransitionYear,
  type TransitionPhase,
} from './engine/transitionBudget.js';
import css from './JCurveChart.module.css';

export interface JCurveChartProps {
  /** D.1 TransitionYear[] — drives the primary axis (cumulative net cashflow). */
  transitionYears: TransitionYear[];
  /**
   * Optional cumulative USD natural-capital appreciation by year. When
   * provided, renders the dashed secondary line + right-axis labels. When
   * absent (older scenarios captured pre-D.4, or projects with no SOM
   * trajectory recompute yet), the secondary axis is suppressed.
   */
  naturalCapitalAppreciationByYear?: Record<number, number>;
  /** Defaults match the OperatingRunwayCard scale. */
  width?: number;
  height?: number;
}

function fmtUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${n < 0 ? '−' : ''}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${n < 0 ? '−' : ''}$${(abs / 1_000).toFixed(0)}K`;
  return `${n < 0 ? '−' : ''}$${abs.toFixed(0)}`;
}

function phaseLabel(phase: TransitionPhase): string {
  if (phase === 'establishment') return 'Establishment';
  if (phase === 'build-up') return 'Build-up';
  return 'Maturation';
}

interface PhaseBand {
  phase: TransitionPhase;
  startIdx: number; // inclusive
  endIdx: number;   // inclusive
}

function bandsFor(rows: TransitionYear[]): PhaseBand[] {
  if (rows.length === 0) return [];
  const out: PhaseBand[] = [];
  let cur: PhaseBand = { phase: rows[0]!.phase, startIdx: 0, endIdx: 0 };
  for (let i = 1; i < rows.length; i++) {
    if (rows[i]!.phase === cur.phase) {
      cur.endIdx = i;
    } else {
      out.push(cur);
      cur = { phase: rows[i]!.phase, startIdx: i, endIdx: i };
    }
  }
  out.push(cur);
  return out;
}

export default function JCurveChart({
  transitionYears,
  naturalCapitalAppreciationByYear,
  width,
  height,
}: JCurveChartProps) {
  const trough = useMemo(() => jCurveTrough(transitionYears), [transitionYears]);

  if (transitionYears.length === 0) return null;

  // Chart geometry — mirrors OperatingRunwayCard scale.
  const W = width ?? 320;
  const H = height ?? 160;
  const padL = 24;
  const padR = 28;
  const padT = 20;
  const padB = 18;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  // Primary axis (cumulative net cashflow): symmetric around 0.
  const primaryValues = transitionYears.map((r) => r.cumulativeNetCashflow);
  const primaryMin = Math.min(0, ...primaryValues);
  const primaryMax = Math.max(0, ...primaryValues);
  const primaryRange = primaryMax - primaryMin || 1;

  // Secondary axis (cumulative natural-capital appreciation): starts at 0.
  const secondaryYears = naturalCapitalAppreciationByYear
    ? Object.keys(naturalCapitalAppreciationByYear).map(Number).sort((a, b) => a - b)
    : [];
  const hasSecondary = secondaryYears.length > 0;
  const secondaryValues = hasSecondary
    ? secondaryYears.map((y) => naturalCapitalAppreciationByYear![y] ?? 0)
    : [];
  const secondaryMax = hasSecondary ? Math.max(0, ...secondaryValues) || 1 : 1;

  // Horizontal layout — equally spaced years.
  const slotW = innerW / Math.max(1, transitionYears.length - 1);
  const xFor = (idx: number) => padL + slotW * idx;
  const yPrimary = (v: number) =>
    padT + innerH - ((v - primaryMin) / primaryRange) * innerH;
  const ySecondary = (v: number) =>
    padT + innerH - (v / secondaryMax) * innerH;

  const zeroY = yPrimary(0);

  const bands = bandsFor(transitionYears);

  const primaryPath = transitionYears
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yPrimary(r.cumulativeNetCashflow)}`)
    .join(' ');

  const secondaryPath = hasSecondary
    ? transitionYears
        .map((r, i) => {
          const v = naturalCapitalAppreciationByYear![r.year] ?? 0;
          return `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${ySecondary(v)}`;
        })
        .join(' ')
    : '';

  const troughIdx =
    trough.troughYear != null
      ? transitionYears.findIndex((r) => r.year === trough.troughYear)
      : -1;
  const beIdx =
    trough.breakevenYear != null
      ? transitionYears.findIndex((r) => r.year === trough.breakevenYear)
      : -1;

  const lastYear = transitionYears[transitionYears.length - 1]!.year;

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h4 className={css.title}>J-curve · Regeneration trajectory</h4>
          {hasSecondary ? (
            <p className={css.hint}>
              Early-year regeneration spend (establishment) trades against a
              long-arc bridge to maturation. The secondary line is cumulative
              appreciation of stewarded land value — carbon sequestered into
              the soil, not a revenue stream.
            </p>
          ) : (
            <p className={css.hint}>
              Early-year regeneration spend (establishment) trades against a
              long-arc bridge to maturation across the build-up and
              maturation stages.
            </p>
          )}
        </div>
      </div>

      <div className={css.annotations}>
        <span className={css.annotation}>
          <span className={css.annotationLabel}>Trough</span>
          <span className={css.annotationValue}>
            {trough.troughYear != null ? `Yr ${trough.troughYear}` : '—'}
            {trough.troughYear != null && ` · ${fmtUsd(trough.troughValue)}`}
          </span>
        </span>
        <span className={css.annotation}>
          <span className={css.annotationLabel}>Breakeven</span>
          <span className={css.annotationValue}>
            {trough.breakevenYear != null ? `Yr ${trough.breakevenYear}` : `> Yr ${lastYear}`}
          </span>
        </span>
        {hasSecondary && (
          <span className={css.annotation}>
            <span className={css.annotationLabel}>Nat-cap @ Yr {lastYear}</span>
            <span className={css.annotationValue}>
              {fmtUsd(naturalCapitalAppreciationByYear![lastYear] ?? 0)}
            </span>
          </span>
        )}
      </div>

      <div className={css.legend}>
        <span><span className={`${css.legDot} ${css.legDot_primary}`} />Cumulative net cashflow</span>
        {hasSecondary && (
          <span><span className={`${css.legDot} ${css.legDot_secondary}`} />Natural-capital appreciation</span>
        )}
        <span><span className={`${css.legDot} ${css.legDot_est}`} />Establishment</span>
        <span><span className={`${css.legDot} ${css.legDot_build}`} />Build-up</span>
        <span><span className={`${css.legDot} ${css.legDot_mat}`} />Maturation</span>
      </div>

      <div className={css.chartWrap}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className={css.svg}
          role="img"
          aria-label="J-curve: cumulative net cashflow with natural-capital appreciation across the regeneration horizon"
        >
          {/* Phase bands */}
          {bands.map((b, i) => {
            const bandX = xFor(b.startIdx) - slotW / 2;
            const nextX = xFor(b.endIdx) + slotW / 2;
            const bandW = Math.min(W - padR, Math.max(padL, nextX)) - Math.max(padL, bandX);
            const cls =
              b.phase === 'establishment'
                ? css.bandEst
                : b.phase === 'build-up'
                  ? css.bandBuildUp
                  : css.bandMaturation;
            return (
              <g key={`band-${i}`}>
                <rect
                  x={Math.max(padL, bandX)}
                  y={padT}
                  width={Math.max(0, bandW)}
                  height={innerH}
                  className={cls}
                />
                {i > 0 && (
                  <line
                    x1={Math.max(padL, bandX)}
                    x2={Math.max(padL, bandX)}
                    y1={padT}
                    y2={padT + innerH}
                    className={css.bandSeparator}
                  />
                )}
                <text
                  x={Math.max(padL, bandX) + Math.max(0, bandW) / 2}
                  y={padT - 6}
                  className={css.bandLabel}
                >
                  {phaseLabel(b.phase)}
                </text>
              </g>
            );
          })}

          {/* Grid lines */}
          <line x1={padL} x2={W - padR} y1={padT} y2={padT} className={css.gridLine} />
          <line x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} className={css.gridLine} />

          {/* Zero line (primary axis) */}
          <line x1={padL} x2={W - padR} y1={zeroY} y2={zeroY} className={css.zeroLine} />

          {/* Primary axis labels (left) */}
          <text x={4} y={padT + 4} className={css.axisLabel}>{fmtUsd(primaryMax)}</text>
          <text x={4} y={zeroY + 3} className={css.axisLabel}>0</text>
          <text x={4} y={padT + innerH} className={css.axisLabel}>{fmtUsd(primaryMin)}</text>

          {/* Secondary axis labels (right) — only when present */}
          {hasSecondary && (
            <>
              <text x={W - 4} y={padT + 4} className={css.axisLabelRight}>{fmtUsd(secondaryMax)}</text>
              <text x={W - 4} y={padT + innerH} className={css.axisLabelRight}>$0</text>
            </>
          )}

          {/* Trough marker */}
          {troughIdx >= 0 && (
            <g>
              <line
                x1={xFor(troughIdx)}
                x2={xFor(troughIdx)}
                y1={padT}
                y2={padT + innerH}
                className={css.troughMarker}
              />
              <text x={xFor(troughIdx) + 3} y={padT + innerH - 4} className={css.troughLabel}>
                Trough Yr {trough.troughYear} · {fmtUsd(trough.troughValue)}
              </text>
            </g>
          )}

          {/* Breakeven marker */}
          {beIdx >= 0 && (
            <g>
              <line
                x1={xFor(beIdx)}
                x2={xFor(beIdx)}
                y1={padT}
                y2={padT + innerH}
                className={css.beMarker}
              />
              <text x={xFor(beIdx) + 3} y={padT + 10} className={css.beLabel}>
                BE Yr {trough.breakevenYear}
              </text>
            </g>
          )}

          {/* Secondary line (cumulative natural-capital appreciation) */}
          {hasSecondary && secondaryPath && (
            <path d={secondaryPath} className={css.secondaryLine} />
          )}

          {/* Primary line (cumulative net cashflow) */}
          <path d={primaryPath} className={css.primaryLine} />

          {/* Primary data points */}
          {transitionYears.map((r, i) => (
            <circle
              key={`dot-${i}`}
              cx={xFor(i)}
              cy={yPrimary(r.cumulativeNetCashflow)}
              r={2}
              className={css.primaryDot}
            />
          ))}

          {/* X-axis year labels */}
          {transitionYears.map((r, i) => (
            <text
              key={`yl-${i}`}
              x={xFor(i)}
              y={H - 4}
              className={css.yearLabel}
            >
              {r.year}
            </text>
          ))}
        </svg>
      </div>

      <p className={css.footnote}>
        Primary axis: cumulative net cashflow from the same engine that
        drives the operating runway above. Secondary axis: cumulative
        appreciation of stewarded land value derived from the SOM
        trajectory — a balance-sheet reading, not a revenue forecast.
      </p>
    </div>
  );
}
