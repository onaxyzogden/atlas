/**
 * RegenerationPlanCard — the Plan-stage strategy home for reviving a
 * troubled zone (iḥyāʾ al-mawāt) into productive pasture / silvopasture.
 *
 * Plans are *authored in Observe* (the "Start regeneration plan" CTA snapshots
 * the baseline); this card is where the steward then shapes the pathway:
 * pick the target state, select regeneration methods, tune the recovery
 * thresholds, anchor the start date, and read the multi-year timeline with an
 * advisory earliest-livestock date.
 *
 * It is presentation glue over already-tested pure logic:
 *   • buildRegenerationTimeline (projection math — unit-tested)
 *   • evaluateRegenerationReadiness (@ogden/shared — unit-tested)
 *   • regenerationPlanStore reducers (unit-tested)
 * The decisive readiness rule is steward-sovereign and lives in the shared
 * evaluator (ready === !!stewardReadinessConfirmedAt); the projected date here
 * only advises. Confirming readiness — the Act-stage covenant judgement that
 * flips the gate and unlocks livestock for the zone — is surfaced per plan
 * below; it records the steward's on-the-ground reading, never a date.
 *
 * Selector stability: subscribes the raw `plans` array and filters via
 * useMemo — never calls the array-returning getProjectPlans inside a Zustand
 * selector (wiki/decisions/2026-04-26-zustand-selector-stability.md).
 */
import { useMemo } from 'react';
import { evaluateRegenerationReadiness } from '@ogden/shared/regeneration';
import {
  useRegenerationPlanStore,
  type RegenerationPlan,
  type RegenTargetState,
  type SilvopastureCanopyConfig,
} from '../../store/regenerationPlanStore.js';
import type { GroundCoverState, SuccessionStage } from '../../store/zoneStore.js';
import {
  REGENERATION_METHODS,
} from '../../v3/plan/data/regenerationPathway.js';
import {
  buildRegenerationTimeline,
  buildCanopyTrack,
  type TimelineSegment,
  type CanopyTrackPoint,
} from './regenerationTimeline.js';
import { selectActivePlans } from './regenerationGate.js';
import css from './RegenerationPlanCard.module.css';

interface Props {
  projectId: string;
}

const TARGETS: { value: RegenTargetState; label: string }[] = [
  { value: 'pasture', label: 'Pasture' },
  { value: 'silvopasture', label: 'Silvopasture' },
];

const GROUND_COVER_OPTIONS: GroundCoverState[] = [
  'barren',
  'bare-soil',
  'sparse-grasses',
  'thriving-grasses',
  'sand',
  'rocky',
  'forest',
  'wetland',
];

const SUCCESSION_OPTIONS: SuccessionStage[] = [
  'disturbed',
  'pioneer',
  'mid',
  'late',
  'climax',
];

const CANOPY_SPECIES: { value: string; label: string }[] = [
  { value: 'oak-tree', label: 'Oak' },
  { value: 'pine-tree', label: 'Pine' },
  { value: 'apple-tree', label: 'Apple' },
  { value: 'shrub', label: 'Shrub' },
];

const DEFAULT_CANOPY: SilvopastureCanopyConfig = {
  speciesId: 'oak-tree',
  targetCanopyM: 6,
  plantingYearOffset: 0,
};

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return iso.slice(0, 10);
}

function readinessLabel(plan: RegenerationPlan): {
  text: string;
  tone: 'good' | 'fair' | 'idle';
} {
  if (plan.stewardReadinessConfirmedAt) {
    return { text: 'READY — STEWARD CONFIRMED', tone: 'good' };
  }
  if (plan.readinessOverride) {
    return { text: 'OVERRIDE RECORDED', tone: 'fair' };
  }
  return { text: 'NOT YET CONFIRMED', tone: 'idle' };
}

