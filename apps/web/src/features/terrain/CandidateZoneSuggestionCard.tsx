/**
 * §4 CandidateZoneSuggestionCard — synthesizes existing site-analysis layers
 * into typed candidate zones (pond / swale / keyline / orchard / grazing /
 * structure / conservation). Pure presentation; no map overlay, no shared math.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import type { ZoneCategory } from '../../store/zoneStore.js';
import css from './CandidateZoneSuggestionCard.module.css';

interface ElevationSummary {
  mean_slope_deg?: number;
  predominant_aspect?: string;
}
interface SoilsSummary {
  drainage_class?: string;
  hydrologic_group?: string;
  predominant_texture?: string;
}
interface TerrainAnalysisSummary {
  twi_classification?: { wet_pct?: number; very_wet_pct?: number; moist_pct?: number; dry_pct?: number; very_dry_pct?: number };
  erosion_classification?: { high_pct?: number; very_high_pct?: number; severe_pct?: number; moderate_pct?: number };
  erosion_dominant_class?: string;
}
interface WatershedDerivedSummary {
  pondCandidates?: { candidateCount?: number };
  swaleCandidates?: { candidateCount?: number };
  runoff?: { meanAccumulation?: number };
  flood?: { detentionAreaPct?: number };
}

type Tier = 'strong' | 'moderate' | 'weak';

interface Candidate {
  id: string;
  icon: string;
  label: string;
  zoneCategory: ZoneCategory;
  tier: Tier;
  score: number; // 0-100, internal ranking
  rationale: string;
  consume: string; // est. land share text
}

const TIER_LABEL: Record<Tier, string> = {
  strong: 'Strong fit',
  moderate: 'Moderate fit',
  weak: 'Possible',
};

function classifyTier(score: number): Tier {
  if (score >= 70) return 'strong';
  if (score >= 40) return 'moderate';
  return 'weak';
}

function pct(n: number | undefined, fallback = 0): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback;
}

function aspectFavorable(aspect: string | undefined): number {
  // S / SE / SW are warm-season + passive-solar favorable
  if (!aspect) return 0;
  const a = aspect.toUpperCase().trim();
  if (a === 'S') return 100;
  if (a === 'SE' || a === 'SW') return 80;
  if (a === 'E' || a === 'W') return 50;
  if (a === 'NE' || a === 'NW') return 25;
  return 10; // N
}

function buildCandidates(
  meanSlopeDeg: number,
  aspect: string | undefined,
  hydroGroup: string,
  drainageClass: string,
  wetPct: number,
  veryWetPct: number,
  dryPct: number,
  veryDryPct: number,
  highErosionPct: number,
  severeErosionPct: number,
  pondCount: number,
  swaleCount: number,
  acreage: number,
): Candidate[] {
  const out: Candidate[] = [];
  const slopePct = Math.tan((meanSlopeDeg * Math.PI) / 180) * 100;
  const wetnessPct = wetPct + veryWetPct;
  const drynessPct = dryPct + veryDryPct;
  const erosionPct = highErosionPct + severeErosionPct;
  const aspectFit = aspectFavorable(aspect);
  const acreageRef = acreage > 0 ? acreage : 0;

  // Pond candidate
  {
    let s = 0;
    if (pondCount > 0) s += Math.min(pondCount * 25, 60);
    if (wetnessPct >= 10) s += 25;
    else if (wetnessPct >= 5) s += 12;
    if (slopePct >= 1 && slopePct <= 8) s += 15;
    if (hydroGroup === 'C' || hydroGroup === 'D') s += 10; // slow drainage favors retention
    s = Math.min(s, 100);
    if (s >= 25) {
      const acres = acreageRef > 0 ? Math.max(0.05, Math.min(acreageRef * 0.04, acreageRef * 0.12)) : 0;
      out.push({
        id: 'pond',
        icon: '\u{1F4A7}',
        label: 'Pond / water-retention basin',
        zoneCategory: 'water_retention',
        tier: classifyTier(s),
        score: s,
        rationale:
          pondCount > 0
            ? `Hydrology layer flagged ${pondCount} pond-siting candidate${pondCount === 1 ? '' : 's'}; gentle bench + ${Math.round(wetnessPct)}% wet/very-wet area supports impoundment.`
            : `${Math.round(wetnessPct)}% wet area + ${Math.round(slopePct)}% mean grade hint at impoundment potential — confirm with a hydrology walk.`,
        consume:
          acres > 0
            ? `~${acres.toFixed(2)}\u20131${(acres * 2).toFixed(1)} ac per basin`
            : 'Site small (< 1 ac) — micro-pond only',
      });
    }
  }

  // Swale candidate
  {
    let s = 0;
    if (swaleCount > 0) s += Math.min(swaleCount * 20, 50);
    if (slopePct >= 2 && slopePct <= 15) s += 30;
    else if (slopePct > 15 && slopePct <= 25) s += 15;
    if (erosionPct >= 5) s += 15;
    if (hydroGroup === 'B' || hydroGroup === 'C') s += 10;
    s = Math.min(s, 100);
    if (s >= 25) {
      out.push({
        id: 'swale',
        icon: '\u{1F30A}',
        label: 'On-contour swale band',
        zoneCategory: 'water_retention',
        tier: classifyTier(s),
        score: s,
        rationale:
          swaleCount > 0
            ? `Hydrology layer flagged ${swaleCount} swale candidate${swaleCount === 1 ? '' : 's'}; ${Math.round(slopePct)}% grade is in the swale-friendly band.`
            : `${Math.round(slopePct)}% grade + ${Math.round(erosionPct)}% high-erosion area — contour swales would slow runoff and rebuild infiltration.`,
        consume:
          acreageRef > 0 ? `Linear earthwork \u2014 ~3\u20136 m strip per swale` : 'Linear band along contour',
      });
    }
  }

  // Keyline / contour-tillage candidate
  {
    let s = 0;
    if (slopePct >= 4 && slopePct <= 18) s += 50;
    else if (slopePct >= 2 && slopePct < 4) s += 20;
    if (erosionPct >= 10) s += 25;
    else if (erosionPct >= 5) s += 12;
    if (drynessPct >= 20) s += 10;
    s = Math.min(s, 100);
    if (s >= 30) {
      out.push({
        id: 'keyline',
        icon: '\u{1F4D0}',
        label: 'Keyline pattern / contour earthworks',
        zoneCategory: 'water_retention',
        tier: classifyTier(s),
        score: s,
        rationale: `${Math.round(slopePct)}% grade with ${Math.round(erosionPct)}% high-erosion classes makes keyline subsoiling along contour an effective rehydration strategy.`,
        consume: 'Pattern overlay \u2014 no exclusive land use',
      });
    }
  }

  // Orchard / food forest candidate
  {
    let s = 0;
    if (slopePct >= 1 && slopePct <= 12) s += 30;
    else if (slopePct > 12 && slopePct <= 20) s += 10;
    s += Math.round(aspectFit * 0.35);
    if (drainageClass.includes('Well') || drainageClass.includes('Moderate')) s += 15;
    if (hydroGroup === 'A' || hydroGroup === 'B') s += 10;
    if (severeErosionPct >= 5) s -= 10;
    s = Math.max(0, Math.min(s, 100));
    if (s >= 30) {
      const acres = acreageRef > 0 ? acreageRef * 0.15 : 0;
      out.push({
        id: 'orchard',
        icon: '\u{1F333}',
        label: 'Orchard / food forest',
        zoneCategory: 'food_production',
        tier: classifyTier(s),
        score: s,
        rationale: `${aspect ?? 'unset'}-facing slope at ${Math.round(slopePct)}% grade with ${drainageClass.toLowerCase()} drainage favors tree-bearing crops.`,
        consume:
          acres > 0 ? `~${(acres * 0.5).toFixed(1)}\u2013${acres.toFixed(1)} ac viable` : 'Bench-scale plantings',
      });
    }
  }

  // Grazing / silvopasture candidate
  {
    let s = 0;
    if (slopePct <= 12) s += 35;
    else if (slopePct <= 18) s += 18;
    if (slopePct > 25) s -= 20;
    if (hydroGroup === 'A' || hydroGroup === 'B') s += 20;
    if (drynessPct < 40) s += 15; // not too dry for forage
    if (severeErosionPct >= 10) s -= 15;
    s = Math.max(0, Math.min(s, 100));
    if (s >= 30) {
      const acres = acreageRef > 0 ? acreageRef * 0.4 : 0;
      out.push({
        id: 'grazing',
        icon: '\u{1F404}',
        label: 'Rotational grazing / pasture',
        zoneCategory: 'livestock',
        tier: classifyTier(s),
        score: s,
        rationale: `${Math.round(slopePct)}% grade on hydrologic group ${hydroGroup} — manageable for paddock rotation; check forage ground-cover before stocking.`,
        consume: acres > 0 ? `Up to ~${acres.toFixed(1)} ac as paddock cells` : 'Small paddock cluster',
      });
    }
  }

  // Structure / habitation candidate
  {
    let s = 0;
    if (slopePct <= 5) s += 40;
    else if (slopePct <= 10) s += 20;
    if (slopePct > 15) s -= 25;
    s += Math.round(aspectFit * 0.25); // passive solar bonus, soft
    if (drainageClass.includes('Well')) s += 20;
    if (hydroGroup === 'A' || hydroGroup === 'B') s += 10;
    if (wetnessPct >= 15) s -= 20; // stay off the wet ground
    s = Math.max(0, Math.min(s, 100));
    if (s >= 30) {
      const acres = acreageRef > 0 ? Math.min(acreageRef * 0.06, 2.5) : 0;
      out.push({
        id: 'structure',
        icon: '\u{1F3E0}',
        label: 'Structure / habitation footprint',
        zoneCategory: 'habitation',
        tier: classifyTier(s),
        score: s,
        rationale: `Flat-to-gentle ${Math.round(slopePct)}% grade with ${drainageClass.toLowerCase()} drainage and ${aspect ?? 'unset'} aspect supports building placement and passive-solar orientation.`,
        consume: acres > 0 ? `~${acres.toFixed(2)} ac envelope` : 'Compact siting',
      });
    }
  }

  // Conservation / restoration candidate (steep, eroded, or wet)
  {
    let s = 0;
    if (slopePct > 25) s += 40;
    else if (slopePct > 18) s += 20;
    if (severeErosionPct >= 5) s += 35;
    else if (highErosionPct >= 10) s += 20;
    if (veryWetPct >= 8) s += 15;
    s = Math.min(s, 100);
    if (s >= 30) {
      out.push({
        id: 'conservation',
        icon: '\u{1F343}',
        label: 'Conservation / restoration set-aside',
        zoneCategory: 'conservation',
        tier: classifyTier(s),
        score: s,
        rationale: `Steep (${Math.round(slopePct)}%) or eroded ground (${Math.round(severeErosionPct + highErosionPct)}% high/severe-erosion classes) is best left out of production \u2014 reforest, rebuild canopy, stabilize soil.`,
        consume: 'Excluded from production rotation',
      });
    }
  }

  // Sort: tier rank, then score
  const tierRank: Record<Tier, number> = { strong: 0, moderate: 1, weak: 2 };
  out.sort((a, b) => {
    if (tierRank[a.tier] !== tierRank[b.tier]) return tierRank[a.tier] - tierRank[b.tier];
    return b.score - a.score;
  });
  return out;
}

interface CandidateZoneSuggestionCardProps {
  project: LocalProject;
}

export default function CandidateZoneSuggestionCard({ project }: CandidateZoneSuggestionCardProps) {
  const siteData = useSiteData(project.id);

  const view = useMemo(() => {
    const elev = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
    const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    const ta = siteData ? getLayerSummary<TerrainAnalysisSummary>(siteData, 'terrain_analysis') : null;
    const wd = siteData ? getLayerSummary<WatershedDerivedSummary>(siteData, 'watershed_derived') : null;

    const meanSlope = elev?.mean_slope_deg ?? 0;
    const aspect = elev?.predominant_aspect;
    const hydroGroup = (soils?.hydrologic_group ?? 'B').toUpperCase().slice(0, 1);
    const drainageClass = soils?.drainage_class ?? 'Moderately well drained';
    const wetPct = pct(ta?.twi_classification?.wet_pct);
    const veryWetPct = pct(ta?.twi_classification?.very_wet_pct);
    const dryPct = pct(ta?.twi_classification?.dry_pct);
    const veryDryPct = pct(ta?.twi_classification?.very_dry_pct);
    const highErosionPct = pct(ta?.erosion_classification?.high_pct) + pct(ta?.erosion_classification?.very_high_pct);
    const severeErosionPct = pct(ta?.erosion_classification?.severe_pct);
    const pondCount = pct(wd?.pondCandidates?.candidateCount);
    const swaleCount = pct(wd?.swaleCandidates?.candidateCount);
    const acreage = typeof project.acreage === 'number' ? project.acreage : 0;

    const candidates = buildCandidates(
      meanSlope,
      aspect,
      hydroGroup,
      drainageClass,
      wetPct,
      veryWetPct,
      dryPct,
      veryDryPct,
      highErosionPct,
      severeErosionPct,
      pondCount,
      swaleCount,
      acreage,
    );

    const strongCount = candidates.filter((c) => c.tier === 'strong').length;
    const moderateCount = candidates.filter((c) => c.tier === 'moderate').length;
    const weakCount = candidates.filter((c) => c.tier === 'weak').length;
    const hasSiteData = Boolean(elev || soils || ta || wd);

    return {
      candidates,
      strongCount,
      moderateCount,
      weakCount,
      hasSiteData,
      meanSlope,
      aspect,
      hydroGroup,
    };
  }, [siteData, project.acreage]);

  if (!view.hasSiteData) {
    return (
      <div className={css.card ?? ''}>
        <div className={css.cardHead ?? ''}>
          <div>
            <h3 className={css.cardTitle ?? ''}>Candidate Zone Suggestions</h3>
            <p className={css.cardHint ?? ''}>
              Synthesizes slope, aspect, drainage, wetness, and erosion analysis into typed
              zone candidates (pond, swale, keyline, orchard, grazing, structure,
              conservation).
            </p>
          </div>
          <span className={css.modeBadge ?? ''}>{'\u00A7'} 4</span>
        </div>
        <div className={css.empty ?? ''}>
          Site analysis layers not yet loaded {'\u2014'} run the terrain + watershed_derived
          analysis pipeline before suggestions can be generated.
        </div>
      </div>
    );
  }

  if (view.candidates.length === 0) {
    return (
      <div className={css.card ?? ''}>
        <div className={css.cardHead ?? ''}>
          <div>
            <h3 className={css.cardTitle ?? ''}>Candidate Zone Suggestions</h3>
          </div>
          <span className={css.modeBadge ?? ''}>{'\u00A7'} 4</span>
        </div>
        <div className={css.empty ?? ''}>
          Site conditions did not match any candidate-zone heuristics. Inspect the slope,
          aspect, and erosion sections above for outliers.
        </div>
      </div>
    );
  }

  let verdictTier: Tier;
  let verdictTitle: string;
  let verdictNote: string;
  if (view.strongCount >= 3) {
    verdictTier = 'strong';
    verdictTitle = 'Multiple strong-fit zones';
    verdictNote = `${view.strongCount} strong candidates align with the underlying analysis \u2014 a solid synthesis backbone for the masterplan.`;
  } else if (view.strongCount >= 1 || view.moderateCount >= 2) {
    verdictTier = 'moderate';
    verdictTitle = 'Workable candidate set';
    verdictNote = `${view.strongCount} strong + ${view.moderateCount} moderate candidate${view.strongCount + view.moderateCount === 1 ? '' : 's'} \u2014 enough to draft a first-pass zone layout.`;
  } else {
    verdictTier = 'weak';
    verdictTitle = 'Sparse candidate set';
    verdictNote = 'Few high-confidence matches. Site may need fuller terrain + hydrology analysis or a constrained design vocabulary.';
  }

  const verdictClass =
    verdictTier === 'strong'
      ? css.verdictGreen
      : verdictTier === 'moderate'
      ? css.verdictCaution
      : css.verdictBlocker;

  return (
    <div className={css.card ?? ''}>
      <div className={css.cardHead ?? ''}>
        <div>
          <h3 className={css.cardTitle ?? ''}>Candidate Zone Suggestions</h3>
          <p className={css.cardHint ?? ''}>
            Synthesizes slope, aspect, drainage, wetness, and erosion analysis into typed
            zone candidates. Heuristic only \u2014 confirm each suggestion with a site walk
            before drafting on the map.
          </p>
        </div>
        <span className={css.modeBadge ?? ''}>{'\u00A7'} 4</span>
      </div>

      <div className={`${css.verdictBanner ?? ''} ${verdictClass ?? ''}`}>
        <div className={css.verdictTitle ?? ''}>{verdictTitle}</div>
        <div className={css.verdictNote ?? ''}>{verdictNote}</div>
      </div>

      <div className={css.headlineGrid ?? ''}>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>{view.candidates.length}</span>
          <span className={css.statLabel ?? ''}>Candidates</span>
        </div>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>{view.strongCount}</span>
          <span className={css.statLabel ?? ''}>Strong</span>
        </div>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>{view.moderateCount}</span>
          <span className={css.statLabel ?? ''}>Moderate</span>
        </div>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>{view.weakCount}</span>
          <span className={css.statLabel ?? ''}>Weak</span>
        </div>
      </div>

      <div className={css.sectionLabel ?? ''}>Suggested zones</div>
      <div className={css.rowList ?? ''}>
        {view.candidates.map((c) => {
          const tierClass =
            c.tier === 'strong'
              ? css.tierStrong
              : c.tier === 'moderate'
              ? css.tierModerate
              : css.tierWeak;
          return (
            <div key={c.id} className={`${css.row ?? ''} ${tierClass ?? ''}`}>
              <div className={css.rowHead ?? ''}>
                <div className={css.rowMain ?? ''}>
                  <span className={css.rowIcon ?? ''}>{c.icon}</span>
                  <div>
                    <div className={css.rowLabel ?? ''}>{c.label}</div>
                    <div className={css.rowMeta ?? ''}>
                      {c.zoneCategory.replace(/_/g, ' ')} {'\u2022'} {c.consume}
                    </div>
                  </div>
                </div>
                <span className={`${css.tierBadge ?? ''} ${tierClass ?? ''}`}>{TIER_LABEL[c.tier]}</span>
              </div>
              <div className={css.rowRationale ?? ''}>{c.rationale}</div>
            </div>
          );
        })}
      </div>

      <div className={css.assumption ?? ''}>
        Heuristics blend slope (deg), predominant aspect, hydrologic group, drainage class,
        TWI wet/dry classes, RUSLE erosion classes, and watershed-derived pond/swale
        candidate counts. Confidence tiers: strong {'\u2265'} 70, moderate {'\u2265'} 40,
        weak {'\u2265'} 25 (below 25 omitted). Ground-truth before drafting.
      </div>
    </div>
  );
}
