/**
 * §17 AlternativeLayoutRationaleCard — for each design assumption the
 * dashboards are leaning on, propose a concrete alternative swap and
 * spell out which downstream metrics or surfaces would change.
 * Pairs tightly with §17 AssumptionGapDetectorCard (which lists what
 * is being assumed) and §18 AiSiteSynthesisCard (which states the
 * resulting constraints).
 *
 * Each row carries:
 *   - Title: the proposed swap (e.g., "Tilt mission weights ecological-led")
 *   - Rationale: the current state and why the swap is worth considering
 *   - Delta: the specific dashboard outcome that would change
 *
 * Pure deterministic introspection — no shared math, no LLM call. The
 * "AI DRAFT" badge tracks the §17 spec language only.
 *
 * Closes manifest §17 `ai-alternative-layout-rationale` (P3) planned -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useFinancialStore } from '../../store/financialStore.js';
import css from './AlternativeLayoutRationaleCard.module.css';

interface Props {
  project: LocalProject;
}

type Domain = 'project_basics' | 'scoring_config' | 'entities' | 'economics' | 'vision';
type Lift = 'high' | 'medium' | 'low';

interface Rationale {
  id: string;
  domain: Domain;
  lift: Lift;
  title: string;
  rationale: string;
  delta: string;
}

const DOMAIN_LABEL: Record<Domain, string> = {
  project_basics: 'Project basics',
  scoring_config: 'Scoring config',
  entities: 'Placed entities',
  economics: 'Economics',
  vision: 'Vision & narrative',
};

const DOMAIN_ORDER: Domain[] = [
  'project_basics',
  'scoring_config',
  'entities',
  'economics',
  'vision',
];

const LIFT_ORDER: Record<Lift, number> = { high: 0, medium: 1, low: 2 };
const LIFT_LABEL: Record<Lift, string> = {
  high: 'High lift',
  medium: 'Medium lift',
  low: 'Low lift',
};

const RETREAT_TYPES = new Set([
  'cabin',
  'yurt',
  'tent_glamping',
  'earthship',
  'pavilion',
]);

export default function AlternativeLayoutRationaleCard({ project }: Props) {
  const allStructures = useStructureStore((s) => s.structures);
  const structures = useMemo(
    () => allStructures.filter((st) => st.projectId === project.id),
    [allStructures, project.id],
  );
  const allUtilities = useUtilityStore((s) => s.utilities);
  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === project.id),
    [allUtilities, project.id],
  );
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const cropAreas = useMemo(
    () => allCropAreas.filter((c) => c.projectId === project.id),
    [allCropAreas, project.id],
  );
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === project.id),
    [allPaddocks, project.id],
  );
  const missionWeights = useFinancialStore((s) => s.missionWeights);
  const costOverrides = useFinancialStore((s) => s.costOverrides);
  const revenueOverrides = useFinancialStore((s) => s.revenueOverrides);

  const rationales = useMemo<Rationale[]>(() => {
    const out: Rationale[] = [];
    const acreage = project.acreage ?? 0;
    const hasBoundary = !!project.parcelBoundaryGeojson;

    // ── project basics ────────────────────────────────────────────────
    if (!hasBoundary) {
      out.push({
        id: 'draw-boundary',
        domain: 'project_basics',
        lift: 'high',
        title: 'Draw the parcel boundary first',
        rationale:
          'Most acreage-derived metrics are running against a null geometry — the dashboards are filling in zeros where polygon-based math should live.',
        delta:
          'Catchment potential, carbon stocks, watershed rollups, viewshed analysis, and zone-area splits would all switch from null/zero to numeric.',
      });
    }
    if (!project.projectType) {
      out.push({
        id: 'pick-project-type',
        domain: 'project_basics',
        lift: 'high',
        title: 'Assign a primary project type',
        rationale:
          'No project type is set, so crop-guild templates, structure presets, and revenue-stream defaults all fall back to a generic baseline.',
        delta:
          'Type-specific defaults unlock — homestead vs. retreat vs. food-forest each ship a different starter zone palette and revenue-mix template.',
      });
    }

    // ── scoring config ────────────────────────────────────────────────
    const isDefaultWeights =
      Math.abs(missionWeights.financial - 0.4) < 0.01 &&
      Math.abs(missionWeights.ecological - 0.25) < 0.01 &&
      Math.abs(missionWeights.spiritual - 0.2) < 0.01 &&
      Math.abs(missionWeights.community - 0.15) < 0.01;
    if (isDefaultWeights) {
      out.push({
        id: 'tilt-mission-weights',
        domain: 'scoring_config',
        lift: 'medium',
        title: 'Tilt mission weights toward the actual project intent',
        rationale:
          'Weights are still the seeded 40 / 25 / 20 / 15 (financial / ecological / spiritual / community). The mission-impact rollup is therefore reading like a generic finance-led project even if the steward is ecology-led or community-led.',
        delta:
          'Zone priority re-ranks, phasing order can flip ecology-recovery work earlier, and the §22 mission-weighted ROI surface re-orders enterprise streams accordingly.',
      });
    }

    // ── entities — water ──────────────────────────────────────────────
    const waterUtilCount = utilities.filter(
      (u) => u.type === 'water_tank' || u.type === 'well_pump' || u.type === 'rain_catchment',
    ).length;
    if (waterUtilCount === 0) {
      out.push({
        id: 'add-water-storage',
        domain: 'entities',
        lift: 'high',
        title: 'Place a 5,000-gallon water tank',
        rationale:
          'Zero water infrastructure on the map means every storage- and resilience-dependent metric is anchored at 0.',
        delta:
          'Storage gauge jumps from 0 → 5,000 gal, off-grid resilience lifts at least one band, drought-buffer goes from "none" to a measurable number, and the §14 water-budget storage-sizing recommendation gains a baseline to compare against.',
      });
    }

    // ── entities — orchard / food forest ──────────────────────────────
    const orchardCropAreas = cropAreas.filter(
      (c) => c.type === 'orchard' || c.type === 'food_forest',
    ).length;
    if (acreage >= 3 && orchardCropAreas === 0) {
      out.push({
        id: 'add-orchard-polygon',
        domain: 'entities',
        lift: 'medium',
        title: 'Add a 0.5-acre orchard or food-forest polygon',
        rationale: `Parcel is ${acreage.toFixed(1)} ac with no perennial-crop polygon yet. The dashboards default the orchard revenue stream to 0 and the carbon-sequestration baseline reads "annual cropland" everywhere.`,
        delta:
          '§22 orchard revenue stream gets a non-zero mature-year placeholder, §11 carbon sequestration gains a perennial baseline, and the §17 needs-site-visit flag for "no perennial cover specified" clears.',
      });
    }

    // ── entities — retreat structures ─────────────────────────────────
    const retreatStructures = structures.filter((s) => RETREAT_TYPES.has(s.type)).length;
    if (acreage >= 5 && retreatStructures === 0) {
      out.push({
        id: 'add-retreat-structure',
        domain: 'entities',
        lift: 'medium',
        title: 'Place at least one guest cabin / yurt footprint',
        rationale: `Parcel is ${acreage.toFixed(1)} ac with no retreat-class structure on the map. Retreat and agritourism revenue streams default to 0 and the §22 overbuilt-for-revenue check flags any non-zero retreat gross as unsupported.`,
        delta:
          '§22 retreat & agritourism revenue streams unlock; the ramp-projection card stops flagging "Lean MVP gap" on those lines.',
      });
    }

    // ── entities — paddock split ──────────────────────────────────────
    if (paddocks.length === 1) {
      out.push({
        id: 'split-paddocks',
        domain: 'entities',
        lift: 'medium',
        title: 'Split the single paddock into 4 rotational paddocks',
        rationale:
          'A single paddock means the rotation factor falls back to 1.0 — forage demand reads as continuous grazing on the same ground.',
        delta:
          'Forage carrying capacity lifts via the rotation factor, soil-trampling impact in the §11 ecology rollup drops, and the §11 grazing dashboard surfaces a real rotation cycle.',
      });
    }

    // ── economics ─────────────────────────────────────────────────────
    const overrideCount =
      Object.keys(costOverrides).length + Object.keys(revenueOverrides).length;
    if (overrideCount === 0) {
      out.push({
        id: 'lock-overrides',
        domain: 'economics',
        lift: 'medium',
        title: 'Lock in 1–2 high-impact cost or revenue overrides',
        rationale:
          'No overrides set — the entire cost / revenue model is running on midline regional defaults, so the budget confidence band is wide enough to make phasing trade-offs ambiguous.',
        delta:
          'Budget confidence band tightens, the §22 phasing dashboard shows a sharper Phase-1 cost line, and the §22 mission-weighted ROI surface stops smearing across the default range.',
      });
    }

    // ── revenue without supporting infrastructure (overbuilt edge) ────
    if (
      Object.keys(revenueOverrides).length > 0 &&
      structures.length === 0 &&
      paddocks.length === 0 &&
      cropAreas.length === 0
    ) {
      out.push({
        id: 'back-revenue-with-entities',
        domain: 'economics',
        lift: 'high',
        title: 'Back the revenue overrides with at least one placed entity',
        rationale:
          'Revenue overrides are set but the map has no structures, paddocks, or crop areas to support them. Every stream is "overbuilt for revenue" by the §22 warning.',
        delta:
          '§22 overbuilt-for-revenue warning clears, ramp-projection becomes defensible, and the Lean-MVP toggle becomes a useful comparison rather than a 100 % gap.',
      });
    }

    // ── vision ────────────────────────────────────────────────────────
    if (!project.visionStatement || project.visionStatement.trim().length === 0) {
      out.push({
        id: 'write-vision',
        domain: 'vision',
        lift: 'low',
        title: 'Write a one-sentence vision statement',
        rationale:
          'Vision statement is blank, so the §18 AI synthesis card and the §20 presentation-mode export both lead with structural data instead of the steward\u2019s voice.',
        delta:
          'AI synthesis re-anchors its narrative around the stated purpose; presentation / public-portal exports lead with a human sentence rather than a metrics block.',
      });
    }
    if (!project.ownerNotes || project.ownerNotes.trim().length === 0) {
      out.push({
        id: 'capture-owner-notes',
        domain: 'vision',
        lift: 'low',
        title: 'Capture owner / stakeholder notes',
        rationale:
          'No owner notes on file — context the dashboards can\u2019t derive (history, neighbour relationships, family priorities) is invisible to downstream synthesis.',
        delta:
          'AI synthesis card surfaces the human context block; collaboration-tab discussions can anchor against an explicit baseline.',
      });
    }

    return out.sort((a, b) => {
      const da = DOMAIN_ORDER.indexOf(a.domain);
      const db = DOMAIN_ORDER.indexOf(b.domain);
      if (da !== db) return da - db;
      return LIFT_ORDER[a.lift] - LIFT_ORDER[b.lift];
    });
  }, [
    project,
    structures,
    utilities,
    cropAreas,
    paddocks,
    missionWeights,
    costOverrides,
    revenueOverrides,
  ]);

  const counts = useMemo(() => {
    const total = rationales.length;
    const highLift = rationales.filter((r) => r.lift === 'high').length;
    const medLift = rationales.filter((r) => r.lift === 'medium').length;
    const domains = new Set(rationales.map((r) => r.domain)).size;
    return { total, highLift, medLift, domains };
  }, [rationales]);

  const overallTone =
    counts.total === 0
      ? css.tone_good
      : counts.highLift > 0
        ? css.tone_poor
        : counts.medLift > 0
          ? css.tone_fair
          : css.tone_muted;

  const grouped = useMemo(() => {
    const map: Partial<Record<Domain, Rationale[]>> = {};
    for (const r of rationales) {
      const arr = map[r.domain] ?? [];
      arr.push(r);
      map[r.domain] = arr;
    }
    return DOMAIN_ORDER.flatMap((d) => {
      const items = map[d];
      if (!items || items.length === 0) return [];
      return [{ domain: d, items }];
    });
  }, [rationales]);

  return (
    <section className={css.card} aria-label="Alternative layout rationale">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Alternative layout rationale</h3>
          <p className={css.cardHint}>
            For each implicit assumption the dashboards are running on, a
            concrete swap to consider and the{' '}
            <em>downstream metric or surface that would change</em> if you
            took it. Pairs with the assumption-detector above.
          </p>
        </div>
        <span className={css.heuristicBadge}>AI DRAFT</span>
      </header>

      <div className={`${css.summaryRow} ${overallTone}`}>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.total}</div>
          <div className={css.summaryLabel}>Alternatives</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.domains}</div>
          <div className={css.summaryLabel}>Domains</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.highLift}</div>
          <div className={css.summaryLabel}>High lift</div>
        </div>
        <div className={css.summaryBlock}>
          <div className={css.summaryValue}>{counts.medLift}</div>
          <div className={css.summaryLabel}>Medium lift</div>
        </div>
      </div>

      {counts.total === 0 && (
        <div className={css.empty}>
          No alternative-layout swaps suggested. The current design state
          isn&rsquo;t leaning on any of the heuristics this card watches
          for &mdash; revisit when project basics, weights, or entity
          coverage shift.
        </div>
      )}

      {grouped.map(({ domain, items }) => (
        <div key={domain} className={css.domainBlock}>
          <h4 className={css.domainTitle}>{DOMAIN_LABEL[domain]}</h4>
          <ul className={css.list}>
            {items.map((r) => (
              <li
                key={r.id}
                className={`${css.row} ${
                  r.lift === 'high'
                    ? css.lift_high
                    : r.lift === 'medium'
                      ? css.lift_med
                      : css.lift_low
                }`}
              >
                <div className={css.rowHead}>
                  <span
                    className={`${css.liftTag} ${
                      r.lift === 'high'
                        ? css.tag_high
                        : r.lift === 'medium'
                          ? css.tag_med
                          : css.tag_low
                    }`}
                  >
                    {LIFT_LABEL[r.lift]}
                  </span>
                  <span className={css.rowTitle}>{r.title}</span>
                </div>
                <div className={css.rowBody}>
                  <div className={css.line}>
                    <span className={css.lineLabel}>Why now:</span>{' '}
                    {r.rationale}
                  </div>
                  <div className={css.line}>
                    <span className={css.lineLabel}>What would change:</span>{' '}
                    {r.delta}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className={css.footnote}>
        <em>How rationales are built:</em> deterministic checks against
        project fields, scoring config, entity stores, and override state.
        Each row names the trigger and the specific dashboard delta the
        swap would produce &mdash; no LLM call, same inputs always
        produce the same output.
      </p>
    </section>
  );
}
