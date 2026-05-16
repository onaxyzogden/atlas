/**
 * LivestockLandFitCard — §11 per-zone × per-species fit matrix.
 *
 * Closes the §11 spec line "Livestock-land fit & enterprise zone matching"
 * by surfacing a 0–3 star rating for each (zone, species) pair using a
 * heuristic blend of:
 *
 *   - Zone category   — livestock / food_production / commons → OK;
 *                        spiritual / water_retention / habitation → BAD;
 *                        other categories → MIXED.
 *   - Zone area       — must meet species' minPaddockHa (from speciesData).
 *   - Site slope      — from elevation summary (mean_slope_deg).
 *   - Site drainage   — from soils summary (drainage_class).
 *
 * Pure presentation: reads zoneStore + siteData. No new shared exports,
 * no new entities, no math touched in @ogden/shared.
 *
 * The heuristic is deliberately coarse — a steward-facing nudge, not a
 * stocking-density quote. Rationale shown on hover so the reasoning is
 * legible.
 *
 * Spec: §11 livestock-land-fit-enterprise-zone (featureManifest).
 */

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useZoneStore, type ZoneCategory, type LandZone } from '../../store/zoneStore.js';
import {
  useSiteData,
  getLayerSummary,
  type SiteData,
} from '../../store/siteDataStore.js';
import {
  LIVESTOCK_SPECIES,
  type LivestockSpeciesInfo,
} from './speciesData.js';
import type { LivestockSpecies } from '../../store/livestockStore.js';
import css from './LivestockLandFitCard.module.css';

interface Props {
  projectId: string;
}

interface SoilsSummary { drainage_class?: string }
interface ElevationSummary { mean_slope_deg?: number }

/** Active rationale tooltip — only one is shown at a time across the matrix. */
interface ActiveTip {
  key: string;
  rect: DOMRect;
  label: string;
  zoneName: string;
  reasons: string[];
}

const TIP_W = 200; // must equal .rationale width in LivestockLandFitCard.module.css
const GAP = 6;
const MARGIN = 8;

/**
 * Five major enterprise species shown in the matrix. Horses, ducks/geese,
 * rabbits, and bees are intentionally omitted to keep the grid readable —
 * they're noted in the footnote.
 */
const MATRIX_SPECIES: LivestockSpecies[] = ['cattle', 'sheep', 'goats', 'poultry', 'pigs'];

/**
 * Per-species slope tolerance (max comfortable degrees). Beyond this the
 * species struggles with traction, hoof wear, or fence stability.
 * Numbers are rules-of-thumb from rotational-grazing literature.
 */
const SLOPE_TOLERANCE_DEG: Record<LivestockSpecies, number> = {
  cattle: 12,
  sheep: 25,
  goats: 35,
  poultry: 10,
  pigs: 8,
  horses: 15,
  ducks_geese: 5,
  rabbits: 8,
  bees: 90, // bees don't care about slope
};

/**
 * Drainage preference per species, expressed as a string keyword to match
 * against SSURGO `drainage_class` values ("well drained", "moderately
 * well drained", "somewhat poorly drained", "poorly drained", etc.).
 *
 * "any" = species is tolerant of any drainage class.
 * "wet" = species actively prefers wet/poorly-drained ground.
 * "well" = species needs well-drained ground (otherwise hoof rot, etc.).
 */
type DrainagePref = 'well' | 'any' | 'wet';

const DRAINAGE_PREFERENCE: Record<LivestockSpecies, DrainagePref> = {
  cattle: 'any',
  sheep: 'well',
  goats: 'well',
  poultry: 'well',
  pigs: 'any',
  horses: 'well',
  ducks_geese: 'wet',
  rabbits: 'well',
  bees: 'any',
};

/**
 * Coarse zone-category disposition for livestock placement.
 *   ok      — designed for or compatible with livestock
 *   mixed   — neutral; possible with care
 *   no      — incompatible (privacy, sanctity, water-table, residential)
 */
type ZoneFit = 'ok' | 'mixed' | 'no';

const ZONE_CATEGORY_FIT: Record<ZoneCategory, ZoneFit> = {
  livestock: 'ok',
  food_production: 'ok',
  commons: 'ok',
  conservation: 'mixed',
  retreat: 'mixed',
  education: 'mixed',
  buffer: 'mixed',
  future_expansion: 'mixed',
  access: 'mixed',
  infrastructure: 'no',
  habitation: 'no',
  spiritual: 'no',
  water_retention: 'no',
};

interface FitResult {
  stars: 0 | 1 | 2 | 3;
  reasons: string[];
}

