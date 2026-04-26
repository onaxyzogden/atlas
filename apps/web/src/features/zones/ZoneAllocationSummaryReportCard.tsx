/**
 * §8 ZoneAllocationSummaryReportCard — flat report rollup of land allocation.
 * Distinct from §7 ZoneAllocationBalanceCard (intent-vs-band targeting) and
 * from the upstream stacked-bar ZoneAllocationSummary (visual breakdown).
 *
 * This is the *report* angle: top-3 dominant categories, per-category zone
 * count alongside acres + percent, an explicit total-allocated/total-zoned
 * count metric, and a one-click CSV export of the full table for sharing
 * with stewards or filing into a project plan.
 */

import { useMemo, useCallback } from 'react';
import {
  ZONE_CATEGORY_CONFIG,
  type LandZone,
  type ZoneCategory,
} from '../../store/zoneStore.js';
import { computeAllocation } from './zoneAnalysis.js';
import s from './ZoneAllocationSummaryReportCard.module.css';

interface Props {
  zones: LandZone[];
  totalAcreage: number | null;
  projectName?: string | null;
}

interface RowData {
  category: ZoneCategory;
  label: string;
  color: string;
  acres: number;
  pct: number;
  count: number;
  rank: number;
}

export default function ZoneAllocationSummaryReportCard({ zones, totalAcreage, projectName }: Props) {
  const { rows, totals, top3, unallocatedAcres, hasProperty } = useMemo(() => {
    const allocation = computeAllocation(zones, totalAcreage, ZONE_CATEGORY_CONFIG);

    const countByCat = new Map<ZoneCategory, number>();
    for (const z of zones) {
      countByCat.set(z.category, (countByCat.get(z.category) ?? 0) + 1);
    }

    const rows: RowData[] = allocation.entries.map((e, i) => ({
      category: e.category,
      label: e.label,
      color: e.color,
      acres: e.acres,
      pct: e.pct,
      count: countByCat.get(e.category) ?? 0,
      rank: i + 1,
    }));

    const top3 = rows.slice(0, 3);
    const totals = {
      zonedAcres: allocation.totalZonedM2 / 4046.86,
      propertyAcres: allocation.totalPropertyM2 / 4046.86,
      zonedPct: allocation.zonedPct,
      categoryCount: rows.length,
      zoneCount: zones.length,
    };
    const unallocatedAcres = allocation.unallocatedM2 / 4046.86;
    const hasProperty = allocation.totalPropertyM2 > 0;

    return { rows, totals, top3, unallocatedAcres, hasProperty };
  }, [zones, totalAcreage]);

  const handleExportCsv = useCallback(() => {
    const lines: string[] = [];
    lines.push('Rank,Category,Zones,Acres,Percent of property');
    for (const r of rows) {
      lines.push(
        `${r.rank},"${r.label.replace(/"/g, '""')}",${r.count},${r.acres.toFixed(2)},${
          hasProperty ? r.pct.toFixed(2) : ''
        }`,
      );
    }
    if (hasProperty) {
      lines.push(`,Unallocated,,${unallocatedAcres.toFixed(2)},${(100 - totals.zonedPct).toFixed(2)}`);
    }
    lines.push(
      `,Total allocated,${totals.zoneCount},${totals.zonedAcres.toFixed(2)},${
        hasProperty ? totals.zonedPct.toFixed(2) : ''
      }`,
    );
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = (projectName ?? 'project').replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, '');
    a.href = url;
    a.download = `${slug || 'project'}-allocation-report.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [rows, hasProperty, unallocatedAcres, totals, projectName]);

  if (zones.length === 0) {
    return (
      <div className={s.card}>
        <div className={s.cardHead}>
          <div>
            <h4 className={s.cardTitle}>Allocation summary report</h4>
            <p className={s.cardHint}>
              Per-category rollup with zone counts, top-3 dominants, and CSV export. Draw zones to populate the report.
            </p>
          </div>
          <span className={s.heuristicBadge}>REPORT</span>
        </div>
      </div>
    );
  }

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div>
          <h4 className={s.cardTitle}>Allocation summary report</h4>
          <p className={s.cardHint}>
            Per-category rollup of zoned acres, percent of property, and zone count — with the top-3 dominant categories surfaced and a CSV export for sharing or filing.
          </p>
        </div>
        <span className={s.heuristicBadge}>REPORT</span>
      </div>

      <div className={s.headlineRow}>
        <div className={s.headlineBlock}>
          <div className={s.headlineValue}>{totals.zoneCount}</div>
          <div className={s.headlineLabel}>Zones drawn</div>
        </div>
        <div className={s.headlineBlock}>
          <div className={s.headlineValue}>{totals.categoryCount}</div>
          <div className={s.headlineLabel}>Categories used</div>
        </div>
        <div className={s.headlineBlock}>
          <div className={s.headlineValue}>{totals.zonedAcres.toFixed(2)} ac</div>
          <div className={s.headlineLabel}>
            Total allocated{hasProperty ? ` · ${totals.zonedPct.toFixed(1)}%` : ''}
          </div>
        </div>
      </div>

      {top3.length > 0 && (
        <>
          <div className={s.sectionTitle}>Top {top3.length} dominant {top3.length === 1 ? 'category' : 'categories'}</div>
          <div className={s.podiumRow}>
            {top3.map((r) => (
              <div key={r.category} className={s.podiumBlock}>
                <div className={s.podiumRank}>#{r.rank}</div>
                <div className={s.podiumSwatchRow}>
                  <span className={s.podiumSwatch} style={{ background: r.color }} />
                  <span className={s.podiumLabel}>{r.label}</span>
                </div>
                <div className={s.podiumMeta}>
                  {r.acres.toFixed(2)} ac{hasProperty ? ` · ${r.pct.toFixed(1)}%` : ''}
                </div>
                <div className={s.podiumCount}>
                  {r.count} {r.count === 1 ? 'zone' : 'zones'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className={s.sectionTitle}>Full breakdown</div>
      <table className={s.table}>
        <thead>
          <tr>
            <th className={s.thCategory}>Category</th>
            <th className={s.thNum}>Zones</th>
            <th className={s.thNum}>Acres</th>
            <th className={s.thNum}>%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category}>
              <td className={s.tdCategory}>
                <span className={s.swatch} style={{ background: r.color }} />
                <span>{r.label}</span>
              </td>
              <td className={s.tdNum}>{r.count}</td>
              <td className={s.tdNum}>{r.acres.toFixed(2)}</td>
              <td className={s.tdNum}>{hasProperty ? `${r.pct.toFixed(1)}%` : '—'}</td>
            </tr>
          ))}
          {hasProperty && unallocatedAcres > 0.01 && (
            <tr className={s.unallocatedRow}>
              <td className={s.tdCategory}>
                <span className={`${s.swatch} ${s.swatchUnallocated}`} />
                <span>Unallocated</span>
              </td>
              <td className={s.tdNum}>—</td>
              <td className={s.tdNum}>{unallocatedAcres.toFixed(2)}</td>
              <td className={s.tdNum}>{(100 - totals.zonedPct).toFixed(1)}%</td>
            </tr>
          )}
          <tr className={s.totalRow}>
            <td className={s.tdCategory}>Total allocated</td>
            <td className={s.tdNum}>{totals.zoneCount}</td>
            <td className={s.tdNum}>{totals.zonedAcres.toFixed(2)}</td>
            <td className={s.tdNum}>{hasProperty ? `${totals.zonedPct.toFixed(1)}%` : '—'}</td>
          </tr>
        </tbody>
      </table>

      <div className={s.actionRow}>
        <button type="button" onClick={handleExportCsv} className={s.exportBtn}>
          Export CSV
        </button>
        {!hasProperty && (
          <span className={s.warnNote}>
            Set project acreage to compute percentages and unallocated balance.
          </span>
        )}
      </div>
    </div>
  );
}
