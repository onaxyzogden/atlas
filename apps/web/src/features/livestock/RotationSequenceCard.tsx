/**
 * RotationSequenceCard — read-only audit surface for Sub-project B (Task 3).
 *
 * Consumes the pure projection math (`rotationSequenceMath`), the isolated
 * persist slice (`rotationPlanStore`), and the carrying-capacity helpers
 * (`livestockAnalysis`) to render a forward-dated move calendar, a
 * rest-compliance roll-up, and non-blocking overstocking advisories.
 *
 * Strictly presentational: no store writes, no save gate, no mutating
 * buttons. The editable companion ("Rotation plan" card) is a separate
 * later task and is intentionally NOT built here.
 */

import { useMemo } from 'react';
import { useLivestockStore, type Paddock } from '../../store/livestockStore.js';
import { useRotationPlanStore } from '../../store/rotationPlanStore.js';
import {
  projectRotationSequence,
  type MoveCalendarEntry,
} from './rotationSequenceMath.js';
import {
  computeOvergrazingRisk,
  computePaddockRecommendedStocking,
  type RiskLevel,
} from './livestockAnalysis.js';
import css from './RotationSequenceCard.module.css';

interface RotationSequenceCardProps {
  projectId: string;
}

interface OverstockRow {
  paddockId: string;
  paddockName: string;
  risk: RiskLevel['risk'];
  ratio: number;
}

export default function RotationSequenceCard({ projectId }: RotationSequenceCardProps) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );

  const plan = useRotationPlanStore((s) => s.byProject[projectId] ?? null);

  const startDateISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const projection = useMemo(
    () => projectRotationSequence(paddocks, plan, startDateISO),
    [paddocks, plan, startDateISO],
  );

  // Calendar grouped by cellGroup: 'ungrouped' sorts last, otherwise
  // localeCompare; entries within a group ordered by sequenceOrder.
  const groupedCalendar = useMemo(() => {
    const map = new Map<string, MoveCalendarEntry[]>();
    for (const entry of projection.calendar) {
      const list = map.get(entry.cellGroup) ?? [];
      list.push(entry);
      map.set(entry.cellGroup, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    }
    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === 'ungrouped') return 1;
      if (b === 'ungrouped') return -1;
      return a.localeCompare(b);
    });
  }, [projection.calendar]);

  const overstocked = useMemo<OverstockRow[]>(() => {
    const rows: OverstockRow[] = [];
    for (const p of paddocks) {
      const rec = computePaddockRecommendedStocking(p);
      const level = computeOvergrazingRisk(p, rec);
      if (level.risk === 'moderate' || level.risk === 'high') {
        rows.push({
          paddockId: p.id,
          paddockName: p.name,
          risk: level.risk,
          ratio: level.ratio,
        });
      }
    }
    return rows;
  }, [paddocks]);

  if (paddocks.length === 0) {
    return (
      <section className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Rotation Sequence</h3>
            <p className={css.cardHint}>
              Forward-dated move calendar derived from the rotation plan.
            </p>
          </div>
          <span className={css.modeBadge}>Read-only</span>
        </div>
        <div className={css.empty}>No paddocks in this project yet.</div>
      </section>
    );
  }

  const hasPlan = plan != null && plan.cells.length > 0;

  if (!hasPlan) {
    return (
      <section className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Rotation Sequence</h3>
            <p className={css.cardHint}>
              Forward-dated move calendar derived from the rotation plan.
            </p>
          </div>
          <span className={css.modeBadge}>Read-only</span>
        </div>
        <div className={css.empty}>
          No rotation plan yet {'—'} build a sequence in the companion
          {' “'}Rotation plan{'”'} card to project the move calendar
          and rest-compliance roll-up here.
        </div>
      </section>
    );
  }

  return (
    <section className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Rotation Sequence</h3>
          <p className={css.cardHint}>
            Forward-dated move calendar projected from the rotation plan against
            species rest requirements. This is an audit view {'—'} edit the
            sequence in the companion {'“'}Rotation plan{'”'} card.
          </p>
        </div>
        <span className={css.modeBadge}>Read-only</span>
      </div>

      {/* Headline rest-compliance */}
      <div className={css.headline}>
        <span className={css.headlineNumber}>{projection.restCompliancePct}%</span>
        <span className={css.headlineLabel}>
          Paddocks meeting species rest requirement
        </span>
      </div>

      {/* Forward move calendar grouped by cell */}
      {groupedCalendar.map(([groupName, entries]) => {
        const groupLabel = groupName === 'ungrouped' ? 'Ungrouped' : groupName;
        return (
          <div key={groupName} className={css.groupBlock}>
            <div className={css.groupHead}>
              <span className={css.groupName}>{groupLabel}</span>
              <span className={css.groupMeta}>
                {entries.length} move{entries.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className={css.moveList}>
              {entries.map((e) => (
                <div key={`${e.cellGroup}-${e.paddockId}-${e.sequenceOrder}`} className={css.moveRow}>
                  <div className={css.moveMain}>
                    <span className={css.paddockName}>{e.paddockName}</span>
                    <span className={css.moveDates}>
                      {e.moveInDateISO} {'→'} {e.moveOutDateISO}
                    </span>
                  </div>
                  <div className={css.moveMeta}>
                    <span>{e.grazeDays}d graze</span>
                    <span className={css.metaDot}>{'·'}</span>
                    <span>{e.restDaysUntilNextGraze}d rest until next graze</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Per-paddock rest-compliance rows */}
      <div className={css.groupBlock}>
        <div className={css.groupHead}>
          <span className={css.groupName}>Rest compliance</span>
          <span className={css.groupMeta}>
            {projection.restCompliance.length} paddock
            {projection.restCompliance.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className={css.moveList}>
          {projection.restCompliance.map((r) => (
            <div key={r.paddockId} className={css.complianceRow}>
              <span className={css.paddockName}>{r.paddockName}</span>
              <span className={css.complianceMeta}>
                {r.plannedRestDays}d planned {'·'} {r.requiredRestDays}d
                required
              </span>
              <span
                className={`${css.complianceBadge} ${
                  r.compliant ? css.badgeGood : css.badgeWarn
                }`}
              >
                {r.compliant ? 'Compliant' : 'Short'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Non-blocking carrying-capacity advisories */}
      <div className={css.groupBlock}>
        <div className={css.groupHead}>
          <span className={css.groupName}>Carrying capacity</span>
          <span className={css.groupMeta}>advisory only</span>
        </div>
        {overstocked.length === 0 ? (
          <div className={css.advisoryClear}>
            No overstocking detected against recommended density.
          </div>
        ) : (
          <div className={css.moveList}>
            {overstocked.map((o) => (
              <div key={o.paddockId} className={css.advisoryRow}>
                <span className={css.advisoryText}>
                  {o.paddockName} {'—'} stocking {'~'}
                  {o.ratio.toFixed(1)}
                  {'×'} recommended ({o.risk})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={css.assumption}>
        Calendar dates assume each cell group{'’'}s sequence starts today
        and advances by planned graze days. Rest compliance compares planned
        rest (sum of other cells{'’'} graze in the group) against species
        recovery requirements. Carrying-capacity notes are advisory and never
        block the schedule.
      </div>
    </section>
  );
}
