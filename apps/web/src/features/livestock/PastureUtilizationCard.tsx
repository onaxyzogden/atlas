/**
 * §11 PastureUtilizationCard — paddock-by-paddock stocking density feedback.
 *
 * Each paddock carries `species[]`, `areaM2`, and `stockingDensity` (head/ha).
 * The species catalog (`speciesData.ts`) carries `typicalStocking` (head/ha)
 * and `AU_FACTORS` (animal-unit per head). Crossing the two gives an honest
 * feedback signal that the existing dashboards leave on the floor:
 *
 *   • Per-paddock utilization band (under / aligned / high / over) vs. the
 *     primary species' typical stocking rate, scaled by an annual-precip
 *     proxy that approximates forage carrying capacity (semi-arid sites
 *     carry ~50% of mesic; high-precip sites ~110%).
 *   • Per-paddock head count, AU load, and AU/ha intensity.
 *   • Whole-parcel rollup: total AU on rotation, AU/ha across all paddocks,
 *     and a count of paddocks outside the target [60%, 110%] band.
 *
 * Pure presentation — uses the livestock store, climate site-data layer, and
 * the species catalog already in the codebase. No shared math, no new
 * persistence, no map writes.
 */
import { useMemo } from 'react';
import { useLivestockStore, type Paddock, type LivestockSpecies } from '../../store/livestockStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { LIVESTOCK_SPECIES, AU_FACTORS } from './speciesData.js';
import css from './PastureUtilizationCard.module.css';

interface ClimateLite {
  annual_precip_mm?: number | null;
}

interface Props {
  projectId: string;
}

type Band = 'under' | 'aligned' | 'high' | 'over' | 'idle';

interface PaddockRow {
  id: string;
  name: string;
  areaHa: number;
  primarySpecies: LivestockSpecies | null;
  primaryLabel: string;
  primaryIcon: string;
  density: number | null; // head/ha (from store)
  recommendedDensity: number | null; // head/ha (climate-adjusted)
  utilization: number | null; // density / recommendedDensity
  band: Band;
  headCount: number; // density × areaHa
  auLoad: number;
  auPerHa: number;
}

// Aligned band:  60–110% of recommended
// High band:    111–150%
// Over band:    >150%
// Under band:   1–59%
// Idle:         density null or 0
function classify(util: number | null): Band {
  if (util == null || util === 0) return 'idle';
  if (util < 0.6) return 'under';
  if (util <= 1.1) return 'aligned';
  if (util <= 1.5) return 'high';
  return 'over';
}

function precipToCapacityFactor(precipMm: number | null | undefined): number {
  // 0.5 at <=300mm, 1.0 at ~800mm, 1.1 cap at >=1500mm. Linear in two segments.
  if (precipMm == null) return 1.0;
  if (precipMm <= 300) return 0.5;
  if (precipMm >= 1500) return 1.1;
  if (precipMm <= 800) {
    // 300 → 0.5 .. 800 → 1.0
    return 0.5 + ((precipMm - 300) / 500) * 0.5;
  }
  // 800 → 1.0 .. 1500 → 1.1
  return 1.0 + ((precipMm - 800) / 700) * 0.1;
}

