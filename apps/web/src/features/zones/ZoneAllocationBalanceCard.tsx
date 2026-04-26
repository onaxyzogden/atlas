/**
 * ZoneAllocationBalanceCard — intent-aware portfolio allocation balance.
 *
 * Sibling of ZoneAllocationSummary (raw per-category breakdown) and
 * ZoneSizingCalculator (per-zone size validation). Where those answer
 * "how much area is each category" and "is this individual zone in
 * range", this card answers "do my category totals match the
 * recommended balance for this *type* of project?"
 *
 * For each ZoneCategory, compares the project's actual percentage of
 * total parcel area against an intent-tuned recommended band (different
 * for homestead vs retreat-center vs conservation, etc). Tone-coded
 * variance per category, top-3 imbalance callout, total-allocated and
 * unallocated summary.
 *
 * Pure presentation; intent bands are heuristic defaults documented
 * inline. Spec: §7 zone-sizing-calculator.
 */

import { useMemo } from 'react';
import type { LandZone, ZoneCategory } from '../../store/zoneStore.js';
import { ZONE_CATEGORY_CONFIG } from '../../store/zoneStore.js';
import s from './ZoneAllocationBalanceCard.module.css';

interface AllocationBand {
  minPct: number;
  maxPct: number;
}

type IntentKey =
  | 'homestead'
  | 'regenerative_farm'
  | 'educational_farm'
  | 'retreat_center'
  | 'conservation'
  | 'moontrance'
  | 'generic';

const INTENT_LABEL: Record<IntentKey, string> = {
  homestead: 'Homestead',
  regenerative_farm: 'Regenerative Farm',
  educational_farm: 'Educational Farm',
  retreat_center: 'Retreat Center',
  conservation: 'Conservation Project',
  moontrance: 'Moontrance Campus',
  generic: 'Generic Project',
};

/**
 * Recommended allocation bands per project intent.
 *
 * Numbers are rough defaults from regenerative-design and
 * permaculture-zoning literature (e.g., Mollison's Zones 0–5 rule of
 * thumb, NRCS conservation-set-aside guidance, hospitality-site
 * planning norms). Categories not listed for a given intent carry no
 * recommendation (rendered as "no band — discretionary").
 *
 * Pcts are *of total parcel*, not of zoned area. They will not sum to
 * 100 — gaps account for unallocated slack and discretionary categories.
 */
