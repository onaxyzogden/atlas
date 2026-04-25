/**
 * §12 CompanionRotationPlannerCard — heuristic 4-year rotation + companion
 * planting audit for annual crop areas (row_crop / garden_bed / market_garden).
 *
 * Maps each crop area's free-text species[] to plant families using a
 * keyword-match heuristic, then:
 *
 *   - Detects same-family monocultures (rotation risk)
 *   - Surfaces companion-planting conflicts (e.g. allium + legume)
 *   - Proposes a deterministic 4-year rotation sequence per area following
 *     the classic legume → brassica → solanum → root cycle (heavy-feeder
 *     fertility flow with a nitrogen-fixer reset)
 *   - Rolls up site-wide family distribution to spot over-concentration
 *
 * Heuristic only — no soil-test integration, no companion-planting database.
 * Intended as a steward checklist, not a prescription.
 */
import { useMemo } from 'react';
import { useCropStore, type CropArea, type CropAreaType } from '../../store/cropStore.js';
import css from './CompanionRotationPlannerCard.module.css';

const ANNUAL_TYPES: ReadonlySet<CropAreaType> = new Set(['row_crop', 'garden_bed', 'market_garden']);

type Family =
  | 'legume'
  | 'brassica'
  | 'solanum'
  | 'cucurbit'
  | 'allium'
  | 'grass_grain'
  | 'leafy_green'
  | 'root'
  | 'umbellifer'
  | 'other';

const FAMILY_LABEL: Record<Family, string> = {
  legume: 'Legume',
  brassica: 'Brassica',
  solanum: 'Solanaceae',
  cucurbit: 'Cucurbit',
  allium: 'Allium',
  grass_grain: 'Grass / Grain',
  leafy_green: 'Leafy Green',
  root: 'Root',
  umbellifer: 'Umbellifer',
  other: 'Other / Unknown',
};

const FAMILY_TONE: Record<Family, string> = {
  legume: 'rgba(150, 200, 170, 0.8)',
  brassica: 'rgba(170, 200, 150, 0.8)',
  solanum: 'rgba(220, 130, 110, 0.8)',
  cucurbit: 'rgba(220, 180, 100, 0.8)',
  allium: 'rgba(196, 162, 220, 0.7)',
  grass_grain: 'rgba(220, 200, 130, 0.75)',
  leafy_green: 'rgba(150, 220, 180, 0.75)',
  root: 'rgba(196, 162, 101, 0.8)',
  umbellifer: 'rgba(170, 220, 200, 0.7)',
  other: 'rgba(180, 165, 140, 0.55)',
};

// Family detection from free-text species name. Order matters — first match wins.
const FAMILY_KEYWORDS: Array<{ family: Family; patterns: string[] }> = [
  { family: 'legume', patterns: ['bean', 'pea', 'lentil', 'chickpea', 'soy', 'fava', 'lupine', 'clover', 'vetch', 'alfalfa', 'cowpea', 'peanut'] },
  { family: 'brassica', patterns: ['cabbage', 'kale', 'broccoli', 'cauliflower', 'collard', 'kohlrabi', 'mustard', 'turnip', 'rutabaga', 'radish', 'arugula', 'bok choy', 'bok-choy', 'pak choi', 'brussels'] },
  { family: 'solanum', patterns: ['tomato', 'pepper', 'eggplant', 'potato', 'tomatillo', 'aubergine'] },
  { family: 'cucurbit', patterns: ['cucumber', 'squash', 'pumpkin', 'melon', 'zucchini', 'gourd', 'watermelon', 'cantaloupe'] },
  { family: 'allium', patterns: ['onion', 'garlic', 'leek', 'shallot', 'chive', 'scallion'] },
  { family: 'umbellifer', patterns: ['carrot', 'parsnip', 'celery', 'fennel', 'dill', 'cilantro', 'coriander', 'parsley'] },
  { family: 'grass_grain', patterns: ['corn', 'maize', 'wheat', 'oat', 'rye', 'barley', 'sorghum', 'millet', 'rice', 'teff'] },
  { family: 'leafy_green', patterns: ['lettuce', 'spinach', 'chard', 'mache', 'endive', 'radicchio', 'sorrel'] },
  { family: 'root', patterns: ['beet', 'sweet potato', 'yam', 'cassava', 'jerusalem artichoke', 'sunchoke', 'daikon'] },
];

function inferFamily(speciesName: string): Family {
  const n = speciesName.trim().toLowerCase();
  if (!n) return 'other';
  for (const entry of FAMILY_KEYWORDS) {
    for (const pat of entry.patterns) {
      if (n.includes(pat)) return entry.family;
    }
  }
  return 'other';
}

// Classic 4-year cycle: heavy feeder → leaf → fruit → root, anchored on a
// nitrogen-fixer to reset fertility.
const ROTATION_CYCLE: Family[] = ['legume', 'brassica', 'solanum', 'root'];

