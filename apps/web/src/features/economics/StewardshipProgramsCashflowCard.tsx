/**
 * Slice 7 (S7-B) of the 2026-05-21 habitat-feature unification —
 * read-only per-phase cashflow card combining cover-crop seeding +
 * habitat-feature install + agroforestry planting + tree-planting
 * economics. Slice 8-D collapsed the per-program columns into a
 * compact "Phase | Labor (hrs) | Cost (USD)" layout. Slice 8-F
 * replaced the native `title` tooltip with the design-system
 * `Tooltip` primitive (role="tooltip" + aria-describedby + keyboard
 * focus) so the per-program breakdown is exposed to touch users and
 * screen readers, not just hover.
 *
 * Consumes `computeStewardshipProgramsCashflow` (pure helper). Rows are
 * ordered by `BuildPhase.order`; unphased bucket lands last as
 * "Unscheduled". The data model retains the four `ProgramSubtotal`
 * fields per row — the collapse is render-only, so the rollup remains
 * losslessly addressable for future consumers.
 *
 * Pure presentation: stores read, no writes, no map overlays. Mounts
 * on EconomicsPanel's Costs tab as a sibling to `CostByFeaturePhaseCard`.
 *
 * Covenant locked: strictly D3 project budget tracking. USD + labor
 * hrs only. No riba / gharar / CSRA / salam / investor / financing /
 * cost-of-capital framing — these are stewardship-program install
 * costs, nothing else.
 */

import { useMemo } from 'react';
import { useWorkItemStore } from '../../store/workItemStore.js';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLandDesignStore } from '../../store/landDesignStore.js';
import { useProjectStore } from '../../store/projectStore.js';
import { useFinancialStore } from '../../store/financialStore.js';
import { deriveCostRegion } from '../financial/engine/regionLocality.js';
import { getRegionMultiplier } from '../financial/engine/costDatabase.js';
import { REGION_LABELS, type CostRegion } from '../financial/engine/types.js';
import { formatUsdRange } from '../../lib/formatRange.js';
import { Tooltip } from '../../components/ui/Tooltip.js';
import CitationSection from '../../components/evidence/CitationSection.js';
import {
  computeStewardshipProgramsCashflow,
  UNPHASED_CASHFLOW_BUCKET_ID,
  type PhaseCashflowRow,
  type ProgramSubtotal,
} from './stewardshipProgramsCashflow.js';
import { collectStewardshipCitations } from './stewardshipCitations.js';
import p from '../../styles/panel.module.css';

const AUTO_SENTINEL = '__auto__';

interface Props {
  projectId: string;
}

