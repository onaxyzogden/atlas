/**
 * §19 ScenarioPhasingAlternativesCard — three strategy lenses over the
 * existing phase ordering (revenue-first, regen-first, habitation-first).
 *
 * The phasing dashboard already lets the steward view the chronological
 * phase sequence + path-mode reorderings of Phase 1. What it doesn\u2019t yet
 * surface is the question "given my current phase plan, would a different
 * sequencing strategy land my priorities earlier?" That\u2019s this card.
 *
 * Per scenario, the card answers two questions, computed from current phase
 * assignments:
 *
 *   - Where does this strategy\u2019s key signal first appear in the current
 *     ordering? (e.g., revenue lens \u2192 first phase with a market_garden /
 *     row_crop / orchard / market structure)
 *   - How concentrated is that signal across the build? (count of phases
 *     that carry it vs. the total)
 *
 * If the key signal first appears late, the scenario surfaces a "consider
 * re-sequencing" nudge \u2014 not a recommendation to reorder, but a flag the
 * steward should sit with.
 *
 * No reordering, no shared math, no entity edits. The card classifies
 * placed features into per-scenario buckets via small hardcoded sets.
 *
 * Closes manifest §19 `scenario-phasing-alternatives` (P3) partial -> done.
 */

import { useMemo, useState } from 'react';
import { usePhaseStore } from '../../store/phaseStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import css from './ScenarioPhasingAlternativesCard.module.css';

interface Props {
  projectId: string;
}

type ScenarioKey = 'revenue' | 'regen' | 'habitation';

interface Scenario {
  key: ScenarioKey;
  label: string;
  tagline: string;
  signalLabel: string;
  signalDescription: string;
}

const SCENARIOS: Scenario[] = [
  {
    key: 'revenue',
    label: 'Revenue-first',
    tagline: 'Cashflow earlier in the buildout',
    signalLabel: 'first revenue-bearing element',
    signalDescription:
      'Market gardens, row crops, orchards, nurseries, and market-facing structures \u2014 the stuff that turns a season into an income line.',
  },
  {
    key: 'regen',
    label: 'Regen-first',
    tagline: 'Soil, water, canopy before throughput',
    signalLabel: 'first regenerative action',
    signalDescription:
      'Cover-crop strips, food forests, silvopasture, windbreaks, rain catchment, greywater, biochar \u2014 land-systems work that compounds.',
  },
  {
    key: 'habitation',
    label: 'Habitation-first',
    tagline: 'Steward on-site as soon as possible',
    signalLabel: 'first habitable structure',
    signalDescription:
      'Cabin, yurt, earthship, tent platform \u2014 the structures that let the steward live on the land while the rest is built.',
  },
];

// Per-scenario signal classifiers. Strings rather than typed enums so the
// card stays loose to manifest drift in the entity stores.
function classifySignal(scenario: ScenarioKey, kind: string, type: string): boolean {
  const t = (type || '').toLowerCase();
  if (scenario === 'revenue') {
    if (kind === 'crop')
      return ['market_garden', 'row_crop', 'orchard', 'nursery', 'garden_bed'].includes(t);
    if (kind === 'structure')
      return ['greenhouse', 'barn', 'workshop', 'storage', 'pavilion'].includes(t);
    return false;
  }
  if (scenario === 'regen') {
    if (kind === 'crop')
      return ['food_forest', 'silvopasture', 'windbreak', 'shelterbelt', 'pollinator_strip'].includes(t);
    if (kind === 'utility')
      return ['rain_catchment', 'greywater', 'biochar', 'compost'].includes(t);
    if (kind === 'structure') return ['compost_station'].includes(t);
    return false;
  }
  if (scenario === 'habitation') {
    if (kind === 'structure')
      return ['cabin', 'yurt', 'earthship', 'tent_glamping', 'bathhouse'].includes(t);
    return false;
  }
  return false;
}

interface PhaseSignal {
  phaseName: string;
  phaseOrder: number;
  timeframe: string;
  color: string;
  count: number;
}

interface ScenarioResult {
  scenario: Scenario;
  perPhase: PhaseSignal[];
  firstPhase: PhaseSignal | null;
  totalCount: number;
  phasesCarrying: number;
  totalPhases: number;
}

