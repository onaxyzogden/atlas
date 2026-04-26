/**
 * PredatorRiskHotspotsCard — per-paddock predator-pressure breakdown
 * with mitigation suggestions.
 *
 * Spec mapping: §11 Livestock Systems · `predator-risk-zone-map`
 * (P3, partial → done). The dashboard already surfaces a one-line
 * "X high, Y moderate" count via `computePredatorRisk`; this card
 * graduates that summary into an actionable per-paddock view.
 *
 * Layered analysis (presentation-layer only — no shared math):
 *   1. Woodland-edge baseline from existing `computePredatorRisk`
 *      (distance to conservation/buffer zone + tree canopy %)
 *   2. Species vulnerability multiplier (poultry / sheep / rabbits /
 *      bees most exposed; cattle / horses least)
 *   3. Edge-density adjustment (perimeter/area ratio — a long, thin
 *      paddock has more fence to defend than a compact square)
 *   4. Fencing-type adjustment (electric drops one band, "none" raises)
 *   5. Shelter proximity (>300m to nearest structure raises one band)
 *
 * Output: tone-coded list ranked highest-risk first, each with a short
 * "why" sentence and 1-3 mitigation suggestions chosen from a static
 * library. Heuristic, not a livestock-management certification — sized
 * to match the dashboard's other steward-facing cards.
 */

import { useMemo } from 'react';
import { useLivestockStore, type Paddock, type LivestockSpecies, type FenceType } from '../../store/livestockStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { useStructureStore, type Structure } from '../../store/structureStore.js';
import { useSiteData, getLayerSummary } from '../../store/siteDataStore.js';
import { computePredatorRisk } from './livestockAnalysis.js';
import s from './PredatorRiskHotspotsCard.module.css';

interface PredatorRiskHotspotsCardProps {
  projectId: string;
}

interface LandCoverSummary {
  tree_canopy_pct?: number;
}

type RiskBand = 'low' | 'moderate' | 'high';
const BAND_ORDER: RiskBand[] = ['low', 'moderate', 'high'];

interface PaddockRisk {
  paddockId: string;
  paddockName: string;
  band: RiskBand;
  scoreLabel: string;
  drivers: string[];
  mitigations: string[];
}

// Vulnerability rank — higher = more exposed. Tuned from common
// homestead pasture experience: small/young/flock species top the list.
const SPECIES_VULNERABILITY: Record<LivestockSpecies, number> = {
  poultry: 3,
  ducks_geese: 3,
  rabbits: 3,
  bees: 2,
  sheep: 2,
  goats: 2,
  pigs: 1,
  cattle: 1,
  horses: 1,
};

const SPECIES_LABEL: Record<LivestockSpecies, string> = {
  sheep: 'sheep',
  cattle: 'cattle',
  goats: 'goats',
  poultry: 'poultry',
  pigs: 'pigs',
  horses: 'horses',
  ducks_geese: 'ducks/geese',
  rabbits: 'rabbits',
  bees: 'bees',
};

const FENCE_LABEL: Record<FenceType, string> = {
  electric: 'electric',
  post_wire: 'post-and-wire',
  post_rail: 'post-and-rail',
  woven_wire: 'woven wire',
  temporary: 'temporary',
  none: 'no fence',
};

function bumpBand(band: RiskBand, delta: number): RiskBand {
  const idx = BAND_ORDER.indexOf(band);
  const next = Math.max(0, Math.min(BAND_ORDER.length - 1, idx + delta));
  return BAND_ORDER[next] as RiskBand;
}

function polygonArea(geom: GeoJSON.Polygon): number {
  // Equirectangular approximation — m². Good enough for ranking.
  const ring = geom.coordinates[0];
  if (!ring || ring.length < 4) return 0;
  let lat0 = 0;
  for (const c of ring) lat0 += (c[1] ?? 0);
  lat0 /= ring.length;
  const cosLat = Math.cos((lat0 * Math.PI) / 180);
  let area = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i]!;
    const b = ring[i + 1]!;
    area += (a[0]! * b[1]! - b[0]! * a[1]!);
  }
  area = Math.abs(area) / 2;
  return area * (111_320 * cosLat) * 110_540;
}