function nextRotation(currentFamilies: Family[]): Family[] {
  // Pick the earliest cycle position not represented; build the next 3 years
  // by walking the cycle forward.
  const present = new Set(currentFamilies);
  let startIdx = 0;
  for (let i = 0; i < ROTATION_CYCLE.length; i++) {
    const f = ROTATION_CYCLE[i]!;
    if (!present.has(f)) { startIdx = i; break; }
    if (i === ROTATION_CYCLE.length - 1) startIdx = 0;
  }
  return [
    ROTATION_CYCLE[(startIdx) % 4]!,
    ROTATION_CYCLE[(startIdx + 1) % 4]!,
    ROTATION_CYCLE[(startIdx + 2) % 4]!,
  ];
}

// Companion-planting conflict pairs (well-established negative interactions).
const COMPANION_CONFLICTS: Array<{ a: Family; b: Family; reason: string }> = [
  { a: 'allium', b: 'legume', reason: 'alliums inhibit legume nitrogen fixation' },
  { a: 'brassica', b: 'solanum', reason: 'compete for the same heavy-feeder fertility' },
  { a: 'cucurbit', b: 'solanum', reason: 'shared late-blight + viral disease pressure' },
  { a: 'allium', b: 'umbellifer', reason: 'allelopathic suppression of carrot/parsley germination' },
];

function findConflicts(families: Family[]): Array<{ a: Family; b: Family; reason: string }> {
  const set = new Set(families);
  return COMPANION_CONFLICTS.filter((c) => set.has(c.a) && set.has(c.b));
}

interface AreaRow {
  area: CropArea;
  families: Family[];
  primaryFamily: Family;
  conflicts: Array<{ a: Family; b: Family; reason: string }>;
  recommended: Family[];
  monoculture: boolean; // single family detected
}

interface Props {
  projectId: string;
}