const INTENT_BANDS: Record<IntentKey, Partial<Record<ZoneCategory, AllocationBand>>> = {
  homestead: {
    food_production:  { minPct: 25, maxPct: 40 },
    livestock:        { minPct: 10, maxPct: 20 },
    habitation:       { minPct: 3,  maxPct: 8  },
    commons:          { minPct: 5,  maxPct: 15 },
    conservation:     { minPct: 10, maxPct: 25 },
    water_retention:  { minPct: 3,  maxPct: 10 },
    infrastructure:   { minPct: 3,  maxPct: 7  },
    access:           { minPct: 3,  maxPct: 8  },
    buffer:           { minPct: 2,  maxPct: 8  },
  },
  regenerative_farm: {
    food_production:  { minPct: 30, maxPct: 50 },
    livestock:        { minPct: 20, maxPct: 35 },
    habitation:       { minPct: 2,  maxPct: 5  },
    commons:          { minPct: 3,  maxPct: 10 },
    conservation:     { minPct: 10, maxPct: 20 },
    water_retention:  { minPct: 3,  maxPct: 10 },
    infrastructure:   { minPct: 3,  maxPct: 8  },
    access:           { minPct: 5,  maxPct: 12 },
  },
  educational_farm: {
    food_production:  { minPct: 25, maxPct: 40 },
    livestock:        { minPct: 10, maxPct: 20 },
    habitation:       { minPct: 3,  maxPct: 8  },
    commons:          { minPct: 5,  maxPct: 15 },
    education:        { minPct: 8,  maxPct: 20 },
    conservation:     { minPct: 10, maxPct: 20 },
    infrastructure:   { minPct: 3,  maxPct: 8  },
    access:           { minPct: 5,  maxPct: 12 },
  },
  retreat_center: {
    food_production:  { minPct: 10, maxPct: 25 },
    habitation:       { minPct: 8,  maxPct: 15 },
    retreat:          { minPct: 10, maxPct: 25 },
    commons:          { minPct: 10, maxPct: 20 },
    spiritual:        { minPct: 3,  maxPct: 10 },
    conservation:     { minPct: 15, maxPct: 30 },
    water_retention:  { minPct: 2,  maxPct: 8  },
    infrastructure:   { minPct: 3,  maxPct: 8  },
    access:           { minPct: 5,  maxPct: 12 },
    buffer:           { minPct: 3,  maxPct: 10 },
  },
  conservation: {
    conservation:     { minPct: 50, maxPct: 80 },
    water_retention:  { minPct: 5,  maxPct: 15 },
    food_production:  { minPct: 0,  maxPct: 10 },
    livestock:        { minPct: 0,  maxPct: 10 },
    habitation:       { minPct: 0,  maxPct: 5  },
    infrastructure:   { minPct: 1,  maxPct: 5  },
    access:           { minPct: 2,  maxPct: 8  },
    buffer:           { minPct: 5,  maxPct: 15 },
  },
  moontrance: {
    spiritual:        { minPct: 5,  maxPct: 15 },
    retreat:          { minPct: 15, maxPct: 30 },
    habitation:       { minPct: 8,  maxPct: 15 },
    education:        { minPct: 5,  maxPct: 15 },
    commons:          { minPct: 10, maxPct: 20 },
    food_production:  { minPct: 10, maxPct: 20 },
    conservation:     { minPct: 10, maxPct: 25 },
    water_retention:  { minPct: 2,  maxPct: 8  },
    infrastructure:   { minPct: 3,  maxPct: 8  },
    access:           { minPct: 5,  maxPct: 12 },
    buffer:           { minPct: 3,  maxPct: 10 },
  },
  generic: {
    food_production:  { minPct: 15, maxPct: 35 },
    habitation:       { minPct: 3,  maxPct: 10 },
    conservation:     { minPct: 10, maxPct: 30 },
    water_retention:  { minPct: 3,  maxPct: 10 },
    infrastructure:   { minPct: 2,  maxPct: 8  },
    access:           { minPct: 3,  maxPct: 10 },
  },
};

function resolveIntent(projectType: string | null | undefined): IntentKey {
  if (!projectType) return 'generic';
  if (projectType === 'homestead') return 'homestead';
  if (projectType === 'regenerative_farm' || projectType === 'farm') return 'regenerative_farm';
  if (projectType === 'educational_farm' || projectType === 'education') return 'educational_farm';
  if (projectType === 'retreat_center' || projectType === 'retreat') return 'retreat_center';
  if (projectType === 'conservation') return 'conservation';
  if (projectType === 'moontrance') return 'moontrance';
  return 'generic';
}

type Status = 'in_band' | 'under' | 'over' | 'absent_required' | 'discretionary';

interface CategoryRow {
  category: ZoneCategory;
  label: string;
  color: string;
  actualPct: number;
  band: AllocationBand | null;
  status: Status;
  variance: number;
}

interface BalanceResult {
  rows: CategoryRow[];
  totalAllocatedPct: number;
  unallocatedPct: number;
  overlapFlag: boolean;
  imbalanceCount: number;
  topImbalances: CategoryRow[];
  intent: IntentKey;
}