function polygonPerimeter(geom: GeoJSON.Polygon): number {
  const ring = geom.coordinates[0];
  if (!ring || ring.length < 2) return 0;
  let lat0 = 0;
  for (const c of ring) lat0 += (c[1] ?? 0);
  lat0 /= ring.length;
  const mPerLng = 111_320 * Math.cos((lat0 * Math.PI) / 180);
  let total = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const a = ring[i]!;
    const b = ring[i + 1]!;
    const dx = (a[0]! - b[0]!) * mPerLng;
    const dy = (a[1]! - b[1]!) * 110_540;
    total += Math.sqrt(dx * dx + dy * dy);
  }
  return total;
}

function paddockCentroid(geom: GeoJSON.Polygon): [number, number] {
  const ring = geom.coordinates[0];
  if (!ring || ring.length === 0) return [0, 0];
  let sx = 0, sy = 0;
  for (const c of ring) { sx += (c[0] ?? 0); sy += (c[1] ?? 0); }
  return [sx / ring.length, sy / ring.length];
}

function distanceM(a: [number, number], b: [number, number]): number {
  const lat0 = (a[1] + b[1]) / 2;
  const dx = (a[0] - b[0]) * 111_320 * Math.cos((lat0 * Math.PI) / 180);
  const dy = (a[1] - b[1]) * 110_540;
  return Math.sqrt(dx * dx + dy * dy);
}

function shelterStructures(structures: Structure[]): Structure[] {
  return structures.filter(
    (st) => st.type === 'animal_shelter' || st.type === 'barn' || st.type === 'pavilion',
  );
}

function nearestShelterDistanceM(p: Paddock, shelters: Structure[]): number | null {
  if (shelters.length === 0) return null;
  const c = paddockCentroid(p.geometry);
  let best = Infinity;
  for (const sh of shelters) {
    const d = distanceM(c, sh.center);
    if (d < best) best = d;
  }
  return best;
}

