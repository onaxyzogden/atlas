/**
 * §7 ServiceExpansionPreservationCard — service / maintenance / future
 * expansion / preservation zone rollup.
 *
 * Sibling to ZoneAllocationBalanceCard (intent-aware portfolio bands)
 * and ZoneAllocationSummary (raw per-category totals). This card targets
 * the *non-program* zones — the categories a steward picks not to host
 * residents or guests but to keep the site working: service/access
 * (infrastructure + access), future expansion (future_expansion), and
 * preservation (conservation + buffer). All four planning concerns
 * grouped into one audit so the steward can see at a glance whether
 * the site has any service capacity, any room to grow, and any
 * intentional preserve.
 *
 * Per-bucket: zone count, total area (acres + % of allocated), per-zone
 * detail row (name + category badge + area + primary use). Tier flags:
 *   - HIGH: bucket count is 0 (no service / no expansion / no preserve)
 *   - ELEVATED: low share (<5% of allocated for service or preservation)
 *   - OK: present and proportionate
 *
 * Pure presentation — reads useZoneStore, no shared math, no map.
 *
 * Closes manifest item `service-maintenance-expansion-preservation`
 * (P2 partial -> done).
 */

import { memo, useMemo } from 'react';
import type { LandZone, ZoneCategory } from '../../store/zoneStore.js';
import { ZONE_CATEGORY_CONFIG } from '../../store/zoneStore.js';
import css from './ServiceExpansionPreservationCard.module.css';

interface Props {
  zones: LandZone[];
  totalAcreage: number | null;
}

type BucketKey = 'service' | 'expansion' | 'preservation';
type Tier = 'ok' | 'elevated' | 'high';

interface BucketDef {
  key: BucketKey;
  label: string;
  blurb: string;
  categories: readonly ZoneCategory[];
  minPctIfPresent: number;
}

const BUCKETS: readonly BucketDef[] = [
  {
    key: 'service',
    label: 'Service & access',
    blurb: 'Roads, utilities, paths, and the infrastructure spine the site relies on.',
    categories: ['infrastructure', 'access'],
    minPctIfPresent: 5,
  },
  {
    key: 'expansion',
    label: 'Future expansion',
    blurb: 'Held-back acreage explicitly reserved for later phases.',
    categories: ['future_expansion'],
    minPctIfPresent: 0,
  },
  {
    key: 'preservation',
    label: 'Preservation',
    blurb: 'Conservation areas and setback buffers kept off the program.',
    categories: ['conservation', 'buffer'],
    minPctIfPresent: 5,
  },
];

const M2_PER_ACRE = 4046.8564224;

const TIER_LABEL: Record<Tier, string> = {
  ok: 'OK',
  elevated: 'LOW',
  high: 'MISSING',
};
const TIER_CLASS: Record<Tier, string> = {
  ok: css.tierOk ?? '',
  elevated: css.tierElevated ?? '',
  high: css.tierHigh ?? '',
};

