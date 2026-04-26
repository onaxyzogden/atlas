/**
 * §12 TreeSpacingCalculatorCard — audits tree-bearing crop areas against
 * type-default spacing recommendations and surfaces planted density (trees
 * per hectare). Companion to CompanionRotationPlannerCard and
 * CanopyMaturityCard: where those address what to plant and how mature
 * canopies overlap, this addresses whether the spacing on the page actually
 * supports the planted area's intent (productive orchard rows vs dense
 * windbreak vs open silvopasture).
 *
 * Pure presentation: reads useCropStore, no shared-package math, no map.
 */

import { useMemo } from 'react';
import { useCropStore, type CropArea, type CropAreaType } from '../../store/cropStore.js';
import { CROP_TYPES } from '../livestock/speciesData.js';
import css from './TreeSpacingCalculatorCard.module.css';

interface TreeSpacingCalculatorCardProps {
  projectId: string;
}

const TREE_TYPES: ReadonlyArray<CropAreaType> = [
  'orchard',
  'food_forest',
  'windbreak',
  'shelterbelt',
  'silvopasture',
] as const;

type FindingTier = 'green' | 'caution' | 'blocker';

interface Finding {
  tier: FindingTier;
  label: string;
  detail: string;
}

interface SpacingRow {
  area: CropArea;
  recommendedSpacingM: number;
  actualSpacingM: number | null;
  rowSpacingM: number | null;
  ratio: number | null; // actual / recommended
  tier: 'overcrowded' | 'tight' | 'ideal' | 'sparse' | 'unset';
  estimatedTrees: number | null;
  treesPerHa: number | null;
  recommendedTreesPerHa: number;
}

function classifyRow(area: CropArea, recommendedSpacingM: number): SpacingRow {
  const actualSpacingM = area.treeSpacingM;
  const rowSpacingM = area.rowSpacingM;
  const areaHa = area.areaM2 / 10_000;

  // Recommended density: assume square grid at recommended spacing
  const recommendedTreesPerHa = recommendedSpacingM > 0
    ? Math.round(10_000 / (recommendedSpacingM * recommendedSpacingM))
    : 0;

  if (actualSpacingM === null || actualSpacingM <= 0) {
    return {
      area,
      recommendedSpacingM,
      actualSpacingM: null,
      rowSpacingM,
      ratio: null,
      tier: 'unset',
      estimatedTrees: null,
      treesPerHa: null,
      recommendedTreesPerHa,
    };
  }

  const effectiveRowSpacing = rowSpacingM && rowSpacingM > 0 ? rowSpacingM : actualSpacingM;
  const treesPerHa = Math.round(10_000 / (actualSpacingM * effectiveRowSpacing));
  const estimatedTrees = Math.round(treesPerHa * areaHa);

  const ratio = actualSpacingM / recommendedSpacingM;
  let tier: SpacingRow['tier'];
  if (ratio < 0.7) tier = 'overcrowded';
  else if (ratio < 0.9) tier = 'tight';
  else if (ratio <= 1.2) tier = 'ideal';
  else tier = 'sparse';

  return {
    area,
    recommendedSpacingM,
    actualSpacingM,
    rowSpacingM,
    ratio,
    tier,
    estimatedTrees,
    treesPerHa,
    recommendedTreesPerHa,
  };
}

const TIER_LABEL: Record<SpacingRow['tier'], string> = {
  overcrowded: 'Overcrowded',
  tight: 'Tight',
  ideal: 'Ideal',
  sparse: 'Sparse',
  unset: 'Spacing unset',
};

// Planting pattern density factors relative to a square grid baseline.
// - square:     trees on a regular grid; baseline = 10000 / s²
// - triangular: offset rows (each row shifted by s/2) → ~15.5% more per ha
// - quincunx:   square + a tree at every cell center → 2× the square density
const PATTERN_FACTORS = [
  { key: 'square', label: 'Square grid', factor: 1.0 },
  { key: 'triangular', label: 'Triangular (offset rows)', factor: 2 / Math.sqrt(3) },
  { key: 'quincunx', label: 'Quincunx (5-of-dice)', factor: 2.0 },
] as const;

