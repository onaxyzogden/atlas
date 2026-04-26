/**
 * §17 DesignBriefPitchCard — bundles the dashboard's synthesis +
 * assumptions + alternative-layout outputs into a one-page brief the
 * steward can hand to a landowner, investor, or community reviewer.
 *
 * Closes the §17 design-support loop alongside `AiSiteSynthesisCard`,
 * `AssumptionGapDetectorCard`, `NeedsSiteVisitCard`, and
 * `AlternativeLayoutRationaleCard`.
 *
 * Pure presentation:
 *   - Composes a structured pitch document from existing store state
 *     (project basics, vision, site-data layer summary, entity counts,
 *     financial overrides, mission weights).
 *   - Renders it as a print-styled card.
 *   - Buttons:  Copy as Markdown  ·  Print / Save PDF.
 *
 * The card body is deterministic and clearly labeled as AI DRAFT — the
 * steward edits the human-readable text after copying / printing,
 * matching the §17 spec language ("editable, clearly labeled as AI draft").
 *
 * Closes manifest §17 `ai-design-brief-investor-landowner-pitch`
 * (P3) planned -> done.
 */

import { useMemo, useCallback, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useFinancialStore } from '../../store/financialStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import css from './DesignBriefPitchCard.module.css';

interface Props {
  project: LocalProject;
}

interface ClimateSummary {
  annual_precip_mm?: number;
  growing_season_days?: number;
}
interface SoilSummary {
  organic_matter_pct?: number | string;
  hydrologic_group?: string;
}
interface ElevationSummary {
  mean_slope_deg?: number;
  elevation_min_m?: number;
  elevation_max_m?: number;
}
interface HydrologySummary {
  watershed_area_km2?: number;
}
interface LandCoverSummary {
  tree_canopy_pct?: number | string;
}

const DEFAULT_VISION =
  'Vision statement not yet captured. The steward should replace this with a one-sentence statement of intent before circulating the brief.';

function fmtPct(v: number | string | undefined): string | null {
  if (v == null) return null;
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  return `${n.toFixed(0)}%`;
}