export const ServiceExpansionPreservationCard = memo(
  function ServiceExpansionPreservationCard({ zones, totalAcreage }: Props) {
    const data = useMemo(() => {
      const totalAllocatedM2 = zones.reduce((sum, z) => sum + z.areaM2, 0);
      const totalAllocatedAcres = totalAllocatedM2 / M2_PER_ACRE;

      const buckets = BUCKETS.map((b) => {
        const matched = zones.filter((z) => b.categories.includes(z.category));
        const areaM2 = matched.reduce((sum, z) => sum + z.areaM2, 0);
        const pctOfAllocated =
          totalAllocatedM2 > 0 ? (areaM2 / totalAllocatedM2) * 100 : 0;

        let tier: Tier;
        if (matched.length === 0) tier = 'high';
        else if (b.minPctIfPresent > 0 && pctOfAllocated < b.minPctIfPresent) tier = 'elevated';
        else tier = 'ok';

        return {
          ...b,
          zones: matched,
          areaM2,
          areaAcres: areaM2 / M2_PER_ACRE,
          pctOfAllocated,
          tier,
        };
      });

      const flagged = buckets.filter((b) => b.tier !== 'ok').length;

      return {
        buckets,
        totalAllocatedM2,
        totalAllocatedAcres,
        flagged,
        zoneCount: zones.length,
      };
    }, [zones]);

    const isEmpty = data.zoneCount === 0;
    const parcelAcres = totalAcreage ?? 0;
    const allocatedPctOfParcel =
      parcelAcres > 0 ? (data.totalAllocatedAcres / parcelAcres) * 100 : null;

    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>
              Service, expansion &amp; preservation zones
            </h3>
            <p className={css.cardHint}>
              The non-program side of the portfolio. Flags{' '}
              <strong>MISSING</strong> when a bucket has no zones at all,{' '}
              <strong>LOW</strong> when service or preservation is under 5% of
              allocated land. Future-expansion has no minimum {'\u2014'} stewards
              can legitimately choose to use everything now.
            </p>
          </div>
          <span className={css.heuristicBadge}>HEURISTIC</span>
        </div>

        <div className={css.stats}>
          <div className={css.stat}>
            <span className={css.statLabel}>Zones drawn</span>
            <span className={css.statVal}>{data.zoneCount}</span>
          </div>
          <div className={css.stat}>
            <span className={css.statLabel}>Allocated</span>
            <span className={css.statVal}>{data.totalAllocatedAcres.toFixed(1)} ac</span>
          </div>
          <div className={css.stat}>
            <span className={css.statLabel}>Of parcel</span>
            <span className={css.statVal}>
              {allocatedPctOfParcel != null ? `${allocatedPctOfParcel.toFixed(0)}%` : '\u2014'}
            </span>
          </div>
          <div className={`${css.stat} ${data.flagged > 0 ? css.statFlagged : ''}`}>
            <span className={css.statLabel}>Flags</span>
            <span className={css.statVal}>{data.flagged}</span>
          </div>
        </div>

        {isEmpty && (
          <div className={css.empty}>
            No zones drawn yet. Use the <strong>Zone</strong> tool on the Map
            to draw zones, then assign categories {'\u2014'} this audit
            activates once any zones exist so you can see whether you{'\u2019'}ve
            allocated for service, future growth, and preservation.
          </div>
        )}

        {!isEmpty && (
          <ul className={css.bucketList}>
            {data.buckets.map((b) => (
              <li key={b.key} className={`${css.bucket} ${TIER_CLASS[b.tier]}`}>
                <div className={css.bucketHead}>
                  <div className={css.bucketIdent}>
                    <span className={css.bucketLabel}>{b.label}</span>
                    <span className={css.bucketBlurb}>{b.blurb}</span>
                  </div>
                  <span className={`${css.tierChip} ${TIER_CLASS[b.tier]}`}>
                    {TIER_LABEL[b.tier]}
                  </span>
                </div>
                <div className={css.bucketMetrics}>
                  <div className={css.metric}>
                    <span className={css.metricLabel}>Zones</span>
                    <span className={css.metricVal}>{b.zones.length}</span>
                  </div>
                  <div className={css.metric}>
                    <span className={css.metricLabel}>Area</span>
                    <span className={css.metricVal}>
                      {b.zones.length > 0 ? `${b.areaAcres.toFixed(2)} ac` : '\u2014'}
                    </span>
                  </div>
                  <div className={css.metric}>
                    <span className={css.metricLabel}>Of allocated</span>
                    <span className={css.metricVal}>
                      {b.zones.length > 0 ? `${b.pctOfAllocated.toFixed(1)}%` : '\u2014'}
                    </span>
                  </div>
                </div>
                {b.zones.length > 0 && (
                  <ul className={css.zoneList}>
                    {b.zones
                      .slice()
                      .sort((a, z) => z.areaM2 - a.areaM2)
                      .map((z) => {
                        const cfg = ZONE_CATEGORY_CONFIG[z.category];
                        const acres = z.areaM2 / M2_PER_ACRE;
                        return (
                          <li key={z.id} className={css.zoneRow}>
                            <span
                              className={css.zoneSwatch}
                              style={{ background: cfg.color }}
                              aria-hidden
                            />
                            <span className={css.zoneName}>{z.name}</span>
                            <span className={css.zoneCategory}>
                              {cfg.icon} {cfg.label}
                            </span>
                            <span className={css.zoneArea}>{acres.toFixed(2)} ac</span>
                            {z.primaryUse && (
                              <span className={css.zoneUse} title={z.primaryUse}>
                                {z.primaryUse}
                              </span>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                )}
                {b.zones.length === 0 && (
                  <div className={css.bucketEmpty}>
                    {b.key === 'service' &&
                      'No service or access zones. Add an Infrastructure or Access / Circulation zone for utilities, roads, or paths so the site has a documented spine.'}
                    {b.key === 'expansion' &&
                      'No future-expansion zone reserved. If everything is allocated to active program, later phases will need to displace something.'}
                    {b.key === 'preservation' &&
                      'No conservation or buffer zone. Even working sites benefit from a documented preserve / setback so it doesn{\u2019}t get quietly converted.'}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <p className={css.footnote}>
          <em>Heuristic:</em> Categories grouped as{' '}
          <strong>service</strong> (infrastructure + access),{' '}
          <strong>expansion</strong> (future_expansion), and{' '}
          <strong>preservation</strong> (conservation + buffer). The 5%
          minimum for service and preservation is a planning prompt, not
          a hard rule {'\u2014'} dense urban or single-purpose retreat sites
          may legitimately fall below it.
        </p>
      </div>
    );
  },
);

export default ServiceExpansionPreservationCard;
