/**
 * §12 AllelopathyWarningCard — flags allelopathic-conflict pairs across
 * placed crop areas.
 *
 * Cross-checks every project crop area against a static lookup table
 * of well-documented allelopathic plants (juglans/juglone, eucalyptus,
 * sunflower residues, fennel, brassica residues, ailanthus, prunus,
 * pinus, asparagus, allium, autumn olive, etc.) and emits a warning
 * whenever a *source* allelopath is placed within its documented
 * suppression buffer of a *target* sensitive crop. Distance is the
 * centroid-to-centroid great-circle separation.
 *
 * Severity bands relative to recommended buffer:
 *   - high:   distance ≤ 50% of buffer (in the suppression zone)
 *   - medium: distance 50–100% of buffer (marginal — design with care)
 *   - low:    distance 100–150% of buffer (near-edge; monitor)
 *   - >150% of buffer: not flagged
 *
 * Pure presentation. Reads `useCropStore` for placed CropArea entries,
 * uses centroid-to-centroid haversine via turf. No new entities, no
 * shared math, no map overlay. Sized as a steward checklist, not a
 * landscape-ecology engine — heuristic v1, source-cited where the
 * literature is unambiguous (juglone, ailanthone) and conservative
 * where it's contextual (sunflower residue, brassica residues).
 *
 * Mounts on PlantingToolDashboard between CompanionRotationPlannerCard
 * and OrchardGuildSuggestionsCard. Manifest mapping: no 1:1 key.
 * Advances §12 multi-facet rollup beneath
 * `pollinator-strip-companion-zone-notes` (P2 done) and
 * `agroforestry-windbreak-shelterbelt-silvopasture` (P2 partial). The
 * proposed key `companion-plant-allelopathy-warnings` does not exist
 * in the manifest. Manifest unchanged.
 */

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import { useCropStore, type CropArea } from '../../store/cropStore.js';
import css from './AllelopathyWarningCard.module.css';

interface Props {
  projectId: string;
}

type Severity = 'high' | 'medium' | 'low';

interface AllelopathRule {
  /** Display label for the source plant (allelopath). */
  sourceLabel: string;
  /** Substrings (case-insensitive) that match the source plant in `species[]`. */
  sourceMatches: string[];
  /** Buffer distance in meters within which suppression is documented. */
  bufferM: number;
  /** Display label for the active compound or mechanism. */
  mechanism: string;
  /** Substrings that match the suppressed/target crops. Empty array = all. */
  targetMatches: string[];
  /** Display label for the family of suppressed crops (for the warning copy). */
  targetLabel: string;
  /** Recommended mitigation copy for the steward. */
  mitigation: string;
}

