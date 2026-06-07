/**
 * MaterialSubstitutionsCard — Plan Module 10 (Phasing & Budgeting),
 * sub-card 7/7.
 *
 * Rec #5 v1 of the Permaculture Scholar review 2026-04-28
 * (Holmgren P5 — Use & value renewable resources & services; P9 — Use
 * small & slow solutions). Surfaces biological-system alternatives for
 * each conventional cost line item in the project and lets the steward
 * toggle the substitution to write-through to
 * `financialStore.costOverrides`. The override flows through
 * `useFinancialModel` → `applyOverrides` so the total-investment and
 * mission-score readouts recompute reactively.
 *
 * **v1 scope.**
 *   - Cost is the only live-wired dimension. The override CostRange is
 *     `original × catalog.costMultiplier` (fractional).
 *   - `establishmentMonths` (years-to-function delta) and
 *     `missionUpliftEstimate` are *informational only*. Wiring into
 *     `cashflowEngine.ts` phase-shift and `missionScoring.ts` is the v2
 *     follow-up.
 *   - Catalog ships 8 cited pairs (backlog note: 10–15 is the v2 target).
 *
 * Algorithm per render:
 *   1. Read `useFinancialModel(projectId).costLineItems` (post-override
 *      values are already merged; we still need the *override-state*
 *      from the store directly to drive toggle UI).
 *   2. Walk each item; for each one resolve its source primitive via the
 *      matching feature store (paddock / path / utility / crop), then
 *      ask `matchSubstitution` for a catalog row.
 *   3. Render one row per substitutable item. Toggle = `setCostOverride`
 *      with the scaled `appliedCostRange` (ON) or `clearCostOverride`
 *      (OFF).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useLivestockStore } from '../../../../store/livestockStore.js';
import { usePathStore } from '../../../../store/pathStore.js';
import { useUtilityStore } from '../../../../store/utilityStore.js';
import { useCropStore } from '../../../../store/cropStore.js';
import { useFinancialStore } from '../../../../store/financialStore.js';
import { useFinancialModel } from '../../../../features/financial/hooks/useFinancialModel.js';
import type { CostLineItem, CostRange } from '../../../../features/financial/engine/types.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';
import {
  SUBSTITUTION_CATALOG,
  appliedCostRange,
  matchSubstitution,
  type Citation,
  type Primitive,
  type Substitution,
} from './substitutionCatalog.js';
import {
  REGION_MULTIPLIERS,
  ECO_UPLIFT_POINT_SCALE,
  ECO_UPLIFT_MAX_POINTS,
} from './materialSubstitutionMath.js';
import { REGION_LABELS } from '../../../../features/financial/engine/types.js';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

interface Row {
  item: CostLineItem;
  /** Original (unscaled) cost — read direct from the rawCosts; equals
   *  `item.cost` when no override is applied. */
  originalCost: CostRange;
  /** Scaled override CostRange the toggle would write. */
  appliedCost: CostRange;
  substitution: Substitution;
  isApplied: boolean;
}

