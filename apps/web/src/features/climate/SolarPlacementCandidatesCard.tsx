/**
 * §6 SolarPlacementCandidatesCard — best-placement guidance derived from
 * site-wide aspect, slope, latitude, and seasonal exposure. Sits ahead of
 * PlacementScoringCard (which scores already-placed arrays) by suggesting
 * *where* to place an array given the parcel's signals.
 *
 * Pure presentation — no map computation. The output is a site-wide
 * potential score, an array-capacity ballpark, and a ranked list of
 * favourable / avoid criteria explaining the score.
 */

import { useMemo } from 'react';
import s from './SolarPlacementCandidatesCard.module.css';

interface Props {
  lat: number;
  meanSlopeDeg: number | null;
  dominantAspect: string | null;
  exposureBySeason: { spring: number; summer: number; fall: number; winter: number };
  hasClimate: boolean;
  acreage: number | null;
}

type Verdict = 'favour' | 'caution' | 'avoid';

interface Criterion {
  id: string;
  label: string;
  detail: string;
  verdict: Verdict;
  weight: number;
}

// Average favourable cosine of aspect, normalised to 0-1 around south.
// 'S' = 1.0; 'SE'/'SW' = ~0.85; 'E'/'W' = 0.5; 'NE'/'NW' = ~0.15; 'N' = 0.
function aspectFavour(aspect: string | null): number | null {
  if (!aspect) return null;
  const a = aspect.toUpperCase();
  const map: Record<string, number> = {
    S: 1.0, SSE: 0.95, SSW: 0.95, SE: 0.85, SW: 0.85,
    ESE: 0.7, WSW: 0.7, E: 0.55, W: 0.55, ENE: 0.35, WNW: 0.35,
    NE: 0.2, NW: 0.2, NNE: 0.1, NNW: 0.1, N: 0.05,
  };
  return map[a] ?? null;
}

function slopeFavour(slopeDeg: number | null): number | null {
  if (slopeDeg == null) return null;
  // 0-3°  flat — ground-mount fine, racks add tilt.
  // 3-15° favourable — natural tilt approaches optimum.
  // 15-25° marginal — mounting cost climbs, soil disturbance harder.
  // 25°+   avoid — earthworks dominate.
  if (slopeDeg <= 3) return 0.85;
  if (slopeDeg <= 15) return 1.0;
  if (slopeDeg <= 25) return 0.5;
  return 0.15;
}

// Latitude favour: peaks 25-40°, drops sharply above 55° and within 10° of equator.
function latitudeFavour(lat: number): number {
  const abs = Math.abs(lat);
  if (abs >= 25 && abs <= 40) return 1.0;
  if (abs < 25) return 0.8;
  if (abs <= 50) return 0.85;
  if (abs <= 60) return 0.6;
  return 0.35;
}