const RULES: AllelopathRule[] = [
  {
    sourceLabel: 'Black walnut (Juglans nigra)',
    sourceMatches: ['walnut', 'juglans'],
    bufferM: 25, // ~80 ft drip-line + root mass
    mechanism: 'juglone (2,5-dihydroxynaphthalene)',
    targetMatches: ['tomato', 'pepper', 'eggplant', 'potato', 'blueberry', 'apple', 'asparagus', 'cabbage', 'broccoli', 'kale'],
    targetLabel: 'nightshades, blueberries, apples, asparagus, brassicas',
    mitigation: 'Move sensitive plantings beyond the drip-line + 8m, or substitute juglone-tolerant species (squash, beans, carrots, beets, raspberries).',
  },
  {
    sourceLabel: 'Eucalyptus',
    sourceMatches: ['eucalyptus'],
    bufferM: 18, // ~60 ft from documented oils + leaf litter
    mechanism: 'volatile oils + leaf-litter phenolics',
    targetMatches: [],
    targetLabel: 'most understory crops',
    mitigation: 'Avoid downwind/downslope crop placement; remove leaf litter or compost it separately.',
  },
  {
    sourceLabel: 'Sunflower (Helianthus)',
    sourceMatches: ['sunflower', 'helianthus'],
    bufferM: 6,
    mechanism: 'residual chlorogenic + isochlorogenic acids',
    targetMatches: ['bean', 'pea', 'potato', 'tomato'],
    targetLabel: 'legumes and nightshades',
    mitigation: 'Either remove all residue + shallow-till, or wait one season before sowing the sensitive crop in the same plot.',
  },
  {
    sourceLabel: 'Fennel (Foeniculum vulgare)',
    sourceMatches: ['fennel', 'foeniculum'],
    bufferM: 5,
    mechanism: 'volatile aromatic oils suppress germination',
    targetMatches: ['dill', 'coriander', 'cilantro', 'bean', 'tomato'],
    targetLabel: 'dill, coriander, beans, tomatoes',
    mitigation: 'Isolate fennel to its own bed at the edge of the garden — it suppresses many companions.',
  },
  {
    sourceLabel: 'Tree of heaven (Ailanthus altissima)',
    sourceMatches: ['ailanthus', 'tree of heaven'],
    bufferM: 20,
    mechanism: 'ailanthone (broad-spectrum suppressor)',
    targetMatches: [],
    targetLabel: 'most cultivated crops',
    mitigation: 'Remove the tree where feasible — ailanthone is one of the strongest documented allelopaths and persists in soil.',
  },
  {
    sourceLabel: 'Black cherry (Prunus serotina)',
    sourceMatches: ['black cherry', 'prunus serotina'],
    bufferM: 15,
    mechanism: 'cyanogenic glycosides in leaf litter',
    targetMatches: [],
    targetLabel: 'understory crops',
    mitigation: 'Manage leaf litter — sweep or compost off-site. Especially relevant for grazing-adjacent plantings.',
  },
  {
    sourceLabel: 'Pine (Pinus)',
    sourceMatches: ['pine', 'pinus'],
    bufferM: 10,
    mechanism: 'soil acidification + needle phenolics',
    targetMatches: ['cabbage', 'broccoli', 'spinach', 'lettuce', 'beet'],
    targetLabel: 'alkaline-loving brassicas and chenopods',
    mitigation: 'Use raised beds or amend with lime; alternatively interplant blueberries / rhododendrons / azaleas which thrive in acidic soil.',
  },
  {
    sourceLabel: 'Asparagus (Asparagus officinalis)',
    sourceMatches: ['asparagus'],
    bufferM: 4,
    mechanism: 'methional + caffeic acid in mature stands (5+ years)',
    targetMatches: ['tomato', 'potato', 'pepper', 'onion', 'garlic'],
    targetLabel: 'nightshades and alliums',
    mitigation: 'Keep asparagus in a permanent bed; avoid rotating nightshades or alliums into a former asparagus plot for 1–2 years.',
  },
  {
    sourceLabel: 'Allium (garlic / onion)',
    sourceMatches: ['garlic', 'onion', 'allium', 'leek', 'chive', 'shallot'],
    bufferM: 2,
    mechanism: 'sulfur-volatile compounds',
    targetMatches: ['bean', 'pea', 'lentil', 'chickpea', 'legume'],
    targetLabel: 'legumes',
    mitigation: 'Separate allium beds from legume beds — alliums depress nodulation in peas and beans.',
  },
  {
    sourceLabel: 'Autumn olive / Russian olive (Elaeagnus)',
    sourceMatches: ['autumn olive', 'russian olive', 'elaeagnus'],
    bufferM: 8,
    mechanism: 'aggressive nitrogen flush + competitive root mass',
    targetMatches: [],
    targetLabel: 'native understory and small fruit',
    mitigation: 'Coppice or remove if invasive locally; otherwise place sensitive perennials upwind and at least 8m clear.',
  },
];

interface Warning {
  id: string;
  source: { areaId: string; areaName: string; species: string };
  target: { areaId: string; areaName: string; species: string };
  rule: AllelopathRule;
  distanceM: number;
  severity: Severity;
}

const SEVERITY_TONE: Record<Severity, 'rust' | 'amber' | 'gold'> = {
  high: 'rust',
  medium: 'amber',
  low: 'gold',
};

const SEVERITY_LABEL: Record<Severity, string> = {
  high: 'High — inside suppression zone',
  medium: 'Medium — marginal buffer',
  low: 'Low — near-edge, monitor',
};

function severityFor(distanceM: number, bufferM: number): Severity | null {
  const ratio = distanceM / bufferM;
  if (ratio <= 0.5) return 'high';
  if (ratio <= 1.0) return 'medium';
  if (ratio <= 1.5) return 'low';
  return null;
}

/** Find the first species string (in `species[]`) that matches any provided substring. */
function matchSpeciesString(species: string[], needles: string[]): string | null {
  for (const sp of species) {
    const lower = sp.toLowerCase();
    for (const needle of needles) {
      if (lower.includes(needle)) return sp;
    }
  }
  return null;
}

/** When `targetMatches` is empty, ANY species in the area counts as a target. */
function matchTargetSpecies(species: string[], needles: string[]): string | null {
  if (needles.length === 0) return species[0] ?? null;
  return matchSpeciesString(species, needles);
}

function centroidDistanceM(a: CropArea, b: CropArea): number | null {
  try {
    const ca = turf.centroid(a.geometry);
    const cb = turf.centroid(b.geometry);
    // turf.distance returns kilometers by default.
    const km = turf.distance(ca, cb, { units: 'kilometers' });
    return km * 1000;
  } catch {
    return null;
  }
}