export default function DesignBriefPitchCard({ project }: Props) {
  const structures = useStructureStore((s) =>
    s.structures.filter((st) => st.projectId === project.id),
  );
  const utilities = useUtilityStore((s) =>
    s.utilities.filter((u) => u.projectId === project.id),
  );
  const zones = useZoneStore((s) => s.zones.filter((z) => z.projectId === project.id));
  const cropAreas = useCropStore((s) =>
    s.cropAreas.filter((c) => c.projectId === project.id),
  );
  const paddocks = useLivestockStore((s) =>
    s.paddocks.filter((p) => p.projectId === project.id),
  );
  const missionWeights = useFinancialStore((s) => s.missionWeights);
  const costOverrides = useFinancialStore((s) => s.costOverrides);
  const revenueOverrides = useFinancialStore((s) => s.revenueOverrides);
  const siteData = useSiteData(project.id);

  const [copied, setCopied] = useState(false);

  const brief = useMemo(() => {
    const climate = siteData ? getLayerSummary<ClimateSummary>(siteData, 'climate') : null;
    const soil = siteData ? getLayerSummary<SoilSummary>(siteData, 'soil') : null;
    const elevation = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
    const hydrology = siteData ? getLayerSummary<HydrologySummary>(siteData, 'hydrology') : null;
    const landcover = siteData ? getLayerSummary<LandCoverSummary>(siteData, 'landcover') : null;

    const acreage = project.acreage ?? 0;
    const hasBoundary = !!project.parcelBoundaryGeojson;

    // ── Site context lines (one per layer, only if data present) ─────
    const siteLines: string[] = [];
    if (climate?.annual_precip_mm) {
      const gs = climate.growing_season_days
        ? `, ${climate.growing_season_days}-day growing season`
        : '';
      siteLines.push(
        `Climate: ${Math.round(climate.annual_precip_mm)} mm annual precipitation${gs}.`,
      );
    }
    if (soil) {
      const om = fmtPct(soil.organic_matter_pct);
      const hg = soil.hydrologic_group ? `hydrologic group ${soil.hydrologic_group}` : null;
      const parts = [om ? `${om} organic matter` : null, hg].filter(Boolean);
      if (parts.length > 0) {
        siteLines.push(`Soil: ${parts.join(', ')}.`);
      } else {
        siteLines.push('Soil: SSURGO survey present (organic matter / hydrologic group not parsed).');
      }
    }
    if (elevation) {
      const slope =
        typeof elevation.mean_slope_deg === 'number'
          ? `${elevation.mean_slope_deg.toFixed(1)}\u00B0 mean slope`
          : null;
      const range =
        elevation.elevation_min_m != null && elevation.elevation_max_m != null
          ? `${Math.round(elevation.elevation_min_m)}\u2013${Math.round(elevation.elevation_max_m)} m elevation range`
          : null;
      const parts = [slope, range].filter(Boolean);
      if (parts.length > 0) siteLines.push(`Terrain: ${parts.join(', ')}.`);
    }
    if (hydrology?.watershed_area_km2) {
      siteLines.push(
        `Hydrology: ${hydrology.watershed_area_km2.toFixed(2)} km\u00B2 watershed delineated.`,
      );
    }
    if (landcover) {
      const tc = fmtPct(landcover.tree_canopy_pct);
      if (tc) siteLines.push(`Land cover: ${tc} tree canopy (NLCD).`);
    }

    // ── Design-state counts ──────────────────────────────────────────
    const designLines: string[] = [];
    if (zones.length > 0) designLines.push(`${zones.length} zone${zones.length === 1 ? '' : 's'} drawn`);
    if (structures.length > 0)
      designLines.push(`${structures.length} structure${structures.length === 1 ? '' : 's'} placed`);
    if (utilities.length > 0)
      designLines.push(`${utilities.length} utilit${utilities.length === 1 ? 'y' : 'ies'} placed`);
    if (cropAreas.length > 0)
      designLines.push(`${cropAreas.length} crop area${cropAreas.length === 1 ? '' : 's'}`);
    if (paddocks.length > 0)
      designLines.push(`${paddocks.length} paddock${paddocks.length === 1 ? '' : 's'}`);

    // ── Top assumptions (max 3) ──────────────────────────────────────
    const assumptions: string[] = [];
    const isDefaultWeights =
      Math.abs(missionWeights.financial - 0.4) < 0.01 &&
      Math.abs(missionWeights.ecological - 0.25) < 0.01 &&
      Math.abs(missionWeights.spiritual - 0.2) < 0.01 &&
      Math.abs(missionWeights.community - 0.15) < 0.01;
    if (isDefaultWeights) {
      assumptions.push(
        'Mission weights remain the seeded 40 / 25 / 20 / 15 split (financial-led). Re-tune to reflect actual project intent before relying on the mission-weighted ROI rollup.',
      );
    }
    if (Object.keys(costOverrides).length === 0 && Object.keys(revenueOverrides).length === 0) {
      assumptions.push(
        'No cost or revenue overrides are set; the entire economic model is running on midline regional defaults. Lock in 1\u20132 high-impact line items before the budget figures should be quoted.',
      );
    }
    if (!climate?.annual_precip_mm) {
      assumptions.push(
        'Annual precipitation is not yet fetched, so the water budget runs against an equal-12 monthly distribution and a regional placeholder for catchment math.',
      );
    }
    if (!soil) {
      assumptions.push(
        'No SSURGO soil survey loaded; carbon-sequestration baselines and infiltration estimates are using mid-band defaults.',
      );
    }
    if (!project.projectType) {
      assumptions.push(
        'No primary project type assigned; crop guilds, structure presets, and revenue templates fall back to a generic baseline.',
      );
    }
    const topAssumptions = assumptions.slice(0, 3);

    // ── Recommended next moves (max 3) ───────────────────────────────
    const moves: string[] = [];
    if (!hasBoundary) {
      moves.push(
        'Draw the parcel boundary (highest leverage \u2014 unlocks all acreage-derived metrics and zone-area splits).',
      );
    }
    const waterUtilCount = utilities.filter(
      (u) => u.type === 'water_tank' || u.type === 'well_pump' || u.type === 'rain_catchment',
    ).length;
    if (waterUtilCount === 0) {
      moves.push(
        'Place baseline water infrastructure (tank, well, or rain-catchment surface) so storage, off-grid resilience, and drought-buffer scores can compute against a real number.',
      );
    }
    if (acreage >= 3 && cropAreas.filter((c) => c.type === 'orchard' || c.type === 'food_forest').length === 0) {
      moves.push(
        'Add at least one perennial-crop polygon (orchard or food forest) to anchor the §22 perennial revenue stream and §11 perennial carbon baseline.',
      );
    }
    if (paddocks.length === 1) {
      moves.push(
        'Split the single paddock into 4 rotational paddocks; rotation factor lifts forage carrying capacity and the soil-trampling impact in the ecology rollup drops.',
      );
    }
    if (!project.visionStatement || project.visionStatement.trim().length === 0) {
      moves.push(
        'Capture a one-sentence vision statement so the brief leads with the steward\u2019s voice rather than a metrics block.',
      );
    }
    const topMoves = moves.slice(0, 3);

    return {
      siteLines,
      designLines,
      topAssumptions,
      topMoves,
      hasBoundary,
      acreage,
    };
  }, [
    project,
    structures,
    utilities,
    zones,
    cropAreas,
    paddocks,
    missionWeights,
    costOverrides,
    revenueOverrides,
    siteData,
  ]);

  const generatedAt = useMemo(() => new Date().toLocaleDateString(), []);

  const markdown = useMemo(() => {
    const lines: string[] = [];
    lines.push(`# ${project.name} — Design Brief`);
    lines.push('');
    lines.push(`*Prepared ${generatedAt} · AI DRAFT — review and edit before circulating.*`);
    lines.push('');

    const facts: string[] = [];
    if (project.address) facts.push(`**Location:** ${project.address}`);
    if (project.acreage != null) facts.push(`**Acreage:** ${project.acreage.toFixed(2)} ac`);
    if (project.projectType) facts.push(`**Project type:** ${project.projectType}`);
    if (facts.length > 0) {
      lines.push(facts.join('  \n'));
      lines.push('');
    }

    lines.push('## Vision');
    lines.push(project.visionStatement?.trim() || DEFAULT_VISION);
    lines.push('');

    if (brief.siteLines.length > 0) {
      lines.push('## Site context');
      for (const line of brief.siteLines) lines.push(`- ${line}`);
      lines.push('');
    }

    if (brief.designLines.length > 0) {
      lines.push('## Current design state');
      lines.push(brief.designLines.join(' · '));
      lines.push('');
    }

    if (brief.topAssumptions.length > 0) {
      lines.push('## Key assumptions in play');
      for (const a of brief.topAssumptions) lines.push(`- ${a}`);
      lines.push('');
    }

    if (brief.topMoves.length > 0) {
      lines.push('## Recommended next moves');
      for (const m of brief.topMoves) lines.push(`1. ${m}`);
      lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push(
      '*Generated deterministically from the OGDEN Atlas project state. Replace this paragraph with the steward\u2019s commentary before sending.*',
    );

    return lines.join('\n');
  }, [project, brief, generatedAt]);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(markdown).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }, [markdown]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <section className={css.card} aria-label="Design brief pitch">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Design brief — landowner / investor pitch</h3>
          <p className={css.cardHint}>
            A one-page draft assembled from project basics, site-data
            layer summary, placed entities, and the §17 detector trio.
            <em> Editable</em> &mdash; copy or print, then revise.
          </p>
        </div>
        <span className={css.heuristicBadge}>AI DRAFT</span>
      </header>

      <div className={css.actionRow}>
        <button type="button" className={css.actionBtn} onClick={handleCopy}>
          {copied ? 'Copied!' : 'Copy as Markdown'}
        </button>
        <button type="button" className={css.actionBtn} onClick={handlePrint}>
          Print / Save PDF
        </button>
        <span className={css.generatedAt}>Prepared {generatedAt}</span>
      </div>

      <article className={css.brief}>
        <h2 className={css.briefTitle}>{project.name}</h2>
        <div className={css.briefSubtitle}>Design brief &middot; {generatedAt}</div>

        <div className={css.factRow}>
          {project.address && (
            <div className={css.fact}>
              <div className={css.factLabel}>Location</div>
              <div className={css.factValue}>{project.address}</div>
            </div>
          )}
          {project.acreage != null && (
            <div className={css.fact}>
              <div className={css.factLabel}>Acreage</div>
              <div className={css.factValue}>{project.acreage.toFixed(2)} ac</div>
            </div>
          )}
          {project.projectType && (
            <div className={css.fact}>
              <div className={css.factLabel}>Project type</div>
              <div className={css.factValue}>{project.projectType}</div>
            </div>
          )}
        </div>

        <section className={css.section}>
          <h4 className={css.sectionTitle}>Vision</h4>
          <p className={`${css.sectionBody} ${
            project.visionStatement?.trim() ? '' : css.placeholder
          }`}>
            {project.visionStatement?.trim() || DEFAULT_VISION}
          </p>
        </section>

        {brief.siteLines.length > 0 && (
          <section className={css.section}>
            <h4 className={css.sectionTitle}>Site context</h4>
            <ul className={css.bulletList}>
              {brief.siteLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        {brief.designLines.length > 0 ? (
          <section className={css.section}>
            <h4 className={css.sectionTitle}>Current design state</h4>
            <p className={css.sectionBody}>{brief.designLines.join(' \u00B7 ')}</p>
          </section>
        ) : (
          <section className={css.section}>
            <h4 className={css.sectionTitle}>Current design state</h4>
            <p className={`${css.sectionBody} ${css.placeholder}`}>
              No entities placed yet &mdash; the brief will read more
              concretely once at least one zone, structure, or crop area
              is on the map.
            </p>
          </section>
        )}

        {brief.topAssumptions.length > 0 && (
          <section className={css.section}>
            <h4 className={css.sectionTitle}>Key assumptions in play</h4>
            <ul className={css.bulletList}>
              {brief.topAssumptions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </section>
        )}

        {brief.topMoves.length > 0 && (
          <section className={css.section}>
            <h4 className={css.sectionTitle}>Recommended next moves</h4>
            <ol className={css.numberList}>
              {brief.topMoves.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ol>
          </section>
        )}

        <footer className={css.briefFooter}>
          Generated deterministically from the OGDEN Atlas project state.
          Replace this paragraph with the steward&rsquo;s commentary before
          sending.
        </footer>
      </article>

      <p className={css.footnote}>
        <em>How this brief is built:</em> deterministic introspection over
        project fields, site-data layer summaries, entity stores, and
        financial overrides. Same inputs produce the same brief &mdash; no
        LLM call. The Markdown export and the on-screen preview are kept
        in sync from the same source-of-truth render pass.
      </p>
    </section>
  );
}
