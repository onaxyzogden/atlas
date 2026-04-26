/**
 * §12 AgroforestryPatternAuditCard — detects which named agroforestry
 * patterns the parcel's existing crop-area + paddock layout best fits
 * (windbreak / shelterbelt / silvopasture / food-forest / alley-cropping
 * / riparian buffer) and surfaces the missing element to upgrade
 * informal tree rows into a named pattern.
 *
 * Pure presentation: reads cropStore + livestockStore + climate summary.
 */

import { useMemo } from 'react';
import * as turf from '@turf/turf';
import { useCropStore, type CropAreaType } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import css from './AgroforestryPatternAuditCard.module.css';

interface ClimateSummary {
  prevailing_wind?: string;
  annual_precip_mm?: number;
}

const TREE_TYPES: ReadonlySet<CropAreaType> = new Set([
  'orchard',
  'food_forest',
  'windbreak',
  'shelterbelt',
  'silvopasture',
]);

// Compass direction → axis the planting RUNS PERPENDICULAR to ("blocks" the wind)
// e.g. wind from W means windbreak should run N-S to block it
function windToBlockingAxis(wind: string): 'NS' | 'EW' | 'unknown' {
  const w = wind.toUpperCase().replace(/[^NSEW]/g, '');
  if (!w) return 'unknown';
  if (w.includes('W') || w.includes('E')) return 'NS';
  if (w.includes('N') || w.includes('S')) return 'EW';
  return 'unknown';
}

// Infer the long-axis of a polygon's bbox: 'NS' if bbox is taller than wide
function bboxAxis(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): 'NS' | 'EW' | 'square' {
  try {
    const bbox = turf.bbox({ type: 'Feature', geometry: geom, properties: {} } as GeoJSON.Feature);
    const [minX, minY, maxX, maxY] = bbox;
    const widthDeg = Math.abs(maxX - minX);
    const heightDeg = Math.abs(maxY - minY);
    const ratio = widthDeg === 0 ? Infinity : heightDeg / widthDeg;
    if (ratio > 1.4) return 'NS';
    if (ratio < 0.7) return 'EW';
    return 'square';
  } catch {
    return 'square';
  }
}

interface AgroforestryPatternAuditCardProps {
  project: LocalProject;
  projectId: string;
}

