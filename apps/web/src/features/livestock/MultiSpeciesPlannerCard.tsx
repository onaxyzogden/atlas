/**
 * §11 MultiSpeciesPlannerCard — synthesizes the species mix declared across
 * all paddocks for a project: per-species head + AU rollup, ecological-niche
 * grouping (grazer / browser / mixed / mobile / specialist), polyface-stack
 * detection (cattle → sheep → poultry follower pattern), and recommendations
 * for missing followers or niche overlap. Pure presentation.
 */

import { useMemo } from 'react';
import { useLivestockStore, type LivestockSpecies } from '../../store/livestockStore.js';
import { LIVESTOCK_SPECIES, AU_FACTORS } from './speciesData.js';
import css from './MultiSpeciesPlannerCard.module.css';

type Niche = 'grazer' | 'browser' | 'mixed' | 'mobile' | 'specialist';

const NICHE: Record<LivestockSpecies, Niche> = {
  cattle: 'grazer',
  horses: 'grazer',
  sheep: 'mixed',
  goats: 'browser',
  pigs: 'mobile',
  poultry: 'mobile',
  ducks_geese: 'mobile',
  rabbits: 'specialist',
  bees: 'specialist',
};

const NICHE_LABEL: Record<Niche, string> = {
  grazer: 'Grazer',
  browser: 'Browser',
  mixed: 'Mixed grazer/browser',
  mobile: 'Mobile / sanitizer',
  specialist: 'Specialist',
};

interface SpeciesAggregate {
  species: LivestockSpecies;
  paddockCount: number;
  totalAreaHa: number;
  estHead: number;
  animalUnits: number;
  niche: Niche;
}

interface MultiSpeciesPlannerCardProps {
  projectId: string;
}

