/**
 * §22 OperatingRunwayCard — annual cost burn-down vs. revenue ramp.
 *
 * Complements the cumulative cashflow chart already on the Overview tab.
 * Where the cumulative view shows the trajectory, this card surfaces the
 * year-by-year deficit/surplus picture that operators actually plan against:
 *
 *   • Bridge years — years where revenue < (capital + operating cost). The
 *     sum of those deficits is the bridge capital the project needs to raise
 *     before going self-sustaining.
 *   • Operating coverage — first year ongoing revenue covers operating cost
 *     (independent of capital amortization).
 *   • Mature surplus — net cashflow at year 10, the steady-state lens.
 *
 * Pure presentation — reads `cashflow: YearlyCashflow[]` and `breakEven`
 * already returned by `useFinancialModel`. No new shared math.
 */
import { useMemo } from 'react';
import type { YearlyCashflow, BreakEvenResult } from '../financial/engine/types.js';
import css from './OperatingRunwayCard.module.css';

interface Props {
  cashflow: YearlyCashflow[];
  breakEven: BreakEvenResult;
}

interface YearRow {
  year: number;
  cap: number;
  ops: number;
  rev: number;
  net: number; // rev - cap - ops
  isBridge: boolean;
}

interface Summary {
  rows: YearRow[];
  bridgeYears: number;
  bridgeCapital: number; // sum |net| across bridge years × 1.10 buffer
  opsCoverageYear: number | null; // first year rev >= ops
  matureNet: number; // year-10 net (or last year if shorter)
  peakDeficit: number; // worst single-year net (negative)
  maxAbs: number; // for chart scaling
}

function summarize(cashflow: YearlyCashflow[]): Summary {
  const rows: YearRow[] = cashflow.map((c) => {
    const cap = c.capitalCosts.mid;
    const ops = c.operatingCosts.mid;
    const rev = c.revenue.mid;
    const net = rev - cap - ops;
    return { year: c.year, cap, ops, rev, net, isBridge: net < 0 };
  });
  const bridgeYears = rows.filter((r) => r.isBridge).length;
  const bridgeCapital = rows.filter((r) => r.isBridge).reduce((s, r) => s + Math.abs(r.net), 0) * 1.1;
  const opsCoverage = rows.find((r) => r.rev > 0 && r.rev >= r.ops);
  const opsCoverageYear = opsCoverage ? opsCoverage.year : null;
  const matureNet = rows.length > 0 ? rows[rows.length - 1]!.net : 0;
  const peakDeficit = rows.reduce((min, r) => (r.net < min ? r.net : min), 0);
  const maxAbs = rows.reduce((m, r) => Math.max(m, r.cap + r.ops, r.rev), 1);
  return { rows, bridgeYears, bridgeCapital, opsCoverageYear, matureNet, peakDeficit, maxAbs };
}

