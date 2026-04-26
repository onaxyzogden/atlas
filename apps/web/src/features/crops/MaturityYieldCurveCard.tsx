/**
 * §12 MaturityYieldCurveCard — per-enterprise yield ramp to maturity.
 *
 * For each RevenueStream in the FinancialModel, surface the year-by-year
 * yield trajectory: when each stream starts, when it crosses the 25/50/75/100%
 * milestones of mature output, and what the at-maturity revenue band looks
 * like. A small Y0–Y10 bar chart visualises the ramp using each stream's
 * `rampSchedule`.
 *
 * Pure derivation — reads useFinancialModel(projectId) only. No new shared
 * math, no scenario writes, no map overlay.
 */

import { useMemo } from 'react';
import { useFinancialModel } from '../financial/hooks/useFinancialModel.js';
import { fmtK } from '../../lib/formatRange.js';
import type { RevenueStream } from '../financial/engine/types.js';
import css from './MaturityYieldCurveCard.module.css';

interface Props {
  projectId: string;
}

interface MilestoneRow {
  stream: RevenueStream;
  matureMidUsd: number;
  matureLowUsd: number;
  matureHighUsd: number;
  pct25Year: number | null;
  pct50Year: number | null;
  pct75Year: number | null;
  pct100Year: number | null;
  bars: number[];
}

const ENTERPRISE_LABELS: Record<string, string> = {
  livestock: 'Livestock',
  orchard: 'Orchard',
  market_garden: 'Market garden',
  retreat: 'Retreat',
  education: 'Education',
  agritourism: 'Agritourism',
  carbon: 'Carbon',
  grants: 'Grants',
};

function findMilestoneYear(ramp: Record<number, number>, target: number): number | null {
  const years = Object.keys(ramp)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  for (const y of years) {
    const v = ramp[y] ?? 0;
    if (v >= target) return y;
  }
  return null;
}

function buildBars(stream: RevenueStream, horizon = 11): number[] {
  const out: number[] = [];
  for (let y = 0; y < horizon; y++) {
    const v = stream.rampSchedule[y];
    out.push(typeof v === 'number' ? Math.max(0, Math.min(1, v)) : 0);
  }
  return out;
}

function confidenceLabel(c: 'high' | 'medium' | 'low'): string {
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function confidenceClass(c: 'high' | 'medium' | 'low'): string {
  if (c === 'high') return css.confidenceHigh ?? '';
  if (c === 'low') return css.confidenceLow ?? '';
  return '';
}

export default function MaturityYieldCurveCard({ projectId }: Props) {
  const model = useFinancialModel(projectId);

  const rows = useMemo<MilestoneRow[] | null>(() => {
    if (!model) return null;
    return model.revenueStreams.map((stream) => ({
      stream,
      matureMidUsd: stream.annualRevenue.mid,
      matureLowUsd: stream.annualRevenue.low,
      matureHighUsd: stream.annualRevenue.high,
      pct25Year: findMilestoneYear(stream.rampSchedule, 0.25),
      pct50Year: findMilestoneYear(stream.rampSchedule, 0.5),
      pct75Year: findMilestoneYear(stream.rampSchedule, 0.75),
      pct100Year: findMilestoneYear(stream.rampSchedule, 1.0),
      bars: buildBars(stream),
    }));
  }, [model]);

  if (!model) {
    return (
      <section className={css.card}>
        <div className={css.head}>
          <div>
            <h3 className={css.title}>Maturity &amp; yield curve</h3>
            <p className={css.hint}>
              Per-enterprise ramp from establishment to mature yield. Computes once revenue streams are present in the financial model.
            </p>
          </div>
          <span className={css.modeBadge}>HEURISTIC</span>
        </div>
        <div className={css.empty}>Financial model not yet available for this project.</div>
      </section>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <section className={css.card}>
        <div className={css.head}>
          <div>
            <h3 className={css.title}>Maturity &amp; yield curve</h3>
            <p className={css.hint}>
              Per-enterprise ramp from establishment to mature yield. Add zones, structures, or crop areas that drive revenue (orchards, market gardens, livestock paddocks, retreat structures) to populate the curve.
            </p>
          </div>
          <span className={css.modeBadge}>HEURISTIC</span>
        </div>
        <div className={css.empty}>No revenue streams detected — placement is still in establishment phase.</div>
      </section>
    );
  }

  return (
    <section className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Maturity &amp; yield curve</h3>
          <p className={css.hint}>
            For each revenue stream, the year ramp crosses 25 / 50 / 75 / 100% of mature output. Bars show ten-year trajectory; gold marks years at full maturity.
          </p>
        </div>
        <span className={css.modeBadge}>HEURISTIC</span>
      </div>

      <div className={css.streamList}>
        {rows.map((r) => (
          <StreamCard key={r.stream.id} row={r} />
        ))}
      </div>

      <div className={css.assumption}>
        Milestone years come straight from each stream's <code>rampSchedule</code>. The 25/50/75% rows mark the first year the multiplier reaches that fraction, so a stream that jumps from 0% to 70% in year 2 will show the same year for both the 25% and 50% milestones. Mature revenue bands are the steady-state low/mid/high before phasing — actual cashflow tilts these years' contribution by the ramp factor.
      </div>
    </section>
  );
}

function StreamCard({ row }: { row: MilestoneRow }) {
  const enterpriseLabel = ENTERPRISE_LABELS[row.stream.enterprise] ?? row.stream.enterprise;
  return (
    <div className={css.stream}>
      <div className={css.streamHead}>
        <span className={css.streamName}>{row.stream.name}</span>
        <span className={css.streamEnterprise}>{enterpriseLabel}</span>
      </div>

      <div className={css.milestoneRow}>
        <Milestone label="25%" year={row.pct25Year} />
        <Milestone label="50%" year={row.pct50Year} />
        <Milestone label="75%" year={row.pct75Year} />
        <Milestone label="100%" year={row.pct100Year} />
      </div>

      <div className={css.bars}>
        {row.bars.map((v, i) => {
          const className = v >= 0.99
            ? `${css.bar} ${css.barMature}`
            : v <= 0.01
              ? `${css.bar} ${css.barIdle}`
              : css.bar;
          return (
            <div
              key={i}
              className={className}
              style={{ height: `${Math.max(8, v * 100)}%` }}
            />
          );
        })}
      </div>
      <div className={css.barAxis}>
        {Array.from({ length: 11 }, (_, i) => (
          <span key={i}>Y{i}</span>
        ))}
      </div>

      <div className={css.matureRevenue}>
        <span>
          At maturity (Y{row.stream.maturityYear}):{' '}
          <strong>
            {fmtK(row.matureLowUsd)}–{fmtK(row.matureHighUsd)}
          </strong>{' '}
          / yr
        </span>
        <span className={`${css.confidence} ${confidenceClass(row.stream.confidence)}`}>
          {confidenceLabel(row.stream.confidence)} confidence
        </span>
      </div>
    </div>
  );
}

function Milestone({ label, year }: { label: string; year: number | null }) {
  return (
    <div className={css.milestone}>
      <span className={css.milestoneLabel}>{label}</span>
      <span className={year != null ? css.milestoneValue : `${css.milestoneValue} ${css.milestoneValuePending}`}>
        {year != null ? `Year ${year}` : '—'}
      </span>
    </div>
  );
}
