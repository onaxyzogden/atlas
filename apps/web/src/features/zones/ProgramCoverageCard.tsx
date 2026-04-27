/**
 * §8 ProgramCoverageCard — habitation / food / livestock / commons
 * coverage audit.
 *
 * The Zone panel already carries an allocation summary, an
 * intent-tuned balance card, a sizing calculator, and a conflict
 * detector. What was missing was the canonical program-quadrant
 * read: across the four primary land-use program types
 * (habitation, food production, livestock, commons), does the
 * project actually have a zone drawn for each, and does each zone
 * have the supporting entities it needs to *function* — dwellings
 * for habitation, crops for food, paddocks for livestock,
 * gathering structures for commons?
 *
 * For each of the four quadrants this card surfaces: zone count,
 * zoned area, share of total zoned area, supporting-entity count
 * sourced from the corresponding entity store (structureStore for
 * habitation + commons, cropStore for food, livestockStore for
 * livestock), and a tone band — empty (no zone drawn), sketch
 * (zone drawn but no supporting entities yet), functional (zone +
 * entities present). A one-line headline summarises how many of
 * the four quadrants are covered.
 *
 * Pure presentation. No engine evaluation, no entity writes, no
 * shared math, no map overlays.
 *
 * Closes manifest §8 `habitation-food-livestock-commons-planning`
 * (P1) partial -> done.
 */

import { useMemo } from 'react';
import type { LandZone } from '../../store/zoneStore.js';
import { useStructureStore, type StructureType } from '../../store/structureStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import css from './ProgramCoverageCard.module.css';

/* ------------------------------------------------------------------ */
/*  Quadrant config                                                    */
/* ------------------------------------------------------------------ */

type Quadrant = 'habitation' | 'food_production' | 'livestock' | 'commons';

const QUADRANT_LABEL: Record<Quadrant, string> = {
  habitation: 'Habitation',
  food_production: 'Food Production',
  livestock: 'Livestock',
  commons: 'Commons',
};

const QUADRANT_HINT: Record<Quadrant, string> = {
  habitation: 'Where stewards and family actually live and work.',
  food_production: 'Annual crops, orchards, kitchen gardens, food forest.',
  livestock: 'Paddocks, grazing rotation, animal shelter areas.',
  commons: 'Shared gathering, fire circle, communal pavilions.',
};

const HABITATION_STRUCTURES: StructureType[] = [
  'cabin',
  'yurt',
  'earthship',
  'bathhouse',
];

const COMMONS_STRUCTURES: StructureType[] = [
  'pavilion',
  'fire_circle',
  'lookout',
  'tent_glamping',
];

const QUADRANT_ENTITY_NOUN: Record<Quadrant, { sing: string; plur: string }> = {
  habitation: { sing: 'dwelling', plur: 'dwellings' },
  food_production: { sing: 'crop', plur: 'crops' },
  livestock: { sing: 'paddock', plur: 'paddocks' },
  commons: { sing: 'gathering structure', plur: 'gathering structures' },
};

/* ------------------------------------------------------------------ */
/*  Tones                                                              */
/* ------------------------------------------------------------------ */

type Tone = 'functional' | 'sketch' | 'empty';

const TONE_LABEL: Record<Tone, string> = {
  functional: 'Functional',
  sketch: 'Sketch',
  empty: 'Not drawn',
};

const TONE_CLASS: Record<Tone, string> = {
  functional: css.toneFunctional!,
  sketch: css.toneSketch!,
  empty: css.toneEmpty!,
};

/* ------------------------------------------------------------------ */
/*  Row shape                                                          */
/* ------------------------------------------------------------------ */

