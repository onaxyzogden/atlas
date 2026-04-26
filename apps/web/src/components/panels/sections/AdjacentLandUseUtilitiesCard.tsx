/**
 * §3 AdjacentLandUseUtilitiesCard — surfaces parcel-edge land-cover
 * composition + utility-network qualitative notes.
 *
 * Closes manifest item `adjacent-landuse-utilities` (P2 planned → done).
 * The InfrastructureAccessSection already shows raw distance metrics
 * (hospital/masjid/market/road/water/grid km). What was missing:
 *   1. The land-cover composition AT the parcel — what's adjacent: forest,
 *      cropland, developed, wetland, water, etc. — since adjacency drives
 *      habitat connectivity, urban-edge concerns, riparian regulations.
 *   2. A qualitative "what utilities are realistically available" rollup
 *      derived from the raw distance numbers (Power: serviceable; Water:
 *      well/cistern likely needed; Sewer: septic required, etc.).
 *
 * Pure presentation — reads land_cover, infrastructure, and zoning
 * summaries from the existing siteDataStore. No new fetchers.
 */

import { memo, useMemo } from 'react';
import type { MockLayerResult } from '../../../lib/mockLayerData.js';
import s from './AdjacentLandUseUtilitiesCard.module.css';

interface LandCoverSummary {
  classes?: Record<string, number>;
  tree_canopy_pct?: number;
  impervious_pct?: number;
  primary_class?: string;
}

interface InfrastructureSummary {
  road_nearest_km?: number;
  road_type?: string;
  power_substation_nearest_km?: number;
  water_supply_nearest_km?: number;
  market_nearest_km?: number;
  hospital_nearest_km?: number;
}

interface ZoningSummary {
  zoning_code?: string;
  permitted_uses?: string[];
  min_lot_size_ac?: number;
}

interface Props {
  layers: MockLayerResult[];
}

type ServiceTier = 'serviceable' | 'marginal' | 'self-sourced';

interface UtilityNote {
  key: string;
  label: string;
  tier: ServiceTier;
  headline: string;
  detail: string;
}

interface LandCoverRow {
  label: string;
  pct: number;
  category: 'natural' | 'agricultural' | 'developed' | 'water' | 'other';
}

const CATEGORY_HINTS: Record<LandCoverRow['category'], string> = {
  natural: 'habitat connectivity opportunity',
  agricultural: 'cropping or grazing context',
  developed: 'urban-edge / runoff considerations',
  water: 'riparian buffer / setback context',
  other: '',
};

function classifyClass(name: string): LandCoverRow['category'] {
  const n = name.toLowerCase();
  if (n.includes('forest') || n.includes('shrub') || n.includes('grass') || n.includes('barren')) return 'natural';
  if (n.includes('crop') || n.includes('pasture') || n.includes('hay') || n.includes('soybean') || n.includes('forage')) return 'agricultural';
  if (n.includes('developed') || n.includes('urban') || n.includes('impervious')) return 'developed';
  if (n.includes('water') || n.includes('wetland')) return 'water';
  return 'other';
}

function tierForKm(km: number | undefined, thresholds: { serviceable: number; marginal: number }): ServiceTier {
  if (km === undefined) return 'self-sourced';
  if (km <= thresholds.serviceable) return 'serviceable';
  if (km <= thresholds.marginal) return 'marginal';
  return 'self-sourced';
}

function getSummary<T>(layers: MockLayerResult[], type: string): T | null {
  const layer = layers.find((l) => l.layerType === type);
  return (layer?.summary as T) ?? null;
}