export default function AllelopathyWarningCard({ projectId }: Props) {
  const allCrops = useCropStore((s) => s.cropAreas);

  const analysis = useMemo(() => {
    const crops = allCrops.filter((c) => c.projectId === projectId);
    const warnings: Warning[] = [];

    // O(n² × R) — fine for realistic n (<50 crop areas, R=10 rules).
    for (let i = 0; i < crops.length; i++) {
      for (let j = 0; j < crops.length; j++) {
        if (i === j) continue;
        const sourceArea = crops[i]!;
        const targetArea = crops[j]!;
        for (const rule of RULES) {
          const sourceMatch = matchSpeciesString(sourceArea.species, rule.sourceMatches);
          if (!sourceMatch) continue;
          const targetMatch = matchTargetSpecies(targetArea.species, rule.targetMatches);
          if (!targetMatch) continue;
          // Skip same-area self-suppression (allelopath + sensitive in same bed
          // is a separate problem — surfaced by CompanionRotationPlannerCard).
          if (sourceArea.id === targetArea.id) continue;
          const distM = centroidDistanceM(sourceArea, targetArea);
          if (distM === null) continue;
          const sev = severityFor(distM, rule.bufferM);
          if (!sev) continue;
          warnings.push({
            id: `${sourceArea.id}::${targetArea.id}::${rule.sourceLabel}`,
            source: { areaId: sourceArea.id, areaName: sourceArea.name, species: sourceMatch },
            target: { areaId: targetArea.id, areaName: targetArea.name, species: targetMatch },
            rule,
            distanceM: distM,
            severity: sev,
          });
        }
      }
    }

    // Sort: high → medium → low, then ascending distance.
    const sevOrder: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
    warnings.sort((a, b) => {
      const so = sevOrder[a.severity] - sevOrder[b.severity];
      if (so !== 0) return so;
      return a.distanceM - b.distanceM;
    });

    const totals = warnings.reduce(
      (acc, w) => { acc[w.severity] += 1; return acc; },
      { high: 0, medium: 0, low: 0 } as Record<Severity, number>,
    );

    return { cropCount: crops.length, warnings, totals };
  }, [allCrops, projectId]);

  if (analysis.cropCount === 0) {
    return null;
  }

  const headlineTone = analysis.totals.high > 0 ? 'poor' : analysis.totals.medium > 0 ? 'fair' : 'good';

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Allelopathy &amp; suppression warnings</h3>
          <p className={css.hint}>
            Cross-checks placed crop areas against {RULES.length} documented allelopathic
            plants (juglone, ailanthone, sunflower residues, fennel oils, allium volatiles,
            etc.). Centroid-to-centroid distance compared to each rule's recommended buffer.
            Heuristic v1 — sized as a checklist, not a definitive landscape-ecology engine.
          </p>
        </div>
        <span className={`${css.badge} ${css[`badge_${headlineTone}`] ?? ''}`}>
          {analysis.warnings.length === 0
            ? 'No conflicts'
            : `${analysis.totals.high} hi · ${analysis.totals.medium} med · ${analysis.totals.low} low`}
        </span>
      </div>

      {analysis.warnings.length === 0 && (
        <p className={css.cleanState}>
          No allelopathic-conflict pairs detected across {analysis.cropCount} crop area{analysis.cropCount === 1 ? '' : 's'}.
          As you add new species, this card will surface any suppression risks before they manifest.
        </p>
      )}

      {analysis.warnings.length > 0 && (
        <ul className={css.warningList}>
          {analysis.warnings.slice(0, 12).map((w) => {
            const tone = SEVERITY_TONE[w.severity];
            const ratioPct = Math.round((w.distanceM / w.rule.bufferM) * 100);
            return (
              <li key={w.id} className={`${css.warning} ${css[`warning_${tone}`] ?? ''}`}>
                <div className={css.warningHead}>
                  <div className={css.warningTitleBlock}>
                    <span className={css.warningTitle}>
                      <strong>{w.rule.sourceLabel}</strong> &rarr; {w.rule.targetLabel}
                    </span>
                    <span className={css.warningPair}>
                      <em>{w.source.areaName}</em> ({w.source.species}) &nbsp;&middot;&nbsp;
                      <em>{w.target.areaName}</em> ({w.target.species})
                    </span>
                  </div>
                  <span className={`${css.severityBadge} ${css[`badge_${tone}`] ?? ''}`}>
                    {SEVERITY_LABEL[w.severity]}
                  </span>
                </div>
                <p className={css.warningMechanism}>
                  Mechanism: {w.rule.mechanism}. Distance{' '}
                  <strong>{w.distanceM.toFixed(1)} m</strong> vs. recommended buffer{' '}
                  <strong>{w.rule.bufferM} m</strong> ({ratioPct}% of buffer).
                </p>
                <p className={css.warningMitigation}>
                  <span className={css.mitigationLabel}>Mitigation:</span> {w.rule.mitigation}
                </p>
              </li>
            );
          })}
          {analysis.warnings.length > 12 && (
            <li className={css.overflow}>
              +{analysis.warnings.length - 12} more pair{analysis.warnings.length - 12 === 1 ? '' : 's'} not shown — resolve top {12} first.
            </li>
          )}
        </ul>
      )}

      <p className={css.footnote}>
        <em>Heuristic v1.</em> Distance is centroid-to-centroid; field-edge separation
        may be larger or smaller depending on geometry. Species matching is substring-based
        on free-text `species[]` — tag plants with their common or Latin names for the
        check to fire. Same-bed allelopath + sensitive pairs are surfaced by the
        Companion &amp; Rotation Planner above.
      </p>
    </div>
  );
}
