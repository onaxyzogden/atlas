/**
 * §6 MicroclimateInsightsCard — derived microclimate advisories.
 *
 * The Microclimate Zones section already on this dashboard surfaces *counts*
 * from the upstream `microclimate` site-data layer when the processor has
 * landed something for this parcel. That row stays silent on the *why*
 * (which slopes are leeward of the prevailing wind, where rain shadow lands,
 * which footslopes pool cold air at night). This card fills that gap by
 * cross-referencing climate signals already loaded into the dashboard:
 *
 *   • Prevailing wind direction (climate.prevailing_wind)
 *   • Dominant aspect of the parcel (elevation.aspect_dominant)
 *   • Mean slope (elevation.mean_slope_deg)
 *   • Annual precipitation (climate.annual_precip_mm)
 *   • Latitude (parcel centroid — for sun aspect direction)
 *
 * Output is a tone-coded chip stack of qualitative advisories: wind-shelter
 * vs. wind-exposed slopes, sun-aspect tilt for the hemisphere, frost-pocket
 * risk on low-gradient footslopes, and rain-shadow advisory on the leeward
 * side. Each chip names which inputs it relied on, so the steward can tell
 * a confident advisory from a heuristic one.
 *
 * Pure derivation — no shared math, no map overlay, no writes.
 */
import { useMemo } from 'react';
import css from './MicroclimateInsightsCard.module.css';

interface ClimateInput {
  prevailing_wind?: string | null;
  annual_precip_mm?: number | null;
}

interface ElevationInput {
  mean_slope_deg?: number | null;
  aspect_dominant?: string | null;
  min_elevation_m?: number | null;
  max_elevation_m?: number | null;
}

interface Props {
  climate: ClimateInput | null;
  elevation: ElevationInput | null;
  lat: number;
}

type Tone = 'good' | 'fair' | 'poor' | 'neutral';

interface Advisory {
  id: string;
  title: string;
  detail: string;
  basis: string[];
  tone: Tone;
}

const COMPASS_AZIMUTH: Record<string, number> = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
  E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

function normalizeCompass(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().toUpperCase();
  // Strip "ly", "erly" etc — accept "WESTERLY", "SW", "SOUTHWEST"
  const directWord: Record<string, string> = {
    NORTH: 'N', SOUTH: 'S', EAST: 'E', WEST: 'W',
    NORTHEAST: 'NE', NORTHWEST: 'NW', SOUTHEAST: 'SE', SOUTHWEST: 'SW',
    NORTHERLY: 'N', SOUTHERLY: 'S', EASTERLY: 'E', WESTERLY: 'W',
  };
  if (directWord[trimmed]) return directWord[trimmed]!;
  if (COMPASS_AZIMUTH[trimmed] !== undefined) return trimmed;
  // Accept first 1–3 chars of common abbreviations
  for (const key of Object.keys(COMPASS_AZIMUTH)) {
    if (trimmed.startsWith(key)) return key;
  }
  return null;
}

function oppositeOf(compass: string): string | null {
  const az = COMPASS_AZIMUTH[compass];
  if (az === undefined) return null;
  const oppAz = (az + 180) % 360;
  // Find the compass with that azimuth
  for (const [k, v] of Object.entries(COMPASS_AZIMUTH)) {
    if (v === oppAz) return k;
  }
  return null;
}