export default function RegenerationPlanCard({ projectId }: Props) {
  const allPlans = useRegenerationPlanStore((s) => s.plans);
  const activePlanIdByZone = useRegenerationPlanStore(
    (s) => s.activePlanIdByZone,
  );
  const updatePlan = useRegenerationPlanStore((s) => s.updatePlan);
  const startPathway = useRegenerationPlanStore((s) => s.startPathway);
  const confirmReadiness = useRegenerationPlanStore((s) => s.confirmReadiness);
  const setActivePlan = useRegenerationPlanStore((s) => s.setActivePlan);
  const createPlan = useRegenerationPlanStore((s) => s.createPlan);

  const plans = useMemo(
    () => allPlans.filter((p) => p.projectId === projectId),
    [allPlans, projectId],
  );

  // Group plans by zone (creation order within a zone) and resolve which
  // plan is active per zone — the active plan is the one every gate-bearing
  // surface keys on; the rest are scenarios/history.
  const zoneGroups = useMemo(() => {
    const byZone = new Map<string, RegenerationPlan[]>();
    for (const p of plans) {
      const list = byZone.get(p.zoneId);
      if (list) list.push(p);
      else byZone.set(p.zoneId, [p]);
    }
    const activeIds = new Set(
      selectActivePlans(plans, activePlanIdByZone).map((p) => p.id),
    );
    return Array.from(byZone.entries()).map(([zoneId, zonePlans]) => ({
      zoneId,
      zonePlans,
      activeIds,
    }));
  }, [plans, activePlanIdByZone]);

  function startAnotherPlan(zoneId: string) {
    const zonePlans = plans.filter((p) => p.zoneId === zoneId);
    if (zonePlans.length === 0) return;
    // A re-plan / alternative pathway starts from the same baseline
    // snapshot (where the land began); it is created as a scenario —
    // createPlan keeps the existing active plan since the zone already
    // has one.
    const seed = zonePlans.reduce((a, b) =>
      a.createdAt >= b.createdAt ? a : b,
    );
    createPlan({
      projectId,
      zoneId,
      baseline: { ...seed.baseline },
      targetState: seed.targetState,
    });
  }

  if (plans.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.head}>
          <div>
            <h3 className={css.title}>Regeneration Plan</h3>
            <p className={css.hint}>
              Troubled ground (barren, compacted, disturbed succession) cannot
              carry livestock until it is revived — often over several years.
              Start a regeneration plan from the <strong>Observe</strong> stage
              when a troubled zone is flagged; it will appear here for you to
              shape the pathway.
            </p>
          </div>
          <span className={`${css.badge} ${css.badgeIdle}`}>NO PLANS</span>
        </div>
        <div className={css.empty}>
          No regeneration plans for this project yet.
        </div>
      </div>
    );
  }

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Regeneration Plan</h3>
          <p className={css.hint}>
            Shape the multi-year pathway from troubled ground to productive
            pasture. The earliest-livestock date is{' '}
            <strong>advisory only</strong> — the land is released when you
            confirm observed readiness on the ground in the{' '}
            <strong>Act</strong> stage, never by a projected date.
          </p>
        </div>
        <span className={`${css.badge} ${css.badgeIdle}`}>
          {plans.length} {plans.length === 1 ? 'PLAN' : 'PLANS'}
        </span>
      </div>

      {zoneGroups.map(({ zoneId, zonePlans, activeIds }) => (
        <div key={zoneId} className={css.zoneGroup}>
          <div className={css.zoneGroupHead}>
            <span className={css.zoneName}>Zone {zoneId}</span>
            <span className={css.muted}>
              {zonePlans.length}{' '}
              {zonePlans.length === 1 ? 'plan' : 'plans'}
            </span>
            <button
              type="button"
              className={css.startBtn}
              onClick={() => startAnotherPlan(zoneId)}
            >
              Start another plan for this zone
            </button>
          </div>
          <ul className={css.list}>
            {zonePlans.map((plan) => (
              <PlanBlock
                key={plan.id}
                plan={plan}
                isActive={activeIds.has(plan.id)}
                onSetActive={setActivePlan}
                onUpdate={updatePlan}
                onStart={startPathway}
                onConfirm={confirmReadiness}
              />
            ))}
          </ul>
        </div>
      ))}

      <p className={css.footnote}>
        The spine (ripping → cover-crop → amendment) sets the critical path to
        productive use. Managed grazing and biochar run concurrently inside the
        cover-crop window and never extend the total. Silvopasture adds a tree
        canopy track that, by design, does not gate grazing in v1.
      </p>
    </div>
  );
}

