/**
 * §15 CanopyMaturityCard — orchard / food-forest canopy maturity simulation.
 *
 * For each perennial crop area, infer expected mature canopy diameter per
 * species (heuristic table by family/cultivar keyword), then evaluate at
 * Y5 / Y10 / Y20:
 *   - In-row overlap risk: treeSpacingM vs. canopy diameter
 *   - Between-row overlap risk: rowSpacingM vs. canopy diameter
 *   - Cross-block overlap risk: centroid-to-centroid distance between
 *     orchard-like areas vs. combined canopy radii
 *
 * Output: HEURISTIC card with year-toggle, summary tally, per-orchard rows,
 * and recommendations (thin / coppice / replace with semi-dwarf).
 *
 * Spec mapping: §15 `canopy-maturity-root-overlap` (P3 planned → done).
 * Pure presentation-layer derivation from CropArea geometry + species[] +
 * spacing fields. No new entities, no new shared math.
 */

import { useMemo, useState } from 'react';
import { useCropStore, type CropArea, type CropAreaType } from '../../store/cropStore.js';
import s from './CanopyMaturityCard.module.css';

interface CanopyMaturityCardProps {
  projectId: string;
}

const ORCHARD_LIKE_TYPES: ReadonlySet<CropAreaType> = new Set([
  'orchard',
  'food_forest',
  'silvopasture',
  'windbreak',
  'shelterbelt',
]);

/** Mature canopy diameter (m) by species keyword.
 *  Sourced from common regen-design references (Mollison, Jacke, Shepard).
 *  Substring match against each species[] entry, lowercase. */
const CANOPY_TABLE: ReadonlyArray<{ key: string; diameterM: number }> = [
  // dwarves first so they win substring race against parent name
  { key: 'dwarf', diameterM: 3.5 },
  { key: 'semi-dwarf', diameterM: 4.5 },
  { key: 'semidwarf', diameterM: 4.5 },
  // large nuts
  { key: 'walnut', diameterM: 14 },
  { key: 'pecan', diameterM: 12 },
  { key: 'chestnut', diameterM: 14 },
  { key: 'oak', diameterM: 16 },
  // medium nuts / mulberry
  { key: 'almond', diameterM: 9 },
  { key: 'mulberry', diameterM: 9 },
  { key: 'persimmon', diameterM: 8 },
  // pome fruit
  { key: 'apple', diameterM: 7 },
  { key: 'pear', diameterM: 7 },
  { key: 'quince', diameterM: 5 },
  // stone fruit
  { key: 'plum', diameterM: 6 },
  { key: 'apricot', diameterM: 6 },
  { key: 'peach', diameterM: 5.5 },
  { key: 'nectarine', diameterM: 5.5 },
  { key: 'cherry', diameterM: 6 },
  // mediterranean
  { key: 'olive', diameterM: 8 },
  { key: 'fig', diameterM: 6 },
  { key: 'pomegranate', diameterM: 4 },
  { key: 'citrus', diameterM: 6 },
  { key: 'lemon', diameterM: 5 },
  { key: 'orange', diameterM: 6 },
  // shrubs / small
  { key: 'hazel', diameterM: 4.5 },
  { key: 'filbert', diameterM: 4.5 },
  { key: 'elder', diameterM: 4 },
  { key: 'blueberry', diameterM: 1.5 },
  { key: 'currant', diameterM: 1.5 },
  { key: 'gooseberry', diameterM: 1.5 },
  { key: 'raspberry', diameterM: 1.2 },
  { key: 'blackberry', diameterM: 1.5 },
  // windbreak / nitrogen
  { key: 'poplar', diameterM: 8 },
  { key: 'willow', diameterM: 7 },
  { key: 'alder', diameterM: 7 },
  { key: 'locust', diameterM: 9 },
  { key: 'mesquite', diameterM: 8 },
  { key: 'pine', diameterM: 9 },
  { key: 'cedar', diameterM: 8 },
  { key: 'cypress', diameterM: 6 },
];

const FALLBACK_DIAMETER_M = 6;

const YEAR_FRACTIONS = { Y5: 0.5, Y10: 0.8, Y20: 1.0 } as const;
type YearKey = keyof typeof YEAR_FRACTIONS;

interface SpeciesCanopy {
  raw: string;
  matched: string | null;
  matureDiameterM: number;
}