export default function PredatorRiskHotspotsCard({ projectId }: PredatorRiskHotspotsCardProps) {
  const paddocks = useLivestockStore((st) => st.paddocks).filter((p) => p.projectId === projectId);
  const zones = useZoneStore((st) => st.zones).filter((z) => z.projectId === projectId);
  const structures = useStructureStore((st) => st.structures).filter((st2) => st2.projectId === projectId);
  const siteData = useSiteData(projectId);
  const landCover = getLayerSummary<LandCoverSummary>(siteData, 'landCover');
  const canopyPct = typeof landCover?.tree_canopy_pct === 'number' ? landCover.tree_canopy_pct : 0;

  const analysis = useMemo<PaddockRisk[]>(() => {
    if (paddocks.length === 0) return [];
    const shelters = shelterStructures(structures);

    return paddocks.map((p) => {
      const baseline = computePredatorRisk(p, zones, canopyPct);
      let band: RiskBand = baseline.risk;
      const drivers: string[] = [baseline.reason];
      const mitigations: string[] = [];

      // 1) Species vulnerability
      const maxVuln = p.species.reduce((m, sp) => Math.max(m, SPECIES_VULNERABILITY[sp] ?? 1), 0);
      if (maxVuln >= 3 && p.species.length > 0) {
        band = bumpBand(band, +1);
        const tops = p.species
          .filter((sp) => (SPECIES_VULNERABILITY[sp] ?? 0) >= 3)
          .map((sp) => SPECIES_LABEL[sp]);
        drivers.push(`High-vulnerability species present (${tops.join(', ')})`);
        mitigations.push('Add a livestock guardian (dog, donkey, or llama)');
        mitigations.push('Lock animals into a predator-proof night shelter');
      } else if (maxVuln === 2 && p.species.length > 0) {
        // Sheep / goats / bees — moderate vulnerability, no automatic bump
        // but worth a mitigation hint when the baseline is already moderate+.
        if (band !== 'low') {
          mitigations.push('Plan a guardian-animal rotation through this paddock');
        }
      }

      // 2) Edge-density (perimeter / sqrt(area)) — the more fence you have
      // to defend per acre, the higher the surface area for incursions.
      const areaM2 = p.areaM2 || polygonArea(p.geometry);
      const perimM = polygonPerimeter(p.geometry);
      const edgeDensity = areaM2 > 0 ? perimM / Math.sqrt(areaM2) : 0;
      // A perfect square has edgeDensity = 4. Long thin shapes climb fast.
      if (edgeDensity > 6) {
        band = bumpBand(band, +1);
        drivers.push(`Long perimeter (${Math.round(perimM)} m around ${Math.round(areaM2 / 10_000 * 100) / 100} ha) — high fence-line surface to defend`);
        mitigations.push('Subdivide into more compact cells to shrink defended perimeter');
      }

      // 3) Fencing-type adjustment
      if (p.fencing === 'electric') {
        band = bumpBand(band, -1);
        drivers.push('Electric fencing in place — significantly deters most ground predators');
      } else if (p.fencing === 'none' || p.fencing === 'temporary') {
        band = bumpBand(band, +1);
        drivers.push(`Fencing: ${FENCE_LABEL[p.fencing]} — minimal physical deterrent`);
        mitigations.push('Upgrade to permanent electric or woven-wire fencing');
      } else if (p.fencing === 'post_rail') {
        // Post-and-rail keeps livestock IN but doesn't keep predators out.
        if (maxVuln >= 2) {
          mitigations.push('Add electric offset wire — post-and-rail alone does not exclude predators');
        }
      }

      // 4) Shelter proximity
      const shelterDist = nearestShelterDistanceM(p, shelters);
      if (shelterDist === null) {
        if (maxVuln >= 2) {
          band = bumpBand(band, +1);
          drivers.push('No animal shelter / barn / pavilion placed yet');
          mitigations.push('Place an animal shelter or barn within 300 m for night-time refuge');
        }
      } else if (shelterDist > 300 && maxVuln >= 2) {
        band = bumpBand(band, +1);
        drivers.push(`Nearest shelter is ${Math.round(shelterDist)} m away — outside the 300 m welfare guideline`);
        mitigations.push('Move animals closer to existing shelter or place a satellite night pen');
      }

      // De-duplicate mitigations (some paths suggest the same action)
      const uniqMitigations = Array.from(new Set(mitigations)).slice(0, 3);

      const scoreLabel =
        band === 'high' ? 'High pressure' : band === 'moderate' ? 'Moderate pressure' : 'Low pressure';

      return {
        paddockId: p.id,
        paddockName: p.name,
        band,
        scoreLabel,
        drivers,
        mitigations: uniqMitigations,
      };
    });
  }, [paddocks, zones, structures, canopyPct]);

  const ranked = useMemo(() => {
    const order: Record<RiskBand, number> = { high: 0, moderate: 1, low: 2 };
    return [...analysis].sort((a, b) => order[a.band] - order[b.band]);
  }, [analysis]);

  if (paddocks.length === 0) {
    return null;
  }

  const counts = ranked.reduce(
    (acc, r) => {
      acc[r.band] += 1;
      return acc;
    },
    { high: 0, moderate: 0, low: 0 } as Record<RiskBand, number>,
  );

  return (
    <div className={s.card}>
      <div className={s.head}>
        <div>
          <h3 className={s.title}>Predator pressure by paddock</h3>
          <p className={s.hint}>
            Per-paddock predator risk layered from woodland-edge proximity, species vulnerability,
            fence-line surface, fencing type, and shelter access. Heuristic — sized for steward
            review, not a wildlife-management report.
          </p>
        </div>
        <span className={s.badge}>
          {counts.high}H · {counts.moderate}M · {counts.low}L
        </span>
      </div>

      <ul className={s.list}>
        {ranked.map((r) => (
          <li key={r.paddockId} className={`${s.item} ${s[`band_${r.band}`]}`}>
            <div className={s.itemHead}>
              <span className={s.itemName}>{r.paddockName}</span>
              <span className={s.itemScore}>{r.scoreLabel}</span>
            </div>
            <ul className={s.driverList}>
              {r.drivers.map((d, i) => (
                <li key={i} className={s.driver}>{d}</li>
              ))}
            </ul>
            {r.mitigations.length > 0 && (
              <div className={s.mitigationBlock}>
                <div className={s.mitigationLabel}>Mitigations</div>
                <ul className={s.mitigationList}>
                  {r.mitigations.map((m, i) => (
                    <li key={i} className={s.mitigation}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className={s.footnote}>
        Layer source: woodland-edge baseline from `computePredatorRisk`; species, fencing,
        edge-density, and shelter overlays applied here. Canopy data: {canopyPct > 0 ? `${canopyPct}% (Tier-1 land cover)` : 'unavailable — using 0%'}.
      </p>
    </div>
  );
}
