/**
 * RotationAdherenceCard — B3 plan-vs-actual rotation adherence audit surface.
 *
 * Composes the pure `rotationAdherence` engine over the isolated
 * rotation-plan slice (`rotationPlanStore`) and the livestock move log
 * (`livestockMoveLogStore`) to render a single health light, a
 * paddocks-tracked headline, and a ranked, deterministic list of
 * agronomic drift recommendations (overgrazing, under-rested re-entry,
 * short rest, early move, unplanned paddock).
 *
 * Strictly presentational: no store writes, no save gate, no mutating
 * buttons, no navigation. The editable companion ("Rotation plan" card)
 * is a separate task and is intentionally NOT built here.
 *
 * Covenant: strictly agronomic / ecological operating analytics. No
 * riba / gharar / financing / capital / investor / yield framing — only
 * sward, forage, graze, rest and recovery language.
 */

import { useMemo } from 'react';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useRotationPlanStore } from '../../store/rotationPlanStore.js';
import { useLivestockMoveLogStore } from '../../store/livestockMoveLogStore.js';
import {
  computeRotationAdherence,
  type RotationAdherence,
} from './rotationAdherence.js';
import css from './RotationAdherenceCard.module.css';

interface RotationAdherenceCardProps {
  projectId: string;
}

const LIGHT_LABEL = { ok: 'OK', warn: 'Warning', alert: 'Alert' } as const;

const LIGHT_CLASS = {
  ok: css.lightOk,
  warn: css.lightWarn,
  alert: css.lightAlert,
} as const;

/**
 * Three-way severity → badge class map. `high` lights `.badgeAlert`
 * (coral/red), `med` lights `.badgeWarn` (amber), `low` lights
 * `.badgeGood` (green). Distinct colours preserve the engine's
 * 3-tier severity signal rather than collapsing high+med onto one
 * badge.
 */
const SEVERITY_CLASS = {
  high: css.badgeAlert,
  med: css.badgeWarn,
  low: css.badgeGood,
} as const;

export default function RotationAdherenceCard({
  projectId,
}: RotationAdherenceCardProps) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const plan = useRotationPlanStore((s) => s.byProject[projectId] ?? null);
  const moves = useLivestockMoveLogStore((s) => s.events);

  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );

  const adherence: RotationAdherence = useMemo(
    () =>
      computeRotationAdherence({
        paddocks,
        plan,
        moves,
        now: new Date().toISOString(),
      }),
    [paddocks, plan, moves],
  );

  if (paddocks.length === 0) {
    return (
      <section className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Rotation adherence</h3>
            <p className={css.cardHint}>
              Plan-vs-actual audit {'—'} compares logged paddock moves against
              the rotation plan and surfaces ranked agronomic drift.
            </p>
          </div>
          <span className={css.modeBadge}>Read-only</span>
        </div>
        <div className={css.empty}>No paddocks in this project yet.</div>
      </section>
    );
  }

  const lightLabel = LIGHT_LABEL[adherence.light];
  const lightClass = LIGHT_CLASS[adherence.light];

  if (adherence.recommendations.length === 0) {
    return (
      <section className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Rotation adherence</h3>
            <p className={css.cardHint}>
              Plan-vs-actual audit {'—'} compares logged paddock moves against
              the rotation plan and surfaces ranked agronomic drift.
            </p>
          </div>
          <span className={css.modeBadge}>Read-only</span>
        </div>
        <div className={css.headline}>
          <span className={`${css.headlineNumber} ${lightClass}`}>
            {lightLabel}
          </span>
          <span className={css.headlineLabel}>Rotation health</span>
        </div>
        <div className={css.empty}>
          On track {'—'} logged moves match the rotation plan.
        </div>
      </section>
    );
  }

  const c = adherence.counts;

  return (
    <section className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Rotation adherence</h3>
          <p className={css.cardHint}>
            Plan-vs-actual audit {'—'} compares logged paddock moves against
            the rotation plan and surfaces ranked agronomic drift.
          </p>
        </div>
        <span className={css.modeBadge}>Read-only</span>
      </div>

      <div className={css.headline}>
        <span className={`${css.headlineNumber} ${lightClass}`}>
          {lightLabel}
        </span>
        <span className={css.headlineLabel}>
          {c.paddocksTracked} paddock{c.paddocksTracked === 1 ? '' : 's'}{' '}
          tracked
        </span>
      </div>

      <div className={css.groupBlock}>
        <div className={css.groupHead}>
          <span className={css.groupName}>Recommended adjustments</span>
          <span className={css.groupMeta}>
            {adherence.recommendations.length} item
            {adherence.recommendations.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className={css.moveList}>
          {adherence.recommendations.map((r) => (
            <div
              key={r.id}
              className={css.recRow}
              data-testid="rec-row"
              data-severity={r.severity}
            >
              <span className={`${css.recSev} ${SEVERITY_CLASS[r.severity]}`}>
                [{r.severity.toUpperCase()}]
              </span>
              <span className={css.recMsg}>{r.message}</span>
            </div>
          ))}
        </div>
      </div>

      <div className={css.assumption}>
        Counts {'—'} overgrazed {c.overgrazed} {'·'} under-rested{' '}
        {c.underRestedReentry} {'·'} short-rest {c.shortRest} {'·'}{' '}
        early-move {c.earlyMove} {'·'} unplanned {c.unplanned}. Recommendations
        rank by severity then frequency; occupancy is derived from logged
        move-in legs closed by their linked move-out (open intervals run to
        now). Rest requirements reuse species recovery floors from the
        rotation sequence math {'—'} this surface never re-derives recovery.
      </div>
    </section>
  );
}