export default function MultiSpeciesPlannerCard({ projectId }: MultiSpeciesPlannerCardProps) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );

  const view = useMemo(() => {
    if (paddocks.length === 0) return null;

    // Aggregate by species
    const agg = new Map<LivestockSpecies, SpeciesAggregate>();
    for (const p of paddocks) {
      const areaHa = (p.areaM2 ?? 0) / 10_000;
      const speciesList = (p.species ?? []) as LivestockSpecies[];
      if (speciesList.length === 0) continue;
      // Split paddock evenly across listed species for head estimation
      const sharePerSpecies = 1 / speciesList.length;
      for (const sp of speciesList) {
        const cur = agg.get(sp) ?? {
          species: sp,
          paddockCount: 0,
          totalAreaHa: 0,
          estHead: 0,
          animalUnits: 0,
          niche: NICHE[sp],
        };
        cur.paddockCount += 1;
        cur.totalAreaHa += areaHa * sharePerSpecies;
        // Use declared stockingDensity if present, else typical
        const density =
          typeof p.stockingDensity === 'number' && Number.isFinite(p.stockingDensity)
            ? p.stockingDensity
            : LIVESTOCK_SPECIES[sp]?.typicalStocking ?? 0;
        const head = density * areaHa * sharePerSpecies;
        cur.estHead += head;
        cur.animalUnits += head * (AU_FACTORS[sp] ?? 0);
        agg.set(sp, cur);
      }
    }

    if (agg.size === 0) return null;

    const speciesList = Array.from(agg.values()).sort((a, b) => b.animalUnits - a.animalUnits);
    const present = new Set(speciesList.map((s) => s.species));

    // Niche distribution
    const nicheCount: Record<Niche, number> = { grazer: 0, browser: 0, mixed: 0, mobile: 0, specialist: 0 };
    for (const s of speciesList) nicheCount[s.niche] += 1;

    const totalAU = speciesList.reduce((sum, s) => sum + s.animalUnits, 0);
    const totalHead = speciesList.reduce((sum, s) => sum + s.estHead, 0);
    const totalAreaHa = speciesList.reduce((sum, s) => sum + s.totalAreaHa, 0);

    // Diversity: 1 species = 0, 2 = 50, 3 = 75, 4+ = 100
    const diversity = Math.min(100, (speciesList.length - 1) * 25 + 25);

    // Detect patterns / generate recommendations
    interface Insight {
      id: string;
      kind: 'good' | 'warn' | 'tip';
      title: string;
      detail: string;
    }
    const insights: Insight[] = [];

    const hasCattle = present.has('cattle');
    const hasSheep = present.has('sheep');
    const hasGoats = present.has('goats');
    const hasPoultry = present.has('poultry');
    const hasPigs = present.has('pigs');
    const hasHorses = present.has('horses');

    // Polyface stack
    if (hasCattle && hasSheep && hasPoultry) {
      insights.push({
        id: 'polyface',
        kind: 'good',
        title: 'Polyface stack detected',
        detail:
          'Cattle + sheep + poultry follower pattern is the textbook Salatin stack — cattle break the canopy, sheep clean up forbs, poultry sanitize the dung 3-4 days behind.',
      });
    } else if (hasCattle && hasPoultry && !hasSheep) {
      insights.push({
        id: 'partial-stack',
        kind: 'tip',
        title: 'Add a small-ruminant tier',
        detail:
          'Sheep or goats between cattle and poultry would clean up forbs and shrubs that cattle leave, raising forage utilization 15-25%.',
      });
    } else if (hasCattle && hasSheep && !hasPoultry) {
      insights.push({
        id: 'no-sanitizer',
        kind: 'tip',
        title: 'Missing pasture sanitizer',
        detail:
          'A poultry follower (laying flock or broilers) 3-4 days behind the ruminants breaks parasite cycles and spreads dung.',
      });
    }

    // Niche overlap warnings
    if (hasSheep && hasGoats && !hasCattle) {
      insights.push({
        id: 'overlap-sheep-goats',
        kind: 'warn',
        title: 'Sheep + goats compete on shrubs',
        detail:
          'Without a grazer (cattle or horses) above them, sheep and goats overlap heavily on browse. Stagger entry or split paddocks by forage class.',
      });
    }
    if (hasCattle && hasHorses) {
      insights.push({
        id: 'overlap-cattle-horses',
        kind: 'warn',
        title: 'Cattle + horses compete on grass',
        detail:
          'Both are grass specialists; horses graze tighter than cattle and can deplete short pasture if rotated together. Lead with cattle, follow with horses on tall residue.',
      });
    }

    // Single-species heaviness
    if (speciesList.length === 1) {
      const only = speciesList[0]!;
      insights.push({
        id: 'monoculture',
        kind: 'warn',
        title: `Single-species operation (${LIVESTOCK_SPECIES[only.species]?.label ?? only.species})`,
        detail:
          'Multi-species rotations build forage utilization, parasite resistance, and resilience. Adding even a small follower flock raises ecosystem function notably.',
      });
    }

    // Browser-heavy
    if (hasGoats && nicheCount.grazer === 0) {
      insights.push({
        id: 'browser-only',
        kind: 'warn',
        title: 'Browser without grazer',
        detail:
          "Goats alone bypass grass — and brushy ground rebounds slowly. Pair with cattle or horses to keep the grass component in succession.",
      });
    }

    // Pigs disturbance
    if (hasPigs) {
      insights.push({
        id: 'pig-discipline',
        kind: 'tip',
        title: 'Disturbance discipline for pigs',
        detail:
          'Pigs root — keep them on small daily moves with electric fence; they belong in succession (after harvest, during clearing) rather than in shared rotation paddocks.',
      });
    }

    // Bees / pollinator partner
    if (present.has('bees') && speciesList.length >= 2) {
      insights.push({
        id: 'bees-partner',
        kind: 'good',
        title: 'Pollinator partner present',
        detail:
          'Bees compound the value of perennial pasture and orchard guilds — 2-3 hives per acre of forage diversifies hive nutrition and parcel income.',
      });
    }

    // Diversity tip if low
    if (speciesList.length === 2 && !hasPoultry) {
      insights.push({
        id: 'add-poultry',
        kind: 'tip',
        title: 'Lowest-effort diversification: poultry',
        detail:
          'A 50-100 bird laying flock in a mobile coop is the highest-leverage third species — small footprint, large sanitation benefit.',
      });
    }

    // Verdict
    let verdict: { tone: 'good' | 'caution' | 'warn'; title: string; note: string };
    if (insights.some((i) => i.kind === 'warn') && speciesList.length === 1) {
      verdict = {
        tone: 'caution',
        title: 'Single-species mix',
        note: 'A second species would unlock follower-pattern benefits and resilience.',
      };
    } else if (speciesList.length >= 3 && nicheCount.grazer >= 1 && nicheCount.mobile >= 1) {
      verdict = {
        tone: 'good',
        title: 'Diversified multi-species mix',
        note: 'Grazer + small-ruminant or follower + mobile tier is the resilient pattern.',
      };
    } else if (insights.some((i) => i.kind === 'warn')) {
      verdict = {
        tone: 'caution',
        title: 'Niche overlap or missing tier',
        note: 'See warnings below for adjustments.',
      };
    } else {
      verdict = {
        tone: 'good',
        title: 'Workable species mix',
        note: 'Consider the tips below for incremental upgrades.',
      };
    }

    return {
      speciesList,
      totalAU,
      totalHead,
      totalAreaHa,
      diversity,
      nicheCount,
      insights,
      verdict,
    };
  }, [paddocks]);

  if (!view) {
    return (
      <section className={css.card ?? ''} aria-label="Multi-species planner">
        <header className={css.cardHead ?? ''}>
          <div>
            <h3 className={css.cardTitle ?? ''}>Multi-species planner</h3>
            <p className={css.cardHint ?? ''}>
              No paddocks with assigned species yet {'\u2014'} draw paddocks and assign livestock to surface this synthesis.
            </p>
          </div>
          <span className={css.modeBadge ?? ''}>{'\u00A7'} 11</span>
        </header>
        <div className={css.empty ?? ''}>No species assignments to plan against.</div>
      </section>
    );
  }

  const v = view;

  return (
    <section className={css.card ?? ''} aria-label="Multi-species planner">
      <header className={css.cardHead ?? ''}>
        <div>
          <h3 className={css.cardTitle ?? ''}>Multi-species planner</h3>
          <p className={css.cardHint ?? ''}>
            Synthesizes declared paddock-species assignments into per-species rollups, niche distribution, and pattern
            recommendations.
          </p>
        </div>
        <span className={css.modeBadge ?? ''}>{'\u00A7'} 11</span>
      </header>

      <div
        className={`${css.verdictBanner ?? ''} ${
          v.verdict.tone === 'good'
            ? css.verdictGreen ?? ''
            : v.verdict.tone === 'caution'
              ? css.verdictCaution ?? ''
              : css.verdictBlocker ?? ''
        }`}
      >
        <div className={css.verdictTitle ?? ''}>{v.verdict.title}</div>
        <div className={css.verdictNote ?? ''}>{v.verdict.note}</div>
      </div>

      <div className={css.headlineGrid ?? ''}>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>{v.speciesList.length}</span>
          <span className={css.statLabel ?? ''}>Species</span>
        </div>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>{Math.round(v.totalHead).toLocaleString()}</span>
          <span className={css.statLabel ?? ''}>Est. head</span>
        </div>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>{v.totalAU.toFixed(1)}</span>
          <span className={css.statLabel ?? ''}>Animal units</span>
        </div>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>{v.diversity}</span>
          <span className={css.statLabel ?? ''}>Diversity</span>
        </div>
      </div>

      <div className={css.sectionLabel ?? ''}>Per-species rollup</div>
      <div className={css.rowList ?? ''}>
        {v.speciesList.map((s) => {
          const info = LIVESTOCK_SPECIES[s.species];
          const tierClass =
            s.niche === 'grazer'
              ? css.tierGreen ?? ''
              : s.niche === 'browser'
                ? css.tierCaution ?? ''
                : s.niche === 'mobile'
                  ? css.tierWeak ?? ''
                  : css.tierNeutral ?? '';
          return (
            <div key={s.species} className={`${css.areaRow ?? ''} ${tierClass}`}>
              <div className={css.rowHead ?? ''}>
                <div className={css.rowMain ?? ''}>
                  <span className={css.areaName ?? ''}>
                    {info?.icon ?? ''} {info?.label ?? s.species}
                  </span>
                  <span className={css.areaType ?? ''}>{NICHE_LABEL[s.niche]}</span>
                </div>
                <span className={css.tierBadge ?? ''}>
                  {s.paddockCount} pad{s.paddockCount === 1 ? '' : 's'}
                </span>
              </div>
              <div className={css.rowMetrics ?? ''}>
                <div className={css.metricBlock ?? ''}>
                  <span className={css.metricLabel ?? ''}>Area</span>
                  <span className={css.metricValue ?? ''}>{s.totalAreaHa.toFixed(2)} ha</span>
                </div>
                <div className={css.metricBlock ?? ''}>
                  <span className={css.metricLabel ?? ''}>Est. head</span>
                  <span className={css.metricValue ?? ''}>{Math.round(s.estHead).toLocaleString()}</span>
                </div>
                <div className={css.metricBlock ?? ''}>
                  <span className={css.metricLabel ?? ''}>AU</span>
                  <span className={css.metricValue ?? ''}>{s.animalUnits.toFixed(2)}</span>
                </div>
                <div className={css.metricBlock ?? ''}>
                  <span className={css.metricLabel ?? ''}>Recovery</span>
                  <span className={css.metricValue ?? ''}>{info?.recoveryDays ?? '\u2014'} d</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {v.insights.length > 0 && (
        <>
          <div className={css.sectionLabel ?? ''}>Pattern analysis</div>
          <ul className={css.stmtList ?? ''}>
            {v.insights.map((i) => (
              <li
                key={i.id}
                className={`${css.stmt ?? ''} ${
                  i.kind === 'good' ? css.stmtGood ?? '' : i.kind === 'warn' ? css.stmtWarn ?? '' : css.stmtTip ?? ''
                }`}
              >
                <div className={css.stmtTitle ?? ''}>{i.title}</div>
                <div className={css.stmtDetail ?? ''}>{i.detail}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className={css.assumption ?? ''}>
        Head estimates use the declared paddock stocking density when set, falling back to typical-stocking defaults
        from the species catalog. Paddocks with multiple species split area evenly. AU factors follow the Schedule A
        approximation already used by the API layer.
      </p>
    </section>
  );
}