function computeFit(
  zone: LandZone,
  species: LivestockSpecies,
  info: LivestockSpeciesInfo,
  slopeDeg: number | null,
  drainage: string | null,
): FitResult {
  const reasons: string[] = [];
  const fit = ZONE_CATEGORY_FIT[zone.category];

  // Hard fail on zone category — livestock doesn't belong in a prayer space.
  if (fit === 'no') {
    return {
      stars: 0,
      reasons: [`zone category "${zone.category}" is incompatible with livestock`],
    };
  }

  let stars = 3;

  // Penalty 1: zone category is "mixed" rather than "ok"
  if (fit === 'mixed') {
    stars -= 1;
    reasons.push(`zone category "${zone.category}" is acceptable but not livestock-primary`);
  } else {
    reasons.push(`zone category "${zone.category}" supports livestock`);
  }

  // Penalty 2: zone is too small for the species' minimum paddock
  const areaHa = zone.areaM2 / 10_000;
  if (areaHa < info.minPaddockHa) {
    stars -= 2;
    reasons.push(
      `${areaHa.toFixed(2)} ha < min ${info.minPaddockHa} ha for ${info.label.toLowerCase()}`,
    );
  } else {
    reasons.push(`${areaHa.toFixed(2)} ha meets ${info.minPaddockHa} ha minimum`);
  }

  // Penalty 3: site slope exceeds species tolerance
  if (slopeDeg !== null) {
    const tol = SLOPE_TOLERANCE_DEG[species];
    if (slopeDeg > tol) {
      stars -= 1;
      reasons.push(
        `site slope ${slopeDeg.toFixed(0)}\u00B0 exceeds ${species} tolerance (${tol}\u00B0)`,
      );
    } else {
      reasons.push(`site slope ${slopeDeg.toFixed(0)}\u00B0 within tolerance`);
    }
  }

  // Penalty 4: drainage mismatch
  if (drainage) {
    const pref = DRAINAGE_PREFERENCE[species];
    const lower = drainage.toLowerCase();
    const isWet = lower.includes('poor') || lower.includes('very poor');
    const isWell = lower.includes('well drained') && !lower.includes('moderately');
    if (pref === 'well' && isWet) {
      stars -= 1;
      reasons.push(`${species} need well-drained ground; site is "${drainage}"`);
    } else if (pref === 'wet' && isWell) {
      stars -= 1;
      reasons.push(`${species} prefer wetter ground; site is "${drainage}"`);
    } else {
      reasons.push(`drainage "${drainage}" compatible`);
    }
  }

  // Clamp to 0..3
  if (stars < 0) stars = 0;
  if (stars > 3) stars = 3;

  return { stars: stars as 0 | 1 | 2 | 3, reasons };
}

function Stars({ count }: { count: 0 | 1 | 2 | 3 }) {
  return (
    <span className={css.stars} aria-label={`${count} of 3 stars`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={i < count ? css.starOn : css.starOff}>
          {'\u2605'}
        </span>
      ))}
    </span>
  );
}

