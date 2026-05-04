/**
 * §10 AccessModeCoverageCard — cross-mode access coverage rollup.
 *
 * Atlas's §10 surface ships a dozen substantiating cards (slope audit,
 * conflicts, accessible routes, parking, event flow, etc.), but no
 * card answers the simplest section-header question: across the
 * canonical access modes — vehicular / emergency / service /
 * pedestrian / animal / arrival / quiet — does the project actually
 * have a path drawn for each mode it should need, against its stated
 * project intent? The 11 `PathType` values group into 7 modes; this
 * card audits each group's coverage (count + total length), tones
 * each row functional / sketch / empty, and flags core / expected
 * gaps against `project.projectType`.
 *
 * Pure presentation. Reads usePathStore. No entity writes, no shared
 * math, no map overlays.
 *
 * Closes manifest §10 `access-circulation` section status
 * partial -> done (all 11 leaves were already done; this rolls them
 * up at the section level).
 */

import { useMemo } from 'react';
import { usePathStore, type PathType } from '../../store/pathStore.js';
import css from './AccessModeCoverageCard.module.css';

/* ------------------------------------------------------------------ */
/*  Modes                                                              */
/* ------------------------------------------------------------------ */

type ModeKey = 'vehicular' | 'emergency' | 'service' | 'pedestrian' | 'animal' | 'arrival' | 'quiet';
type Tone = 'empty' | 'sketch' | 'functional';
type Criticality = 'core' | 'expected' | 'nice' | 'ignore';

interface ModeDef {
  key: ModeKey;
  label: string;
  blurb: string;
  types: PathType[];
}

const MODES: ModeDef[] = [
  { key: 'vehicular',  label: 'Vehicular',  blurb: 'Main and secondary road network.',           types: ['main_road', 'secondary_road'] },
  { key: 'emergency',  label: 'Emergency',  blurb: 'Fire, ambulance, evacuation reach.',          types: ['emergency_access'] },
  { key: 'service',    label: 'Service',    blurb: 'Operational and farm-lane routes.',           types: ['service_road', 'farm_lane'] },
  { key: 'pedestrian', label: 'Pedestrian', blurb: 'Walking, trails, footpath network.',          types: ['pedestrian_path', 'trail'] },
  { key: 'animal',     label: 'Animal',     blurb: 'Livestock corridors and grazing routes.',     types: ['animal_corridor', 'grazing_route'] },
  { key: 'arrival',    label: 'Arrival',    blurb: 'Curated guest-experience approach.',          types: ['arrival_sequence'] },
  { key: 'quiet',      label: 'Quiet',      blurb: 'Acoustically protected reflection routes.',   types: ['quiet_route'] },
];

const TONE_LABEL: Record<Tone, string> = {
  empty: 'No path',
  sketch: 'Sketched',
  functional: 'Functional',
};

const TONE_CLASS: Record<Tone, string> = {
  empty: css.toneEmpty!,
  sketch: css.toneSketch!,
  functional: css.toneFunctional!,
};

const CRIT_LABEL: Record<Criticality, string> = {
  core: 'Core',
  expected: 'Expected',
  nice: 'Nice-to-have',
  ignore: 'Optional',
};

const CRIT_CLASS: Record<Criticality, string> = {
  core: css.critCore!,
  expected: css.critExpected!,
  nice: css.critNice!,
  ignore: css.critIgnore!,
};

/* ------------------------------------------------------------------ */
/*  Project-type need map                                              */
/* ------------------------------------------------------------------ */

