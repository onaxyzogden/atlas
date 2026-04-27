/**
 * §8 ZoneCategoryUseAuditCard — primary/secondary use designation audit.
 *
 * Grades whether each drawn zone has a primary and secondary use filled
 * in, whether they say different things, and whether the primary use
 * actually aligns with the zone's category (a `food_production` zone
 * whose primary use is "parking" gets flagged). Pure derivation from
 * `useZoneStore`, no writes.
 *
 * Closes manifest §8 `zone-categories-primary-secondary` (P1) partial -> done.
 */

import { useMemo } from 'react';
import {
  useZoneStore,
  ZONE_CATEGORY_CONFIG,
  type LandZone,
  type ZoneCategory,
} from '../../store/zoneStore.js';
import css from './ZoneCategoryUseAuditCard.module.css';

interface Props {
  projectId: string;
}

type UseTier = 'aligned' | 'partial' | 'thin' | 'missing';

interface ZoneAudit {
  zone: LandZone;
  hasPrimary: boolean;
  hasSecondary: boolean;
  primaryAligns: boolean;
  primaryEqualsSecondary: boolean;
  tier: UseTier;
  flags: string[];
  matchedKeyword: string | null;
}

const CATEGORY_KEYWORDS: Record<ZoneCategory, string[]> = {
  habitation:       ['home', 'house', 'dwell', 'cabin', 'living', 'residence', 'sleep', 'bedroom'],
  food_production:  ['food', 'garden', 'orchard', 'crop', 'vegetable', 'farm', 'pasture', 'annual', 'perennial', 'forage', 'kitchen garden', 'market garden', 'plant', 'grow'],
  livestock:        ['livestock', 'animal', 'cattle', 'sheep', 'goat', 'chicken', 'poultry', 'duck', 'graze', 'grazing', 'paddock', 'herd', 'pen', 'shelter'],
  commons:          ['common', 'shared', 'community', 'public', 'social', 'gather', 'open'],
  spiritual:        ['spiritual', 'prayer', 'salah', 'sacred', 'reflect', 'meditat', 'mosque', 'masjid', 'devot', 'worship', 'qibla'],
  education:        ['educat', 'learn', 'class', 'school', 'teach', 'workshop', 'demo', 'training', 'lesson', 'study'],
  retreat:          ['retreat', 'guest', 'visitor', 'lodging', 'glamp', 'camp', 'cabin', 'overnight', 'hospitality'],
  conservation:     ['conserv', 'protect', 'reserve', 'wild', 'native', 'forest', 'habitat', 'preserve', 'untouch'],
  water_retention:  ['water', 'pond', 'swale', 'dam', 'cistern', 'reservoir', 'wetland', 'rain', 'catch', 'storm', 'detention'],
  infrastructure:   ['infrastruct', 'utility', 'power', 'solar', 'electric', 'septic', 'well', 'tank', 'pump', 'service', 'mechanical'],
  access:           ['access', 'road', 'path', 'trail', 'lane', 'driveway', 'circulation', 'route', 'walk'],
  buffer:           ['buffer', 'setback', 'screen', 'edge', 'boundary', 'transition', 'hedge'],
  future_expansion: ['future', 'expansion', 'reserve', 'phase', 'pending', 'later', 'tbd', 'tba'],
};

function matchKeyword(text: string, category: ZoneCategory): string | null {
  const lc = text.toLowerCase();
  for (const k of CATEGORY_KEYWORDS[category]) {
    if (lc.includes(k)) return k;
  }
  return null;
}

