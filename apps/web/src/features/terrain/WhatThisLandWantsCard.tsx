/**
 * §4 WhatThisLandWantsCard — first-person-of-the-land synthesis.
 *
 * Distills the strongest physical signals (slope, aspect, TWI, erosion class,
 * hydrologic group, growing season, candidate counts) into 3-5 short
 * "this land wants ___" statements plus 1-3 "and what it doesn't want"
 * counter-statements. Heuristic-only — no LLM call. Closes §4 row state.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import css from './WhatThisLandWantsCard.module.css';

interface ElevationSummary {
  mean_slope_deg?: number;
  predominant_aspect?: string;
  mean_elevation_m?: number;
}
interface SoilsSummary {
  drainage_class?: string;
  hydrologic_group?: string;
  predominant_texture?: string;
}
interface ClimateSummary {
  hardiness_zone?: string;
  growing_season_days?: number;
  annual_precip_mm?: number;
}
interface TerrainAnalysisSummary {
  twi_classification?: { wet_pct?: number; very_wet_pct?: number; dry_pct?: number; very_dry_pct?: number };
  erosion_classification?: { high_pct?: number; very_high_pct?: number; severe_pct?: number };
}
interface WatershedDerivedSummary {
  pondCandidates?: { candidateCount?: number };
  swaleCandidates?: { candidateCount?: number };
}

type Tone = 'wants' | 'avoid';

interface Statement {
  id: string;
  tone: Tone;
  text: string;
  rationale: string;
  weight: number; // higher = stronger signal, used for ranking
}

function pct(n: number | undefined): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

function aspectDirection(a: string): 'south' | 'north' | 'east' | 'west' | 'flat' | 'unknown' {
  const v = a.toUpperCase().trim();
  if (!v) return 'unknown';
  if (v.startsWith('S')) return 'south';
  if (v.startsWith('N')) return 'north';
  if (v === 'E' || v === 'ESE' || v === 'ENE') return 'east';
  if (v === 'W' || v === 'WSW' || v === 'WNW') return 'west';
  if (v === 'FLAT' || v === '-') return 'flat';
  return 'unknown';
}

interface WhatThisLandWantsCardProps {
  project: LocalProject;
}

export default function WhatThisLandWantsCard({ project }: WhatThisLandWantsCardProps) {
  const siteData = useSiteData(project.id);

  const view = useMemo(() => {
    if (!siteData) return null;
    const elev = getLayerSummary<ElevationSummary>(siteData, 'elevation');
    const soils = getLayerSummary<SoilsSummary>(siteData, 'soils');
    const climate = getLayerSummary<ClimateSummary>(siteData, 'climate');
    const ta = getLayerSummary<TerrainAnalysisSummary>(siteData, 'terrain_analysis');
    const wd = getLayerSummary<WatershedDerivedSummary>(siteData, 'watershed_derived');

    if (!elev && !soils && !climate && !ta) return null;

    const meanSlopeDeg = elev?.mean_slope_deg ?? 0;
    const slopePct = Math.tan((meanSlopeDeg * Math.PI) / 180) * 100;
    const aspectDir = aspectDirection(elev?.predominant_aspect ?? '');
    const hydroGroup = (soils?.hydrologic_group ?? '').toUpperCase().slice(0, 1);
    const drainageClass = (soils?.drainage_class ?? '').toLowerCase();
    const texture = (soils?.predominant_texture ?? '').toLowerCase();
    const wetPct = pct(ta?.twi_classification?.wet_pct) + pct(ta?.twi_classification?.very_wet_pct);
    const dryPct = pct(ta?.twi_classification?.dry_pct) + pct(ta?.twi_classification?.very_dry_pct);
    const highErosion = pct(ta?.erosion_classification?.high_pct) + pct(ta?.erosion_classification?.very_high_pct);
    const severeErosion = pct(ta?.erosion_classification?.severe_pct);
    const pondCount = pct(wd?.pondCandidates?.candidateCount);
    const swaleCount = pct(wd?.swaleCandidates?.candidateCount);
    const annualPrecip = climate?.annual_precip_mm ?? null;
    const growingDays = climate?.growing_season_days ?? null;

    const stmts: Statement[] = [];

    // ── Aspect-driven wants
    if (aspectDir === 'south' && slopePct >= 4 && slopePct <= 18) {
      stmts.push({
        id: 'south-bench',
        tone: 'wants',
        text: 'This south-facing bench wants masonry mass and a kitchen-garden roof — keep the warm exposure working through the shoulder seasons.',
        rationale: `${aspectDir.toUpperCase()} aspect on a ${Math.round(slopePct)}% grade is the parcel's solar engine.`,
        weight: 90,
      });
    } else if (aspectDir === 'north' && slopePct > 8) {
      stmts.push({
        id: 'north-canopy',
        tone: 'wants',
        text: 'This cool north flank wants canopy first, structures last — let the trees do the climate work before the buildings ask anything of it.',
        rationale: `${aspectDir.toUpperCase()} aspect on a ${Math.round(slopePct)}% grade limits passive-solar gain; reforest before siting.`,
        weight: 70,
      });
    }

    // ── Erosion-driven wants
    if (severeErosion >= 5) {
      stmts.push({
        id: 'erosion-canopy',
        tone: 'wants',
        text: 'This eroded ground wants canopy and cover before anything else — every season of bare soil is a season of irreversible loss.',
        rationale: `${Math.round(severeErosion)}% of the parcel is in severe RUSLE class (>50 t/ha/yr).`,
        weight: 100,
      });
    } else if (highErosion >= 10) {
      stmts.push({
        id: 'erosion-cover',
        tone: 'wants',
        text: 'This thinning ground wants permanent cover and contour-keyed tillage — rebuild structure before it asks for crops.',
        rationale: `${Math.round(highErosion)}% of the parcel sits in high or very-high erosion classes.`,
        weight: 80,
      });
    }

    // ── Wetness-driven wants
    if (wetPct >= 15 && (pondCount > 0 || hydroGroup === 'D')) {
      stmts.push({
        id: 'wet-impound',
        tone: 'wants',
        text: 'These wet pockets want impoundment, not drainage — the water is already telling you where it wants to be held.',
        rationale: `${Math.round(wetPct)}% wet/very-wet TWI area${pondCount > 0 ? `, ${pondCount} pond candidate${pondCount === 1 ? '' : 's'} flagged` : ''}${hydroGroup === 'D' ? ', Group D soils retain' : ''}.`,
        weight: 85,
      });
    } else if (wetPct >= 10) {
      stmts.push({
        id: 'wet-respect',
        tone: 'wants',
        text: 'These low pockets want their water-table respected — site buildings and septic on the higher ground and let the wet stay wet.',
        rationale: `${Math.round(wetPct)}% wet/very-wet TWI area on the parcel.`,
        weight: 60,
      });
    }

    // ── Aridity-driven wants
    if (dryPct >= 50 && annualPrecip !== null && annualPrecip < 500) {
      stmts.push({
        id: 'arid-harvest',
        tone: 'wants',
        text: `This dry land wants every drop harvested ${swaleCount > 0 ? 'on contour' : 'and stored'} — water is the binding constraint here, not soil.`,
        rationale: `${Math.round(dryPct)}% dry TWI + ${annualPrecip} mm annual precip${swaleCount > 0 ? `; ${swaleCount} swale candidate${swaleCount === 1 ? '' : 's'} flagged` : ''}.`,
        weight: 95,
      });
    }

    // ── Slope / keyline wants
    if (slopePct >= 6 && slopePct <= 18 && (swaleCount > 0 || hydroGroup === 'C' || hydroGroup === 'D')) {
      stmts.push({
        id: 'keyline-rolling',
        tone: 'wants',
        text: 'This rolling ground wants keyline subsoiling along contour — convert the runoff lines into recharge lines before planting heavy.',
        rationale: `${Math.round(slopePct)}% mean grade is the keyline sweet spot${swaleCount > 0 ? `; ${swaleCount} swale candidate${swaleCount === 1 ? '' : 's'} flagged` : ''}.`,
        weight: 75,
      });
    }

    // ── Texture-driven wants
    if (texture.includes('clay') && wetPct < 10) {
      stmts.push({
        id: 'clay-perennials',
        tone: 'wants',
        text: 'This clay-leaning ground wants perennials and deep-rooted cover — annual tillage will pan it out within a few seasons.',
        rationale: `Predominant texture: ${soils?.predominant_texture ?? 'clay-based'}.`,
        weight: 50,
      });
    } else if (texture.includes('sand') && annualPrecip !== null && annualPrecip < 700) {
      stmts.push({
        id: 'sand-mulch',
        tone: 'wants',
        text: 'This sandy ground wants mulch, mulch, mulch — water and nutrients leave too fast for bare soil to hold them.',
        rationale: `Predominant texture: ${soils?.predominant_texture ?? 'sand-based'}; annual precip ${annualPrecip} mm.`,
        weight: 55,
      });
    }

    // ── Short-season wants
    if (growingDays !== null && growingDays < 150) {
      stmts.push({
        id: 'short-season-bench',
        tone: 'wants',
        text: 'This short-season ground wants a south bench, a windbreak, and a cold frame — every microclimate week you steal is a week of harvest.',
        rationale: `${growingDays} frost-free days — under the 150-day annual-cropping threshold.`,
        weight: 65,
      });
    }

    // ── Counter-statements (avoid)
    if (slopePct > 25) {
      stmts.push({
        id: 'avoid-vehicles',
        tone: 'avoid',
        text: "It doesn't want vehicle traffic on contour or annual tillage on these grades — every pass cuts a year off the soil.",
        rationale: `${Math.round(slopePct)}% mean grade exceeds vehicle-safe and till-safe thresholds.`,
        weight: 80,
      });
    }
    if (severeErosion >= 5 || highErosion >= 15) {
      stmts.push({
        id: 'avoid-bare',
        tone: 'avoid',
        text: "It doesn't want bare soil — not for a season, not for a month. Cover it green or cover it brown, but cover it.",
        rationale: `Active erosion bands (${Math.round(severeErosion + highErosion)}% high+ class) accelerate every uncovered week.`,
        weight: 85,
      });
    }
    if (hydroGroup === 'D' || drainageClass.includes('poor')) {
      stmts.push({
        id: 'avoid-wet-traffic',
        tone: 'avoid',
        text: "It doesn't want trafficking when wet — Group D soils compact in one pass and take a decade to recover.",
        rationale: `Hydrologic group ${hydroGroup || 'D'}${drainageClass ? ` / ${drainageClass} drainage` : ''}.`,
        weight: 60,
      });
    }
    if (wetPct >= 15) {
      stmts.push({
        id: 'avoid-drain',
        tone: 'avoid',
        text: "It doesn't want its wet pockets drained — those are the parcel's reservoirs, not its problems.",
        rationale: `${Math.round(wetPct)}% wet/very-wet TWI area is doing free hydrologic work.`,
        weight: 55,
      });
    }
    if (dryPct >= 50 && annualPrecip !== null && annualPrecip < 500) {
      stmts.push({
        id: 'avoid-thirsty',
        tone: 'avoid',
        text: "It doesn't want thirsty crops or shallow-rooted lawns — anything that leaves in July will leave in July.",
        rationale: `${Math.round(dryPct)}% dry TWI + ${annualPrecip} mm precip — moisture is rationed.`,
        weight: 70,
      });
    }

    // Rank and split
    stmts.sort((a, b) => b.weight - a.weight);
    const wants = stmts.filter((s) => s.tone === 'wants').slice(0, 5);
    const avoid = stmts.filter((s) => s.tone === 'avoid').slice(0, 3);

    // Headline character of the land — single-sentence summary
    const headlineParts: string[] = [];
    if (aspectDir === 'south') headlineParts.push('south-leaning');
    else if (aspectDir === 'north') headlineParts.push('cool-aspect');
    if (slopePct > 15) headlineParts.push('steep');
    else if (slopePct > 6) headlineParts.push('rolling');
    else headlineParts.push('gentle');
    if (severeErosion >= 5 || highErosion >= 15) headlineParts.push('eroded');
    if (wetPct >= 15) headlineParts.push('wet-spotted');
    if (dryPct >= 50) headlineParts.push('dry-leaning');
    if (hydroGroup === 'D') headlineParts.push('slow-draining');
    const headline = headlineParts.length
      ? `A ${headlineParts.slice(0, 4).join(', ')} parcel — listen before you build.`
      : 'A balanced parcel — work with what each band of ground asks for.';

    return {
      headline,
      wants,
      avoid,
      meta: {
        slopePct: Math.round(slopePct),
        aspect: elev?.predominant_aspect ?? '—',
        hydroGroup: hydroGroup || '—',
        wetPct: Math.round(wetPct),
        dryPct: Math.round(dryPct),
        annualPrecip,
        growingDays,
      },
    };
  }, [siteData, project]);

  if (!view) {
    return (
      <section className={css.card ?? ''} aria-label="What this land wants">
        <header className={css.cardHead ?? ''}>
          <div>
            <h3 className={css.cardTitle ?? ''}>What this land wants</h3>
            <p className={css.cardHint ?? ''}>
              Site analysis layers not yet loaded {'\u2014'} run terrain + soils + climate analysis to surface this synthesis.
            </p>
          </div>
          <span className={css.modeBadge ?? ''}>{'\u00A7'} 4</span>
        </header>
        <div className={css.empty ?? ''}>No layer data available yet.</div>
      </section>
    );
  }

  return (
    <section className={css.card ?? ''} aria-label="What this land wants">
      <header className={css.cardHead ?? ''}>
        <div>
          <h3 className={css.cardTitle ?? ''}>What this land wants</h3>
          <p className={css.cardHint ?? ''}>
            First-person synthesis of the strongest signals across terrain, soils, climate, and hydrology {'\u2014'} written
            in the voice of the parcel itself.
          </p>
        </div>
        <span className={css.modeBadge ?? ''}>{'\u00A7'} 4</span>
      </header>

      <div className={css.headline ?? ''}>
        <div className={css.headlineLabel ?? ''}>Character of the ground</div>
        <div className={css.headlineText ?? ''}>{view.headline}</div>
      </div>

      <div className={css.metaRow ?? ''}>
        <div className={css.metaChip ?? ''}>
          <span className={css.metaLabel ?? ''}>Slope</span>
          <span className={css.metaValue ?? ''}>{view.meta.slopePct}%</span>
        </div>
        <div className={css.metaChip ?? ''}>
          <span className={css.metaLabel ?? ''}>Aspect</span>
          <span className={css.metaValue ?? ''}>{view.meta.aspect}</span>
        </div>
        <div className={css.metaChip ?? ''}>
          <span className={css.metaLabel ?? ''}>Hydro grp</span>
          <span className={css.metaValue ?? ''}>{view.meta.hydroGroup}</span>
        </div>
        <div className={css.metaChip ?? ''}>
          <span className={css.metaLabel ?? ''}>Wet / Dry</span>
          <span className={css.metaValue ?? ''}>
            {view.meta.wetPct}% / {view.meta.dryPct}%
          </span>
        </div>
        {view.meta.annualPrecip !== null && (
          <div className={css.metaChip ?? ''}>
            <span className={css.metaLabel ?? ''}>Precip</span>
            <span className={css.metaValue ?? ''}>{view.meta.annualPrecip} mm</span>
          </div>
        )}
        {view.meta.growingDays !== null && (
          <div className={css.metaChip ?? ''}>
            <span className={css.metaLabel ?? ''}>Season</span>
            <span className={css.metaValue ?? ''}>{view.meta.growingDays} d</span>
          </div>
        )}
      </div>

      {view.wants.length > 0 && (
        <>
          <div className={css.sectionLabel ?? ''}>It wants</div>
          <ul className={css.stmtList ?? ''}>
            {view.wants.map((s) => (
              <li key={s.id} className={`${css.stmt ?? ''} ${css.stmtWants ?? ''}`}>
                <div className={css.stmtText ?? ''}>{s.text}</div>
                <div className={css.stmtRationale ?? ''}>{s.rationale}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      {view.avoid.length > 0 && (
        <>
          <div className={css.sectionLabel ?? ''}>And what it doesn{'\u2019'}t want</div>
          <ul className={css.stmtList ?? ''}>
            {view.avoid.map((s) => (
              <li key={s.id} className={`${css.stmt ?? ''} ${css.stmtAvoid ?? ''}`}>
                <div className={css.stmtText ?? ''}>{s.text}</div>
                <div className={css.stmtRationale ?? ''}>{s.rationale}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      {view.wants.length === 0 && view.avoid.length === 0 && (
        <div className={css.empty ?? ''}>
          No dominant signals crossed the synthesis threshold {'\u2014'} a balanced parcel without strong constraints.
        </div>
      )}

      <p className={css.footnote ?? ''}>
        Heuristic synthesis from the same signals used by Threats &amp; Leverage and Candidate Zones {'\u2014'} not an LLM
        summary. Statements are ranked by signal strength; the strongest 3{'\u2013'}5 surface here.
      </p>
    </section>
  );
}