const NEEDS_BY_INTENT: Record<string, Record<ModeKey, Criticality>> = {
  regenerative_farm: {
    vehicular: 'core', emergency: 'expected', service: 'core', pedestrian: 'expected',
    animal: 'core', arrival: 'nice', quiet: 'nice',
  },
  retreat_center: {
    vehicular: 'core', emergency: 'core', service: 'expected', pedestrian: 'core',
    animal: 'nice', arrival: 'core', quiet: 'core',
  },
  homestead: {
    vehicular: 'core', emergency: 'expected', service: 'expected', pedestrian: 'expected',
    animal: 'nice', arrival: 'nice', quiet: 'nice',
  },
  educational_farm: {
    vehicular: 'core', emergency: 'core', service: 'expected', pedestrian: 'core',
    animal: 'expected', arrival: 'expected', quiet: 'expected',
  },
  conservation: {
    vehicular: 'expected', emergency: 'expected', service: 'nice', pedestrian: 'core',
    animal: 'expected', arrival: 'nice', quiet: 'expected',
  },
};

const PROJECT_TYPE_LABEL: Record<string, string> = {
  regenerative_farm: 'Regenerative Farm',
  retreat_center: 'Retreat Center',
  homestead: 'Homestead',
  educational_farm: 'Educational Farm',
  conservation: 'Conservation',
};

/* ------------------------------------------------------------------ */
/*  Tone bands                                                         */
/* ------------------------------------------------------------------ */

const FUNCTIONAL_LENGTH_M = 80; // a sketch promotes to functional once total length is meaningful

function deriveTone(count: number, totalLengthM: number): Tone {
  if (count === 0) return 'empty';
  if (count >= 2 && totalLengthM >= FUNCTIONAL_LENGTH_M) return 'functional';
  if (count >= 1 && totalLengthM >= FUNCTIONAL_LENGTH_M * 2) return 'functional';
  return 'sketch';
}