function classify(zone: LandZone): ZoneAudit {
  const primary = (zone.primaryUse ?? '').trim();
  const secondary = (zone.secondaryUse ?? '').trim();
  const hasPrimary = primary.length > 0;
  const hasSecondary = secondary.length > 0;
  const matched = hasPrimary ? matchKeyword(primary, zone.category) : null;
  const primaryAligns = matched !== null;
  const primaryEqualsSecondary =
    hasPrimary && hasSecondary && primary.toLowerCase() === secondary.toLowerCase();

  const flags: string[] = [];
  if (!hasPrimary) flags.push('No primary use');
  if (!hasSecondary) flags.push('No secondary use');
  if (hasPrimary && !primaryAligns) flags.push('Primary out of category');
  if (primaryEqualsSecondary) flags.push('Primary = secondary');

  let tier: UseTier;
  if (!hasPrimary) {
    tier = 'missing';
  } else if (!primaryAligns) {
    tier = 'thin';
  } else if (!hasSecondary || primaryEqualsSecondary) {
    tier = 'partial';
  } else {
    tier = 'aligned';
  }

  return {
    zone,
    hasPrimary,
    hasSecondary,
    primaryAligns,
    primaryEqualsSecondary,
    tier,
    flags,
    matchedKeyword: matched,
  };
}

type Verdict = 'documented' | 'outlined' | 'sparse' | 'empty';

function deriveVerdict(audit: ZoneAudit[]): { verdict: Verdict; label: string; blurb: string } {
  if (audit.length === 0) {
    return { verdict: 'empty', label: 'No zones drawn', blurb: 'Draw a zone in the Zones tab to begin.' };
  }
  const aligned = audit.filter((a) => a.tier === 'aligned').length;
  const missing = audit.filter((a) => a.tier === 'missing').length;
  const ratio = aligned / audit.length;
  if (ratio >= 0.7 && missing === 0) {
    return { verdict: 'documented', label: 'Documented', blurb: 'Most zones carry an aligned primary + distinct secondary use.' };
  }
  if (ratio >= 0.4) {
    return { verdict: 'outlined', label: 'Outlined', blurb: 'Primary uses are filled but several lack alignment or a secondary.' };
  }
  return { verdict: 'sparse', label: 'Sparse', blurb: 'Many zones are missing a primary use or list one outside their category.' };
}

const TIER_LABEL: Record<UseTier, string> = {
  aligned: 'Aligned',
  partial: 'Partial',
  thin: 'Off-category',
  missing: 'Unset',
};

const TIER_PILL_CLASS: Record<UseTier, string> = {
  aligned: css.tierStrong ?? '',
  partial: css.tierAcceptable ?? '',
  thin: css.tierSparse ?? '',
  missing: css.tierGap ?? '',
};

