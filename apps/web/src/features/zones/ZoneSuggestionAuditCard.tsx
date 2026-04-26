import { memo, useMemo } from 'react';
import css from './ZoneSuggestionAuditCard.module.css';
import {
  ZONE_CATEGORY_CONFIG,
  type ZoneCategory,
} from '../../store/zoneStore.js';
import type { ScoredResult } from '../../lib/computeScores.js';
import { useSiteData, getLayerSummary, type SiteData } from '../../store/siteDataStore.js';
import { computeZoneSuggestions } from './zoneAnalysis.js';

interface ZoneSuggestionAuditCardProps {
  projectId: string;
  scores: ScoredResult[] | null;
  existingCategories: Set<ZoneCategory>;
}

type Tier = 'strong' | 'moderate' | 'heuristic';

const TIER_LABEL: Record<Tier, string> = {
  strong: 'Strong',
  moderate: 'Moderate',
  heuristic: 'Heuristic',
};

interface AuditSuggestion {
  category: ZoneCategory;
  tier: Tier;
  reason: string;
  basis: string;
}

interface SkipEntry {
  category: ZoneCategory;
  reason: string;
}

interface MicroclimateSummary {
  windShelter?: Array<{ direction?: string; effectiveness?: number }>;
  outdoorComfort?: { rating?: string; score?: number };
  sunTraps?: Array<{ location?: string; area_m2?: number }>;
}

interface ElevationSummary {
  mean_slope_deg?: number;
  aspect_dominant?: string;
}

interface CriticalHabitatSummary {
  on_site?: boolean;
  species_on_site?: number | null;
  species_nearby?: number | null;
}

interface FloodWetlandSummary {
  has_significant_wetland?: boolean;
  flood_zone?: string;
}

const SCORE_THRESHOLDS: Record<string, { strong: number; moderate: number }> = {
  'Water Resilience': { strong: 80, moderate: 60 },
  'Agricultural Suitability': { strong: 80, moderate: 65 },
  'Habitat Sensitivity': { strong: 85, moderate: 70 },
  'Regenerative Potential': { strong: 80, moderate: 60 },
  Buildability: { strong: 85, moderate: 70 },
  'Stewardship Readiness': { strong: 80, moderate: 65 },
};

const FAVOURABLE_ASPECT = new Set(['S', 'SSE', 'SSW', 'SE', 'SW']);

function tierFromScore(score: number, scoreName: string): Tier {
  const t = SCORE_THRESHOLDS[scoreName];
  if (!t) return 'moderate';
  if (score >= t.strong) return 'strong';
  return 'moderate';
}