function computeBalance(
  zones: LandZone[],
  totalAcreage: number | null,
  intent: IntentKey,
): BalanceResult {
  const totalPropertyM2 = (totalAcreage ?? 0) * 4046.86;
  const bands = INTENT_BANDS[intent];

  const byCat = new Map<ZoneCategory, number>();
  let totalZonedM2 = 0;
  for (const z of zones) {
    byCat.set(z.category, (byCat.get(z.category) ?? 0) + z.areaM2);
    totalZonedM2 += z.areaM2;
  }

  const seenCats = new Set<ZoneCategory>(byCat.keys());
  const bandCats = Object.keys(bands) as ZoneCategory[];
  const allCats = new Set<ZoneCategory>([...seenCats, ...bandCats]);

  const rows: CategoryRow[] = [];
  for (const category of allCats) {
    const cfg = ZONE_CATEGORY_CONFIG[category];
    const areaM2 = byCat.get(category) ?? 0;
    const actualPct = totalPropertyM2 > 0 ? (areaM2 / totalPropertyM2) * 100 : 0;
    const band = bands[category] ?? null;

    let status: Status;
    let variance = 0;
    if (!band) {
      status = areaM2 > 0 ? 'discretionary' : 'discretionary';
    } else if (areaM2 === 0 && band.minPct > 0) {
      status = 'absent_required';
      variance = -band.minPct;
    } else if (actualPct < band.minPct) {
      status = 'under';
      variance = actualPct - band.minPct;
    } else if (actualPct > band.maxPct) {
      status = 'over';
      variance = actualPct - band.maxPct;
    } else {
      status = 'in_band';
      variance = 0;
    }

    if (areaM2 === 0 && !band) continue;
    rows.push({ category, label: cfg.label, color: cfg.color, actualPct, band, status, variance });
  }

  rows.sort((a, b) => b.actualPct - a.actualPct);

  const totalAllocatedPct = totalPropertyM2 > 0 ? (totalZonedM2 / totalPropertyM2) * 100 : 0;
  const unallocatedPct = Math.max(0, 100 - totalAllocatedPct);
  const overlapFlag = totalAllocatedPct > 100.5;

  const imbalances = rows.filter((r) => r.status === 'under' || r.status === 'over' || r.status === 'absent_required');
  imbalances.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

  return {
    rows,
    totalAllocatedPct,
    unallocatedPct,
    overlapFlag,
    imbalanceCount: imbalances.length,
    topImbalances: imbalances.slice(0, 3),
    intent,
  };
}

interface ZoneAllocationBalanceCardProps {
  zones: LandZone[];
  totalAcreage: number | null;
  projectType: string | null;
}