export const AdjacentLandUseUtilitiesCard = memo(function AdjacentLandUseUtilitiesCard({ layers }: Props) {
  const data = useMemo(() => {
    const landCover = getSummary<LandCoverSummary>(layers, 'land_cover');
    const infra = getSummary<InfrastructureSummary>(layers, 'infrastructure');
    const zoning = getSummary<ZoningSummary>(layers, 'zoning');

    const landRows: LandCoverRow[] = landCover?.classes
      ? Object.entries(landCover.classes)
          .map(([label, pct]) => ({ label, pct, category: classifyClass(label) }))
          .sort((a, b) => b.pct - a.pct)
          .slice(0, 5)
      : [];

    const naturalPct = landRows.filter((r) => r.category === 'natural').reduce((s, r) => s + r.pct, 0);
    const agriculturalPct = landRows.filter((r) => r.category === 'agricultural').reduce((s, r) => s + r.pct, 0);
    const developedPct = landRows.filter((r) => r.category === 'developed').reduce((s, r) => s + r.pct, 0);
    const waterPct = landRows.filter((r) => r.category === 'water').reduce((s, r) => s + r.pct, 0);

    const utilities: UtilityNote[] = [];

    if (infra) {
      const roadTier = tierForKm(infra.road_nearest_km, { serviceable: 2, marginal: 8 });
      utilities.push({
        key: 'road',
        label: 'Road access',
        tier: roadTier,
        headline:
          infra.road_nearest_km != null
            ? `${infra.road_nearest_km} km to ${infra.road_type ?? 'nearest'} road`
            : 'No public road network detected nearby',
        detail:
          roadTier === 'serviceable'
            ? 'Driveway can connect to public road without major access easement.'
            : roadTier === 'marginal'
              ? 'Long driveway likely required; verify access easement and grading cost.'
              : 'Remote — private road or significant access infrastructure required.',
      });

      const powerTier = tierForKm(infra.power_substation_nearest_km, { serviceable: 5, marginal: 15 });
      utilities.push({
        key: 'power',
        label: 'Grid power',
        tier: powerTier,
        headline:
          infra.power_substation_nearest_km != null
            ? `${infra.power_substation_nearest_km} km to nearest substation`
            : 'No grid infrastructure detected nearby',
        detail:
          powerTier === 'serviceable'
            ? 'Standard utility hookup likely cost-effective.'
            : powerTier === 'marginal'
              ? 'Line extension cost may favor solar+storage as primary.'
              : 'Off-grid solar/wind+storage is the practical default at this distance.',
      });

      const waterTier = tierForKm(infra.water_supply_nearest_km, { serviceable: 3, marginal: 10 });
      utilities.push({
        key: 'water',
        label: 'Municipal water',
        tier: waterTier,
        headline:
          infra.water_supply_nearest_km != null
            ? `${infra.water_supply_nearest_km} km to municipal supply`
            : 'No municipal water network detected nearby',
        detail:
          waterTier === 'serviceable'
            ? 'Connection feasible if right-of-way is available.'
            : waterTier === 'marginal'
              ? 'Hybrid approach common: well or cistern primary with optional connection.'
              : 'Well, cistern, or rainwater catchment will be the primary supply.',
      });

      utilities.push({
        key: 'sewer',
        label: 'Sewer / wastewater',
        tier: 'self-sourced',
        headline: 'Septic / on-site treatment likely required',
        detail:
          'Rural agricultural parcels rarely have municipal sewer. Plan for septic field, composting toilet, or constructed wetland — verify soil percolation in §3 soils.',
      });
    }

    return {
      landRows,
      treeCanopyPct: landCover?.tree_canopy_pct ?? null,
      imperviousPct: landCover?.impervious_pct ?? null,
      primaryClass: landCover?.primary_class ?? landRows[0]?.label ?? null,
      categoryTotals: { naturalPct, agriculturalPct, developedPct, waterPct },
      utilities,
      zoningCode: zoning?.zoning_code ?? null,
      minLotAc: zoning?.min_lot_size_ac ?? null,
      hasAnyData: !!landCover || !!infra,
    };
  }, [layers]);

  if (!data.hasAnyData) return null;

  const tierLabel: Record<ServiceTier, string> = {
    serviceable: 'Serviceable',
    marginal: 'Marginal',
    'self-sourced': 'Self-sourced',
  };

  const tierClass: Record<ServiceTier, string> = {
    serviceable: s.tier_serviceable!,
    marginal: s.tier_marginal!,
    'self-sourced': s.tier_self!,
  };

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div>
          <h3 className={s.cardTitle}>Adjacent Land Use & Utility Notes</h3>
          <p className={s.cardHint}>
            Edge composition and qualitative utility-availability rollup. Distance
            metrics live in <em>Infrastructure Access</em> above; this card translates
            them into <em>what to design for</em>.
          </p>
        </div>
        <span className={s.heuristicBadge}>HEURISTIC</span>
      </div>

      {/* Adjacent land cover */}
      {data.landRows.length > 0 && (
        <>
          <div className={s.sectionLabel}>Adjacent land cover (top classes)</div>
          <ul className={s.classList}>
            {data.landRows.map((row) => (
              <li key={row.label} className={s.classRow}>
                <span className={`${s.classDot} ${s[`cat_${row.category}`] ?? ''}`} />
                <span className={s.classLabel}>{row.label}</span>
                <span className={s.classPct}>{row.pct}%</span>
                <span className={s.classNote}>{CATEGORY_HINTS[row.category]}</span>
              </li>
            ))}
          </ul>

          {/* Headline strip */}
          <div className={s.headlineStrip}>
            {data.treeCanopyPct != null && (
              <div className={s.headlineBlock}>
                <span className={s.headlineLabel}>Tree canopy</span>
                <span className={s.headlineValue}>{data.treeCanopyPct}%</span>
              </div>
            )}
            {data.imperviousPct != null && (
              <div className={s.headlineBlock}>
                <span className={s.headlineLabel}>Impervious</span>
                <span className={s.headlineValue}>{data.imperviousPct}%</span>
              </div>
            )}
            <div className={s.headlineBlock}>
              <span className={s.headlineLabel}>Natural %</span>
              <span className={s.headlineValue}>{data.categoryTotals.naturalPct}%</span>
            </div>
            <div className={s.headlineBlock}>
              <span className={s.headlineLabel}>Agric. %</span>
              <span className={s.headlineValue}>{data.categoryTotals.agriculturalPct}%</span>
            </div>
          </div>
        </>
      )}

      {/* Utility network notes */}
      {data.utilities.length > 0 && (
        <>
          <div className={s.sectionLabel}>Utility network (qualitative)</div>
          <ul className={s.utilList}>
            {data.utilities.map((u) => (
              <li key={u.key} className={s.utilRow}>
                <div className={s.utilHead}>
                  <span className={s.utilLabel}>{u.label}</span>
                  <span className={`${s.utilTier} ${tierClass[u.tier]}`}>
                    {tierLabel[u.tier]}
                  </span>
                </div>
                <div className={s.utilHeadline}>{u.headline}</div>
                <div className={s.utilDetail}>{u.detail}</div>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className={s.footnote}>
        <em>Method:</em> land-cover composition is the top-5 classes from the
        NLCD or AAFC layer. Utility tiers map raw distance thresholds to
        plain-English service expectations (Road: serviceable {'\u2264'}2km,
        marginal {'\u2264'}8km; Power: {'\u2264'}5/15km; Water: {'\u2264'}3/10km).
        Sewer is shown as self-sourced by default since municipal sewer is
        uncommon on rural agricultural parcels.
        {data.zoningCode && (
          <> Zoning context: {data.zoningCode}{data.minLotAc != null ? ` (min lot ${data.minLotAc} ac)` : ''}.</>
        )}
      </p>
    </div>
  );
});