function buildAudit(
  scores: ScoredResult[] | null,
  siteData: SiteData | null,
  existing: Set<ZoneCategory>,
): { suggestions: AuditSuggestion[]; skipped: SkipEntry[] } {
  const suggestions: AuditSuggestion[] = [];
  const suggested = new Set<ZoneCategory>();
  const skipped: SkipEntry[] = [];

  const scoreSugg = computeZoneSuggestions(scores, siteData, existing);
  for (const s of scoreSugg) {
    const tier = tierFromScore(s.sourceScore, s.sourceName);
    suggestions.push({
      category: s.category,
      tier,
      reason: s.reason,
      basis: `${s.sourceName} ${s.sourceScore.toFixed(0)}/100`,
    });
    suggested.add(s.category);
  }

  const microclimate = siteData ? getLayerSummary<MicroclimateSummary>(siteData, 'microclimate') : null;
  const elevation = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
  const habitat = siteData ? getLayerSummary<CriticalHabitatSummary>(siteData, 'critical_habitat') : null;
  const floodWetland = siteData ? getLayerSummary<FloodWetlandSummary>(siteData, 'wetlands_flood') : null;

  const consider = (
    cat: ZoneCategory,
    push: AuditSuggestion | null,
    skipReason: string,
  ) => {
    if (existing.has(cat)) {
      skipped.push({ category: cat, reason: 'already drawn on this parcel' });
      return;
    }
    if (suggested.has(cat)) return;
    if (push) {
      suggestions.push(push);
      suggested.add(cat);
    } else {
      skipped.push({ category: cat, reason: skipReason });
    }
  };

  // Spiritual: wind-sheltered + favourable comfort = quiet contemplative spot
  {
    const sheltered = (microclimate?.windShelter ?? []).some(
      (w) => (w.effectiveness ?? 0) >= 0.4,
    );
    const comfort = microclimate?.outdoorComfort?.score ?? null;
    if (sheltered && comfort != null && comfort >= 60) {
      consider('spiritual', {
        category: 'spiritual',
        tier: 'heuristic',
        reason: 'Wind-sheltered pockets with favourable outdoor comfort suit a contemplation / prayer zone.',
        basis: `windShelter ≥0.4 · outdoorComfort ${comfort.toFixed(0)}/100`,
      }, '');
    } else {
      consider('spiritual', null, microclimate ? 'no sheltered comfortable pocket detected' : 'microclimate layer not loaded');
    }
  }

  // Retreat: south-facing aspect + gentle slope = guest siting
  {
    const aspect = elevation?.aspect_dominant;
    const slope = elevation?.mean_slope_deg ?? null;
    const aspectGood = aspect ? FAVOURABLE_ASPECT.has(aspect.toUpperCase()) : false;
    const slopeGood = slope != null && slope >= 3 && slope <= 15;
    if (aspectGood && slopeGood) {
      consider('retreat', {
        category: 'retreat',
        tier: 'heuristic',
        reason: 'South-facing aspect with gentle slope offers warm, view-favourable guest accommodation siting.',
        basis: `aspect ${aspect} · slope ${slope!.toFixed(1)}°`,
      }, '');
    } else {
      consider('retreat', null, elevation ? 'aspect or slope outside favourable range' : 'elevation layer not loaded');
    }
  }

  // Education: anchor near commons (commons already exists)
  if (existing.has('commons')) {
    consider('education', {
      category: 'education',
      tier: 'heuristic',
      reason: 'A commons zone is already drawn — adjacent education space leverages the gathering anchor.',
      basis: 'commons present',
    }, '');
  } else {
    consider('education', null, 'no commons anchor drawn yet');
  }

  // Buffer: critical habitat or significant wetland on parcel
  {
    const habitatPresent = habitat?.on_site === true || (habitat?.species_on_site ?? 0) > 0;
    const wetlandPresent = floodWetland?.has_significant_wetland === true;
    if (habitatPresent || wetlandPresent) {
      const parts: string[] = [];
      if (habitatPresent) parts.push('critical habitat on-site');
      if (wetlandPresent) parts.push('significant wetland present');
      consider('buffer', {
        category: 'buffer',
        tier: 'strong',
        reason: 'Sensitive features on-site warrant a dedicated setback buffer to protect ecological function.',
        basis: parts.join(' · '),
      }, '');
    } else {
      consider('buffer', null, habitat || floodWetland ? 'no sensitive feature requiring setback' : 'habitat / wetland layers not loaded');
    }
  }

  // Access: gentle terrain + no access zone yet
  {
    const slope = elevation?.mean_slope_deg ?? null;
    if (slope != null && slope < 10) {
      consider('access', {
        category: 'access',
        tier: 'heuristic',
        reason: 'Gentle terrain (<10° mean slope) supports a planned circulation corridor connecting zones.',
        basis: `mean slope ${slope.toFixed(1)}°`,
      }, '');
    } else {
      consider('access', null, elevation ? 'mean slope ≥10° — corridor design needs site-specific routing' : 'elevation layer not loaded');
    }
  }

  // Infrastructure: always advisable to plan a small footprint
  consider('infrastructure', {
    category: 'infrastructure',
    tier: 'heuristic',
    reason: 'Reserve a small footprint (2–5%) for utilities, storage, and service access before zones lock in.',
    basis: 'sizing default — every project',
  }, '');

  // Future expansion: surfaced as a planning prompt only when nothing else has been suggested
  if (!suggested.has('future_expansion') && !existing.has('future_expansion')) {
    skipped.push({ category: 'future_expansion', reason: 'optional — set aside only if growth is anticipated' });
  }

  return { suggestions, skipped };
}

const TIER_RANK: Record<Tier, number> = { strong: 0, moderate: 1, heuristic: 2 };