interface Row {
  quadrant: Quadrant;
  zoneCount: number;
  areaM2: number;
  sharePct: number | null;
  entityCount: number;
  tone: Tone;
}

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  projectId: string;
  zones: LandZone[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ProgramCoverageCard({ projectId, zones }: Props) {
  const allStructures = useStructureStore((s) => s.structures);
  const allCrops = useCropStore((s) => s.cropAreas);
  const allPaddocks = useLivestockStore((s) => s.paddocks);

  const { rows, totalProgramAreaM2 } = useMemo(() => {
    const structuresList = Array.isArray(allStructures) ? allStructures : [];
    const cropsList = Array.isArray(allCrops) ? allCrops : [];
    const paddocksList = Array.isArray(allPaddocks) ? allPaddocks : [];
    const zonesList = Array.isArray(zones) ? zones : [];
    const projectStructures = structuresList.filter((s) => s.projectId === projectId);
    const projectCrops = cropsList.filter((c) => c.projectId === projectId);
    const projectPaddocks = paddocksList.filter((p) => p.projectId === projectId);

    const habCount = projectStructures.filter((s) =>
      HABITATION_STRUCTURES.includes(s.type),
    ).length;
    const commonsCount = projectStructures.filter((s) =>
      COMMONS_STRUCTURES.includes(s.type),
    ).length;
    const cropCount = projectCrops.length;
    const paddockCount = projectPaddocks.length;

    const entityCounts: Record<Quadrant, number> = {
      habitation: habCount,
      food_production: cropCount,
      livestock: paddockCount,
      commons: commonsCount,
    };

    const programAreas: Record<Quadrant, number> = {
      habitation: 0,
      food_production: 0,
      livestock: 0,
      commons: 0,
    };
    const programZoneCounts: Record<Quadrant, number> = {
      habitation: 0,
      food_production: 0,
      livestock: 0,
      commons: 0,
    };

    for (const z of zonesList) {
      if (z.category === 'habitation') {
        programAreas.habitation += z.areaM2;
        programZoneCounts.habitation += 1;
      } else if (z.category === 'food_production') {
        programAreas.food_production += z.areaM2;
        programZoneCounts.food_production += 1;
      } else if (z.category === 'livestock') {
        programAreas.livestock += z.areaM2;
        programZoneCounts.livestock += 1;
      } else if (z.category === 'commons') {
        programAreas.commons += z.areaM2;
        programZoneCounts.commons += 1;
      }
    }

    const totalProgramArea =
      programAreas.habitation +
      programAreas.food_production +
      programAreas.livestock +
      programAreas.commons;

    const quads: Quadrant[] = ['habitation', 'food_production', 'livestock', 'commons'];
    const rowList: Row[] = quads.map((q) => {
      const zc = programZoneCounts[q];
      const ec = entityCounts[q];
      const am2 = programAreas[q];
      let tone: Tone;
      if (zc === 0) tone = 'empty';
      else if (ec === 0) tone = 'sketch';
      else tone = 'functional';
      return {
        quadrant: q,
        zoneCount: zc,
        areaM2: am2,
        sharePct: totalProgramArea > 0 ? (am2 / totalProgramArea) * 100 : null,
        entityCount: ec,
        tone,
      };
    });

    return { rows: rowList, totalProgramAreaM2: totalProgramArea };
  }, [allStructures, allCrops, allPaddocks, zones, projectId]);

  const coveredCount = rows.filter((r) => r.tone === 'functional').length;
  const sketchCount = rows.filter((r) => r.tone === 'sketch').length;
  const emptyCount = rows.filter((r) => r.tone === 'empty').length;

  let headlineTone: 'good' | 'fair' | 'poor';
  if (coveredCount === 4) headlineTone = 'good';
  else if (coveredCount + sketchCount === 4) headlineTone = 'fair';
  else headlineTone = 'poor';

  const HEADLINE_TONE_CLASS = {
    good: css.headlineGood!,
    fair: css.headlineFair!,
    poor: css.headlinePoor!,
  } as const;

  return (
    <section className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Program coverage
            <span className={css.badge}>HEURISTIC</span>
            <span className={css.tag}>§8</span>
          </h3>
          <p className={css.cardHint}>
            The four canonical program quadrants &mdash; habitation, food
            production, livestock, commons &mdash; checked against zones drawn
            and entities placed. <em>Functional</em> means a zone exists and at
            least one supporting entity has been placed; <em>sketch</em> means a
            zone is drawn but the supporting entities are still absent.
          </p>
        </div>
        <div className={`${css.headlinePill} ${HEADLINE_TONE_CLASS[headlineTone]}`}>
          <span className={css.headlineLabel}>Coverage</span>
          <span className={css.headlineScore}>
            {coveredCount} <span className={css.headlineScoreDim}>of 4</span>
          </span>
          <span className={css.headlineSub}>
            {sketchCount > 0 && `${sketchCount} sketched`}
            {sketchCount > 0 && emptyCount > 0 && ', '}
            {emptyCount > 0 && `${emptyCount} not drawn`}
            {sketchCount === 0 && emptyCount === 0 && 'all functional'}
          </span>
        </div>
      </div>

      <ul className={css.rowList}>
        {rows.map((row) => (
          <li key={row.quadrant} className={`${css.row} ${TONE_CLASS[row.tone]}`}>
            <div className={css.rowHead}>
              <span className={css.rowName}>{QUADRANT_LABEL[row.quadrant]}</span>
              <span className={`${css.tonePill} ${TONE_CLASS[row.tone]}`}>
                {TONE_LABEL[row.tone]}
              </span>
            </div>
            <p className={css.rowHint}>{QUADRANT_HINT[row.quadrant]}</p>
            <div className={css.rowStats}>
              <div className={css.stat}>
                <span className={css.statLabel}>Zones</span>
                <span className={css.statValue}>
                  {row.zoneCount}
                  <span className={css.statDim}>{row.zoneCount === 1 ? ' drawn' : ' drawn'}</span>
                </span>
              </div>
              <div className={css.stat}>
                <span className={css.statLabel}>Area</span>
                <span className={css.statValue}>
                  {formatArea(row.areaM2)}
                  {row.sharePct !== null && row.zoneCount > 0 && (
                    <span className={css.statDim}> &middot; {row.sharePct.toFixed(0)}% of program</span>
                  )}
                </span>
              </div>
              <div className={css.stat}>
                <span className={css.statLabel}>
                  {QUADRANT_ENTITY_NOUN[row.quadrant].plur[0]!.toUpperCase() +
                    QUADRANT_ENTITY_NOUN[row.quadrant].plur.slice(1)}
                </span>
                <span className={css.statValue}>
                  {row.entityCount}
                  <span className={css.statDim}>
                    {' '}
                    {row.entityCount === 1
                      ? QUADRANT_ENTITY_NOUN[row.quadrant].sing
                      : 'placed'}
                  </span>
                </span>
              </div>
            </div>
            {row.tone === 'empty' && (
              <p className={css.rowFlag}>
                No {QUADRANT_LABEL[row.quadrant].toLowerCase()} zone drawn yet
                &mdash; this program quadrant is unallocated.
              </p>
            )}
            {row.tone === 'sketch' && (
              <p className={css.rowFlag}>
                Zone drawn but no {QUADRANT_ENTITY_NOUN[row.quadrant].plur} placed
                &mdash; the program is reserved on the map but not yet populated.
              </p>
            )}
          </li>
        ))}
      </ul>

      <p className={css.footnote}>
        <em>Scope:</em> coverage is judged against four primary program
        quadrants only. Support categories &mdash; water retention,
        infrastructure, access, buffer &mdash; and specialty categories
        (spiritual, education, retreat, conservation) are evaluated in
        sibling cards. Total program area on this project:{' '}
        <em>{formatArea(totalProgramAreaM2)}</em>.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatArea(m2: number): string {
  if (m2 <= 0) return '0 m\u00B2';
  if (m2 >= 10000) return `${(m2 / 10000).toFixed(2)} ha`;
  return `${Math.round(m2).toLocaleString()} m\u00B2`;
}
