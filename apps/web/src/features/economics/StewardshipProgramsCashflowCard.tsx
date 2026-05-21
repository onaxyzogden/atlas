/**
 * Slice 7 (S7-B) of the 2026-05-21 habitat-feature unification —
 * read-only per-phase cashflow card combining cover-crop seeding +
 * habitat-feature install economics.
 *
 * Consumes `computeStewardshipProgramsCashflow` (S7-A pure helper) and
 * renders a phase × program table: rows ordered by `BuildPhase.order`,
 * unphased bucket last as "Unscheduled". Columns show each program's
 * `{laborHrs, costRange}` plus the combined total. Empty-project copy
 * mirrors the rest of the EconomicsPanel ("Place habitat features or
 * cover-crop windows to populate the cashflow").
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
import { formatUsdRange } from '../../lib/formatRange.js';
import {
  computeStewardshipProgramsCashflow,
  UNPHASED_CASHFLOW_BUCKET_ID,
  type PhaseCashflowRow,
} from './stewardshipProgramsCashflow.js';
import p from '../../styles/panel.module.css';

interface Props {
  projectId: string;
}

export default function StewardshipProgramsCashflowCard({ projectId }: Props) {
  const items = useWorkItemStore((s) => s.items);
  const phases = usePhaseStore((s) => s.phases);
  const cropAreas = useCropStore((s) => s.cropAreas);
  const byProject = useLandDesignStore((s) => s.byProject);

  const rollup = useMemo(() => {
    const designElements = byProject[projectId] ?? [];
    return computeStewardshipProgramsCashflow({
      projectId,
      items,
      designElements,
      declaredPhases: phases,
      cropAreas,
    });
  }, [projectId, items, byProject, phases, cropAreas]);

  if (rollup.rows.length === 0) {
    return (
      <div className={p.card} aria-label="Stewardship Programs Cashflow">
        <h3 className={p.sectionLabel} style={{ margin: 0, marginBottom: 6 }}>
          Stewardship Programs Cashflow
        </h3>
        <div className={p.empty} style={{ padding: '12px 0', fontSize: 12 }}>
          Place habitat features or schedule cover-crop windows to populate
          the per-phase cashflow.
        </div>
      </div>
    );
  }

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
        Per-phase cover-crop seeding + habitat-feature install cost & labor.
        Low/mid/high reflects DIY-to-contracted variance on habitat installs;
        cover-crop seed cost is a flat per-acre figure projected into all
        three columns.
      </div>

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
            <Th align="right">Cover-crop labor</Th>
            <Th align="right">Cover-crop cost</Th>
            <Th align="right">Habitat labor</Th>
            <Th align="right">Habitat cost</Th>
            <Th align="right">Combined labor</Th>
            <Th align="right">Combined cost</Th>
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
            <Td>Total</Td>
            <Td align="right">{formatHrs(rollup.totals.coverCrop.laborHrs)}</Td>
            <Td align="right">{formatRange(rollup.totals.coverCrop.costRange)}</Td>
            <Td align="right">{formatHrs(rollup.totals.habitatFeature.laborHrs)}</Td>
            <Td align="right">{formatRange(rollup.totals.habitatFeature.costRange)}</Td>
            <Td align="right">{formatHrs(rollup.totals.combined.laborHrs)}</Td>
            <Td align="right">{formatRange(rollup.totals.combined.costRange)}</Td>
          </tr>
        </tbody>
      </table>
    </div>
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
      <Td align="right">{formatHrs(row.coverCrop.laborHrs)}</Td>
      <Td align="right">{formatRange(row.coverCrop.costRange)}</Td>
      <Td align="right">{formatHrs(row.habitatFeature.laborHrs)}</Td>
      <Td align="right">{formatRange(row.habitatFeature.costRange)}</Td>
      <Td align="right">{formatHrs(row.total.laborHrs)}</Td>
      <Td align="right">{formatRange(row.total.costRange)}</Td>
    </tr>
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