function ZoneSuggestionAuditCard({ projectId, scores, existingCategories }: ZoneSuggestionAuditCardProps) {
  const siteData = useSiteData(projectId);

  const audit = useMemo(
    () => buildAudit(scores, siteData, existingCategories),
    [scores, siteData, existingCategories],
  );

  const sortedSuggestions = useMemo(
    () => [...audit.suggestions].sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]),
    [audit.suggestions],
  );

  const counts = useMemo(
    () => ({
      strong: audit.suggestions.filter((s) => s.tier === 'strong').length,
      moderate: audit.suggestions.filter((s) => s.tier === 'moderate').length,
      heuristic: audit.suggestions.filter((s) => s.tier === 'heuristic').length,
    }),
    [audit.suggestions],
  );

  const hasSignals = scores != null || siteData != null;

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h4 className={css.title}>Zone suggestion audit</h4>
          <p className={css.hint}>
            Layers score-driven category suggestions over heuristic prompts derived from microclimate, elevation,
            habitat, and wetland signals. Each entry carries a confidence tier and the basis it was inferred from;
            categories considered but skipped show why.
          </p>
        </div>
        <span className={css.modeBadge}>HEURISTIC</span>
      </div>

      {!hasSignals ? (
        <div className={css.empty}>
          Fetch site data and run the assessment to populate suggestions. Without scores or layer summaries the
          audit can only report the universal infrastructure prompt.
        </div>
      ) : (
        <>
          <div className={css.headlineGrid}>
            <div className={css.headlineStat}>
              <span className={css.statValue}>{counts.strong}</span>
              <span className={css.statLabel}>Strong</span>
            </div>
            <div className={css.headlineStat}>
              <span className={css.statValue}>{counts.moderate}</span>
              <span className={css.statLabel}>Moderate</span>
            </div>
            <div className={css.headlineStat}>
              <span className={css.statValue}>{counts.heuristic}</span>
              <span className={css.statLabel}>Heuristic</span>
            </div>
          </div>

          {sortedSuggestions.length > 0 ? (
            <>
              <div className={css.sectionLabel}>Suggested categories</div>
              <div className={css.suggestionList}>
                {sortedSuggestions.map((s) => {
                  const cfg = ZONE_CATEGORY_CONFIG[s.category];
                  return (
                    <div
                      key={s.category}
                      className={[css.suggestionRow, css[`tier-${s.tier}`] ?? ''].join(' ')}
                    >
                      <div className={css.rowHead}>
                        <div className={css.rowMain}>
                          <span className={css.icon}>{cfg.icon}</span>
                          <span className={css.categoryName}>{cfg.label}</span>
                        </div>
                        <span className={[css.tierBadge, css[`tierBadge-${s.tier}`] ?? ''].join(' ')}>
                          {TIER_LABEL[s.tier]}
                        </span>
                      </div>
                      <div className={css.reason}>{s.reason}</div>
                      <div className={css.basis}>{s.basis}</div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className={css.empty}>
              No category surfaced above the suggestion threshold. All recommended zones may already be drawn or
              site signals are below trigger levels.
            </div>
          )}

          {audit.skipped.length > 0 && (
            <>
              <div className={css.sectionLabel}>Considered but skipped</div>
              <div className={css.skipList}>
                {audit.skipped.map((s) => {
                  const cfg = ZONE_CATEGORY_CONFIG[s.category];
                  return (
                    <div key={s.category} className={css.skipRow}>
                      <span className={css.skipName}>
                        <span className={css.icon}>{cfg.icon}</span>
                        {cfg.label}
                      </span>
                      <span className={css.skipReason}>{s.reason}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className={css.assumption}>
            Strong = score ≥80 against the source threshold or a sensitive on-site feature. Moderate = score above
            the suggestion threshold but below 80. Heuristic = layer-derived prompt without a quantified score
            (microclimate shelter, aspect, slope, anchor adjacency). Spiritual prompt requires windShelter
            effectiveness ≥0.4 and outdoorComfort ≥60. Retreat prompt requires a southerly aspect (S/SE/SW family)
            and 3–15° mean slope. Access prompt requires &lt;10° mean slope. Infrastructure is always surfaced as
            a 2–5% planning reservation. Categories already drawn are skipped automatically.
          </div>
        </>
      )}
    </div>
  );
}

export default memo(ZoneSuggestionAuditCard);