function angularDeltaDeg(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

export default function MicroclimateInsightsCard({ climate, elevation, lat }: Props) {
  const advisories = useMemo<Advisory[]>(() => {
    return buildAdvisories({ climate, elevation, lat });
  }, [climate, elevation, lat]);

  const completeness = useMemo(() => {
    let provided = 0;
    let total = 4;
    if (climate?.prevailing_wind) provided++;
    if (climate?.annual_precip_mm != null) provided++;
    if (elevation?.aspect_dominant) provided++;
    if (elevation?.mean_slope_deg != null) provided++;
    return { provided, total };
  }, [climate, elevation]);

  return (
    <div className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Microclimate Insights</h3>
          <p className={css.hint}>
            Qualitative advisories cross-referenced from prevailing wind, slope aspect,
            and parcel latitude. Complements the upstream Microclimate Zones counts
            with the <em>why</em> behind each zone — which slopes are leeward, which
            footslopes pool cold air, where rain shadow falls.
          </p>
        </div>
        <span className={`${css.badge} ${completeness.provided >= 3 ? css.badgeGood : completeness.provided >= 2 ? css.badgeFair : css.badgePoor}`}>
          {completeness.provided}/{completeness.total} INPUTS
        </span>
      </div>

      {advisories.length === 0 ? (
        <div className={css.empty}>
          Need climate (prevailing wind) and elevation (aspect, slope) layers to derive advisories.
          Run a Site Intelligence pass to populate them.
        </div>
      ) : (
        <ul className={css.list}>
          {advisories.map((adv) => (
            <li key={adv.id} className={`${css.row} ${css[`tone_${adv.tone}`]}`}>
              <div className={css.rowHead}>
                <span className={css.rowTitle}>{adv.title}</span>
                <span className={`${css.rowTone} ${css[`tag_${adv.tone}`]}`}>{adv.tone.toUpperCase()}</span>
              </div>
              <div className={css.rowDetail}>{adv.detail}</div>
              <div className={css.rowBasis}>
                <em>Basis:</em> {adv.basis.join(' · ')}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className={css.footnote}>
        These are heuristic advisories — confidence scales with how many inputs are
        populated (badge above). Validate against on-site observation before siting
        cold-sensitive crops, irrigation lines, or wind-exposed structures.
      </p>
    </div>
  );
}

function buildAdvisories({
  climate,
  elevation,
  lat,
}: {
  climate: ClimateInput | null;
  elevation: ElevationInput | null;
  lat: number;
}): Advisory[] {
  const out: Advisory[] = [];

  const prevailingNorm = normalizeCompass(climate?.prevailing_wind ?? null);
  const aspectNorm = normalizeCompass(elevation?.aspect_dominant ?? null);
  const slope = elevation?.mean_slope_deg ?? null;
  const precip = climate?.annual_precip_mm ?? null;
  const elevRange = (elevation?.max_elevation_m != null && elevation?.min_elevation_m != null)
    ? elevation.max_elevation_m - elevation.min_elevation_m
    : null;

  // 1. Wind-shelter advisory (leeward vs windward)
  if (prevailingNorm && aspectNorm) {
    const prevAz = COMPASS_AZIMUTH[prevailingNorm]!;
    const aspectAz = COMPASS_AZIMUTH[aspectNorm]!;
    const delta = angularDeltaDeg(prevAz, aspectAz);
    const leeway = oppositeOf(prevailingNorm);
    if (delta < 60) {
      // Slope faces into wind
      out.push({
        id: 'wind-exposed',
        title: `Wind-exposed: ${aspectNorm}-facing slopes catch ${prevailingNorm} wind head-on`,
        detail: `Dominant aspect ${aspectNorm} aligns within ${Math.round(delta)}° of the ${prevailingNorm} prevailing wind. Expect wind chill, evaporative stress on broadleaves, and lodging risk on tall crops. Plant windbreaks on the ${prevailingNorm} edge before siting structures or sensitive species here.`,
        basis: ['prevailing wind', 'dominant aspect'],
        tone: 'poor',
      });
    } else if (delta > 120) {
      out.push({
        id: 'wind-sheltered',
        title: `Wind-sheltered: ${aspectNorm}-facing slopes are leeward of ${prevailingNorm} wind`,
        detail: `Dominant aspect ${aspectNorm} is ${Math.round(delta)}° off the ${prevailingNorm} prevailing wind — effectively the leeward face${leeway ? ` (${leeway} side)` : ''}. Good candidate for outdoor gathering areas, sensitive nursery stock, and passive-cooled structures.`,
        basis: ['prevailing wind', 'dominant aspect'],
        tone: 'good',
      });
    } else {
      out.push({
        id: 'wind-flank',
        title: `Side-flank exposure: ${aspectNorm}-facing slopes catch glancing ${prevailingNorm} wind`,
        detail: `Aspect ${aspectNorm} sits ${Math.round(delta)}° off prevailing wind — neither sheltered nor head-on. Plan partial windbreaks on the ${prevailingNorm} flank if siting tall crops or vulnerable structures.`,
        basis: ['prevailing wind', 'dominant aspect'],
        tone: 'fair',
      });
    }
  } else if (prevailingNorm) {
    out.push({
      id: 'wind-no-aspect',
      title: `Prevailing wind ${prevailingNorm} (aspect data missing)`,
      detail: `Plan windbreaks on the ${prevailingNorm} edge of structures and sensitive plantings. Add elevation data to refine which slopes are leeward.`,
      basis: ['prevailing wind'],
      tone: 'fair',
    });
  }

  // 2. Sun-aspect advisory (hemisphere-aware)
  if (aspectNorm) {
    const aspectAz = COMPASS_AZIMUTH[aspectNorm]!;
    const sunAz = lat >= 0 ? 180 : 0; // S in NH, N in SH
    const sunDelta = angularDeltaDeg(aspectAz, sunAz);
    const sunFacing = lat >= 0 ? 'south' : 'north';
    if (sunDelta < 45) {
      out.push({
        id: 'sun-trap',
        title: `Solar gain: ${aspectNorm}-facing slopes are warm and sunny`,
        detail: `Aspect ${aspectNorm} faces ${sunDelta < 22.5 ? 'directly' : 'closely'} toward the ${sunFacing}-tracking sun. Maximizes passive solar exposure — prioritize for greenhouses, season-extension crops, and passive-solar building orientation.`,
        basis: ['dominant aspect', 'parcel latitude'],
        tone: 'good',
      });
    } else if (sunDelta > 135) {
      out.push({
        id: 'sun-shade',
        title: `Cool & shaded: ${aspectNorm}-facing slopes get reduced sun`,
        detail: `Aspect ${aspectNorm} faces away from the ${sunFacing}-tracking sun (${Math.round(sunDelta)}° offset). Cooler microclimate — favorable for shade-tolerant crops, cold-storage siting, and summer livestock loafing areas. Avoid for sun-loving species.`,
        basis: ['dominant aspect', 'parcel latitude'],
        tone: 'fair',
      });
    } else {
      out.push({
        id: 'sun-side',
        title: `Side-aspect: ${aspectNorm}-facing slopes get partial sun`,
        detail: `Aspect ${aspectNorm} sits ${Math.round(sunDelta)}° off the ${sunFacing}-tracking sun — moderate solar exposure suited to a wide range of fruiting plants and mixed-use siting.`,
        basis: ['dominant aspect', 'parcel latitude'],
        tone: 'neutral',
      });
    }
  }

  // 3. Frost-pocket advisory (low slope + footslope assumption)
  if (slope != null) {
    if (slope < 2 && elevRange != null && elevRange > 6) {
      out.push({
        id: 'frost-pocket',
        title: `Frost-pocket risk: low-gradient terrain with ${elevRange.toFixed(0)} m relief`,
        detail: `Mean slope ${slope.toFixed(1)}° is shallow enough that cold air can pool overnight, especially in the lower ${(elevRange * 0.3).toFixed(0)} m of the parcel. Avoid siting frost-sensitive perennials (stone fruit, brassicas in spring) at footslopes; vent cold air with selective tree removal in drainage paths.`,
        basis: ['mean slope', 'elevation range'],
        tone: 'poor',
      });
    } else if (slope < 2) {
      out.push({
        id: 'frost-flat',
        title: `Flat terrain: cold air accumulates, no drainage`,
        detail: `Mean slope ${slope.toFixed(1)}° offers little cold-air drainage; whole parcel sits at one thermal layer. Frost-sensitive species need season-extension protection (row cover, low tunnels, cold frames).`,
        basis: ['mean slope'],
        tone: 'fair',
      });
    } else if (slope >= 5) {
      out.push({
        id: 'frost-drained',
        title: `Cold-air drainage: slope ${slope.toFixed(1)}° vents frost downhill`,
        detail: `Sufficient slope for cold air to drain off rather than pool. Mid-slope plantings get the warmest microclimate; footslopes still cool overnight but recover faster than basin terrain.`,
        basis: ['mean slope'],
        tone: 'good',
      });
    }
  }

  // 4. Rain-shadow advisory
  if (prevailingNorm && elevRange != null && elevRange > 30) {
    const lee = oppositeOf(prevailingNorm);
    const dryBias = precip != null && precip < 600 ? ' Annual precipitation is already low — drought-tolerant species and water-harvesting earthworks are critical on the lee side.' : '';
    out.push({
      id: 'rain-shadow',
      title: `Rain-shadow advisory: lee side of ${prevailingNorm}-driven storms`,
      detail: `${elevRange.toFixed(0)} m of relief with ${prevailingNorm} prevailing wind creates a measurable rain-shadow effect on the ${lee ?? 'leeward'} flank — expect 10–25% drier than the windward side.${dryBias}`,
      basis: precip != null ? ['prevailing wind', 'elevation range', 'annual precipitation'] : ['prevailing wind', 'elevation range'],
      tone: precip != null && precip < 600 ? 'poor' : 'fair',
    });
  }

  // 5. High-precip + cool aspect synergy (mildew watch)
  if (precip != null && precip > 1100 && aspectNorm) {
    const aspectAz = COMPASS_AZIMUTH[aspectNorm]!;
    const sunAz = lat >= 0 ? 180 : 0;
    const sunDelta = angularDeltaDeg(aspectAz, sunAz);
    if (sunDelta > 120) {
      out.push({
        id: 'mildew-watch',
        title: `Wet + shaded: mildew & rot pressure on ${aspectNorm} slopes`,
        detail: `${precip.toFixed(0)} mm annual precipitation on cool ${aspectNorm}-facing slopes holds moisture longer. Increase plant spacing, prefer mildew-resistant cultivars, and route drip irrigation away from canopy. Avoid dense stone-fruit blocks and tomatoes here.`,
        basis: ['annual precipitation', 'dominant aspect', 'parcel latitude'],
        tone: 'fair',
      });
    }
  }

  return out;
}