export default function AgroforestryPatternAuditCard({ project, projectId }: AgroforestryPatternAuditCardProps) {
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const siteData = useSiteData(projectId);

  const cropAreas = useMemo(
    () => allCropAreas.filter((c) => c.projectId === projectId),
    [allCropAreas, projectId],
  );
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );

  const view = useMemo(() => {
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const prevailingWind = climate?.prevailing_wind ?? null;
    const blockingAxis = prevailingWind ? windToBlockingAxis(prevailingWind) : 'unknown';

    // Bucket crop areas by type
    const byType: Record<CropAreaType, typeof cropAreas> = {
      orchard: [],
      row_crop: [],
      garden_bed: [],
      food_forest: [],
      windbreak: [],
      shelterbelt: [],
      silvopasture: [],
      nursery: [],
      market_garden: [],
      pollinator_strip: [],
    };
    for (const c of cropAreas) byType[c.type].push(c);

    const treeAreaM2 = cropAreas
      .filter((c) => TREE_TYPES.has(c.type))
      .reduce((s, c) => s + (c.areaM2 ?? 0), 0);
    const totalCropAreaM2 = cropAreas.reduce((s, c) => s + (c.areaM2 ?? 0), 0);
    const parcelAreaHa = typeof project.acreage === 'number' ? project.acreage * 0.4047 : null;
    const parcelAreaM2 = parcelAreaHa !== null ? parcelAreaHa * 10_000 : null;
    const treeCoveragePct = parcelAreaM2 && parcelAreaM2 > 0
      ? (treeAreaM2 / parcelAreaM2) * 100
      : null;

    if (cropAreas.length === 0 && paddocks.length === 0) {
      return null;
    }

    // ── Pattern detection ────────────────────────────────────────────
    interface Pattern {
      id: string;
      label: string;
      present: boolean;
      detail: string;
    }
    const patterns: Pattern[] = [];

    // Windbreak alignment
    const windbreaks = byType.windbreak;
    const shelterbelts = byType.shelterbelt;
    const allWindbreakish = [...windbreaks, ...shelterbelts];
    if (allWindbreakish.length > 0 && blockingAxis !== 'unknown') {
      const aligned = allWindbreakish.filter((w) => bboxAxis(w.geometry) === blockingAxis).length;
      const total = allWindbreakish.length;
      patterns.push({
        id: 'windbreak',
        label: 'Windbreak / shelterbelt',
        present: true,
        detail: `${total} planting${total === 1 ? '' : 's'} drawn; ${aligned}/${total} aligned to block prevailing ${prevailingWind} (long-axis ${blockingAxis === 'NS' ? 'N-S' : 'E-W'}).`,
      });
    } else if (allWindbreakish.length > 0) {
      patterns.push({
        id: 'windbreak',
        label: 'Windbreak / shelterbelt',
        present: true,
        detail: `${allWindbreakish.length} planting${allWindbreakish.length === 1 ? '' : 's'} drawn — prevailing wind direction not yet derived from climate layer; alignment unverified.`,
      });
    } else {
      patterns.push({
        id: 'windbreak',
        label: 'Windbreak / shelterbelt',
        present: false,
        detail: prevailingWind
          ? `No windbreak drawn — prevailing ${prevailingWind} would benefit from a long-axis ${blockingAxis === 'NS' ? 'N-S' : 'E-W'} planting on the upwind edge.`
          : 'No windbreak drawn; consider one once prevailing wind is established for the parcel.',
      });
    }

    // Silvopasture
    if (byType.silvopasture.length > 0) {
      const silvoOverlap = byType.silvopasture.filter((s) => {
        // Intersection check: silvopasture area must overlap at least one paddock
        try {
          const sf = turf.feature(s.geometry);
          return paddocks.some((p) => {
            try {
              return turf.booleanIntersects(sf, turf.feature(p.geometry));
            } catch {
              return false;
            }
          });
        } catch {
          return false;
        }
      }).length;
      patterns.push({
        id: 'silvopasture',
        label: 'Silvopasture',
        present: true,
        detail: paddocks.length === 0
          ? `${byType.silvopasture.length} silvopasture area${byType.silvopasture.length === 1 ? '' : 's'} drawn but no paddocks on the parcel — silvopasture means trees AND grazing, so add at least one paddock.`
          : `${byType.silvopasture.length} silvopasture area${byType.silvopasture.length === 1 ? '' : 's'}; ${silvoOverlap}/${byType.silvopasture.length} overlap a drawn paddock.`,
      });
    } else if (paddocks.length > 0 && byType.orchard.length > 0) {
      patterns.push({
        id: 'silvopasture',
        label: 'Silvopasture',
        present: false,
        detail: `${paddocks.length} paddock${paddocks.length === 1 ? '' : 's'} + ${byType.orchard.length} orchard${byType.orchard.length === 1 ? '' : 's'} on the same parcel — converting an orchard to silvopasture (grazed understorey) is a one-edit upgrade.`,
      });
    } else {
      patterns.push({
        id: 'silvopasture',
        label: 'Silvopasture',
        present: false,
        detail: 'No silvopasture drawn — pairs trees with grazing on the same ground; needs both a tree-bearing area and a paddock to enable.',
      });
    }

    // Food forest
    if (byType.food_forest.length > 0) {
      const total = byType.food_forest.reduce((s, c) => s + (c.areaM2 ?? 0), 0);
      patterns.push({
        id: 'food-forest',
        label: 'Food forest',
        present: true,
        detail: `${byType.food_forest.length} food forest${byType.food_forest.length === 1 ? '' : 's'} totaling ${(total / 10_000).toFixed(2)} ha — multi-strata perennial polyculture.`,
      });
    } else {
      patterns.push({
        id: 'food-forest',
        label: 'Food forest',
        present: false,
        detail: 'No food forest drawn — multi-strata perennial guild is the highest-leverage agroforestry pattern for residential / homestead parcels.',
      });
    }

    // Alley cropping (orchard rows with row crops in between — heuristic: orchard adjacent to row_crop)
    if (byType.orchard.length > 0 && byType.row_crop.length > 0) {
      let adjacent = 0;
      for (const o of byType.orchard) {
        try {
          const of = turf.feature(o.geometry);
          if (byType.row_crop.some((r) => {
            try {
              return turf.booleanIntersects(of, turf.feature(r.geometry));
            } catch {
              return false;
            }
          })) adjacent += 1;
        } catch { /* skip */ }
      }
      patterns.push({
        id: 'alley',
        label: 'Alley cropping',
        present: adjacent > 0,
        detail: adjacent > 0
          ? `${adjacent} orchard${adjacent === 1 ? '' : 's'} touching row-crop area${adjacent === 1 ? '' : 's'} — alley-cropping pattern detected (perennials in rows, annuals between).`
          : `${byType.orchard.length} orchard${byType.orchard.length === 1 ? '' : 's'} and ${byType.row_crop.length} row-crop area${byType.row_crop.length === 1 ? '' : 's'} drawn but not adjacent — overlap them to form an alley-cropping pattern.`,
      });
    } else if (byType.orchard.length > 0 || byType.row_crop.length > 0) {
      patterns.push({
        id: 'alley',
        label: 'Alley cropping',
        present: false,
        detail: 'Alley cropping needs orchard rows adjacent to row crops — only one of the two is drawn so far.',
      });
    }

    // Riparian buffer (food_forest or windbreak near hydrology) — checked against watershed_derived
    const hasRiparianCandidate = byType.food_forest.length > 0 || byType.windbreak.length > 0;
    if (hasRiparianCandidate) {
      patterns.push({
        id: 'riparian',
        label: 'Riparian buffer',
        present: false,
        detail: 'Riparian buffer detection requires hydrology overlay analysis — not yet automated. If any of these plantings sit within ~15 m of a stream or pond edge, label them as such for water-quality crediting.',
      });
    }

    // ── Verdict ──────────────────────────────────────────────────────
    const presentCount = patterns.filter((p) => p.present).length;
    let verdict: { tone: 'good' | 'caution' | 'warn'; title: string; note: string };
    if (presentCount >= 3) {
      verdict = {
        tone: 'good',
        title: 'Layered agroforestry mosaic',
        note: `${presentCount} named pattern${presentCount === 1 ? '' : 's'} present — the parcel is doing real agroforestry work, not just tree-planting.`,
      };
    } else if (presentCount === 2) {
      verdict = {
        tone: 'good',
        title: 'Two-pattern agroforestry start',
        note: 'A third named pattern would compound the productive surface — see suggestions below.',
      };
    } else if (presentCount === 1) {
      verdict = {
        tone: 'caution',
        title: 'Single-pattern agroforestry',
        note: 'One named pattern present — most parcels can stack at least three without competing for ground.',
      };
    } else {
      verdict = {
        tone: 'warn',
        title: 'No named agroforestry pattern detected',
        note: 'Tree-area types (windbreak / shelterbelt / silvopasture / food-forest) not yet drawn. Convert at least one tree row to a named type.',
      };
    }

    return {
      patterns,
      verdict,
      counts: {
        windbreak: byType.windbreak.length,
        shelterbelt: byType.shelterbelt.length,
        silvopasture: byType.silvopasture.length,
        foodForest: byType.food_forest.length,
        orchard: byType.orchard.length,
      },
      treeAreaM2,
      totalCropAreaM2,
      treeCoveragePct,
      prevailingWind,
      blockingAxis,
    };
  }, [cropAreas, paddocks, siteData, project.acreage]);

  if (!view) {
    return (
      <section className={css.card ?? ''} aria-label="Agroforestry pattern audit">
        <header className={css.cardHead ?? ''}>
          <div>
            <h3 className={css.cardTitle ?? ''}>Agroforestry pattern audit</h3>
            <p className={css.cardHint ?? ''}>
              No crop areas or paddocks drawn yet {'\u2014'} draw at least one tree-bearing area to surface this synthesis.
            </p>
          </div>
          <span className={css.modeBadge ?? ''}>{'\u00A7'} 12</span>
        </header>
        <div className={css.empty ?? ''}>Nothing to audit.</div>
      </section>
    );
  }

  const v = view;

  return (
    <section className={css.card ?? ''} aria-label="Agroforestry pattern audit">
      <header className={css.cardHead ?? ''}>
        <div>
          <h3 className={css.cardTitle ?? ''}>Agroforestry pattern audit</h3>
          <p className={css.cardHint ?? ''}>
            Detects which named patterns (windbreak, silvopasture, food forest, alley cropping, riparian buffer) the
            current crop + paddock layout fits, and what the missing element would be.
          </p>
        </div>
        <span className={css.modeBadge ?? ''}>{'\u00A7'} 12</span>
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
          <span className={css.statValue ?? ''}>{(v.treeAreaM2 / 10_000).toFixed(2)}</span>
          <span className={css.statLabel ?? ''}>Tree area (ha)</span>
        </div>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>
            {v.treeCoveragePct !== null ? `${v.treeCoveragePct.toFixed(1)}%` : '\u2014'}
          </span>
          <span className={css.statLabel ?? ''}>Of parcel</span>
        </div>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>{v.patterns.filter((p) => p.present).length}</span>
          <span className={css.statLabel ?? ''}>Patterns met</span>
        </div>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>{v.prevailingWind ?? '\u2014'}</span>
          <span className={css.statLabel ?? ''}>Prev. wind</span>
        </div>
      </div>

      <div className={css.sectionLabel ?? ''}>Pattern checklist</div>
      <ul className={css.stmtList ?? ''}>
        {v.patterns.map((p) => (
          <li
            key={p.id}
            className={`${css.stmt ?? ''} ${p.present ? css.stmtPresent ?? '' : css.stmtMissing ?? ''}`}
          >
            <div className={css.stmtTitle ?? ''}>
              <span className={css.checkMark ?? ''}>{p.present ? '\u2713' : '\u00B7'}</span> {p.label}
            </div>
            <div className={css.stmtDetail ?? ''}>{p.detail}</div>
          </li>
        ))}
      </ul>

      <p className={css.assumption ?? ''}>
        Wind-alignment uses the climate layer{"'"}s prevailing-wind compass to derive the perpendicular long-axis a
        windbreak should follow (W or E winds {'\u2192'} N-S planting; N or S winds {'\u2192'} E-W planting).
        Silvopasture overlap uses Turf{"'"}s boolean-intersects between crop areas of type silvopasture and drawn
        paddocks. Alley-cropping detection requires orchard polygons to literally touch row-crop polygons.
      </p>
    </section>
  );
}