function fmtUSD(n: number): string {
  if (Math.abs(n) >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

function fmtDelta(n: number): string {
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  return `${sign}${fmtUSD(Math.abs(n))}`;
}

function CitationTag({ c }: { c: Citation }) {
  return (
    <span
      className={styles.pill}
      title={c.source}
      style={{
        background: 'rgba(255,255,255,0.04)',
        color: 'rgba(232,220,200,0.7)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {c.kind} · {c.year}
    </span>
  );
}

export default function MaterialSubstitutionsCard({ project }: Props) {
  const model = useFinancialModel(project.id);
  const costOverrides = useFinancialStore((s) => s.costOverrides);
  const setCostOverride = useFinancialStore((s) => s.setCostOverride);
  const clearCostOverride = useFinancialStore((s) => s.clearCostOverride);
  const setSubstitutionMeta = useFinancialStore((s) => s.setSubstitutionMeta);
  const clearSubstitutionMeta = useFinancialStore((s) => s.clearSubstitutionMeta);
  const region = useFinancialStore((s) => s.region);
  const regionFactor = REGION_MULTIPLIERS[region] ?? 1;

  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allPaths = usePathStore((s) => s.paths);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allCrops = useCropStore((s) => s.cropAreas);

  /** Project-scoped sourceId → primitive map. */
  const primitiveById = useMemo(() => {
    const map = new Map<string, Primitive>();
    for (const p of allPaddocks) {
      if (p.projectId !== project.id) continue;
      map.set(p.id, { kind: 'paddock', fencing: p.fencing });
    }
    for (const p of allPaths) {
      if (p.projectId !== project.id) continue;
      map.set(p.id, { kind: 'path', type: p.type });
    }
    for (const u of allUtilities) {
      if (u.projectId !== project.id) continue;
      map.set(u.id, { kind: 'utility', type: u.type });
    }
    for (const c of allCrops) {
      if (c.projectId !== project.id) continue;
      map.set(c.id, { kind: 'crop', type: c.type });
    }
    return map;
  }, [project.id, allPaddocks, allPaths, allUtilities, allCrops]);

  const rows: Row[] = useMemo(() => {
    if (!model) return [];
    const out: Row[] = [];
    for (const item of model.costLineItems) {
      const primitive = primitiveById.get(item.sourceId) ?? null;
      const sub = matchSubstitution(item, primitive);
      if (!sub) continue;
      const override = costOverrides[item.id];
      const isApplied = Boolean(override);
      // `item.cost` already reflects the override post-merge. To recover the
      // original we divide back by the catalog multiplier when the override
      // is active. (Cheaper than re-running the cost engine.)
      const originalCost: CostRange = isApplied
        ? {
            low: Math.round(item.cost.low / Math.max(0.0001, sub.alternative.costMultiplier.low)),
            mid: Math.round(item.cost.mid / Math.max(0.0001, sub.alternative.costMultiplier.mid)),
            high: Math.round(item.cost.high / Math.max(0.0001, sub.alternative.costMultiplier.high)),
          }
        : item.cost;
      const applied = appliedCostRange(originalCost, sub.alternative.costMultiplier);
      out.push({
        item,
        originalCost,
        appliedCost: applied,
        substitution: sub,
        isApplied,
      });
    }
    return out;
  }, [model, primitiveById, costOverrides]);

  const totals = useMemo(() => {
    let substitutable = rows.length;
    let applied = 0;
    let savings = 0;
    let establishmentMonthsPending = 0;
    let upliftPending = 0;
    for (const r of rows) {
      if (r.isApplied) {
        applied += 1;
        savings += r.originalCost.mid - r.appliedCost.mid;
        establishmentMonthsPending += r.substitution.alternative.establishmentMonths;
        upliftPending += r.substitution.alternative.missionUpliftEstimate;
      }
    }
    return { substitutable, applied, savings, establishmentMonthsPending, upliftPending };
  }, [rows]);

  const hasModel = Boolean(model);
  const hasMatches = rows.length > 0;

  function toggle(row: Row) {
    if (row.isApplied) {
      clearCostOverride(row.item.id);
      clearSubstitutionMeta(row.item.id);
    } else {
      setCostOverride(row.item.id, row.appliedCost);
      // v2: record the non-cost dimensions so the ecological mission uplift
      // and establishment-time delta go live (covenant: ecological only).
      setSubstitutionMeta(row.item.id, {
        upliftEstimate: row.substitution.alternative.missionUpliftEstimate,
        establishmentMonths: row.substitution.alternative.establishmentMonths,
      });
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 10 · Phasing</span>
        <h1 className={styles.title}>Material substitutions</h1>
        <p className={styles.lede}>
          Every infrastructure line item with a living-system alternative
          surfaces here. Toggle a row and the alternative&apos;s cost
          flows through the financial model — total investment,
          break-even, and mission score recompute live. v2 makes the
          mission-uplift live too: applied substitutions raise the
          <em> ecological</em> mission component only (never the financial
          return). Holmgren P5 — Use &amp; value renewable resources &amp;
          services; P9 — Use small &amp; slow solutions.
        </p>
      </header>

      {!hasModel && (
        <section className={styles.section}>
          <p className={styles.empty}>
            No cost line items yet. Draw paddocks, paths, utilities,
            or crop areas in the Plan canvas to populate the financial
            model — substitutions will appear here for each matching
            element.
          </p>
        </section>
      )}

      {hasModel && (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Site rollup</h2>
            <div className={styles.statRow}>
              <span>Cost line items</span>
              <span>{model!.costLineItems.length}</span>
            </div>
            <div className={styles.statRow}>
              <span>Substitutable items</span>
              <span>{totals.substitutable}</span>
            </div>
            <div className={styles.statRow}>
              <span>Applied substitutions</span>
              <span>{totals.applied}</span>
            </div>
            <div className={styles.statRow}>
              <span>Cost savings (mid)</span>
              <span>{fmtDelta(totals.savings)}</span>
            </div>
            <div className={styles.statRow}>
              <span>Establishment time pending</span>
              <span>+{totals.establishmentMonthsPending} months</span>
            </div>
            <div className={styles.statRow}>
              <span>Ecological mission uplift (live)</span>
              <span>
                +
                {Math.min(
                  ECO_UPLIFT_MAX_POINTS,
                  Math.round(totals.upliftPending * ECO_UPLIFT_POINT_SCALE),
                )}{' '}
                eco pts
              </span>
            </div>
            <div className={styles.statRow}>
              <span>Regional cost factor</span>
              <span>
                {regionFactor.toFixed(2)}× · {REGION_LABELS[region]}
              </span>
            </div>
            <div className={styles.statRow}>
              <span>Total investment (mid, post-override)</span>
              <span>{fmtUSD(model!.totalInvestment.mid)}</span>
            </div>
          </section>

          {!hasMatches && (
            <section className={styles.section}>
              <p className={styles.empty}>
                None of the {model!.costLineItems.length} cost line items
                in this project match the substitution catalog. The catalog
                covers fencing (woven-wire, post-wire, electric/temporary),
                paths and livestock lanes, garden / market-garden / nursery
                beds, orchards, row crops, windbreaks, water tanks, and
                rain-catchment drainage ({SUBSTITUTION_CATALOG.length} cited
                pairs).
              </p>
            </section>
          )}

          {hasMatches && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Per-item audit</h2>
              <ul className={styles.list}>
                {rows.map((r) => (
                  <li
                    key={r.item.id}
                    className={styles.listRow}
                    style={{
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <strong>{r.item.name}</strong>
                        <div className={styles.listMeta}>
                          {r.substitution.originalLabel} ·{' '}
                          original {fmtUSD(r.originalCost.mid)}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {r.isApplied && (
                          <span className={`${styles.pill} ${styles.pillMet ?? ''}`}>
                            Saved {fmtDelta(r.originalCost.mid - r.appliedCost.mid)}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => toggle(r)}
                          style={{
                            appearance: 'none',
                            border: '1px solid rgba(255,255,255,0.12)',
                            background: r.isApplied
                              ? 'rgba(120, 200, 140, 0.18)'
                              : 'rgba(255,255,255,0.04)',
                            color: r.isApplied
                              ? 'rgba(150, 220, 170, 0.95)'
                              : 'rgba(232,220,200,0.85)',
                            padding: '6px 12px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {r.isApplied ? 'Applied · turn off' : 'Apply substitution'}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 13, color: 'rgba(232,220,200,0.92)' }}>
                        🌱 <strong>{r.substitution.alternative.label}</strong>
                      </div>
                      <div
                        className={styles.listMeta}
                        style={{ lineHeight: 1.5 }}
                      >
                        {r.substitution.alternative.description}
                      </div>
                      <div className={styles.hint} style={{ fontStyle: 'italic' }}>
                        “{r.substitution.scholarRationale}”
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          marginTop: 2,
                        }}
                      >
                        <span className={styles.pill}>
                          cost {fmtUSD(r.appliedCost.mid)}{' '}
                          ({Math.round(r.substitution.alternative.costMultiplier.mid * 100)}% of original)
                        </span>
                        <span className={styles.pill}>
                          +{r.substitution.alternative.establishmentMonths} mo to function
                        </span>
                        <span className={styles.pill}>
                          mission uplift +{r.substitution.alternative.missionUpliftEstimate.toFixed(2)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 6,
                          flexWrap: 'wrap',
                          alignItems: 'center',
                        }}
                      >
                        {r.substitution.citations.map((c, i) => (
                          <CitationTag key={i} c={c} />
                        ))}
                      </div>
                      <div
                        className={styles.listMeta}
                        style={{ fontSize: 11, marginTop: 2 }}
                      >
                        {r.substitution.principles.join(' · ')}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Notes</h2>
            <p className={styles.listMeta}>
              Applying a substitution writes a scaled CostRange into
              <code> financialStore.costOverrides[itemId]</code>; the
              financial engine&apos;s <code>applyOverrides</code> picks
              it up on the next recompute, so total investment, cashflow,
              break-even, and mission score all reflect the swap. Turning
              the toggle off clears that one override (other manual
              overrides remain untouched). v2 additionally records each
              applied row in <code>financialStore.substitutionMeta</code>,
              which raises the <em>ecological</em> mission component only
              (capped at {ECO_UPLIFT_MAX_POINTS} points) — the financial
              return surface is never touched. Catalog ships{' '}
              {SUBSTITUTION_CATALOG.length} cited pairs.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