function PlanBlock({
  plan,
  isActive,
  onSetActive,
  onUpdate,
  onStart,
  onConfirm,
}: {
  plan: RegenerationPlan;
  isActive: boolean;
  onSetActive: (zoneId: string, planId: string) => void;
  onUpdate: (id: string, updates: Partial<RegenerationPlan>) => void;
  onStart: (id: string, at?: string) => void;
  onConfirm: (id: string, at?: string) => void;
}) {
  const timeline = useMemo(
    () => buildRegenerationTimeline(plan.pathwayMethodIds),
    [plan.pathwayMethodIds],
  );

  const canopy =
    plan.targetState === 'silvopasture' ? plan.silvopastureCanopy : undefined;

  // Canopy age is computed here (impure: today) and handed to the pure
  // evaluator as a plain number, so the evaluator stays deterministic.
  const canopyInput = useMemo(() => {
    if (!canopy || !plan.startedAt) return undefined;
    const yearsSinceStart =
      (Date.now() - Date.parse(plan.startedAt)) / MS_PER_YEAR;
    const canopyAgeYears = Math.max(
      0,
      yearsSinceStart - canopy.plantingYearOffset,
    );
    return {
      speciesId: canopy.speciesId,
      targetCanopyM: canopy.targetCanopyM,
      canopyAgeYears,
    };
  }, [canopy, plan.startedAt]);

  const readiness = useMemo(
    () =>
      evaluateRegenerationReadiness({
        thresholds: {
          groundCover: plan.thresholds.groundCover,
          minSuccessionStage: plan.thresholds.minSuccessionStage,
        },
        observed: {
          groundCover: plan.baseline.groundCover,
          successionStage: plan.baseline.successionStage,
        },
        pathwayDurationYears: timeline.totalYears,
        startedAt: plan.startedAt,
        stewardConfirmedAt: plan.stewardReadinessConfirmedAt,
        silvopastureCanopy: canopyInput,
      }),
    [plan.thresholds, plan.baseline, plan.startedAt, plan.stewardReadinessConfirmedAt, timeline.totalYears, canopyInput],
  );

  const canopyTrack = useMemo(
    () =>
      canopy
        ? buildCanopyTrack(canopy, timeline.totalYears).points
        : [],
    [canopy, timeline.totalYears],
  );

  const rl = readinessLabel(plan);

  function toggleMethod(methodId: string, on: boolean) {
    const next = REGENERATION_METHODS.filter((m) =>
      m.id === methodId
        ? on
        : plan.pathwayMethodIds.includes(m.id),
    ).map((m) => m.id);
    onUpdate(plan.id, { pathwayMethodIds: next });
  }

  return (
    <li className={css.block}>
      <div className={css.blockHead}>
        <div className={css.blockMeta}>
          {isActive ? (
            <span className={`${css.stateTag} ${css.tag_good}`}>ACTIVE</span>
          ) : (
            <button
              type="button"
              className={css.setActiveBtn}
              onClick={() => onSetActive(plan.zoneId, plan.id)}
            >
              Scenario · Set active
            </button>
          )}
          <span className={css.targetTag}>{plan.targetState}</span>
        </div>
        <span className={`${css.stateTag} ${css[`tag_${rl.tone}`]}`}>
          {rl.text}
        </span>
      </div>

      <div className={css.baseline}>
        Baseline @ {fmtDate(plan.baseline.capturedAt)} ·{' '}
        cover <strong>{plan.baseline.groundCover ?? 'unknown'}</strong> ·{' '}
        succession <strong>{plan.baseline.successionStage ?? 'unknown'}</strong>{' '}
        <span className={css.muted}>({plan.baseline.source})</span>
      </div>

      <div className={css.controls}>
        <label className={css.field}>
          <span className={css.fieldLabel}>Target</span>
          <select
            className={css.select}
            value={plan.targetState}
            onChange={(e) =>
              onUpdate(plan.id, {
                targetState: e.target.value as RegenTargetState,
              })
            }
          >
            {TARGETS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className={css.field}>
          <span className={css.fieldLabel}>Recovered cover</span>
          <select
            className={css.select}
            value={plan.thresholds.groundCover}
            onChange={(e) =>
              onUpdate(plan.id, {
                thresholds: {
                  ...plan.thresholds,
                  groundCover: e.target.value as GroundCoverState,
                },
              })
            }
          >
            {GROUND_COVER_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        <label className={css.field}>
          <span className={css.fieldLabel}>Min. succession</span>
          <select
            className={css.select}
            value={plan.thresholds.minSuccessionStage}
            onChange={(e) =>
              onUpdate(plan.id, {
                thresholds: {
                  ...plan.thresholds,
                  minSuccessionStage: e.target.value as SuccessionStage,
                },
              })
            }
          >
            {SUCCESSION_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <div className={css.field}>
          <span className={css.fieldLabel}>Pathway started</span>
          {plan.startedAt ? (
            <span className={css.startedValue}>
              {fmtDate(plan.startedAt)}
            </span>
          ) : (
            <button
              type="button"
              className={css.startBtn}
              onClick={() => onStart(plan.id)}
            >
              Start pathway
            </button>
          )}
        </div>
      </div>

      <div className={css.methods}>
        <span className={css.fieldLabel}>Pathway methods</span>
        <div className={css.methodGrid}>
          {REGENERATION_METHODS.map((m) => {
            const checked = plan.pathwayMethodIds.includes(m.id);
            return (
              <label
                key={m.id}
                className={`${css.method} ${checked ? css.methodOn : ''}`}
                title={m.description}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => toggleMethod(m.id, e.target.checked)}
                />
                <span className={css.methodName}>{m.name}</span>
                <span className={css.methodDur}>{m.durationYears}y</span>
              </label>
            );
          })}
        </div>
      </div>

      {timeline.segments.length > 0 ? (
        <TimelineSvg
          segments={timeline.segments}
          totalYears={timeline.totalYears}
          productiveYearOffset={timeline.productiveYearOffset}
          canopyTrack={canopyTrack}
          canopyTargetM={canopy?.targetCanopyM ?? 0}
        />
      ) : (
        <div className={css.emptyTimeline}>
          Select at least one pathway method to project a timeline.
        </div>
      )}

      <div className={css.projected}>
        {plan.startedAt ? (
          <>
            Earliest livestock (advisory):{' '}
            <strong>{fmtDate(readiness.projectedReadyDate)}</strong> · spine{' '}
            {timeline.totalYears}y
          </>
        ) : (
          <>Start the pathway to project an earliest-livestock date.</>
        )}
        {' · '}
        observed thresholds{' '}
        <strong>
          {readiness.thresholdsObservedMet ? 'met' : 'not yet met'}
        </strong>{' '}
        <span className={css.muted}>(advisory — never gates)</span>
      </div>

      {plan.stewardReadinessConfirmedAt ? (
        <div className={css.silvoNote}>
          Readiness confirmed {fmtDate(plan.stewardReadinessConfirmedAt)} —
          livestock <strong>unlocked</strong> for this zone.
        </div>
      ) : (
        <div className={css.silvoNote}>
          <button
            type="button"
            className={css.startBtn}
            onClick={() => onConfirm(plan.id)}
          >
            Confirm readiness — unlock livestock
          </button>
          <div className={css.muted} style={{ marginTop: 6 }}>
            Your on-the-ground judgement that the land has recovered. This
            opens the gate so livestock may be placed on this zone — the
            projected date above is advisory only.
          </div>
        </div>
      )}

      {plan.targetState === 'silvopasture' && (
        <div className={css.silvoNote}>
          {canopy ? (
            <>
              <div className={css.controls}>
                <label className={css.field}>
                  <span className={css.fieldLabel}>Canopy species</span>
                  <select
                    className={css.select}
                    value={canopy.speciesId}
                    onChange={(e) =>
                      onUpdate(plan.id, {
                        silvopastureCanopy: {
                          ...canopy,
                          speciesId: e.target.value,
                        },
                      })
                    }
                  >
                    {CANOPY_SPECIES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={css.field}>
                  <span className={css.fieldLabel}>Target canopy (m)</span>
                  <input
                    className={css.select}
                    type="number"
                    min={0}
                    step={0.5}
                    value={canopy.targetCanopyM}
                    onChange={(e) =>
                      onUpdate(plan.id, {
                        silvopastureCanopy: {
                          ...canopy,
                          targetCanopyM: Number(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </label>
                <label className={css.field}>
                  <span className={css.fieldLabel}>Planting year offset</span>
                  <input
                    className={css.select}
                    type="number"
                    min={0}
                    step={1}
                    value={canopy.plantingYearOffset}
                    onChange={(e) =>
                      onUpdate(plan.id, {
                        silvopastureCanopy: {
                          ...canopy,
                          plantingYearOffset: Math.max(
                            0,
                            Math.floor(Number(e.target.value) || 0),
                          ),
                        },
                      })
                    }
                  />
                </label>
              </div>
              <div className={css.muted} style={{ marginTop: 6 }}>
                {readiness.canopyAdvisory ? (
                  <>
                    Canopy{' '}
                    <strong>
                      {Math.round(readiness.canopyAdvisory.percentToTarget)}%
                    </strong>{' '}
                    of target (
                    {readiness.canopyAdvisory.currentCanopyM.toFixed(1)} m /{' '}
                    {readiness.canopyAdvisory.targetCanopyM.toFixed(1)} m) —
                    advisory, never gates.
                  </>
                ) : (
                  <>
                    Start the pathway to project canopy progress. Canopy is
                    advisory only and never gates grazing.
                  </>
                )}
              </div>
            </>
          ) : (
            <button
              type="button"
              className={css.startBtn}
              onClick={() =>
                onUpdate(plan.id, { silvopastureCanopy: { ...DEFAULT_CANOPY } })
              }
            >
              Add canopy layer
            </button>
          )}
        </div>
      )}
    </li>
  );
}

function TimelineSvg({
  segments,
  totalYears,
  productiveYearOffset,
  canopyTrack,
  canopyTargetM,
}: {
  segments: TimelineSegment[];
  totalYears: number;
  productiveYearOffset: number;
  canopyTrack: CanopyTrackPoint[];
  canopyTargetM: number;
}) {
  const LABEL_W = 134;
  const YEAR_W = 84;
  const ROW_H = 24;
  const ROW_GAP = 8;
  const AXIS_TOP = 22;
  const AXIS_BOT = 26;
  const CANOPY_BAND_H = canopyTrack.length > 0 ? 56 : 0;

  const span = Math.max(totalYears, 1);
  const chartW = LABEL_W + span * YEAR_W + 16;
  const segmentsBottom =
    AXIS_TOP + segments.length * (ROW_H + ROW_GAP);
  const chartH = segmentsBottom + CANOPY_BAND_H + AXIS_BOT;

  const xForYear = (y: number) => LABEL_W + y * YEAR_W;
  const productiveX = xForYear(productiveYearOffset);

  // Advisory canopy curve drawn in its own band below the spine. Scaled to
  // the larger of the target or the peak sampled canopy so the target line
  // is always visible. Never gates — purely informational.
  const canopyScaleMax = Math.max(
    canopyTargetM,
    ...canopyTrack.map((p) => p.canopyM),
    0.001,
  );
  const canopyBandTop = segmentsBottom + 8;
  const canopyBandBot = canopyBandTop + CANOPY_BAND_H - 16;
  const yForCanopy = (m: number) =>
    canopyBandBot -
    (Math.min(m, canopyScaleMax) / canopyScaleMax) *
      (canopyBandBot - canopyBandTop);
  const canopyPolyline = canopyTrack
    .map((p) => `${xForYear(p.year)},${yForCanopy(p.canopyM)}`)
    .join(' ');

  return (
    <svg
      className={css.timeline}
      viewBox={`0 0 ${chartW} ${chartH}`}
      role="img"
      aria-label={`Regeneration timeline: ${totalYears} years to productive use across ${segments.length} methods`}
    >
      {/* Year gridlines + labels */}
      {Array.from({ length: totalYears + 1 }, (_, g) => (
        <g key={`grid-${g}`}>
          <line
            x1={xForYear(g)}
            y1={AXIS_TOP}
            x2={xForYear(g)}
            y2={chartH - AXIS_BOT}
            className={css.grid}
          />
          <text
            x={xForYear(g)}
            y={14}
            className={css.yearLabel}
            textAnchor="middle"
          >
            Y{g}
          </text>
        </g>
      ))}

      {/* Productive marker */}
      <line
        x1={productiveX}
        y1={AXIS_TOP - 6}
        x2={productiveX}
        y2={chartH - AXIS_BOT + 4}
        className={css.productiveLine}
      />
      <text
        x={productiveX}
        y={chartH - 8}
        className={css.productiveLabel}
        textAnchor="middle"
      >
        ▲ Productive · Y{productiveYearOffset}
      </text>

      {/* Segments */}
      {segments.map((seg, i) => {
        const y = AXIS_TOP + i * (ROW_H + ROW_GAP);
        const x = xForYear(seg.startYear);
        const w = Math.max((seg.endYear - seg.startYear) * YEAR_W, 6);
        return (
          <g key={seg.id}>
            <text
              x={6}
              y={y + ROW_H / 2}
              className={css.segLabel}
              dominantBaseline="middle"
            >
              {seg.name.length > 22
                ? `${seg.name.slice(0, 21)}…`
                : seg.name}
            </text>
            <rect
              x={x}
              y={y}
              width={w}
              height={ROW_H}
              rx={4}
              className={
                seg.concurrent ? css.segConcurrent : css.segSpine
              }
            />
            <text
              x={x + w / 2}
              y={y + ROW_H / 2}
              className={css.segDur}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {seg.durationYears}y{seg.concurrent ? ' ∥' : ''}
            </text>
          </g>
        );
      })}

      {/* Advisory canopy track (silvopasture) — never gates grazing. */}
      {canopyTrack.length > 0 && (
        <g>
          <line
            x1={LABEL_W}
            y1={yForCanopy(canopyTargetM)}
            x2={xForYear(totalYears)}
            y2={yForCanopy(canopyTargetM)}
            className={css.grid}
            strokeDasharray="4 3"
          />
          <text
            x={6}
            y={(canopyBandTop + canopyBandBot) / 2}
            className={css.segLabel}
            dominantBaseline="middle"
          >
            Canopy (advisory)
          </text>
          <polyline
            points={canopyPolyline}
            fill="none"
            stroke="rgba(150, 200, 140, 0.85)"
            strokeWidth={2}
          />
        </g>
      )}
    </svg>
  );
}
