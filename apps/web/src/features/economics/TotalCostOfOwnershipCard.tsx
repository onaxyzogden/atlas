/**
 * §22 TotalCostOfOwnershipCard — 10-year TCO rollup with lifecycle
 * replacement projections.
 *
 * Complements the existing Grant Readiness section to close §22 manifest
 * item `grant-readiness-total-cost-of-ownership` (P3 planned → done).
 * Grant readiness asks "which programs am I eligible for?"; TCO asks
 * "what's the all-in cost of owning this design over a decade — capex,
 * opex, and the replacement cycles I haven't budgeted for yet?"
 *
 * HEURISTIC: lifecycle replacement schedules are industry-standard
 * service-life rules of thumb (RSMeans facility lifecycle data, USDA
 * NRCS infrastructure standards, owner-builder norms) — not regional
 * benchmarks. The card derives capex / opex from the existing
 * FinancialModel cashflow and overlays a per-category replacement
 * estimate. Decision-support, not engineering certification.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import type { FinancialModel } from '../financial/engine/types.js';
import s from './TotalCostOfOwnershipCard.module.css';

interface Props {
  project: LocalProject;
  model: FinancialModel;
}

const HORIZON_YEARS = 10;

interface LifecycleCategory {
  key: string;
  label: string;
  matches: ReadonlyArray<string>;
  serviceLifeYears: number;
  replacementPctOfCapex: number;
  note: string;
}

const LIFECYCLE_CATEGORIES: ReadonlyArray<LifecycleCategory> = [
  {
    key: 'structures',
    label: 'Structures',
    matches: ['Structures'],
    serviceLifeYears: 30,
    replacementPctOfCapex: 0.18,
    note: 'Roof, mechanicals, finishes — partial refresh on a 10yr horizon.',
  },
  {
    key: 'water',
    label: 'Water systems',
    matches: ['Water'],
    serviceLifeYears: 20,
    replacementPctOfCapex: 0.25,
    note: 'Pumps, valves, filtration — half the components hit replacement by yr 10.',
  },
  {
    key: 'infrastructure',
    label: 'Infrastructure',
    matches: ['Infrastructure'],
    serviceLifeYears: 25,
    replacementPctOfCapex: 0.20,
    note: 'Paths, fencing, utility runs — wear, weather, repair budget.',
  },
  {
    key: 'agricultural',
    label: 'Agricultural',
    matches: ['Agricultural', 'Land Preparation'],
    serviceLifeYears: 12,
    replacementPctOfCapex: 0.40,
    note: 'Crop replants, paddock refurb, soil amendments — heavy renewal in 10yr.',
  },
];

interface LifecycleRow {
  key: string;
  label: string;
  capex: number;
  serviceLifeYears: number;
  replacementCost: number;
  note: string;
}

function formatUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

function formatPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default function TotalCostOfOwnershipCard({ project, model }: Props) {
  const tco = useMemo(() => {
    const horizon = model.cashflow.slice(0, HORIZON_YEARS);
    if (horizon.length === 0) return null;

    const capex = horizon.reduce(
      (acc, yr) => ({
        low: acc.low + yr.capitalCosts.low,
        mid: acc.mid + yr.capitalCosts.mid,
        high: acc.high + yr.capitalCosts.high,
      }),
      { low: 0, mid: 0, high: 0 },
    );

    const opex = horizon.reduce(
      (acc, yr) => ({
        low: acc.low + yr.operatingCosts.low,
        mid: acc.mid + yr.operatingCosts.mid,
        high: acc.high + yr.operatingCosts.high,
      }),
      { low: 0, mid: 0, high: 0 },
    );

    const categoryCapex = new Map<string, number>();
    for (const item of model.costLineItems) {
      categoryCapex.set(item.category, (categoryCapex.get(item.category) ?? 0) + item.cost.mid);
    }

    const lifecycle: LifecycleRow[] = LIFECYCLE_CATEGORIES.map((cat) => {
      const cap = cat.matches.reduce((sum, m) => sum + (categoryCapex.get(m) ?? 0), 0);
      return {
        key: cat.key,
        label: cat.label,
        capex: cap,
        serviceLifeYears: cat.serviceLifeYears,
        replacementCost: cap * cat.replacementPctOfCapex,
        note: cat.note,
      };
    }).filter((r) => r.capex > 0);

    const lifecycleTotal = lifecycle.reduce((sum, r) => sum + r.replacementCost, 0);

    const tcoLow = capex.low + opex.low + lifecycleTotal;
    const tcoMid = capex.mid + opex.mid + lifecycleTotal;
    const tcoHigh = capex.high + opex.high + lifecycleTotal;

    const opexShareMid = capex.mid + opex.mid > 0 ? opex.mid / (capex.mid + opex.mid) : 0;
    const lifecycleShareMid = tcoMid > 0 ? lifecycleTotal / tcoMid : 0;

    const acreage = project.acreage ?? null;
    const tcoPerAcre = acreage && acreage > 0 ? tcoMid / acreage : null;

    return {
      capex,
      opex,
      lifecycle,
      lifecycleTotal,
      tcoLow,
      tcoMid,
      tcoHigh,
      opexShareMid,
      lifecycleShareMid,
      tcoPerAcre,
      acreage,
    };
  }, [model, project.acreage]);

  if (!tco) {
    return (
      <div className={s.card}>
        <div className={s.empty}>
          Place features on the map to see total cost of ownership over a 10-year horizon.
        </div>
      </div>
    );
  }

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}>Total Cost of Ownership ({HORIZON_YEARS}yr)</h3>
          <p className={s.cardHint}>
            All-in cost of owning the design over a decade: <em>capex</em> + <em>opex</em> +
            estimated <em>lifecycle replacement</em>. Replacement uses industry service-life
            rules of thumb per category, not regional benchmarks.
          </p>
        </div>
        <span className={s.heuristicBadge}>HEURISTIC</span>
      </div>

      {/* Headline TCO row */}
      <div className={s.headlineRow}>
        <div className={s.headlineBlock}>
          <span className={s.headlineLabel}>Capex (10yr)</span>
          <span className={s.headlineValue}>{formatUsd(tco.capex.mid)}</span>
          <span className={s.headlineSub}>
            {formatUsd(tco.capex.low)}{'\u2013'}{formatUsd(tco.capex.high)}
          </span>
        </div>
        <div className={s.headlineBlock}>
          <span className={s.headlineLabel}>Opex (10yr)</span>
          <span className={s.headlineValue}>{formatUsd(tco.opex.mid)}</span>
          <span className={s.headlineSub}>
            {formatPct(tco.opexShareMid)} of capex+opex
          </span>
        </div>
        <div className={s.headlineBlock}>
          <span className={s.headlineLabel}>Lifecycle</span>
          <span className={s.headlineValue}>{formatUsd(tco.lifecycleTotal)}</span>
          <span className={s.headlineSub}>
            {formatPct(tco.lifecycleShareMid)} of TCO
          </span>
        </div>
        <div className={`${s.headlineBlock} ${s.headlineEmphasis}`}>
          <span className={s.headlineLabel}>TCO total</span>
          <span className={s.headlineValueAccent}>{formatUsd(tco.tcoMid)}</span>
          <span className={s.headlineSub}>
            {formatUsd(tco.tcoLow)}{'\u2013'}{formatUsd(tco.tcoHigh)}
          </span>
        </div>
      </div>

      {/* Per-acre normalization */}
      {tco.tcoPerAcre != null && (
        <div className={s.perAcreRow}>
          <span className={s.perAcreLabel}>TCO per acre</span>
          <span className={s.perAcreValue}>{formatUsd(tco.tcoPerAcre)}</span>
          <span className={s.perAcreNote}>
            across {tco.acreage} ac {'\u2014'} useful for benchmarking against comparable parcels
          </span>
        </div>
      )}

      {/* Lifecycle replacement breakdown */}
      {tco.lifecycle.length > 0 && (
        <>
          <div className={s.sectionLabel}>Lifecycle replacement by category</div>
          <ul className={s.lifecycleList}>
            {tco.lifecycle.map((row) => (
              <li key={row.key} className={s.lifecycleRow}>
                <div className={s.lifecycleHead}>
                  <span className={s.lifecycleLabel}>{row.label}</span>
                  <span className={s.lifecycleService}>{row.serviceLifeYears}yr life</span>
                  <span className={s.lifecycleCost}>{formatUsd(row.replacementCost)}</span>
                </div>
                <div className={s.lifecycleNote}>{row.note}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className={s.footnote}>
        <em>Method:</em> capex + opex are summed from the financial engine{'\''}s 10-year
        cashflow projection. Lifecycle replacement applies category-specific
        service-life percentages to the placed-feature capex base{' '}
        ({'\u2248'}18{'\u2013'}40% over 10yr depending on category). Use the per-acre
        figure to compare against benchmark parcels of similar scale and intent.
      </p>
    </div>
  );
}