export default function StewardshipProgramsCashflowCard({ projectId }: Props) {
  const items = useWorkItemStore((s) => s.items);
  const phases = usePhaseStore((s) => s.phases);
  const cropAreas = useCropStore((s) => s.cropAreas);
  const byProject = useLandDesignStore((s) => s.byProject);
  const project = useProjectStore((s) => s.projects.find((pr) => pr.id === projectId));
  const stewardshipCostRegion = useFinancialStore((s) => s.stewardshipCostRegion);
  const setStewardshipCostRegion = useFinancialStore((s) => s.setStewardshipCostRegion);

  const derivedRegion = deriveCostRegion(project?.country, project?.provinceState);
  const effectiveRegion: CostRegion = stewardshipCostRegion ?? derivedRegion;

  const rollup = useMemo(() => {
    const designElements = byProject[projectId] ?? [];
    return computeStewardshipProgramsCashflow({
      projectId,
      items,
      designElements,
      declaredPhases: phases,
      cropAreas,
      region: effectiveRegion,
    });
  }, [projectId, items, byProject, phases, cropAreas, effectiveRegion]);

  const citations = useMemo(() => {
    const designElements = byProject[projectId] ?? [];
    return collectStewardshipCitations({ projectId, items, designElements });
  }, [projectId, items, byProject]);

  if (rollup.rows.length === 0) {
    return (
      <div className={p.card} aria-label="Stewardship Programs Cashflow">
        <h3 className={p.sectionLabel} style={{ margin: 0, marginBottom: 6 }}>
          Stewardship Programs Cashflow
        </h3>
        <div className={p.empty} style={{ padding: '12px 0', fontSize: 12 }}>
          Place habitat features, agroforestry plantings, tree-plantings,
          or schedule cover-crop windows to populate the per-phase cashflow.
        </div>
      </div>
    );
  }

  const totalsRow: PhaseCashflowRow = {
    phaseId: '__total__',
    phaseName: 'Total',
    phaseOrder: Number.MAX_SAFE_INTEGER,
    coverCrop: rollup.totals.coverCrop,
    habitatFeature: rollup.totals.habitatFeature,
    agroforestry: rollup.totals.agroforestry,
    treePlanting: rollup.totals.treePlanting,
    total: rollup.totals.combined,
  };

  return (
    <div className={p.card} aria-label="Stewardship Programs Cashflow">
      <h3 className={p.sectionLabel} style={{ margin: 0, marginBottom: 4 }}>
        Stewardship Programs Cashflow
      </h3>
      <div
        style={{
          fontSize: 11,
          color: 'rgba(180, 165, 140, 0.7)',
          marginBottom: 12,
          lineHeight: 1.5,
        }}
      >
        Per-phase combined labor + cost across cover-crop seeding,
        habitat-feature installs, agroforestry plantings, and tree-planting.
        Hover any cell for the per-program breakdown. Low/mid/high reflects
        DIY-to-contracted variance on the install programs; cover-crop seed
        cost is a flat per-acre figure projected uniformly into the band.
        Costs are region-adjusted (×{getRegionMultiplier(effectiveRegion).toFixed(2)});
        labor hours are not.
      </div>

      <RegionSelect
        derivedRegion={derivedRegion}
        override={stewardshipCostRegion}
        onChange={setStewardshipCostRegion}
      />

      <table
        role="table"
        aria-label="Stewardship programs cashflow per phase"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 11.5,
          color: 'rgba(220, 210, 185, 0.9)',
        }}
      >
        <thead>
          <tr style={{ textAlign: 'left' }}>
            <Th>Phase</Th>
            <Th align="right">Labor (hrs)</Th>
            <Th align="right">Cost (USD)</Th>
          </tr>
        </thead>
        <tbody>
          {rollup.rows.map((row) => (
            <CashflowRow key={row.phaseId} row={row} />
          ))}
          <tr
            style={{
              borderTop: '1px solid rgba(232, 220, 200, 0.16)',
              fontWeight: 600,
            }}
          >
            <Td>{totalsRow.phaseName}</Td>
            <Td align="right">
              <BreakdownTrigger
                value={formatHrs(totalsRow.total.laborHrs)}
                breakdown={laborBreakdown(totalsRow)}
              />
            </Td>
            <Td align="right">
              <BreakdownTrigger
                value={formatRange(totalsRow.total.costRange)}
                breakdown={costBreakdown(totalsRow)}
              />
            </Td>
          </tr>
        </tbody>
      </table>

      <CitationSection citations={citations} />
    </div>
  );
}

/**
 * Cost-region picker. Defaults to "Auto", which derives the region from the
 * project's location; the steward can override to any of the seven regions.
 * The override persists in `financialStore` (`stewardshipCostRegion`).
 */
function RegionSelect({
  derivedRegion,
  override,
  onChange,
}: {
  derivedRegion: CostRegion;
  override: CostRegion | null;
  onChange: (region: CostRegion | null) => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        color: 'rgba(180, 165, 140, 0.8)',
        marginBottom: 10,
      }}
    >
      Cost region:
      <select
        value={override ?? AUTO_SENTINEL}
        onChange={(e) =>
          onChange(e.target.value === AUTO_SENTINEL ? null : (e.target.value as CostRegion))
        }
        style={{
          fontSize: 11,
          padding: '2px 6px',
          background: 'rgba(20, 18, 14, 0.6)',
          color: 'rgba(220, 210, 185, 0.95)',
          border: '1px solid rgba(232, 220, 200, 0.18)',
          borderRadius: 4,
        }}
      >
        <option value={AUTO_SENTINEL}>Auto — {REGION_LABELS[derivedRegion]}</option>
        {(Object.keys(REGION_LABELS) as CostRegion[]).map((r) => (
          <option key={r} value={r}>
            {REGION_LABELS[r]}
          </option>
        ))}
      </select>
    </label>
  );
}