function fmtUsd(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${n < 0 ? '−' : ''}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${n < 0 ? '−' : ''}$${(abs / 1_000).toFixed(0)}K`;
  return `${n < 0 ? '−' : ''}$${abs.toFixed(0)}`;
}

export default function OperatingRunwayCard({ cashflow, breakEven }: Props) {
  const sum = useMemo(() => summarize(cashflow), [cashflow]);
  const { rows, bridgeYears, bridgeCapital, opsCoverageYear, matureNet, peakDeficit, maxAbs } = sum;
  const beYear = breakEven.breakEvenYear.mid;

  if (rows.length === 0) return null;

  // Chart geometry
  const W = 320;
  const H = 110;
  const padL = 18;
  const padR = 6;
  const padT = 6;
  const padB = 14;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const yMid = padT + innerH / 2;
  const halfH = innerH / 2;
  const barSlot = innerW / rows.length;
  const barW = Math.max(2, barSlot * 0.42);
  const yScale = (v: number) => (v / maxAbs) * halfH;

  const totalBadge =
    bridgeYears === 0
      ? { tone: 'good', label: 'SELF-FUNDING' }
      : bridgeYears <= 3
      ? { tone: 'fair', label: `${bridgeYears} BRIDGE YR${bridgeYears > 1 ? 'S' : ''}` }
      : { tone: 'poor', label: `${bridgeYears} BRIDGE YRS` };

  const opsTone: 'good' | 'fair' | 'poor' =
    opsCoverageYear == null ? 'poor' : opsCoverageYear <= 3 ? 'good' : opsCoverageYear <= 6 ? 'fair' : 'poor';
  const matureTone: 'good' | 'fair' | 'poor' = matureNet >= 0 ? 'good' : matureNet > -25_000 ? 'fair' : 'poor';

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h4 className={css.title}>Operating Runway</h4>
          <p className={css.hint}>
            Year-by-year revenue vs. cost. Bridge years are when revenue can't cover
            outflows — their cumulative deficit (×1.10 buffer) is the working
            capital you need before steady operations begin.
          </p>
        </div>
        <span className={`${css.badge} ${totalBadge.tone === 'good' ? css.badgeGood : totalBadge.tone === 'fair' ? css.badgeFair : css.badgePoor}`}>
          {totalBadge.label}
        </span>
      </div>

      <div className={css.kpis}>
        <div className={`${css.kpi} ${bridgeCapital > 0 ? css.kpi_fair : css.kpi_good}`}>
          <span className={css.kpiLabel}>Bridge capital</span>
          <span className={css.kpiValue}>{fmtUsd(bridgeCapital)}</span>
          <span className={css.kpiSub}>{bridgeYears > 0 ? `${bridgeYears} yr${bridgeYears > 1 ? 's' : ''} × 1.10` : 'no bridge needed'}</span>
        </div>
        <div className={`${css.kpi} ${peakDeficit < -50_000 ? css.kpi_poor : peakDeficit < 0 ? css.kpi_fair : css.kpi_good}`}>
          <span className={css.kpiLabel}>Worst single yr</span>
          <span className={css.kpiValue}>{fmtUsd(peakDeficit)}</span>
          <span className={css.kpiSub}>annual net low-point</span>
        </div>
        <div className={`${css.kpi} ${css[`kpi_${opsTone}`]}`}>
          <span className={css.kpiLabel}>Ops covered</span>
          <span className={css.kpiValue}>{opsCoverageYear != null ? `Yr ${opsCoverageYear}` : 'never (10yr)'}</span>
          <span className={css.kpiSub}>rev ≥ operating</span>
        </div>
        <div className={`${css.kpi} ${css[`kpi_${matureTone}`]}`}>
          <span className={css.kpiLabel}>Yr {rows[rows.length - 1]!.year} net</span>
          <span className={css.kpiValue}>{fmtUsd(matureNet)}</span>
          <span className={css.kpiSub}>steady-state lens</span>
        </div>
      </div>

      <div className={css.chartLegend}>
        <span><span className={`${css.legDot} ${css.legDot_cap}`} />Capital</span>
        <span><span className={`${css.legDot} ${css.legDot_ops}`} />Operating</span>
        <span><span className={`${css.legDot} ${css.legDot_rev}`} />Revenue</span>
        <span><span className={`${css.legDot} ${css.legDot_bridge}`} />Bridge year</span>
      </div>

      <div className={css.chartWrap}>
        <svg viewBox={`0 0 ${W} ${H}`} className={css.svg} role="img" aria-label="Annual revenue vs cost chart">
          {/* horizontal grid */}
          <line x1={padL} x2={W - padR} y1={padT} y2={padT} className={css.gridLine} />
          <line x1={padL} x2={W - padR} y1={padT + halfH * 0.5} y2={padT + halfH * 0.5} className={css.gridLine} />
          <line x1={padL} x2={W - padR} y1={padT + halfH * 1.5} y2={padT + halfH * 1.5} className={css.gridLine} />
          <line x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} className={css.gridLine} />

          {/* axis labels */}
          <text x={4} y={padT + 4} className={css.axisLabel}>+{fmtUsd(maxAbs)}</text>
          <text x={4} y={yMid + 3} className={css.axisLabel}>0</text>
          <text x={4} y={padT + innerH} className={css.axisLabel}>−{fmtUsd(maxAbs)}</text>

          {/* bridge bands */}
          {rows.map((r, i) =>
            r.isBridge ? (
              <rect
                key={`band-${i}`}
                x={padL + barSlot * i}
                y={padT}
                width={barSlot}
                height={innerH}
                className={css.bridgeBand}
              />
            ) : null,
          )}

          {/* zero line */}
          <line x1={padL} x2={W - padR} y1={yMid} y2={yMid} className={css.zeroLine} />

          {/* break-even marker */}
          {beYear != null && beYear <= rows[rows.length - 1]!.year && (() => {
            const idx = rows.findIndex((r) => r.year === beYear);
            if (idx < 0) return null;
            const x = padL + barSlot * idx + barSlot / 2;
            return (
              <g>
                <line x1={x} x2={x} y1={padT} y2={padT + innerH} className={css.beMarker} />
                <text x={x + 3} y={padT + 8} className={css.beLabel}>BE</text>
              </g>
            );
          })()}

          {/* bars: cap+ops stacked downward, revenue upward */}
          {rows.map((r, i) => {
            const cx = padL + barSlot * i + barSlot / 2;
            const capH = yScale(r.cap);
            const opsH = yScale(r.ops);
            const revH = yScale(r.rev);
            return (
              <g key={`bar-${i}`}>
                {/* operating cost (bottom of stack, closest to zero) */}
                <rect
                  x={cx - barW - 0.6}
                  y={yMid}
                  width={barW}
                  height={opsH}
                  fill="rgba(220, 130, 110, 0.7)"
                />
                {/* capital cost (above operating, further from zero) */}
                <rect
                  x={cx - barW - 0.6}
                  y={yMid + opsH}
                  width={barW}
                  height={capH}
                  fill="rgba(180, 165, 140, 0.7)"
                />
                {/* revenue */}
                <rect
                  x={cx + 0.6}
                  y={yMid - revH}
                  width={barW}
                  height={revH}
                  fill="rgba(180, 220, 150, 0.7)"
                />
              </g>
            );
          })}

          {/* x-axis year labels */}
          {rows.map((r, i) => {
            const x = padL + barSlot * i + barSlot / 2;
            return (
              <text key={`yl-${i}`} x={x} y={H - 3} className={css.yearLabel}>
                {r.year}
              </text>
            );
          })}
        </svg>
      </div>

      <div className={css.tableWrap}>
        <div className={css.tableHead}>
          <span>Yr</span>
          <span>Capital</span>
          <span>Operating</span>
          <span>Revenue</span>
          <span style={{ textAlign: 'right' }}>Net</span>
        </div>
        {rows.map((r) => (
          <div
            key={r.year}
            className={`${css.tableRow} ${r.isBridge ? css.tableRow_bridge : r.net > 0 ? css.tableRow_surplus : ''}`}
          >
            <span className={css.tCol_year}>{r.year}</span>
            <span className={css.tCol_cap}>{r.cap > 0 ? fmtUsd(r.cap) : '—'}</span>
            <span className={css.tCol_ops}>{r.ops > 0 ? fmtUsd(r.ops) : '—'}</span>
            <span className={css.tCol_rev}>{r.rev > 0 ? fmtUsd(r.rev) : '—'}</span>
            <span className={`${css.tCol_net} ${r.net < 0 ? css.tCol_neg : css.tCol_pos}`}>
              {fmtUsd(r.net)}
            </span>
          </div>
        ))}
      </div>

      <p className={css.footnote}>
        Mid-scenario figures from the same engine that drives the cumulative
        cashflow chart above. Bridge capital is the sum of negative annual
        net cashflows × 1.10 contingency — a conservative working-capital
        target before revenues outrun outflows.
      </p>
    </div>
  );
}