export default function CompanionRotationPlannerCard({ projectId }: Props) {
  const allCropAreas = useCropStore((s) => s.cropAreas);

  const annualAreas = useMemo(
    () => allCropAreas.filter((a) => a.projectId === projectId && ANNUAL_TYPES.has(a.type)),
    [allCropAreas, projectId],
  );

  const rows = useMemo<AreaRow[]>(() => annualAreas.map((area) => {
    const families = Array.from(new Set(area.species.map(inferFamily))) as Family[];
    // Primary family = most common; here we just take the first non-other.
    const primary = families.find((f) => f !== 'other') ?? 'other';
    const conflicts = findConflicts(families);
    const recommended = nextRotation(families);
    return {
      area,
      families,
      primaryFamily: primary,
      conflicts,
      recommended,
      monoculture: families.filter((f) => f !== 'other').length === 1,
    };
  }), [annualAreas]);

  if (annualAreas.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Companion & Rotation Planner</h3>
            <p className={css.cardHint}>
              No annual crop areas (row_crop, garden_bed, market_garden) placed yet. Draw an
              annual area and add species names to surface family-based rotation guidance.
            </p>
          </div>
          <span className={css.heuristicBadge}>AI DRAFT</span>
        </div>
      </div>
    );
  }

  // Site-wide family rollup (acreage by family across all annual areas)
  const familyAreaMap = new Map<Family, number>();
  for (const r of rows) {
    const perFamily = r.area.areaM2 / Math.max(r.families.length, 1);
    for (const f of r.families) {
      familyAreaMap.set(f, (familyAreaMap.get(f) ?? 0) + perFamily);
    }
  }
  const familyRollup = Array.from(familyAreaMap.entries())
    .map(([family, m2]) => ({ family, m2 }))
    .sort((a, b) => b.m2 - a.m2);
  const totalM2 = familyRollup.reduce((s, r) => s + r.m2, 0);

  const totalConflicts = rows.reduce((s, r) => s + r.conflicts.length, 0);
  const monoCount = rows.filter((r) => r.monoculture).length;
  const cleanCount = rows.filter((r) => r.conflicts.length === 0 && !r.monoculture).length;

  const summaryTone = (n: number, threshold: number) =>
    n === 0 ? css.toneGood : n < threshold ? css.toneFair : css.tonePoor;

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Companion & Rotation Planner</h3>
          <p className={css.cardHint}>
            Family-based rotation audit for {rows.length} annual crop area{rows.length === 1 ? '' : 's'}.
            Recommended sequence follows the classic legume → brassica → solanum → root cycle, anchored by
            a nitrogen-fixer reset. Companion conflicts flag well-known negative interactions.
          </p>
        </div>
        <span className={css.heuristicBadge}>AI DRAFT</span>
      </div>

      <div className={css.summaryRow}>
        <div className={css.summaryStat}>
          <div className={css.summaryLabel}>Audited</div>
          <div className={css.summaryValue}>{rows.length}</div>
          <div className={css.summarySub}>annual areas</div>
        </div>
        <div className={css.summaryStat}>
          <div className={css.summaryLabel}>Clean</div>
          <div className={`${css.summaryValue} ${cleanCount === rows.length ? css.toneGood : css.toneFair}`}>{cleanCount}</div>
          <div className={css.summarySub}>no conflicts or mono</div>
        </div>
        <div className={css.summaryStat}>
          <div className={css.summaryLabel}>Monoculture</div>
          <div className={`${css.summaryValue} ${summaryTone(monoCount, 3)}`}>{monoCount}</div>
          <div className={css.summarySub}>single-family beds</div>
        </div>
        <div className={css.summaryStat}>
          <div className={css.summaryLabel}>Conflicts</div>
          <div className={`${css.summaryValue} ${summaryTone(totalConflicts, 3)}`}>{totalConflicts}</div>
          <div className={css.summarySub}>companion pairs</div>
        </div>
      </div>

      {familyRollup.length > 0 && (
        <div className={css.rollupBlock}>
          <div className={css.rollupTitle}>Family distribution (by area)</div>
          <div className={css.rollupBar}>
            {familyRollup.map(({ family, m2 }) => {
              const pct = totalM2 > 0 ? (m2 / totalM2) * 100 : 0;
              return (
                <div
                  key={family}
                  className={css.rollupSeg}
                  style={{ width: `${pct}%`, background: FAMILY_TONE[family] }}
                  title={`${FAMILY_LABEL[family]}: ${m2.toFixed(0)} m² (${pct.toFixed(0)}%)`}
                />
              );
            })}
          </div>
          <div className={css.rollupLegend}>
            {familyRollup.map(({ family, m2 }) => {
              const pct = totalM2 > 0 ? (m2 / totalM2) * 100 : 0;
              return (
                <div key={family} className={css.rollupLegendItem}>
                  <span className={css.rollupSwatch} style={{ background: FAMILY_TONE[family] }} />
                  <span className={css.rollupLabel}>{FAMILY_LABEL[family]}</span>
                  <span className={css.rollupPct}>{pct.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ul className={css.areaList}>
        {rows.map((r) => {
          const tone = r.conflicts.length > 0 ? 'poor' : r.monoculture ? 'fair' : 'good';
          return (
            <li key={r.area.id} className={`${css.areaRow} ${css[`tone_${tone}`] ?? ''}`}>
              <div className={css.areaHead}>
                <div>
                  <div className={css.areaName}>{r.area.name}</div>
                  <div className={css.areaType}>{r.area.type.replace(/_/g, ' ')} · {r.area.areaM2.toFixed(0)} m²</div>
                </div>
                <div className={css.familyChips}>
                  {r.families.length === 0 ? (
                    <span className={css.chipMuted}>no species listed</span>
                  ) : r.families.map((f) => (
                    <span key={f} className={css.familyChip} style={{ background: FAMILY_TONE[f], color: '#1a1a1a' }}>
                      {FAMILY_LABEL[f]}
                    </span>
                  ))}
                </div>
              </div>

              {r.area.species.length > 0 && (
                <div className={css.speciesLine}>
                  Species: <span className={css.speciesNames}>{r.area.species.slice(0, 6).join(', ')}{r.area.species.length > 6 ? `, +${r.area.species.length - 6}` : ''}</span>
                </div>
              )}

              <div className={css.rotationBlock}>
                <div className={css.rotationLabel}>Recommended rotation</div>
                <div className={css.rotationFlow}>
                  <div className={css.rotationStep}>
                    <div className={css.rotationYear}>Year 1 (now)</div>
                    <div className={css.rotationFamily} style={{ background: FAMILY_TONE[r.primaryFamily], color: '#1a1a1a' }}>
                      {FAMILY_LABEL[r.primaryFamily]}
                    </div>
                  </div>
                  {r.recommended.map((f, i) => (
                    <div key={i} className={css.rotationStep}>
                      <div className={css.rotationYear}>Year {i + 2}</div>
                      <div className={css.rotationFamily} style={{ background: FAMILY_TONE[f], color: '#1a1a1a' }}>
                        {FAMILY_LABEL[f]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {(r.conflicts.length > 0 || r.monoculture) && (
                <ul className={css.flagList}>
                  {r.monoculture && (
                    <li className={css.flagFair}>
                      <strong>Monoculture risk</strong> — single family ({FAMILY_LABEL[r.primaryFamily]}) detected. Plan a year-2
                      switch to {FAMILY_LABEL[r.recommended[0] ?? 'legume']} to break disease/pest cycles.
                    </li>
                  )}
                  {r.conflicts.map((c, i) => (
                    <li key={i} className={css.flagPoor}>
                      <strong>{FAMILY_LABEL[c.a]} + {FAMILY_LABEL[c.b]}</strong> — {c.reason}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      <p className={css.footnote}>
        Family detection uses keyword matching on free-text species names — common annual vegetables only.
        Perennial fruit/nut species are not rotated and are excluded. Recommended sequence is a textbook
        4-year cycle; refine against your soil-test schedule, season length, and market plan. Companion
        conflicts reflect <em>well-established negative interactions</em> and are not exhaustive.
      </p>
    </div>
  );
}