const M_TO_FT = 3.28084;

export default function TreeSpacingCalculatorCard({ projectId }: TreeSpacingCalculatorCardProps) {
  const allAreas = useCropStore((s) => s.cropAreas);
  const treeAreas = useMemo(
    () =>
      allAreas.filter(
        (c) => c.projectId === projectId && (TREE_TYPES as readonly CropAreaType[]).includes(c.type),
      ),
    [allAreas, projectId],
  );

  const rows = useMemo(() => {
    return treeAreas
      .map((area) => {
        const typeInfo = CROP_TYPES[area.type];
        const recommended = typeInfo?.defaultSpacingM ?? 4;
        return classifyRow(area, recommended);
      })
      .sort((a, b) => {
        const tierRank: Record<SpacingRow['tier'], number> = {
          overcrowded: 0,
          unset: 1,
          tight: 2,
          sparse: 3,
          ideal: 4,
        };
        return (tierRank[a.tier] ?? 9) - (tierRank[b.tier] ?? 9);
      });
  }, [treeAreas]);

  const summary = useMemo(() => {
    const totalAreaHa = treeAreas.reduce((acc, a) => acc + a.areaM2 / 10_000, 0);
    const totalTrees = rows.reduce((acc, r) => acc + (r.estimatedTrees ?? 0), 0);
    const meanSpacingM =
      rows.filter((r) => r.actualSpacingM !== null).length > 0
        ? rows
            .filter((r) => r.actualSpacingM !== null)
            .reduce((acc, r) => acc + (r.actualSpacingM ?? 0), 0) /
          rows.filter((r) => r.actualSpacingM !== null).length
        : 0;
    return {
      areas: treeAreas.length,
      totalAreaHa,
      totalTrees,
      meanSpacingM,
    };
  }, [rows, treeAreas]);

  const findings = useMemo<Finding[]>(() => {
    const out: Finding[] = [];
    if (rows.length === 0) return out;

    const overcrowded = rows.filter((r) => r.tier === 'overcrowded');
    if (overcrowded.length > 0) {
      out.push({
        tier: 'blocker',
        label: `${overcrowded.length} overcrowded planting${overcrowded.length === 1 ? '' : 's'}`,
        detail: `Spacing < 70% of recommended will compete for light, water, and root volume: ${overcrowded.slice(0, 3).map((r) => r.area.name).join(', ')}${overcrowded.length > 3 ? '\u2026' : ''}.`,
      });
    }

    const unset = rows.filter((r) => r.tier === 'unset');
    if (unset.length > 0) {
      out.push({
        tier: 'caution',
        label: `${unset.length} planting${unset.length === 1 ? '' : 's'} without spacing`,
        detail: `Cannot estimate density or yield until spacing is set: ${unset.slice(0, 3).map((r) => r.area.name).join(', ')}${unset.length > 3 ? '\u2026' : ''}.`,
      });
    }

    const tight = rows.filter((r) => r.tier === 'tight');
    if (tight.length > 0) {
      out.push({
        tier: 'caution',
        label: `${tight.length} tight planting${tight.length === 1 ? '' : 's'}`,
        detail: `Spacing 70-90% of recommended is workable for thinning-then-cull strategies but watch for early-canopy crowding.`,
      });
    }

    const sparse = rows.filter((r) => r.tier === 'sparse');
    if (sparse.length > 0) {
      out.push({
        tier: 'caution',
        label: `${sparse.length} sparse planting${sparse.length === 1 ? '' : 's'}`,
        detail: `Spacing > 120% of recommended underuses the area. Consider interplanting or reducing footprint: ${sparse.slice(0, 2).map((r) => r.area.name).join(', ')}.`,
      });
    }

    const missingSpecies = rows.filter((r) => r.area.species.length === 0);
    if (missingSpecies.length > 0) {
      out.push({
        tier: 'caution',
        label: `${missingSpecies.length} planting${missingSpecies.length === 1 ? '' : 's'} without species`,
        detail: `Spacing recommendations default to area-type averages; per-species recommendations require species selection.`,
      });
    }

    const smallEdgy = rows.filter((r) => {
      const haSet = r.area.areaM2 / 10_000;
      return haSet > 0 && haSet < 0.5 && r.actualSpacingM !== null;
    });
    if (smallEdgy.length > 0) {
      out.push({
        tier: 'caution',
        label: `${smallEdgy.length} small planting${smallEdgy.length === 1 ? '' : 's'} (<0.5 ha) — edge effect`,
        detail: `Small plots have proportionally more perimeter trees that don't receive full neighbour canopy. Yield estimates assume interior conditions and may overstate by 10\u201320%: ${smallEdgy.slice(0, 2).map((r) => r.area.name).join(', ')}.`,
      });
    }

    const ideal = rows.filter((r) => r.tier === 'ideal');
    if (ideal.length > 0) {
      out.push({
        tier: 'green',
        label: `${ideal.length} planting${ideal.length === 1 ? '' : 's'} at ideal spacing`,
        detail: `Spacing within 90-120% of recommended for the area type.`,
      });
    }

    return out;
  }, [rows]);

  if (treeAreas.length === 0) {
    return (
      <section className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Tree Spacing Calculator</h3>
            <p className={css.cardHint}>
              Audits tree-bearing plantings (orchard, food forest, windbreak, shelterbelt,
              silvopasture) against type-default spacing. Draw tree areas to populate.
            </p>
          </div>
          <span className={css.modeBadge}>Calc</span>
        </div>
        <div className={css.empty}>No tree-bearing crop areas in this project yet.</div>
      </section>
    );
  }

  const verdictTier: FindingTier = findings.some((f) => f.tier === 'blocker')
    ? 'blocker'
    : findings.some((f) => f.tier === 'caution')
    ? 'caution'
    : 'green';

  const verdictText = {
    green: 'Tree spacing is within ideal range across all plantings.',
    caution: 'Tree spacing is workable; address cautions before maturity.',
    blocker: 'Overcrowded plantings will fail to mature; revise spacing or thin early.',
  }[verdictTier];

  const verdictTone =
    verdictTier === 'green'
      ? css.verdictGreen
      : verdictTier === 'caution'
      ? css.verdictCaution
      : css.verdictBlocker;

  return (
    <section className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Tree Spacing Calculator</h3>
          <p className={css.cardHint}>
            Per-area density rollup with type-default spacing recommendations. Surfaces
            overcrowding before canopy closure and sparse plantings that underuse the
            footprint. Recommended spacing pulls from `CROP_TYPES.defaultSpacingM`.
          </p>
        </div>
        <span className={css.modeBadge}>Calc</span>
      </div>

      {/* Verdict */}
      <div className={`${css.verdictBanner} ${verdictTone}`}>
        <div className={css.verdictTitle}>
          {verdictTier === 'green' ? 'Ideal' : verdictTier === 'caution' ? 'Caution' : 'Blocker'}
        </div>
        <div className={css.verdictNote}>{verdictText}</div>
      </div>

      {/* Headline */}
      <div className={css.headlineGrid}>
        <div className={css.headlineStat}>
          <span className={css.statValue}>{summary.areas}</span>
          <span className={css.statLabel}>Tree areas</span>
        </div>
        <div className={css.headlineStat}>
          <span className={css.statValue}>{summary.totalAreaHa.toFixed(1)}</span>
          <span className={css.statLabel}>Total ha</span>
        </div>
        <div className={css.headlineStat}>
          <span className={css.statValue}>{summary.totalTrees.toLocaleString()}</span>
          <span className={css.statLabel}>Est. trees</span>
        </div>
        <div className={css.headlineStat}>
          <span className={css.statValue}>
            {summary.meanSpacingM > 0
              ? `${summary.meanSpacingM.toFixed(1)}m / ${(summary.meanSpacingM * M_TO_FT).toFixed(1)}ft`
              : '\u2014'}
          </span>
          <span className={css.statLabel}>Mean spacing</span>
        </div>
      </div>

      {/* Findings */}
      {findings.length > 0 && (
        <>
          <div className={css.sectionLabel}>Findings</div>
          <div className={css.findings}>
            {findings.map((f, i) => {
              const tone =
                f.tier === 'blocker'
                  ? css.findingBlocker
                  : f.tier === 'caution'
                  ? css.findingCaution
                  : css.findingGreen;
              return (
                <div key={i} className={`${css.findingRow} ${tone}`}>
                  <div className={css.findingTier}>{f.tier}</div>
                  <div className={css.findingMain}>
                    <div className={css.findingLabel}>{f.label}</div>
                    <div className={css.findingDetail}>{f.detail}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Per-area rows */}
      <div className={css.sectionLabel}>Plantings</div>
      <div className={css.rowList}>
        {rows.map((r) => {
          const tone =
            r.tier === 'overcrowded'
              ? css.tierOvercrowded
              : r.tier === 'tight'
              ? css.tierTight
              : r.tier === 'sparse'
              ? css.tierSparse
              : r.tier === 'unset'
              ? css.tierUnset
              : css.tierIdeal;
          const typeInfo = CROP_TYPES[r.area.type];
          return (
            <div key={r.area.id} className={`${css.areaRow} ${tone}`}>
              <div className={css.rowHead}>
                <div className={css.rowMain}>
                  <span className={css.areaIcon}>{typeInfo?.icon ?? '\u{1F332}'}</span>
                  <div>
                    <div className={css.areaName}>{r.area.name}</div>
                    <div className={css.areaType}>{typeInfo?.label ?? r.area.type}</div>
                  </div>
                </div>
                <div className={`${css.tierBadge} ${tone}`}>{TIER_LABEL[r.tier]}</div>
              </div>
              <div className={css.rowMetrics}>
                <div className={css.metricBlock}>
                  <span className={css.metricLabel}>Actual</span>
                  <span className={css.metricValue}>
                    {r.actualSpacingM !== null ? `${r.actualSpacingM.toFixed(1)}m` : '\u2014'}
                  </span>
                </div>
                <div className={css.metricBlock}>
                  <span className={css.metricLabel}>Recommended</span>
                  <span className={css.metricValue}>{r.recommendedSpacingM.toFixed(1)}m</span>
                </div>
                <div className={css.metricBlock}>
                  <span className={css.metricLabel}>Density</span>
                  <span className={css.metricValue}>
                    {r.treesPerHa !== null ? `${r.treesPerHa}/ha` : '\u2014'}
                  </span>
                </div>
                <div className={css.metricBlock}>
                  <span className={css.metricLabel}>Est. trees</span>
                  <span className={css.metricValue}>
                    {r.estimatedTrees !== null ? r.estimatedTrees.toLocaleString() : '\u2014'}
                  </span>
                </div>
              </div>
              {r.actualSpacingM !== null && (
                <div className={css.spacingTrack}>
                  <div className={css.spacingMid} />
                  <div
                    className={`${css.spacingMarker} ${tone}`}
                    style={{
                      left: `${Math.min(100, Math.max(0, ((r.ratio ?? 1) / 2) * 100))}%`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {summary.totalTrees > 0 && (
        <>
          <div className={css.sectionLabel}>Pattern density comparison</div>
          <div className={css.patternGrid}>
            {PATTERN_FACTORS.map((p) => {
              const trees = Math.round(summary.totalTrees * p.factor);
              const delta = p.factor === 1 ? null : Math.round((p.factor - 1) * 100);
              return (
                <div key={p.key} className={css.headlineStat}>
                  <span className={css.statValue}>{trees.toLocaleString()}</span>
                  <span className={css.statLabel}>
                    {p.label}
                    {delta !== null && <> {'\u00b7'} +{delta}%</>}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className={css.assumption}>
        Recommended spacing is the area-type default ({'\u201C'}orchard 5m, food forest 4m, windbreak 3m, shelterbelt 2.5m, silvopasture 8m{'\u201D'}). Estimated trees use the
        actual spacing on a square grid; the comparison above reprojects that count under triangular
        (offset rows, +15.5%) and quincunx (square + cell-centre, +100%) patterns for orchard /
        windbreak design choices. Per-species recommendations (apple 5m vs walnut 12m vs hazelnut
        3m) are a P3 refinement that requires the species lookup not yet plumbed into the crop store.
      </div>
    </section>
  );
}