export default function PastureUtilizationCard({ projectId }: Props) {
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const paddocks = useMemo(() => allPaddocks.filter((p) => p.projectId === projectId), [allPaddocks, projectId]);
  const siteData = useSiteData(projectId);
  const climate = siteData ? getLayerSummary<ClimateLite>(siteData, 'climate') : null;
  const precip = climate?.annual_precip_mm ?? null;
  const capFactor = precipToCapacityFactor(precip);

  const rows = useMemo<PaddockRow[]>(() => paddocks.map((p) => buildRow(p, capFactor)), [paddocks, capFactor]);

  const totals = useMemo(() => {
    const totalAreaHa = rows.reduce((s, r) => s + r.areaHa, 0);
    const totalAu = rows.reduce((s, r) => s + r.auLoad, 0);
    const auPerHa = totalAreaHa > 0 ? totalAu / totalAreaHa : 0;
    const outOfBand = rows.filter((r) => r.band !== 'aligned' && r.band !== 'idle').length;
    const idleCount = rows.filter((r) => r.band === 'idle').length;
    return { totalAreaHa, totalAu, auPerHa, outOfBand, idleCount };
  }, [rows]);

  if (paddocks.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.head}>
          <div>
            <h3 className={css.title}>Pasture Utilization</h3>
            <p className={css.hint}>
              Stocking-density feedback per paddock against species recommendations
              and climate-adjusted forage capacity. Draw at least one paddock and
              assign a species + stocking density to populate this card.
            </p>
          </div>
          <span className={`${css.badge} ${css.badgeIdle}`}>NO PADDOCKS</span>
        </div>
        <div className={css.empty}>No paddocks drawn for this project yet.</div>
      </div>
    );
  }

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Pasture Utilization</h3>
          <p className={css.hint}>
            Stocking density per paddock vs. species recommendation, scaled by
            a precipitation-based forage capacity factor
            (<strong>{capFactor.toFixed(2)}×</strong>{precip != null ? ` from ${precip.toFixed(0)} mm/yr` : ' — climate layer absent, using 1.0×'}).
            Aligned = 60–110%, High = 110–150%, Over = &gt;150%, Under = &lt;60%.
          </p>
        </div>
        <span className={`${css.badge} ${totals.outOfBand === 0 ? css.badgeGood : totals.outOfBand <= 2 ? css.badgeFair : css.badgePoor}`}>
          {totals.outOfBand}/{rows.length - totals.idleCount} OUT OF BAND
        </span>
      </div>

      <div className={css.summaryGrid}>
        <Stat label="Paddocks" value={`${rows.length}`} sub={totals.idleCount > 0 ? `${totals.idleCount} idle` : undefined} />
        <Stat label="Total area" value={`${totals.totalAreaHa.toFixed(2)} ha`} />
        <Stat label="Total AU loaded" value={totals.totalAu.toFixed(1)} />
        <Stat
          label="AU / ha (parcel)"
          value={totals.auPerHa.toFixed(2)}
          tone={totals.auPerHa > 2.5 ? 'poor' : totals.auPerHa > 1.5 ? 'fair' : 'good'}
        />
      </div>

      <ul className={css.list}>
        {rows.map((r) => (
          <li key={r.id} className={`${css.row} ${css[`band_${r.band}`]}`}>
            <div className={css.rowMain}>
              <div className={css.rowMeta}>
                <span className={css.rowName}>{r.name}</span>
                <span className={css.rowSpecies}>
                  {r.primarySpecies ? `${r.primaryIcon} ${r.primaryLabel}` : 'No species assigned'}
                </span>
                <span className={css.rowArea}>{r.areaHa.toFixed(2)} ha</span>
              </div>
              <span className={`${css.rowBand} ${css[`tag_${r.band}`]}`}>
                {bandLabel(r.band)}
              </span>
            </div>
            {r.density != null && r.recommendedDensity != null ? (
              <>
                <div className={css.utilBar}>
                  <div
                    className={`${css.utilFill} ${css[`fill_${r.band}`]}`}
                    style={{ width: `${Math.min(100, ((r.utilization ?? 0) / 1.5) * 100)}%` }}
                  />
                  <div className={css.utilTickAligned} title="Aligned band 60–110%" />
                </div>
                <div className={css.rowFigures}>
                  <Figure label="Density" value={`${r.density.toFixed(1)} hd/ha`} />
                  <Figure label="Recommended" value={`${r.recommendedDensity.toFixed(1)} hd/ha`} />
                  <Figure label="Utilization" value={r.utilization != null ? `${(r.utilization * 100).toFixed(0)}%` : '—'} />
                  <Figure label="Head" value={r.headCount.toFixed(0)} />
                  <Figure label="AU load" value={r.auLoad.toFixed(2)} />
                  <Figure label="AU/ha" value={r.auPerHa.toFixed(2)} />
                </div>
                <div className={css.rowAdvisory}>{advise(r)}</div>
              </>
            ) : (
              <div className={css.rowAdvisory}>
                {r.primarySpecies == null
                  ? 'Assign a primary species to this paddock to receive utilization feedback.'
                  : 'Set the stocking density (head per hectare) on this paddock to score utilization.'}
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className={css.footnote}>
        The capacity factor is a coarse precipitation proxy — a working
        alternative to a full DM-yield model. For peer-reviewed targets,
        substitute county NRCS forage productivity or on-site exclosure
        clipping data. Bands are tuned for sustained rotational grazing,
        not short-duration mob stocking (which can run higher transiently).
      </p>
    </div>
  );
}

function buildRow(p: Paddock, capFactor: number): PaddockRow {
  const areaHa = p.areaM2 / 10000;
  const primarySpecies = p.species[0] ?? null;
  const info = primarySpecies ? LIVESTOCK_SPECIES[primarySpecies] : null;
  const recommended = info ? info.typicalStocking * capFactor : null;
  const density = p.stockingDensity ?? null;
  const utilization = density != null && recommended != null && recommended > 0
    ? density / recommended
    : null;
  const headCount = density != null ? density * areaHa : 0;
  const auFactor = primarySpecies ? AU_FACTORS[primarySpecies] : 0;
  const auLoad = headCount * auFactor;
  const auPerHa = areaHa > 0 ? auLoad / areaHa : 0;
  return {
    id: p.id,
    name: p.name,
    areaHa,
    primarySpecies,
    primaryLabel: info?.label ?? '—',
    primaryIcon: info?.icon ?? '',
    density,
    recommendedDensity: recommended,
    utilization,
    band: classify(utilization),
    headCount,
    auLoad,
    auPerHa,
  };
}

function bandLabel(b: Band): string {
  switch (b) {
    case 'under': return 'UNDER';
    case 'aligned': return 'ALIGNED';
    case 'high': return 'HIGH';
    case 'over': return 'OVERSTOCKED';
    case 'idle': return 'IDLE';
  }
}

function advise(r: PaddockRow): string {
  if (r.utilization == null || r.recommendedDensity == null) return '';
  const pct = Math.round(r.utilization * 100);
  switch (r.band) {
    case 'under':
      return `${pct}% of recommended density — paddock is under-utilized. Either grow the herd to harvest the available forage, lengthen rotation rest periods, or shrink the paddock footprint to match a smaller herd.`;
    case 'aligned':
      return `${pct}% of recommended density — well within the sustainable band. Monitor regrowth height before each rotation move and adjust if forage doesn't recover within the species' typical rest period.`;
    case 'high':
      return `${pct}% of recommended density — pushing the upper edge. Sustainable only with attentive rotation timing and good forage quality. Watch for soil compaction, manure concentration, and parasite pressure.`;
    case 'over':
      return `${pct}% of recommended density — overstocked relative to species norms. Expect overgrazing, bare-ground patches, weed encroachment, and degraded animal performance. Reduce herd, expand the paddock, or shorten residence time aggressively.`;
    case 'idle':
      return '';
  }
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string | undefined; tone?: 'good' | 'fair' | 'poor' }) {
  return (
    <div className={`${css.stat} ${tone ? css[`stat_${tone}`] : ''}`}>
      <div className={css.statLabel}>{label}</div>
      <div className={css.statValue}>{value}</div>
      {sub && <div className={css.statSub}>{sub}</div>}
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className={css.figure}>
      <span className={css.figLabel}>{label}</span>
      <span className={css.figValue}>{value}</span>
    </div>
  );
}