export default function ScenarioPhasingAlternativesCard({ projectId }: Props) {
  const allPhases = usePhaseStore((s) => s.phases);
  const allCrops = useCropStore((s) => s.cropAreas);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allStructures = useStructureStore((s) => s.structures);
  const allUtilities = useUtilityStore((s) => s.utilities);

  const [activeScenario, setActiveScenario] = useState<ScenarioKey>('revenue');

  const phases = useMemo(
    () =>
      allPhases
        .filter((p) => p.projectId === projectId)
        .slice()
        .sort((a, b) => a.order - b.order),
    [allPhases, projectId],
  );

  const crops = useMemo(
    () => allCrops.filter((c) => c.projectId === projectId),
    [allCrops, projectId],
  );
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );
  const structures = useMemo(
    () => allStructures.filter((s) => s.projectId === projectId),
    [allStructures, projectId],
  );
  const utilities = useMemo(
    () => allUtilities.filter((u) => u.projectId === projectId),
    [allUtilities, projectId],
  );

  const scenarioResults: ScenarioResult[] = useMemo(() => {
    return SCENARIOS.map((scenario) => {
      const perPhase: PhaseSignal[] = phases.map((p) => {
        let count = 0;
        for (const c of crops) {
          if (c.phase === p.name && classifySignal(scenario.key, 'crop', String(c.type ?? ''))) count += 1;
        }
        // Paddocks have no `type` field on the entity; they don\u2019t carry
        // signal in any of the three current scenarios.
        void paddocks;
        for (const st of structures) {
          if (st.phase === p.name && classifySignal(scenario.key, 'structure', String(st.type ?? ''))) count += 1;
        }
        for (const u of utilities) {
          if (u.phase === p.name && classifySignal(scenario.key, 'utility', String(u.type ?? ''))) count += 1;
        }
        return {
          phaseName: p.name,
          phaseOrder: p.order,
          timeframe: p.timeframe,
          color: p.color,
          count,
        };
      });
      const firstPhase = perPhase.find((r) => r.count > 0) ?? null;
      const totalCount = perPhase.reduce((acc, r) => acc + r.count, 0);
      const phasesCarrying = perPhase.filter((r) => r.count > 0).length;
      return {
        scenario,
        perPhase,
        firstPhase,
        totalCount,
        phasesCarrying,
        totalPhases: phases.length,
      };
    });
  }, [phases, crops, paddocks, structures, utilities]);

  const activeResult =
    scenarioResults.find((r) => r.scenario.key === activeScenario) ?? scenarioResults[0];

  return (
    <section className={css.card} aria-label="Scenario phasing alternatives">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Scenario Phasing Alternatives</h3>
          <p className={css.cardHint}>
            Three strategy lenses over the current phase ordering. Each lens shows where its key
            signal first appears in your build sequence {'\u2014'} not a re-sequencing
            recommendation, a prompt to sit with.
          </p>
        </div>
        <span className={css.modeBadge}>SCENARIOS</span>
      </header>

      <div className={css.scenarioTabs} role="tablist" aria-label="Scenario lens">
        {SCENARIOS.map((scenario) => {
          const isActive = scenario.key === activeScenario;
          const result = scenarioResults.find((r) => r.scenario.key === scenario.key);
          const firstOrder = result?.firstPhase?.phaseOrder ?? null;
          return (
            <button
              key={scenario.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`${css.scenarioTab} ${isActive ? css.scenarioTabActive : ''}`}
              onClick={() => setActiveScenario(scenario.key)}
            >
              <span className={css.scenarioTabLabel}>{scenario.label}</span>
              <span className={css.scenarioTabFirst}>
                {firstOrder == null ? 'no signal' : `first @ Phase ${firstOrder}`}
              </span>
            </button>
          );
        })}
      </div>

      {activeResult ? <ResultPanel result={activeResult} /> : null}

      <p className={css.footnote}>
        Lenses are heuristic prompts, not budgets. A late "first signal" in revenue-first might
        be entirely correct if regeneration was the priority {'\u2014'} it just makes the
        trade-off legible.
      </p>
    </section>
  );
}

function ResultPanel({ result }: { result: ScenarioResult }) {
  const { scenario, perPhase, firstPhase, totalCount, phasesCarrying, totalPhases } = result;

  const lateSignal =
    firstPhase != null && totalPhases > 0 && firstPhase.phaseOrder > Math.ceil(totalPhases / 2);
  const noSignal = firstPhase == null;

  return (
    <div className={css.resultPanel}>
      <p className={css.scenarioTagline}>
        <strong>{scenario.label}</strong> {'\u2014'} {scenario.tagline}
      </p>
      <p className={css.scenarioSignal}>
        Tracks the {scenario.signalLabel}. {scenario.signalDescription}
      </p>

      <div className={css.statRow}>
        <div className={css.stat}>
          <div className={css.statValue}>
            {firstPhase ? firstPhase.phaseOrder : '\u2014'}
          </div>
          <div className={css.statLabel}>First-signal phase</div>
        </div>
        <div className={css.stat}>
          <div className={css.statValue}>{totalCount}</div>
          <div className={css.statLabel}>Items in lens</div>
        </div>
        <div className={css.stat}>
          <div className={css.statValue}>
            {phasesCarrying}
            <span className={css.statDenom}>/{totalPhases || '0'}</span>
          </div>
          <div className={css.statLabel}>Phases carrying it</div>
        </div>
      </div>

      <ul className={css.phaseStrip}>
        {perPhase.map((row) => {
          const hasSignal = row.count > 0;
          const isFirst = firstPhase?.phaseName === row.phaseName;
          return (
            <li
              key={row.phaseName}
              className={`${css.phaseChip} ${hasSignal ? css.phaseChipOn : css.phaseChipOff} ${isFirst ? css.phaseChipFirst : ''}`}
            >
              <span className={css.phaseChipDot} style={{ background: row.color }} aria-hidden="true" />
              <div className={css.phaseChipBody}>
                <div className={css.phaseChipName}>{row.phaseName}</div>
                <div className={css.phaseChipCount}>
                  {hasSignal ? `${row.count} item${row.count === 1 ? '' : 's'}` : 'no signal'}
                </div>
              </div>
              {isFirst && <span className={css.phaseChipFirstBadge}>FIRST</span>}
            </li>
          );
        })}
      </ul>

      {noSignal ? (
        <div className={css.nudgeMissing}>
          No items match this lens yet. If this strategy matters to the project, the steward
          should add at least one element to an early phase.
        </div>
      ) : lateSignal ? (
        <div className={css.nudgeLate}>
          First signal lands in the second half of the build. Worth sitting with: is the
          deferral intentional, or has this lens drifted out of focus?
        </div>
      ) : (
        <div className={css.nudgeOk}>
          Signal lands early in the sequence {'\u2014'} this lens is reflected in the current
          plan.
        </div>
      )}
    </div>
  );
}