function CashflowRow({ row }: { row: PhaseCashflowRow }) {
  const isUnphased = row.phaseId === UNPHASED_CASHFLOW_BUCKET_ID;
  return (
    <tr
      style={{
        borderTop: '1px solid rgba(232, 220, 200, 0.06)',
        color: isUnphased ? 'rgba(180, 165, 140, 0.7)' : undefined,
      }}
    >
      <Td>{row.phaseName}</Td>
      <Td align="right">
        <BreakdownTrigger
          value={formatHrs(row.total.laborHrs)}
          breakdown={laborBreakdown(row)}
        />
      </Td>
      <Td align="right">
        <BreakdownTrigger
          value={formatRange(row.total.costRange)}
          breakdown={costBreakdown(row)}
        />
      </Td>
    </tr>
  );
}

/**
 * Per-cell trigger that exposes the four-line per-program breakdown via
 * the design-system `Tooltip` primitive (role="tooltip" + aria-describedby
 * + keyboard focus). Replaces the native `title` attribute (Slice 8-F)
 * for touch-device + screen-reader parity.
 */
function BreakdownTrigger({
  value,
  breakdown,
}: {
  value: string;
  breakdown: string;
}) {
  const lines = breakdown.split('\n');
  return (
    <Tooltip
      position="top"
      content={
        <div style={{ fontSize: 11, lineHeight: 1.45, whiteSpace: 'nowrap' }}>
          {lines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      }
    >
      <span tabIndex={0} style={{ outline: 'none' }}>
        {value}
      </span>
    </Tooltip>
  );
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <th
      scope="col"
      style={{
        padding: '6px 8px',
        textAlign: align ?? 'left',
        fontWeight: 600,
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'rgba(180, 165, 140, 0.65)',
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
}) {
  return (
    <td
      style={{
        padding: '6px 8px',
        textAlign: align ?? 'left',
        verticalAlign: 'top',
      }}
    >
      {children}
    </td>
  );
}

function formatHrs(hrs: number): string {
  if (hrs === 0) return '–';
  if (hrs < 1) return `${hrs.toFixed(2)} hr`;
  return `${hrs.toFixed(1)} hr`;
}

function formatRange(range: { low: number; mid: number; high: number }): string {
  if (range.low === 0 && range.mid === 0 && range.high === 0) return '–';
  // Degenerate band (cover-crop only) → single value.
  if (range.low === range.high) {
    return `$${Math.round(range.mid).toLocaleString()}`;
  }
  return formatUsdRange(range.low, range.high);
}

function laborBreakdown(row: PhaseCashflowRow): string {
  return [
    `Cover-crop: ${formatHrs(row.coverCrop.laborHrs)}`,
    `Habitat: ${formatHrs(row.habitatFeature.laborHrs)}`,
    `Agroforestry: ${formatHrs(row.agroforestry.laborHrs)}`,
    `Tree-planting: ${formatHrs(row.treePlanting.laborHrs)}`,
  ].join('\n');
}

function costBreakdown(row: PhaseCashflowRow): string {
  return [
    `Cover-crop: ${formatRange(row.coverCrop.costRange)}`,
    `Habitat: ${formatRange(row.habitatFeature.costRange)}`,
    `Agroforestry: ${formatRange(row.agroforestry.costRange)}`,
    `Tree-planting: ${formatRange(row.treePlanting.costRange)}`,
  ].join('\n');
}

// Silence "unused" warnings for re-exported helper types.
export type { ProgramSubtotal };
