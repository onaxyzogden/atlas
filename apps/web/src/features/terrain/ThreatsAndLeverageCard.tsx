/**
 * §4 ThreatsAndLeverageCard — distills site analysis into the two synthesis
 * prompts a steward asks: "What are the main threats to success?" and
 * "Where are the highest-leverage interventions?" Pure presentation.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { computeAssessmentScores } from '../../lib/computeScores.js';
import css from './ThreatsAndLeverageCard.module.css';

interface ElevationSummary {
  mean_slope_deg?: number;
  predominant_aspect?: string;
}
interface SoilsSummary {
  drainage_class?: string;
  hydrologic_group?: string;
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

type Severity = 'critical' | 'major' | 'moderate';
type Effort = 'low' | 'medium' | 'high';

interface Threat {
  id: string;
  label: string;
  severity: Severity;
  rationale: string;
  addressedBy: string[]; // intervention ids that mitigate this
}

interface Leverage {
  id: string;
  label: string;
  effort: Effort;
  benefit: string;
  addresses: string[]; // threat labels (short)
}

const SEV_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  major: 'Major',
  moderate: 'Moderate',
};
const EFFORT_LABEL: Record<Effort, string> = {
  low: 'Low effort',
  medium: 'Med effort',
  high: 'High effort',
};

function pct(n: number | undefined): number {
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}

interface ThreatsAndLeverageCardProps {
  project: LocalProject;
}

export default function ThreatsAndLeverageCard({ project }: ThreatsAndLeverageCardProps) {
  const siteData = useSiteData(project.id);

  const view = useMemo(() => {
    if (!siteData) return null;
    const layers = siteData.layers ?? [];
    const elev = getLayerSummary<ElevationSummary>(siteData, 'elevation');
    const soils = getLayerSummary<SoilsSummary>(siteData, 'soils');
    const climate = getLayerSummary<ClimateSummary>(siteData, 'climate');
    const ta = getLayerSummary<TerrainAnalysisSummary>(siteData, 'terrain_analysis');
    const wd = getLayerSummary<WatershedDerivedSummary>(siteData, 'watershed_derived');

    if (!elev && !soils && !climate && !ta) return null;

    const acreage = typeof project.acreage === 'number' ? project.acreage : null;
    const scores = computeAssessmentScores(layers, acreage, project.country);

    const meanSlopeDeg = elev?.mean_slope_deg ?? 0;
    const slopePct = Math.tan((meanSlopeDeg * Math.PI) / 180) * 100;
    const aspect = (elev?.predominant_aspect ?? '').toUpperCase().trim();
    const hydroGroup = (soils?.hydrologic_group ?? 'B').toUpperCase().slice(0, 1);
    const drainageClass = soils?.drainage_class ?? '';
    const wetPct = pct(ta?.twi_classification?.wet_pct) + pct(ta?.twi_classification?.very_wet_pct);
    const dryPct = pct(ta?.twi_classification?.dry_pct) + pct(ta?.twi_classification?.very_dry_pct);
    const highErosionPct = pct(ta?.erosion_classification?.high_pct) + pct(ta?.erosion_classification?.very_high_pct);
    const severeErosionPct = pct(ta?.erosion_classification?.severe_pct);
    const pondCount = pct(wd?.pondCandidates?.candidateCount);
    const swaleCount = pct(wd?.swaleCandidates?.candidateCount);
    const annualPrecip = climate?.annual_precip_mm ?? null;
    const growingDays = climate?.growing_season_days ?? null;

    const threats: Threat[] = [];
    const leverage: Leverage[] = [];

    // ── Threats from facet scores
    for (const s of scores) {
      if (s.score < 35) {
        threats.push({
          id: `score-${s.label}`,
          label: `Weak ${s.label.toLowerCase()}`,
          severity: 'critical',
          rationale: `Facet score ${Math.round(s.score)}/100 (${s.rating.toLowerCase()}) — design must lean on imports or upgrades for this dimension.`,
          addressedBy: [],
        });
      } else if (s.score < 55) {
        threats.push({
          id: `score-${s.label}`,
          label: `Below-target ${s.label.toLowerCase()}`,
          severity: 'major',
          rationale: `Facet score ${Math.round(s.score)}/100 (${s.rating.toLowerCase()}) — leverage moves below could lift this above 70.`,
          addressedBy: [],
        });
      }
    }

    // ── Threats from physical site analysis
    if (severeErosionPct >= 5) {
      threats.push({
        id: 'erosion-severe',
        label: 'Severe-erosion ground',
        severity: 'critical',
        rationale: `${Math.round(severeErosionPct)}% of parcel falls in severe RUSLE class — soil loss exceeds 50 t/ha/yr; cropping or trafficking accelerates collapse.`,
        addressedBy: ['keyline', 'reforest', 'swale-band'],
      });
    } else if (highErosionPct >= 10) {
      threats.push({
        id: 'erosion-high',
        label: 'Active erosion bands',
        severity: 'major',
        rationale: `${Math.round(highErosionPct)}% of parcel sits in high/very-high erosion classes — rebuild vegetative cover before disturbing.`,
        addressedBy: ['keyline', 'swale-band', 'cover-crop'],
      });
    }

    if (slopePct > 25) {
      threats.push({
        id: 'slope-steep',
        label: 'Steep mean grade',
        severity: 'major',
        rationale: `${Math.round(slopePct)}% mean grade limits vehicle access, raises construction cost, and compounds erosion vulnerability.`,
        addressedBy: ['terraces', 'reforest'],
      });
    }

    if (wetPct >= 15) {
      threats.push({
        id: 'wetness-excess',
        label: 'Excess wet ground',
        severity: 'moderate',
        rationale: `${Math.round(wetPct)}% wet/very-wet TWI area — siting buildings, septic, or cropping requires drainage or relocation.`,
        addressedBy: ['drainage', 'pond'],
      });
    }
    if (dryPct >= 60 && annualPrecip !== null && annualPrecip < 500) {
      threats.push({
        id: 'aridity',
        label: 'Aridity / drought exposure',
        severity: 'major',
        rationale: `${Math.round(dryPct)}% dry/very-dry TWI area + ${annualPrecip} mm annual precip — water budget is the binding constraint.`,
        addressedBy: ['pond', 'swale-band', 'cover-crop'],
      });
    }

    if (hydroGroup === 'D') {
      threats.push({
        id: 'hydro-d',
        label: 'Hydrologic group D soils',
        severity: 'moderate',
        rationale: 'Very slow infiltration — runoff dominates; trafficking when wet causes severe compaction.',
        addressedBy: ['swale-band', 'cover-crop', 'keyline'],
      });
    }

    if (aspect === 'N' || aspect === 'NE' || aspect === 'NW') {
      threats.push({
        id: 'aspect-cool',
        label: 'Cool aspect bias',
        severity: 'moderate',
        rationale: `${aspect}-facing slope shortens warm-season productivity and weakens passive-solar building potential.`,
        addressedBy: ['microclimate-bench', 'reforest'],
      });
    }

    if (growingDays !== null && growingDays < 150) {
      threats.push({
        id: 'short-season',
        label: 'Short growing season',
        severity: 'major',
        rationale: `Only ${growingDays} frost-free days — annual cropping limited; plan around perennials, season extension, and storage.`,
        addressedBy: ['microclimate-bench', 'season-extend'],
      });
    }

    // ── Leverage interventions (ranked by addressable threat count)
    const candidates: Leverage[] = [
      {
        id: 'keyline',
        label: 'Keyline subsoiling along contour',
        effort: 'medium',
        benefit: 'Converts erosion class to retention class on slopes 4–18%; rebuilds infiltration without disturbing existing cover.',
        addresses: ['Erosion', 'Aridity', 'Group D'],
      },
      {
        id: 'swale-band',
        label: 'On-contour swale band',
        effort: 'medium',
        benefit:
          swaleCount > 0
            ? `Hydrology layer flagged ${swaleCount} swale candidate${swaleCount === 1 ? '' : 's'} — slow runoff, recharge groundwater, irrigate downslope plantings.`
            : 'Slows runoff, recharges groundwater, irrigates downslope plantings — single highest-leverage move on sloped land.',
        addresses: ['Erosion', 'Aridity', 'Group D'],
      },
      {
        id: 'pond',
        label: 'Pond / water-retention basin',
        effort: 'high',
        benefit:
          pondCount > 0
            ? `Hydrology layer flagged ${pondCount} pond candidate${pondCount === 1 ? '' : 's'} — buffers drought, supports livestock and irrigation.`
            : 'Buffers drought weeks, supports livestock and irrigation; doubles as fire-suppression reserve.',
        addresses: ['Aridity', 'Water resilience', 'Wet ground'],
      },
      {
        id: 'reforest',
        label: 'Reforest / canopy restoration',
        effort: 'low',
        benefit: 'Stabilizes steep + eroded ground over 3–7 years; shades cool aspects to extend warm-microclimate windows downslope.',
        addresses: ['Slope', 'Erosion', 'Cool aspect'],
      },
      {
        id: 'cover-crop',
        label: 'Permanent cover crop / pasture mix',
        effort: 'low',
        benefit: 'Closes the bare-soil window; raises infiltration, organic matter, and forage simultaneously.',
        addresses: ['Erosion', 'Group D', 'Aridity'],
      },
      {
        id: 'terraces',
        label: 'Bench terraces on steep ground',
        effort: 'high',
        benefit: 'Converts > 25% slopes into workable benches at the cost of one heavy earthworks campaign.',
        addresses: ['Slope'],
      },
      {
        id: 'drainage',
        label: 'Targeted subsurface drainage',
        effort: 'medium',
        benefit: 'Drops the water table on wet pockets so building, septic, or root crops become viable.',
        addresses: ['Wet ground'],
      },
      {
        id: 'microclimate-bench',
        label: 'South-facing microclimate bench',
        effort: 'medium',
        benefit: 'Stone-wall + windbreak combo creates a 1–2 zone uplift; turns shoulder seasons into productive months.',
        addresses: ['Cool aspect', 'Short season'],
      },
      {
        id: 'season-extend',
        label: 'Tunnel / cold-frame stack',
        effort: 'low',
        benefit: 'Adds 4–8 weeks each shoulder; pairs with the microclimate bench for compounding effect.',
        addresses: ['Short season'],
      },
    ];

    // Score interventions by how many threats they map to
    const threatIds = new Set(threats.flatMap((t) => t.addressedBy));
    for (const c of candidates) {
      if (threatIds.has(c.id)) leverage.push(c);
    }

    // Always include keyline + cover crop as baseline regenerative moves if leverage list is thin
    if (leverage.length < 3) {
      const fallback = candidates.filter((c) => c.id === 'cover-crop' || c.id === 'keyline');
      for (const c of fallback) {
        if (!leverage.some((l) => l.id === c.id)) leverage.push(c);
      }
    }

    // Sort threats by severity
    const sevRank: Record<Severity, number> = { critical: 0, major: 1, moderate: 2 };
    threats.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

    // Sort leverage by effort (low first)
    const effRank: Record<Effort, number> = { low: 0, medium: 1, high: 2 };
    leverage.sort((a, b) => effRank[a.effort] - effRank[b.effort]);

    const criticalCount = threats.filter((t) => t.severity === 'critical').length;
    const majorCount = threats.filter((t) => t.severity === 'major').length;

    return {
      threats: threats.slice(0, 7),
      leverage: leverage.slice(0, 6),
      criticalCount,
      majorCount,
      moderateCount: threats.length - criticalCount - majorCount,
      hasData: true,
    };
  }, [siteData, project.acreage, project.country]);

  if (!view) {
    return (
      <div className={css.card ?? ''}>
        <div className={css.cardHead ?? ''}>
          <div>
            <h3 className={css.cardTitle ?? ''}>Threats & Highest-Leverage Interventions</h3>
            <p className={css.cardHint ?? ''}>
              Synthesis layer pairs each ranked threat with the lowest-effort intervention
              that would move the needle.
            </p>
          </div>
          <span className={css.modeBadge ?? ''}>{'\u00A7'} 4</span>
        </div>
        <div className={css.empty ?? ''}>
          Site analysis layers not yet loaded {'\u2014'} run the analysis pipeline first.
        </div>
      </div>
    );
  }

  let verdictTier: 'critical' | 'major' | 'ok';
  let verdictTitle: string;
  let verdictNote: string;
  if (view.criticalCount > 0) {
    verdictTier = 'critical';
    verdictTitle = `${view.criticalCount} critical threat${view.criticalCount === 1 ? '' : 's'} flagged`;
    verdictNote =
      'Address the critical-severity items first; they bound what the rest of the design can achieve.';
  } else if (view.majorCount >= 2) {
    verdictTier = 'major';
    verdictTitle = `${view.majorCount} major threats — leverage moves available`;
    verdictNote = 'No blockers, but several major friction points. Cluster low-effort interventions to compound gains.';
  } else if (view.threats.length === 0) {
    verdictTier = 'ok';
    verdictTitle = 'No structural threats detected';
    verdictNote = 'Site is structurally permissive — design constraints will come from intent, not from the land.';
  } else {
    verdictTier = 'ok';
    verdictTitle = 'Manageable threat profile';
    verdictNote = 'Friction is moderate; the leverage list below covers it.';
  }

  const verdictClass =
    verdictTier === 'critical'
      ? css.verdictBlocker
      : verdictTier === 'major'
      ? css.verdictCaution
      : css.verdictGreen;

  return (
    <div className={css.card ?? ''}>
      <div className={css.cardHead ?? ''}>
        <div>
          <h3 className={css.cardTitle ?? ''}>Threats & Highest-Leverage Interventions</h3>
          <p className={css.cardHint ?? ''}>
            Distills facet scores, slope, aspect, drainage, wetness, and erosion into the
            two synthesis questions {'\u2014'} {'\u201C'}what are the main threats to success?{'\u201D'} and
            {' '}{'\u201C'}where are the highest-leverage interventions?{'\u201D'}
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
          <span className={css.statValue ?? ''}>{view.criticalCount}</span>
          <span className={css.statLabel ?? ''}>Critical</span>
        </div>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>{view.majorCount}</span>
          <span className={css.statLabel ?? ''}>Major</span>
        </div>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>{view.moderateCount}</span>
          <span className={css.statLabel ?? ''}>Moderate</span>
        </div>
        <div className={css.headlineStat ?? ''}>
          <span className={css.statValue ?? ''}>{view.leverage.length}</span>
          <span className={css.statLabel ?? ''}>Leverage moves</span>
        </div>
      </div>

      <div className={css.twoCol ?? ''}>
        <div className={css.col ?? ''}>
          <div className={css.sectionLabel ?? ''}>Main threats to success</div>
          {view.threats.length === 0 ? (
            <div className={css.empty ?? ''}>No structural threats detected.</div>
          ) : (
            <div className={css.rowList ?? ''}>
              {view.threats.map((t) => {
                const sevClass =
                  t.severity === 'critical'
                    ? css.tierCritical
                    : t.severity === 'major'
                    ? css.tierMajor
                    : css.tierModerate;
                return (
                  <div key={t.id} className={`${css.row ?? ''} ${sevClass ?? ''}`}>
                    <div className={css.rowHead ?? ''}>
                      <div className={css.rowLabel ?? ''}>{t.label}</div>
                      <span className={`${css.tierBadge ?? ''} ${sevClass ?? ''}`}>{SEV_LABEL[t.severity]}</span>
                    </div>
                    <div className={css.rowDetail ?? ''}>{t.rationale}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className={css.col ?? ''}>
          <div className={css.sectionLabel ?? ''}>Highest-leverage interventions</div>
          {view.leverage.length === 0 ? (
            <div className={css.empty ?? ''}>No interventions matched the threat profile.</div>
          ) : (
            <div className={css.rowList ?? ''}>
              {view.leverage.map((l) => {
                const effClass =
                  l.effort === 'low'
                    ? css.effortLow
                    : l.effort === 'medium'
                    ? css.effortMed
                    : css.effortHigh;
                return (
                  <div key={l.id} className={`${css.row ?? ''} ${effClass ?? ''}`}>
                    <div className={css.rowHead ?? ''}>
                      <div className={css.rowLabel ?? ''}>{l.label}</div>
                      <span className={`${css.tierBadge ?? ''} ${effClass ?? ''}`}>{EFFORT_LABEL[l.effort]}</span>
                    </div>
                    <div className={css.rowDetail ?? ''}>{l.benefit}</div>
                    {l.addresses.length > 0 && (
                      <div className={css.rowAddresses ?? ''}>
                        Addresses: {l.addresses.join(' \u00B7 ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className={css.assumption ?? ''}>
        Threats blend the seven facet scores ({'<'} 35 {'\u2192'} critical, {'<'} 55 {'\u2192'} major) with raw
        site signals (severe-erosion {'\u2265'} 5%, high-erosion {'\u2265'} 10%, slope {'>'} 25%, wet TWI{' '}
        {'\u2265'} 15%, dry TWI {'\u2265'} 60% with low precip, hydrologic group D, cool aspect, growing season{' '}
        {'<'} 150 days). Interventions are ranked by how many active threats they address and by
        relative effort.
      </div>
    </div>
  );
}