export default function LivestockLandFitCard({ projectId }: Props) {
  const allZones = useZoneStore((s) => s.zones);
  const siteData: SiteData | null = useSiteData(projectId);

  const zones = useMemo(
    () => allZones.filter((z) => z.projectId === projectId),
    [allZones, projectId],
  );

  const { slopeDeg, drainage } = useMemo(() => {
    const elev = siteData ? getLayerSummary<ElevationSummary>(siteData, 'elevation') : null;
    const soils = siteData ? getLayerSummary<SoilsSummary>(siteData, 'soils') : null;
    return {
      slopeDeg: typeof elev?.mean_slope_deg === 'number' ? elev.mean_slope_deg : null,
      drainage: typeof soils?.drainage_class === 'string' ? soils.drainage_class : null,
    };
  }, [siteData]);

  const [tip, setTip] = useState<ActiveTip | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const anchorElRef = useRef<HTMLTableCellElement | null>(null);
  const tipId = useId();

  useLayoutEffect(() => {
    if (!tip) return;
    const node = tipRef.current;
    if (!node) return;
    const tipH = node.offsetHeight;
    const r = tip.rect;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceAbove = r.top;
    const placeAbove = spaceAbove >= tipH + GAP || spaceAbove >= vh - r.bottom;
    let top = placeAbove ? r.top - GAP - tipH : r.bottom + GAP;
    if (top < MARGIN) top = MARGIN;
    if (top + tipH > vh - MARGIN) top = Math.max(MARGIN, vh - MARGIN - tipH);

    let left = r.left + r.width / 2 - TIP_W / 2;
    if (left < MARGIN) left = MARGIN;
    if (left + TIP_W > vw - MARGIN) left = Math.max(MARGIN, vw - MARGIN - TIP_W);

    setPos({ top: Math.round(top), left: Math.round(left) });
  }, [tip]);

  useEffect(() => {
    if (!tip) return;
    const onScroll = () => {
      setTip(null);
      setPos(null);
    };
    const onResize = () => {
      const el = anchorElRef.current;
      if (!el || !el.isConnected) {
        setTip(null);
        setPos(null);
        return;
      }
      setTip((t) => (t ? { ...t, rect: el.getBoundingClientRect() } : t));
    };
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', onResize);
    };
  }, [tip]);

  if (zones.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <h2 className={css.cardTitle}>Livestock-land fit matrix</h2>
          <span className={css.cardHint}>0 zones</span>
        </div>
        <div className={css.empty}>
          No zones drawn yet. Draw land-use zones from the Map view {'\u2014'}{' '}
          this matrix will rate each zone{'\u2019'}s fit for the five major
          livestock enterprises.
        </div>
      </div>
    );
  }

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <h2 className={css.cardTitle}>Livestock-land fit matrix</h2>
        <span className={css.cardHint}>
          {zones.length} zone{zones.length !== 1 ? 's' : ''} {'\u00D7'} {MATRIX_SPECIES.length} species
        </span>
      </div>

      <div className={css.siteBanner}>
        <span>
          Site slope:{' '}
          <strong>{slopeDeg !== null ? `${slopeDeg.toFixed(1)}\u00B0` : 'unknown'}</strong>
        </span>
        <span>
          Drainage: <strong>{drainage ?? 'unknown'}</strong>
        </span>
      </div>

      <div className={css.tableWrap}>
        <table className={css.matrix}>
          <thead>
            <tr>
              <th className={css.zoneCol}>Zone</th>
              {MATRIX_SPECIES.map((s) => {
                const info = LIVESTOCK_SPECIES[s];
                return (
                  <th key={s} title={info.label}>
                    {info.icon} {info.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {zones.map((z) => (
              <tr key={z.id}>
                <td className={css.zoneCell}>
                  <div className={css.zoneName}>
                    <span className={css.zoneNameTitle}>{z.name}</span>
                    <span className={css.zoneNameSub}>
                      {z.category} {'\u00B7'} {(z.areaM2 / 10_000).toFixed(2)} ha
                    </span>
                  </div>
                </td>
                {MATRIX_SPECIES.map((s) => {
                  const info = LIVESTOCK_SPECIES[s];
                  const fit = computeFit(z, s, info, slopeDeg, drainage);
                  const tierClass =
                    fit.stars === 3 ? css.fitTier_3
                    : fit.stars === 2 ? css.fitTier_2
                    : fit.stars === 1 ? css.fitTier_1
                    : css.fitTier_0;
                  const cellKey = `${z.id}:${s}`;
                  return (
                    <td
                      key={s}
                      className={`${css.fitCell} ${tierClass}`}
                      tabIndex={0}
                      aria-describedby={tip?.key === cellKey ? tipId : undefined}
                      onMouseEnter={(e) => {
                        const el = e.currentTarget;
                        anchorElRef.current = el;
                        setTip({
                          key: cellKey,
                          rect: el.getBoundingClientRect(),
                          label: info.label,
                          zoneName: z.name,
                          reasons: fit.reasons,
                        });
                      }}
                      onMouseLeave={() => {
                        anchorElRef.current = null;
                        setTip(null);
                        setPos(null);
                      }}
                      onFocus={(e) => {
                        const el = e.currentTarget;
                        anchorElRef.current = el;
                        setTip({
                          key: cellKey,
                          rect: el.getBoundingClientRect(),
                          label: info.label,
                          zoneName: z.name,
                          reasons: fit.reasons,
                        });
                      }}
                      onBlur={() => {
                        anchorElRef.current = null;
                        setTip(null);
                        setPos(null);
                      }}
                    >
                      <Stars count={fit.stars} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={css.footnote}>
        Spec ref: §11 livestock-land-fit & enterprise zone matching.
        Heuristic blend of zone category, area-vs-min-paddock, site slope,
        and SSURGO drainage class. Coarse by design {'\u2014'} a steward
        nudge, not a stocking-density quote. Hover or focus any cell for
        rationale. Horses, ducks/geese, rabbits, and bees are not shown to
        keep the matrix readable; their per-species data lives in{' '}
        <em>speciesData.ts</em>.
      </div>

      {tip && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={tipRef}
              id={tipId}
              role="tooltip"
              className={css.rationale}
              style={{
                top: pos ? pos.top : tip.rect.top,
                left: pos ? pos.left : tip.rect.left,
                visibility: pos ? 'visible' : 'hidden',
              }}
            >
              <strong>
                {tip.label} {'×'} {tip.zoneName}
              </strong>
              <ul style={{ margin: '4px 0 0', paddingLeft: 14 }}>
                {tip.reasons.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
