/**
 * §28 DomainFeasibilityCard — Access / Water / Agricultural / Livestock
 * feasibility verdicts derived from existing layer summaries, scoring engine,
 * and entity stores. Pure presentation-layer synthesis — no new shared math.
 *
 * Each domain emits: Good / Fair / Poor verdict + 1-line headline + 2-3
 * evidence bullets that quote actual values (so the steward can see *why*).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { computeAssessmentScores, type ScoredResult } from '../../lib/computeScores.js';
import css from './DomainFeasibilityCard.module.css';

interface Props {
  project: LocalProject;
}

type Verdict = 'good' | 'fair' | 'poor' | 'unknown';

interface DomainResult {
  id: string;
  label: string;
  verdict: Verdict;
  headline: string;
  evidence: string[];
}

interface SoilsSummary {
  drainage_class?: string;
  fertility_index?: number | null;
  awc_cm_cm?: number | null;
  predominant_texture?: string;
  hydrologic_group?: string;
}

const VERDICT_LABEL: Record<Verdict, string> = {
  good: 'Good fit',
  fair: 'Workable',
  poor: 'Constrained',
  unknown: 'Insufficient data',
};

export default function DomainFeasibilityCard({ project }: Props) {
  const structures = useStructureStore((s) => s.structures).filter((s) => s.projectId === project.id);
  const paddocks = useLivestockStore((s) => s.paddocks).filter((p) => p.projectId === project.id);
  const paths = usePathStore((s) => s.paths).filter((p) => p.projectId === project.id);
  const utilities = useUtilityStore((s) => s.utilities).filter((u) => u.projectId === project.id);
  const zones = useZoneStore((s) => s.zones).filter((z) => z.projectId === project.id);
  const siteData = useSiteData(project.id);

  const scores: ScoredResult[] = useMemo(() => {
    if (!siteData?.layers) return [];
    return computeAssessmentScores(siteData.layers, project.acreage);
  }, [siteData, project.acreage]);

  const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;

  const domains = useMemo<DomainResult[]>(() => {
    const findScore = (lbl: string) => scores.find((s) => s.label === lbl);

    // ── Access ─────────────────────────────────────────────────────────────
    const access: DomainResult = (() => {
      const evidence: string[] = [];
      if (!project.hasParcelBoundary) {
        return {
          id: 'access',
          label: 'Site access',
          verdict: 'unknown',
          headline: 'Boundary not yet drawn — access cannot be evaluated.',
          evidence: ['Draw or import a parcel boundary first.'],
        };
      }
      const mainRoads = paths.filter((p) => p.type === 'main_road');
      const secondary = paths.filter((p) => p.type !== 'main_road');
      const dwellings = structures.filter((s) =>
        (['cabin', 'yurt', 'earthship', 'tent_glamping'] as const).some((t) => s.type === t),
      );
      evidence.push(`${mainRoads.length} main road${mainRoads.length === 1 ? '' : 's'}, ${secondary.length} secondary path${secondary.length === 1 ? '' : 's'}.`);
      if (dwellings.length > 0) {
        evidence.push(`${dwellings.length} dwelling${dwellings.length === 1 ? '' : 's'} placed — main road required for habitation.`);
      }
      let verdict: Verdict;
      let headline: string;
      if (mainRoads.length >= 1 && (paths.length >= 2 || dwellings.length === 0)) {
        verdict = 'good';
        headline = 'Main road is in place; secondary circulation supports interior access.';
      } else if (mainRoads.length >= 1) {
        verdict = 'fair';
        headline = 'Main road exists but interior circulation is sparse.';
        evidence.push('Add at least one secondary path connecting structures or paddocks.');
      } else if (paths.length > 0) {
        verdict = 'fair';
        headline = 'Paths drawn but no designated main road — emergency/delivery access unclear.';
      } else {
        verdict = 'poor';
        headline = 'No paths drawn — site has no documented vehicular access.';
        evidence.push('Draw a main road from the property edge to the build envelope.');
      }
      return { id: 'access', label: 'Site access', verdict, headline, evidence };
    })();

    // ── Water ──────────────────────────────────────────────────────────────
    const water: DomainResult = (() => {
      const evidence: string[] = [];
      const wellPump = utilities.filter((u) => u.type === 'well_pump').length;
      const tank = utilities.filter((u) => u.type === 'water_tank').length;
      const catchment = utilities.filter((u) => u.type === 'rain_catchment').length;
      const greywater = utilities.filter((u) => u.type === 'greywater').length;
      const sources = wellPump + catchment;
      const storage = tank;
      const waterScore = findScore('Water Resilience');
      evidence.push(`${sources} water source${sources === 1 ? '' : 's'} (${wellPump} well/pump · ${catchment} rain catchment), ${storage} storage tank${storage === 1 ? '' : 's'}.`);
      if (waterScore) {
        evidence.push(`Water Resilience score: ${waterScore.score} (${waterScore.rating}).`);
      }
      if (greywater > 0) {
        evidence.push(`${greywater} greywater system${greywater === 1 ? '' : 's'} — extends usable supply.`);
      }
      let verdict: Verdict;
      let headline: string;
      const scoreVal = waterScore?.score ?? null;
      if (sources >= 1 && storage >= 1 && (scoreVal == null || scoreVal >= 60)) {
        verdict = 'good';
        headline = 'Source + storage are in place and underlying water resilience is adequate.';
      } else if (sources >= 1 || (scoreVal != null && scoreVal >= 45)) {
        verdict = 'fair';
        headline = sources >= 1 ? 'Source planned but storage or resilience needs reinforcement.' : 'No infrastructure yet — but climate/soils support a workable system.';
        if (storage === 0) evidence.push('Add at least one storage tank sized for drought buffer.');
      } else {
        verdict = scoreVal != null && scoreVal < 30 ? 'poor' : 'unknown';
        headline = scoreVal != null && scoreVal < 30
          ? 'No water infrastructure and climate/soils signal high drought risk.'
          : 'No water infrastructure planned and resilience signal is unclear.';
        evidence.push('Plan a well, rain catchment, or both — paired with storage.');
      }
      return { id: 'water', label: 'Water systems', verdict, headline, evidence };
    })();

    // ── Agricultural ───────────────────────────────────────────────────────
    const ag: DomainResult = (() => {
      const evidence: string[] = [];
      const agScore = findScore('Agricultural Suitability');
      const fertility = soils?.fertility_index ?? null;
      const drainage = soils?.drainage_class ?? null;
      const texture = soils?.predominant_texture ?? null;
      if (agScore) {
        evidence.push(`Agricultural Suitability score: ${agScore.score} (${agScore.rating}).`);
      }
      if (fertility != null) {
        evidence.push(`Soil fertility index: ${fertility.toFixed(1)} / 5.`);
      }
      if (drainage) {
        evidence.push(`Soil drainage: ${drainage}${texture ? ` · ${texture}` : ''}.`);
      } else if (texture) {
        evidence.push(`Predominant texture: ${texture}.`);
      }
      let verdict: Verdict;
      let headline: string;
      const scoreVal = agScore?.score ?? null;
      const fertilityOk = fertility == null || fertility >= 3;
      if (scoreVal != null && scoreVal >= 65 && fertilityOk) {
        verdict = 'good';
        headline = 'Soils and climate support a productive agricultural program.';
      } else if (scoreVal != null && scoreVal >= 45) {
        verdict = 'fair';
        headline = 'Workable for crops with amendments, raised beds, or selected species.';
        if (fertility != null && fertility < 3) {
          evidence.push('Plan compost/cover-crop program — fertility is below the productive band.');
        }
      } else if (scoreVal != null) {
        verdict = 'poor';
        headline = 'Field-scale agriculture is constrained — consider perennial or pasture-led use.';
      } else {
        verdict = 'unknown';
        headline = 'Soils data not yet attached — load a SSURGO/Tier-1 soils layer.';
      }
      return { id: 'ag', label: 'Agricultural use', verdict, headline, evidence };
    })();

    // ── Livestock ──────────────────────────────────────────────────────────
    const livestock: DomainResult = (() => {
      const evidence: string[] = [];
      const speciesPaddocks = paddocks.filter((p) => p.species.length > 0);
      const pastureZones = zones.filter((z) => z.category === 'livestock');
      const waterUtil = utilities.some((u) => u.type === 'well_pump' || u.type === 'water_tank');
      const agScore = findScore('Agricultural Suitability');
      const agScoreVal = agScore?.score ?? null;
      evidence.push(`${paddocks.length} paddock${paddocks.length === 1 ? '' : 's'} (${speciesPaddocks.length} stocked), ${pastureZones.length} pasture/silvopasture zone${pastureZones.length === 1 ? '' : 's'}.`);
      evidence.push(waterUtil ? 'Stock water infrastructure in place.' : 'No stock water source — required before grazing.');
      if (agScoreVal != null) {
        evidence.push(`Pasture base (Agricultural Suitability): ${agScoreVal}.`);
      }
      let verdict: Verdict;
      let headline: string;
      if (paddocks.length === 0 && pastureZones.length === 0) {
        verdict = 'unknown';
        headline = 'No paddocks or pasture zones yet — livestock not part of the current plan.';
      } else if (speciesPaddocks.length >= 1 && waterUtil && (agScoreVal == null || agScoreVal >= 45)) {
        verdict = 'good';
        headline = 'Paddocks stocked, water available, and forage base is workable.';
      } else if (paddocks.length >= 1 && (waterUtil || (agScoreVal != null && agScoreVal >= 45))) {
        verdict = 'fair';
        headline = 'Paddocks drawn but stocking, water, or forage signal needs follow-up.';
        if (!waterUtil) evidence.push('Add a stock water tank or well before introducing animals.');
        if (speciesPaddocks.length === 0) evidence.push('Assign species to at least one paddock to model carrying capacity.');
      } else {
        verdict = 'poor';
        headline = 'Livestock infrastructure is incomplete — water, paddocks, or pasture missing.';
      }
      return { id: 'livestock', label: 'Livestock', verdict, headline, evidence };
    })();

    return [access, water, ag, livestock];
  }, [project.hasParcelBoundary, paths, structures, utilities, paddocks, zones, soils, scores]);

  const counts = useMemo(() => {
    const c = { good: 0, fair: 0, poor: 0, unknown: 0 };
    for (const d of domains) c[d.verdict] += 1;
    return c;
  }, [domains]);

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Domain Feasibility — Access · Water · Ag · Livestock</h3>
          <p className={css.cardHint}>
            Per-domain verdicts derived from your layer data, assessment scores, and placed entities.
            Each row shows the headline plus the evidence behind it — so you know <em>which</em> input
            is driving the verdict.
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </header>

      <div className={css.summaryRow}>
        <div className={`${css.summaryBlock} ${css.tone_good}`}>
          <span className={css.summaryValue}>{counts.good}</span>
          <span className={css.summaryLabel}>Good</span>
        </div>
        <div className={`${css.summaryBlock} ${css.tone_fair}`}>
          <span className={css.summaryValue}>{counts.fair}</span>
          <span className={css.summaryLabel}>Workable</span>
        </div>
        <div className={`${css.summaryBlock} ${css.tone_poor}`}>
          <span className={css.summaryValue}>{counts.poor}</span>
          <span className={css.summaryLabel}>Constrained</span>
        </div>
        <div className={`${css.summaryBlock} ${css.tone_muted}`}>
          <span className={css.summaryValue}>{counts.unknown}</span>
          <span className={css.summaryLabel}>Unclear</span>
        </div>
      </div>

      <ul className={css.list}>
        {domains.map((d) => (
          <li key={d.id} className={`${css.row} ${verdictClass(d.verdict)}`}>
            <div className={css.rowHead}>
              <span className={`${css.verdictTag} ${verdictTagClass(d.verdict)}`}>
                {VERDICT_LABEL[d.verdict]}
              </span>
              <span className={css.rowTitle}>{d.label}</span>
            </div>
            <div className={css.rowBody}>
              <div className={css.headline}>{d.headline}</div>
              <ul className={css.bullets}>
                {d.evidence.map((e, i) => (
                  <li key={i} className={css.bullet}>{e}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>

      <p className={css.footnote}>
        Verdicts blend three signals per domain: <em>placed entities</em> (e.g., paths, utilities,
        paddocks), <em>scoring engine output</em> (Water Resilience, Agricultural Suitability), and
        <em> raw layer values</em> (drainage class, fertility index). When a signal is missing, the
        verdict downgrades to <em>Insufficient data</em> rather than guessing.
      </p>
    </section>
  );
}

function verdictClass(v: Verdict): string {
  if (v === 'good') return css.row_good ?? '';
  if (v === 'fair') return css.row_fair ?? '';
  if (v === 'poor') return css.row_poor ?? '';
  return css.row_unknown ?? '';
}
function verdictTagClass(v: Verdict): string {
  if (v === 'good') return css.tag_good ?? '';
  if (v === 'fair') return css.tag_fair ?? '';
  if (v === 'poor') return css.tag_poor ?? '';
  return css.tag_unknown ?? '';
}