export default function ZoneCategoryUseAuditCard({ projectId }: Props) {
  const allZones = useZoneStore((st) => st.zones);
  const projectZones = useMemo(
    () => allZones.filter((z) => z.projectId === projectId),
    [allZones, projectId],
  );

  const audit = useMemo(() => projectZones.map(classify), [projectZones]);

  const stats = useMemo(() => {
    const tiers: Record<UseTier, number> = { aligned: 0, partial: 0, thin: 0, missing: 0 };
    let withPrimary = 0;
    let withSecondary = 0;
    let withBoth = 0;
    let alignedCount = 0;
    for (const a of audit) {
      tiers[a.tier] += 1;
      if (a.hasPrimary) withPrimary += 1;
      if (a.hasSecondary) withSecondary += 1;
      if (a.hasPrimary && a.hasSecondary && !a.primaryEqualsSecondary) withBoth += 1;
      if (a.primaryAligns) alignedCount += 1;
    }
    return {
      total: audit.length,
      tiers,
      withPrimary,
      withSecondary,
      withBoth,
      alignedCount,
    };
  }, [audit]);

  const verdict = useMemo(() => deriveVerdict(audit), [audit]);

  const verdictClass =
    verdict.verdict === 'documented' ? css.verdictGood ?? ''
    : verdict.verdict === 'outlined' ? css.verdictFair ?? ''
    : verdict.verdict === 'sparse' ? css.verdictWork ?? ''
    : css.verdictBlock ?? '';

  return (
    <div className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Primary &amp; secondary use designation
            <span className={css.badge}>AUDIT</span>
          </h3>
          <p className={css.cardHint}>
            Tests every zone's primary and secondary use fields against
            its category. <em>Aligned</em> = primary use contains a
            keyword that matches the category (a food-production zone
            whose primary use says "market garden", for example) and a
            distinct secondary is filled. <em>Partial</em> = primary
            aligns but secondary is missing or duplicates the primary.
            <em>Off-category</em> = primary is filled but doesn't match
            the category vocabulary. <em>Unset</em> = no primary use at
            all.
          </p>
        </div>
        <div className={`${css.verdictPill} ${verdictClass}`}>
          <span className={css.verdictLabel}>{verdict.label}</span>
          <span className={css.verdictBlurb}>{verdict.blurb}</span>
        </div>
      </header>

      {audit.length === 0 ? (
        <p className={css.empty}>
          No zones drawn for this project yet. Use the Zones tab to draw
          a polygon and fill in primary / secondary use — the audit
          appears here once at least one is saved.
        </p>
      ) : (
        <>
          <div className={css.statsRow}>
            <div className={css.stat}>
              <span className={css.statValue}>{stats.total}</span>
              <span className={css.statLabel}>Zones</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{stats.tiers.aligned}</span>
              <span className={css.statLabel}>Aligned</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{stats.withPrimary}</span>
              <span className={css.statLabel}>Has primary</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{stats.withSecondary}</span>
              <span className={css.statLabel}>Has secondary</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{stats.withBoth}</span>
              <span className={css.statLabel}>Distinct pair</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{stats.tiers.missing}</span>
              <span className={css.statLabel}>Unset primary</span>
            </div>
          </div>

          <ul className={css.zoneList}>
            {audit.map((a) => {
              const cfg = ZONE_CATEGORY_CONFIG[a.zone.category];
              const primaryDisplay = a.hasPrimary ? a.zone.primaryUse : '(no primary use)';
              const secondaryDisplay = a.hasSecondary ? a.zone.secondaryUse : '(no secondary use)';
              return (
                <li key={a.zone.id} className={css.zoneRow}>
                  <span
                    className={css.colorSwatch}
                    style={{ background: a.zone.color }}
                    aria-hidden
                  />
                  <div className={css.zoneBody}>
                    <div className={css.zoneHead}>
                      <span className={css.zoneName}>{a.zone.name || '(unnamed)'}</span>
                      <span className={css.categoryTag}>
                        {cfg?.icon} {cfg?.label ?? a.zone.category}
                      </span>
                      <span className={`${css.tierPill} ${TIER_PILL_CLASS[a.tier]}`}>
                        {TIER_LABEL[a.tier]}
                      </span>
                    </div>
                    <div className={css.usePair}>
                      <div className={css.useCell}>
                        <span className={css.useLabel}>Primary</span>
                        <span className={a.hasPrimary ? css.useText : css.useTextMissing}>
                          {primaryDisplay}
                        </span>
                        {a.matchedKeyword && (
                          <span className={css.matchedKw} title="Keyword matched against category vocabulary">
                            matched: {a.matchedKeyword}
                          </span>
                        )}
                      </div>
                      <div className={css.useCell}>
                        <span className={css.useLabel}>Secondary</span>
                        <span className={a.hasSecondary ? css.useText : css.useTextMissing}>
                          {secondaryDisplay}
                        </span>
                      </div>
                    </div>
                    {a.flags.length > 0 && (
                      <div className={css.flagChips}>
                        {a.flags.map((f) => (
                          <span key={f} className={css.flagChip}>{f}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <p className={css.footnote}>
            <em>Why this matters:</em> the primary/secondary pair is the
            only place a steward says — in their own words — what a zone
            is for. The category gives the colour and the broad bucket;
            primary use says <em>which</em> orchard, <em>which</em>
            paddock, <em>which</em> guest area. Off-category primaries
            usually mean the steward picked the wrong category at draw
            time. Empty secondaries forfeit the chance to capture the
            stacked-function intent that makes the zone read as
            regenerative rather than monoculture.
          </p>
        </>
      )}
    </div>
  );
}