function formatLength(m: number): string {
  if (m === 0) return '0 m';
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

/* ------------------------------------------------------------------ */
/*  Row                                                                */
/* ------------------------------------------------------------------ */

interface ModeRow extends ModeDef {
  count: number;
  totalLengthM: number;
  tone: Tone;
  need: Criticality;
  isGap: boolean; // need is core/expected and tone is empty
}

interface Project {
  id: string;
  projectType: string | null;
}

interface Props {
  project: Project;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AccessModeCoverageCard({ project }: Props) {
  const allPaths = usePathStore((s) => s.paths);

  const { rows, totalLengthM, totalPaths, projectType, intentLabel } = useMemo(() => {
    const paths = allPaths.filter((pa) => pa.projectId === project.id);
    const pType = project.projectType ?? '';
    const needs = NEEDS_BY_INTENT[pType];

    const grandLength = paths.reduce((acc, p) => acc + (p.lengthM ?? 0), 0);

    const out: ModeRow[] = MODES.map((m) => {
      const matching = paths.filter((p) => m.types.includes(p.type));
      const count = matching.length;
      const len = matching.reduce((acc, p) => acc + (p.lengthM ?? 0), 0);
      const tone = deriveTone(count, len);
      const need = needs?.[m.key] ?? 'ignore';
      const isGap = (need === 'core' || need === 'expected') && tone === 'empty';
      return { ...m, count, totalLengthM: len, tone, need, isGap };
    });

    return {
      rows: out,
      totalLengthM: grandLength,
      totalPaths: paths.length,
      projectType: pType,
      intentLabel: PROJECT_TYPE_LABEL[pType] ?? null,
    };
  }, [allPaths, project.id, project.projectType]);

  const coreGaps = rows.filter((r) => r.need === 'core' && r.tone === 'empty').length;
  const expectedGaps = rows.filter((r) => r.need === 'expected' && r.tone === 'empty').length;
  const expectedRows = rows.filter((r) => r.need === 'core' || r.need === 'expected');
  const expectedCovered = expectedRows.filter((r) => r.tone !== 'empty').length;

  let verdict: 'unknown' | 'block' | 'work' | 'done';
  let verdictText: string;
  if (!projectType) {
    verdict = 'unknown';
    verdictText = 'Project type not set — coverage thresholds unavailable.';
  } else if (coreGaps > 0) {
    verdict = 'block';
    verdictText = `${coreGaps} core mode gap${coreGaps === 1 ? '' : 's'} for ${intentLabel ?? projectType}.`;
  } else if (expectedGaps > 0) {
    verdict = 'work';
    verdictText = `${expectedGaps} expected mode gap${expectedGaps === 1 ? '' : 's'} — coverage incomplete.`;
  } else {
    verdict = 'done';
    verdictText = `All expected modes have at least one path drawn.`;
  }

  const VERDICT_CLASS = {
    unknown: css.verdictUnknown!,
    block: css.verdictBlock!,
    work: css.verdictWork!,
    done: css.verdictDone!,
  } as const;

  const VERDICT_LABEL = {
    unknown: 'No project type',
    block: 'Core gaps',
    work: 'Expected gaps',
    done: 'Covered',
  } as const;

  return (
    <section className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Access mode coverage
            <span className={css.badge}>HEURISTIC</span>
            <span className={css.tag}>§10</span>
          </h3>
          <p className={css.cardHint}>
            Across the seven canonical access modes &mdash; vehicular,
            emergency, service, pedestrian, animal, arrival, quiet &mdash; does
            the project carry at least one drawn path for each mode it needs?
            Mode need is tuned by{' '}
            <em>{intentLabel ?? 'project type (not set)'}</em>.
          </p>
        </div>
        <div className={`${css.verdictPill} ${VERDICT_CLASS[verdict]}`}>
          <span className={css.verdictLabel}>{VERDICT_LABEL[verdict]}</span>
          <span className={css.verdictText}>{verdictText}</span>
        </div>
      </div>

      <div className={css.statStrip}>
        <Stat label="Modes covered" value={`${expectedCovered}/${expectedRows.length}`} sub="of expected" />
        <Stat label="Core gaps" value={coreGaps} sub={coreGaps === 0 ? 'none' : 'must address'} tone={coreGaps > 0 ? 'bad' : 'good'} />
        <Stat label="Expected gaps" value={expectedGaps} sub={expectedGaps === 0 ? 'none' : 'review'} tone={expectedGaps > 0 ? 'warn' : 'good'} />
        <Stat label="Total network" value={formatLength(totalLengthM)} sub={`${totalPaths} path${totalPaths === 1 ? '' : 's'}`} />
      </div>

      <ul className={css.modeList}>
        {rows.map((row) => (
          <li
            key={row.key}
            className={`${css.modeRow} ${TONE_CLASS[row.tone]} ${row.isGap ? css.modeRowGap : ''}`}
          >
            <div className={css.modeHead}>
              <span className={css.modeName}>{row.label}</span>
              <span className={`${css.tonePill} ${TONE_CLASS[row.tone]}`}>
                {TONE_LABEL[row.tone]}
              </span>
              <span className={`${css.critPill} ${CRIT_CLASS[row.need]}`}>
                {CRIT_LABEL[row.need]}
              </span>
              <span className={css.modeStats}>
                {row.count} path{row.count === 1 ? '' : 's'} &middot; {formatLength(row.totalLengthM)}
              </span>
            </div>
            <p className={css.modeBlurb}>
              {row.blurb}
              {row.isGap && (
                <>
                  {' '}
                  <span className={css.gapInline}>
                    Gap &mdash; {row.need === 'core' ? 'must draw at least one' : 'consider drawing'}.
                  </span>
                </>
              )}
            </p>
          </li>
        ))}
      </ul>

      <p className={css.footnote}>
        <em>Scope:</em> coverage measures presence and total length per mode,
        not per-path quality &mdash; sibling cards on this panel cover slope,
        conflicts, accessibility, parking, event flow, and quiet acoustic
        separation in detail. <em>Sketched</em> rows have a path but a thin
        network; promote to <em>functional</em> by extending or adding routes.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: 'good' | 'warn' | 'bad';
}) {
  const toneClass =
    tone === 'good' ? css.statGood : tone === 'warn' ? css.statWarn : tone === 'bad' ? css.statBad : '';
  return (
    <div className={css.stat}>
      <span className={css.statLabel}>{label}</span>
      <span className={`${css.statValue} ${toneClass}`}>{value}</span>
      {sub && <span className={css.statSub}>{sub}</span>}
    </div>
  );
}