export default function SolarPlacementCandidatesCard({
  lat, meanSlopeDeg, dominantAspect, exposureBySeason, hasClimate, acreage,
}: Props) {
  const { score, criteria, capacityKw, suitableAcres } = useMemo(() => {
    const aspectF = aspectFavour(dominantAspect);
    const slopeF = slopeFavour(meanSlopeDeg);
    const latF = latitudeFavour(lat);

    // Seasonal exposure already 0-100; smooth across summer + winter.
    const exposureF = (exposureBySeason.summer * 0.5 + exposureBySeason.winter * 0.5) / 100;

    // Composite site-wide solar potential (0-100). Aspect and slope dominate
    // because exposure is latitude-derived (already partially captured by latF).
    const weights = {
      aspect: aspectF != null ? 0.35 : 0,
      slope: slopeF != null ? 0.25 : 0,
      lat: 0.20,
      exposure: 0.20,
    };
    const wSum = weights.aspect + weights.slope + weights.lat + weights.exposure;
    const composite =
      ((aspectF ?? 0) * weights.aspect +
        (slopeF ?? 0) * weights.slope +
        latF * weights.lat +
        exposureF * weights.exposure) /
      Math.max(wSum, 0.01);
    const score = Math.round(composite * 100);

    const cs: Criterion[] = [];
    if (aspectF != null) {
      const verdict: Verdict = aspectF >= 0.7 ? 'favour' : aspectF >= 0.4 ? 'caution' : 'avoid';
      cs.push({
        id: 'aspect',
        label: `Dominant aspect ${dominantAspect}`,
        detail:
          aspectF >= 0.7
            ? 'Aspect already aligns with solar south — favour candidate zones on the predominantly south-facing slopes.'
            : aspectF >= 0.4
              ? 'Aspect is partial — east/west exposure costs ~20–35% annual yield versus south. Favour pockets that orient closer to south.'
              : 'Aspect is unfavourable — target the small south-facing exceptions; bulk of parcel costs >40% annual yield.',
        verdict,
        weight: 35,
      });
    } else {
      cs.push({
        id: 'aspect-missing',
        label: 'Aspect data not yet computed',
        detail: 'Without a dominant-aspect signal, placement guidance reduces to latitude-only fallback.',
        verdict: 'caution',
        weight: 35,
      });
    }
    if (slopeF != null && meanSlopeDeg != null) {
      const verdict: Verdict = slopeF >= 0.85 ? 'favour' : slopeF >= 0.5 ? 'caution' : 'avoid';
      cs.push({
        id: 'slope',
        label: `Mean slope ${meanSlopeDeg.toFixed(1)}°`,
        detail:
          meanSlopeDeg <= 3
            ? 'Flat ground — ground-mount racks add the tilt; trench costs and panel-shading risk are the main sensitivity.'
            : meanSlopeDeg <= 15
              ? 'Natural slope is in the sweet spot — racks tilt the panels for free, drainage stays good.'
              : meanSlopeDeg <= 25
                ? 'Slope is steep — expect higher mounting cost and soil-stabilisation work.'
                : 'Slope exceeds 25° — earthworks dominate any ground-mount; target rooftops or terraced sub-areas instead.',
        verdict,
        weight: 25,
      });
    }
    cs.push({
      id: 'latitude',
      label: `Latitude ${lat.toFixed(2)}°`,
      detail:
        Math.abs(lat) < 25
          ? 'Lower latitude — high summer flux but watch for high cell-temperature derating.'
          : Math.abs(lat) <= 40
            ? 'Mid-latitude band — strong year-round irradiance; tilt ≈ latitude is the standard rule.'
            : Math.abs(lat) <= 50
              ? 'Mid-to-high latitude — winter dip is meaningful; tilt at latitude + 10° favours winter capture.'
              : 'High latitude — winter dip is severe; target a steeper tilt and account for snow shedding.',
      verdict: latF >= 0.85 ? 'favour' : latF >= 0.6 ? 'caution' : 'avoid',
      weight: 20,
    });
    cs.push({
      id: 'exposure',
      label: `Seasonal exposure (summer ${exposureBySeason.summer.toFixed(0)} · winter ${exposureBySeason.winter.toFixed(0)})`,
      detail: hasClimate
        ? 'Exposure score blends sun-path daylight hours with seasonal angle — winter score is the binding constraint for off-grid systems.'
        : 'Exposure score uses latitude-only sun path; load real climate layers to refine for cloud cover.',
      verdict: exposureF >= 0.65 ? 'favour' : exposureF >= 0.4 ? 'caution' : 'avoid',
      weight: 20,
    });

    cs.sort((a, b) => {
      const order: Record<Verdict, number> = { favour: 0, caution: 1, avoid: 2 };
      return order[a.verdict] - order[b.verdict] || b.weight - a.weight;
    });

    // Capacity ballpark: site-wide composite acts as a suitable-fraction proxy.
    // Roughly 6 acres per MW of utility-scale ground-mount; 200 kW per acre.
    let suitableAcres: number | null = null;
    let capacityKw: number | null = null;
    if (acreage && acreage > 0) {
      const suitableFraction = Math.max(0.05, Math.min(0.5, composite * 0.5));
      suitableAcres = Math.max(0.1, Number((acreage * suitableFraction).toFixed(2)));
      capacityKw = Math.round(suitableAcres * 200);
    }

    return { score, criteria: cs, capacityKw, suitableAcres };
  }, [lat, meanSlopeDeg, dominantAspect, exposureBySeason, hasClimate, acreage]);

  const band: { label: string; tone: Verdict } =
    score >= 70 ? { label: 'Strong', tone: 'favour' }
    : score >= 50 ? { label: 'Moderate', tone: 'caution' }
    : { label: 'Weak', tone: 'avoid' };

  return (
    <div className={s.card}>
      <div className={s.cardHead}>
        <div>
          <h4 className={s.cardTitle}>Best placement zones</h4>
          <p className={s.cardHint}>
            Site-wide solar potential and where to favour candidate ground-mount or rooftop zones, derived from aspect, slope, latitude, and seasonal exposure.
          </p>
        </div>
        <span className={s.heuristicBadge}>HEURISTIC</span>
      </div>

      <div className={s.headlineRow}>
        <div className={s.headlineBlock}>
          <div className={`${s.headlineValue} ${s[`tone_${band.tone}`] ?? ''}`}>{score}</div>
          <div className={s.headlineLabel}>Site potential · {band.label}</div>
        </div>
        <div className={s.headlineBlock}>
          <div className={s.headlineValue}>
            {suitableAcres != null ? `${suitableAcres} ac` : '—'}
          </div>
          <div className={s.headlineLabel}>Suitable footprint</div>
        </div>
        <div className={s.headlineBlock}>
          <div className={s.headlineValue}>
            {capacityKw != null ? (capacityKw >= 1000 ? `${(capacityKw / 1000).toFixed(2)} MW` : `${capacityKw} kW`) : '—'}
          </div>
          <div className={s.headlineLabel}>Ballpark capacity</div>
        </div>
      </div>

      <div className={s.sectionTitle}>Placement criteria</div>
      <ul className={s.list}>
        {criteria.map((c) => (
          <li key={c.id} className={`${s.row} ${s[`tone_${c.verdict}`] ?? ''}`}>
            <div className={s.rowHead}>
              <span className={`${s.dot} ${s[`dot_${c.verdict}`] ?? ''}`} />
              <span className={s.rowLabel}>{c.label}</span>
              <span className={`${s.verdictTag} ${s[`verdict_${c.verdict}`] ?? ''}`}>{c.verdict}</span>
            </div>
            <p className={s.rowDetail}>{c.detail}</p>
          </li>
        ))}
      </ul>

      <p className={s.footnote}>
        Capacity ballpark assumes ~200 kW per suitable acre (community-scale ground-mount). Use placed-array scoring below to validate specific candidate locations.
      </p>
    </div>
  );
}