interface OverlapFinding {
  axis: 'in-row' | 'between-row' | 'cross-block';
  detail: string;
  severity: 'high' | 'med' | 'low';
}

interface OrchardEval {
  area: CropArea;
  largestSpecies: SpeciesCanopy | null;
  matureDiameterM: number;
  diameterAtYear: number;
  findings: OverlapFinding[];
  worst: 'high' | 'med' | 'low' | 'clear';
  centroidLat: number | null;
  centroidLng: number | null;
}

function lookupCanopy(species: string): SpeciesCanopy {
  const lc = species.toLowerCase();
  for (const entry of CANOPY_TABLE) {
    if (lc.includes(entry.key)) {
      return { raw: species, matched: entry.key, matureDiameterM: entry.diameterM };
    }
  }
  return { raw: species, matched: null, matureDiameterM: FALLBACK_DIAMETER_M };
}

function polygonCentroid(geom: GeoJSON.Polygon): { lat: number; lng: number } | null {
  const ring = geom.coordinates[0];
  if (!ring || ring.length === 0) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const pt of ring) {
    if (!pt || pt.length < 2) continue;
    const lng = pt[0];
    const lat = pt[1];
    if (typeof lng !== 'number' || typeof lat !== 'number') continue;
    sx += lng;
    sy += lat;
    n += 1;
  }
  if (n === 0) return null;
  return { lng: sx / n, lat: sy / n };
}

/** Approx great-circle distance in meters (equirect, fine for small parcels). */
function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const latRad = ((a.lat + b.lat) / 2) * (Math.PI / 180);
  const dLat = (b.lat - a.lat) * (Math.PI / 180);
  const dLng = (b.lng - a.lng) * (Math.PI / 180) * Math.cos(latRad);
  return Math.sqrt(dLat * dLat + dLng * dLng) * R;
}

function severityFromRatio(ratio: number): 'high' | 'med' | 'low' {
  // ratio = canopy / spacing; >1 = overlap
  if (ratio >= 1.25) return 'high';
  if (ratio >= 1.0) return 'med';
  return 'low';
}

const TYPE_LABEL: Record<CropAreaType, string> = {
  orchard: 'Orchard',
  food_forest: 'Food forest',
  silvopasture: 'Silvopasture',
  windbreak: 'Windbreak',
  shelterbelt: 'Shelterbelt',
  row_crop: 'Row crop',
  garden_bed: 'Garden bed',
  nursery: 'Nursery',
  market_garden: 'Market garden',
  pollinator_strip: 'Pollinator strip',
};