export default function ZoneAllocationBalanceCard({
  zones,
  totalAcreage,
  projectType,
}: ZoneAllocationBalanceCardProps) {
  const intent = useMemo(() => resolveIntent(projectType), [projectType]);
  const balance = useMemo(
    () => computeBalance(zones, totalAcreage, intent),
    [zones, totalAcreage, intent],
  );

  if (!totalAcreage || totalAcreage <= 0) {
    return (
      <div className={s.card}>
        <div className={s.cardHead}>
          <div>
            <h3 className={s.cardTitle}>Allocation Balance</h3>
            <p className={s.cardHint}>
              Set project acreage to see how your zone categories compare to a
              recommended balance for this project type.
            </p>
          </div>
          <span className={s.heuristicBadge}>HEURISTIC</span>
        </div>
      </div>
    );
  }

  if (zones.length === 0) {
    return (
      <div className={s.card}>
        <div className={s.cardHead}>
          <div>
            <h3 className={s.cardTitle}>Allocation Balance</h3>
            <p className={s.cardHint}>
              Draw zones to see your category totals checked against the
              recommended balance for a <em>{INTENT_LABEL[intent]}</em>.
            </p>
          </div>
          <span className={s.heuristicBadge}>HEURISTIC</span>
        </div>
      </div>
    );
  }

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}>Allocation Balance</h3>
          <p className={s.cardHint}>
            Category totals checked against the recommended balance for a{' '}
            <em>{INTENT_LABEL[intent]}</em>. Bands are heuristic defaults from
            regenerative-design literature; not absolute targets.
          </p>
        </div>
        <span className={s.heuristicBadge}>HEURISTIC</span>
      </div>

      {/* Headline: total allocated, unallocated, imbalance count */}
      <div className={s.headlineRow}>
        <div className={s.headlineBlock}>
          <div className={s.headlineValue}>{balance.totalAllocatedPct.toFixed(1)}%</div>
          <div className={s.headlineLabel}>Allocated</div>
        </div>
        <div className={s.headlineBlock}>
          <div className={s.headlineValue}>{balance.unallocatedPct.toFixed(1)}%</div>
          <div className={s.headlineLabel}>Unallocated</div>
        </div>
        <div className={`${s.headlineBlock} ${balance.imbalanceCount === 0 ? s.statusInBand : s.statusOff}`}>
          <div className={s.headlineValue}>{balance.imbalanceCount}</div>
          <div className={s.headlineLabel}>{balance.imbalanceCount === 1 ? 'Imbalance' : 'Imbalances'}</div>
        </div>
      </div>

      {balance.overlapFlag && (
        <p className={s.overlapWarning}>
          Total allocated exceeds 100% — zones likely overlap. See conflict detector below.
        </p>
      )}

      {/* Top imbalance callout */}
      {balance.topImbalances.length > 0 && (
        <>
          <h4 className={s.sectionTitle}>Top Imbalances</h4>
          <ul className={s.imbalanceList}>
            {balance.topImbalances.map((row) => (
              <li key={row.category} className={`${s.imbalanceRow} ${statusClass(s, row.status)}`}>
                <span className={s.imbalanceDot} style={{ background: row.color }} />
                <span className={s.imbalanceLabel}>{row.label}</span>
                <span className={s.imbalanceDetail}>
                  {row.status === 'absent_required' && row.band &&
                    `Missing — recommended ${row.band.minPct.toFixed(0)}–${row.band.maxPct.toFixed(0)}%`}
                  {row.status === 'under' && row.band &&
                    `Under by ${Math.abs(row.variance).toFixed(1)} pts (have ${row.actualPct.toFixed(1)}%, want ≥${row.band.minPct.toFixed(0)}%)`}
                  {row.status === 'over' && row.band &&
                    `Over by ${row.variance.toFixed(1)} pts (have ${row.actualPct.toFixed(1)}%, want ≤${row.band.maxPct.toFixed(0)}%)`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Per-category rows */}
      <h4 className={s.sectionTitle}>Per-Category Balance</h4>
      <ul className={s.list}>
        {balance.rows.map((row) => (
          <CategoryBar key={row.category} row={row} />
        ))}
      </ul>

      <p className={s.footnote}>
        Bands shown as percentage of total parcel area (not of zoned area).
        Discretionary categories carry no recommendation. Numbers are
        directional guidance, not compliance targets.
      </p>
    </div>
  );
}

function statusClass(styles: Record<string, string>, status: Status): string {
  if (status === 'in_band') return styles.statusInBand ?? '';
  if (status === 'discretionary') return styles.statusDiscretionary ?? '';
  if (status === 'absent_required') return styles.statusMissing ?? '';
  if (status === 'over') return styles.statusOver ?? '';
  return styles.statusUnder ?? '';
}

function CategoryBar({ row }: { row: CategoryRow }) {
  const max = row.band ? Math.max(row.band.maxPct * 1.5, row.actualPct * 1.1, 10) : Math.max(row.actualPct * 1.2, 10);
  const actualPctOfBar = (row.actualPct / max) * 100;
  const bandStartPct = row.band ? (row.band.minPct / max) * 100 : 0;
  const bandWidthPct = row.band ? ((row.band.maxPct - row.band.minPct) / max) * 100 : 0;

  return (
    <li className={`${s.row} ${statusClass(s, row.status)}`}>
      <div className={s.rowHead}>
        <span className={s.rowDot} style={{ background: row.color }} />
        <span className={s.rowLabel}>{row.label}</span>
        <span className={s.rowActual}>{row.actualPct.toFixed(1)}%</span>
      </div>
      <div className={s.barTrack}>
        {row.band && (
          <span
            className={s.bandRange}
            style={{ left: `${bandStartPct}%`, width: `${bandWidthPct}%` }}
          />
        )}
        <span
          className={s.barFill}
          style={{ width: `${Math.min(100, actualPctOfBar)}%`, background: row.color }}
        />
      </div>
      <p className={s.rowCaption}>
        {row.band
          ? `Recommended ${row.band.minPct.toFixed(0)}–${row.band.maxPct.toFixed(0)}% · ${statusCaption(row.status, row.variance)}`
          : 'Discretionary — no recommended band for this intent'}
      </p>
    </li>
  );
}

function statusCaption(status: Status, variance: number): string {
  if (status === 'in_band') return 'in range';
  if (status === 'absent_required') return 'category missing';
  if (status === 'discretionary') return 'discretionary';
  if (status === 'under') return `under by ${Math.abs(variance).toFixed(1)} pts`;
  return `over by ${variance.toFixed(1)} pts`;
}