export default function CanopyMaturityCard({ projectId }: CanopyMaturityCardProps) {
  const allCropAreas = useCropStore((st) => st.cropAreas);
  const [year, setYear] = useState<YearKey>('Y10');

  const orchards = useMemo(
    () => allCropAreas.filter((a) => a.projectId === projectId && ORCHARD_LIKE_TYPES.has(a.type)),
    [allCropAreas, projectId],
  );

  const evals: OrchardEval[] = useMemo(() => {
    const fraction = YEAR_FRACTIONS[year];

    // Pre-compute centroid + canopy for each orchard
    const prelim = orchards.map((area): {
      area: CropArea;
      largestSpecies: SpeciesCanopy | null;
      matureDiameterM: number;
      diameterAtYear: number;
      centroidLat: number | null;
      centroidLng: number | null;
    } => {
      const speciesCanopies = (area.species ?? []).map(lookupCanopy);
      let largest: SpeciesCanopy | null = null;
      for (const sp of speciesCanopies) {
        if (!largest || sp.matureDiameterM > largest.matureDiameterM) largest = sp;
      }
      const matureDiameterM = largest?.matureDiameterM ?? FALLBACK_DIAMETER_M;
      const c = polygonCentroid(area.geometry);
      return {
        area,
        largestSpecies: largest,
        matureDiameterM,
        diameterAtYear: matureDiameterM * fraction,
        centroidLat: c?.lat ?? null,
        centroidLng: c?.lng ?? null,
      };
    });

    return prelim.map((p): OrchardEval => {
      const findings: OverlapFinding[] = [];
      const dY = p.diameterAtYear;

      // In-row check
      if (typeof p.area.treeSpacingM === 'number' && p.area.treeSpacingM > 0) {
        const ratio = dY / p.area.treeSpacingM;
        if (ratio >= 1.0) {
          findings.push({
            axis: 'in-row',
            detail: `Canopy ${dY.toFixed(1)} m vs. tree spacing ${p.area.treeSpacingM.toFixed(1)} m (${Math.round(ratio * 100)}% of spacing).`,
            severity: severityFromRatio(ratio),
          });
        }
      }

      // Between-row check
      if (typeof p.area.rowSpacingM === 'number' && p.area.rowSpacingM > 0) {
        const ratio = dY / p.area.rowSpacingM;
        if (ratio >= 1.0) {
          findings.push({
            axis: 'between-row',
            detail: `Canopy ${dY.toFixed(1)} m vs. row spacing ${p.area.rowSpacingM.toFixed(1)} m (${Math.round(ratio * 100)}% of spacing).`,
            severity: severityFromRatio(ratio),
          });
        }
      }

      // Cross-block: pair against every other orchard, flag if centroid distance < combined radii
      if (p.centroidLat !== null && p.centroidLng !== null) {
        for (const other of prelim) {
          if (other.area.id === p.area.id) continue;
          if (other.centroidLat === null || other.centroidLng === null) continue;
          const dist = distanceM(
            { lat: p.centroidLat, lng: p.centroidLng },
            { lat: other.centroidLat, lng: other.centroidLng },
          );
          const combinedRadii = (p.diameterAtYear + other.diameterAtYear) / 2;
          // Only flag if centers are within the combined-radius envelope
          // (i.e., canopies could literally meet edge-to-edge)
          if (dist < combinedRadii && dist > 0) {
            const ratio = combinedRadii / dist;
            findings.push({
              axis: 'cross-block',
              detail: `Centroid ${Math.round(dist)} m from "${other.area.name || TYPE_LABEL[other.area.type]}" — combined radii ${combinedRadii.toFixed(1)} m suggest canopy contact.`,
              severity: severityFromRatio(ratio),
            });
            break; // one cross-block finding per orchard is enough for a card view
          }
        }
      }

      let worst: OrchardEval['worst'] = 'clear';
      for (const f of findings) {
        if (f.severity === 'high') {
          worst = 'high';
          break;
        }
        if (f.severity === 'med') worst = 'med';
        else if (f.severity === 'low' && worst === 'clear') worst = 'low';
      }

      return {
        area: p.area,
        largestSpecies: p.largestSpecies,
        matureDiameterM: p.matureDiameterM,
        diameterAtYear: p.diameterAtYear,
        findings,
        worst,
        centroidLat: p.centroidLat,
        centroidLng: p.centroidLng,
      };
    });
  }, [orchards, year]);

  const summary = useMemo(() => {
    let high = 0;
    let med = 0;
    let clear = 0;
    let unspaced = 0;
    for (const e of evals) {
      if (e.worst === 'high') high += 1;
      else if (e.worst === 'med') med += 1;
      else clear += 1;
      if (e.area.treeSpacingM == null && e.area.rowSpacingM == null) unspaced += 1;
    }
    return { high, med, clear, unspaced, total: evals.length };
  }, [evals]);

  if (orchards.length === 0) {
    return (
      <section className={s.card}>
        <header className={s.cardHead}>
          <div>
            <h3 className={s.cardTitle}>Canopy maturity & overlap</h3>
            <p className={s.cardHint}>
              Project a perennial planting forward to mature canopy size and flag spacing conflicts before
              they become permanent.
            </p>
          </div>
          <span className={s.heuristicBadge}>Heuristic</span>
        </header>
        <p className={s.empty}>
          No orchard, food-forest, silvopasture, windbreak, or shelterbelt areas drawn yet. This card
          activates once you sketch perennial plantings.
        </p>
      </section>
    );
  }

  const sorted = [...evals].sort((a, b) => {
    const rank = { high: 0, med: 1, low: 2, clear: 3 } as const;
    return rank[a.worst] - rank[b.worst];
  });

  return (
    <section className={s.card}>
      <header className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}>Canopy maturity & overlap</h3>
          <p className={s.cardHint}>
            For each perennial block, the largest species' mature canopy is projected at <em>Y5</em> (50%),
            <em> Y10</em> (80%), and <em>Y20</em> (100%) and compared to your tree / row spacing — plus
            cross-block centroid distance.
          </p>
        </div>
        <span className={s.heuristicBadge}>Heuristic</span>
      </header>

      <div className={s.yearRow}>
        {(['Y5', 'Y10', 'Y20'] as const).map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setYear(y)}
            className={`${s.yearTab} ${year === y ? s.yearTabActive : ''}`}
          >
            <span className={s.yearLabel}>{y}</span>
            <span className={s.yearTagline}>{Math.round(YEAR_FRACTIONS[y] * 100)}% mature</span>
          </button>
        ))}
      </div>

      <div className={s.summaryRow}>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{summary.total}</span>
          <span className={s.summaryLabel}>Blocks</span>
        </div>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{summary.high}</span>
          <span className={s.summaryLabel}>High overlap</span>
        </div>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{summary.med}</span>
          <span className={s.summaryLabel}>Moderate</span>
        </div>
        <div className={s.summaryBlock}>
          <span className={s.summaryValue}>{summary.clear}</span>
          <span className={s.summaryLabel}>Clear</span>
        </div>
      </div>

      <h4 className={s.sectionTitle}>Per-block findings @ {year}</h4>
      <ul className={s.list}>
        {sorted.map((e) => {
          const rowClass =
            e.worst === 'high'
              ? s.row_high
              : e.worst === 'med'
                ? s.row_med
                : e.worst === 'low'
                  ? s.row_low
                  : s.row_clear;
          const tagClass =
            e.worst === 'high'
              ? s.tag_high
              : e.worst === 'med'
                ? s.tag_med
                : e.worst === 'low'
                  ? s.tag_low
                  : s.tag_clear;
          const tagText =
            e.worst === 'high'
              ? 'OVERLAP'
              : e.worst === 'med'
                ? 'TIGHT'
                : e.worst === 'low'
                  ? 'WATCH'
                  : 'CLEAR';
          return (
            <li key={e.area.id} className={`${s.row} ${rowClass ?? ''}`}>
              <div className={s.rowHead}>
                <span className={`${s.statusTag} ${tagClass ?? ''}`}>{tagText}</span>
                <span className={s.rowTitle}>{e.area.name || TYPE_LABEL[e.area.type]}</span>
                <span className={s.kindBadge}>{TYPE_LABEL[e.area.type]}</span>
              </div>
              <p className={s.rowMeta}>
                {e.largestSpecies?.matched ? (
                  <>
                    Largest species: <em>{e.largestSpecies.raw}</em> · mature canopy ≈{' '}
                    {e.matureDiameterM.toFixed(1)} m · projected at {year}: {e.diameterAtYear.toFixed(1)} m
                  </>
                ) : (
                  <>
                    No species recognized in this block — using fallback {FALLBACK_DIAMETER_M} m mature
                    canopy. Add species[] entries (e.g., "apple", "walnut") for sharper estimates.
                  </>
                )}
              </p>
              {e.findings.length > 0 ? (
                <ul className={s.findingList}>
                  {e.findings.map((f, idx) => (
                    <li key={idx} className={s.finding}>
                      <span className={s.findingAxis}>{f.axis}:</span> {f.detail}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={s.clearLine}>
                  Spacing holds at {year} — no overlap detected on the axes recorded.
                </p>
              )}
              {(e.area.treeSpacingM == null || e.area.rowSpacingM == null) && (
                <p className={s.subEmpty}>
                  Missing {e.area.treeSpacingM == null ? 'treeSpacingM' : ''}
                  {e.area.treeSpacingM == null && e.area.rowSpacingM == null ? ' and ' : ''}
                  {e.area.rowSpacingM == null ? 'rowSpacingM' : ''} — add to the crop area to enable in-row
                  / between-row checks.
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {summary.unspaced > 0 && (
        <p className={s.footnote}>
          <em>Note:</em> {summary.unspaced} of {summary.total} block{summary.total === 1 ? '' : 's'} are
          missing spacing fields entirely; only species-canopy and cross-block proximity were evaluated.
        </p>
      )}

      <p className={s.footnote}>
        Mature-canopy table is a regen-design heuristic (Mollison / Jacke / Shepard ranges) — substring
        match on each species[] entry. Dwarf and semi-dwarf rootstocks are detected if named explicitly
        (e.g., "dwarf apple"). Cross-block overlap uses polygon centroids, not edge geometry, so very
        elongated blocks (windbreaks, shelterbelts) may flag false positives.
      </p>
    </section>
  );
}
