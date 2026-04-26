import { memo, useMemo } from 'react';
import css from './WindCorridorAuditCard.module.css';
import type { WindRoseData } from '../../lib/layerFetcher.js';

interface WindShelterEntry {
  direction?: string;
  effectiveness?: number;
}

interface WindCorridorAuditCardProps {
  prevailingWind: string | null | undefined;
  windSpeedMs: number | null | undefined;
  windRose: WindRoseData | null | undefined;
  windShelter: WindShelterEntry[] | null | undefined;
  windbreakCount: number;
  windbreakTotalLengthM: number;
}

const COMPASS_16 = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
] as const;

type Tier = 'calm' | 'light' | 'moderate' | 'strong' | 'severe';

const TIER_LABEL: Record<Tier, string> = {
  calm: 'Calm',
  light: 'Light',
  moderate: 'Moderate',
  strong: 'Strong',
  severe: 'Severe',
};

function speedTier(ms: number | null | undefined): Tier | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  if (ms < 2) return 'calm';
  if (ms < 4) return 'light';
  if (ms < 7) return 'moderate';
  if (ms < 12) return 'strong';
  return 'severe';
}

function normalizeDir(d: string | null | undefined): string | null {
  if (!d) return null;
  const up = d.trim().toUpperCase();
  return COMPASS_16.includes(up as typeof COMPASS_16[number]) ? up : null;
}

function seasonalPrevailing(arr: number[] | null | undefined): string | null {
  if (!arr || arr.length !== 16) return null;
  let best = 0;
  let bestIdx = 0;
  for (let i = 0; i < 16; i++) {
    const v = arr[i] ?? 0;
    if (v > best) { best = v; bestIdx = i; }
  }
  return best > 0 ? (COMPASS_16[bestIdx] ?? null) : null;
}

type Finding = {
  tier: 'caution' | 'green' | 'info';
  label: string;
  detail: string;
};

function WindCorridorAuditCard({
  prevailingWind,
  windSpeedMs,
  windRose,
  windShelter,
  windbreakCount,
  windbreakTotalLengthM,
}: WindCorridorAuditCardProps) {
  const tier = speedTier(windSpeedMs);
  const prevailing = normalizeDir(prevailingWind) ?? (windRose?.prevailing ? normalizeDir(windRose.prevailing) : null);

  const seasonalShift = useMemo(() => {
    if (!windRose?.seasonal) return null;
    const winter = seasonalPrevailing(windRose.seasonal.winter);
    const summer = seasonalPrevailing(windRose.seasonal.summer);
    if (!winter || !summer) return null;
    return { winter, summer, shifts: winter !== summer };
  }, [windRose]);

  const exposureFindings = useMemo<Finding[]>(() => {
    const out: Finding[] = [];
    if (!windRose?.frequencies_16 || windRose.frequencies_16.length !== 16) return out;
    const shelterDirs = new Set<string>();
    (windShelter ?? []).forEach((s) => {
      const d = normalizeDir(s.direction ?? null);
      if (d && (s.effectiveness ?? 0) >= 0.4) shelterDirs.add(d);
    });
    const threshold = 0.125;
    const exposed: Array<{ dir: string; pct: number }> = [];
    const buffered: Array<{ dir: string; pct: number }> = [];
    for (let i = 0; i < 16; i++) {
      const f = windRose.frequencies_16[i] ?? 0;
      if (f < threshold) continue;
      const dir = COMPASS_16[i] ?? '?';
      if (shelterDirs.has(dir)) buffered.push({ dir, pct: f * 100 });
      else exposed.push({ dir, pct: f * 100 });
    }
    if (exposed.length > 0) {
      const list = exposed
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 3)
        .map((e) => `${e.dir} ${e.pct.toFixed(0)}%`)
        .join(', ');
      out.push({
        tier: 'caution',
        label: `${exposed.length} exposed wind direction${exposed.length === 1 ? '' : 's'}`,
        detail: `Above-average frequency (>12.5%) without effective shelter: ${list}. Consider windbreak placement on these upwind edges.`,
      });
    }
    if (buffered.length > 0) {
      const list = buffered
        .sort((a, b) => b.pct - a.pct)
        .slice(0, 3)
        .map((e) => `${e.dir} ${e.pct.toFixed(0)}%`)
        .join(', ');
      out.push({
        tier: 'green',
        label: `${buffered.length} sheltered wind direction${buffered.length === 1 ? '' : 's'}`,
        detail: `Effective shelter coverage on: ${list}. Existing terrain or canopy buffers these inflows.`,
      });
    }
    return out;
  }, [windRose, windShelter]);

  const coldWindFinding = useMemo<Finding | null>(() => {
    if (!seasonalShift?.shifts) return null;
    return {
      tier: 'caution',
      label: `Cold-wind shift: winter ${seasonalShift.winter} \u2192 summer ${seasonalShift.summer}`,
      detail: `Winter winds arrive from ${seasonalShift.winter}; summer cooling breezes from ${seasonalShift.summer}. Site windbreaks on the ${seasonalShift.winter} side without blocking the ${seasonalShift.summer} ventilation.`,
    };
  }, [seasonalShift]);

  const allFindings: Finding[] = [
    ...(coldWindFinding ? [coldWindFinding] : []),
    ...exposureFindings,
  ];

  const haveAnyData = prevailing != null || tier != null || windRose != null;

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h4 className={css.cardTitle}>Wind corridor audit</h4>
          <p className={css.cardHint}>
            Cross-references prevailing wind, seasonal shifts, and existing wind-shelter coverage to flag exposed edges and buffered approaches. Ventilation-corridor mapping pending §9 obstacle model.
          </p>
        </div>
        <span className={css.modeBadge}>HEURISTIC</span>
      </div>

      {!haveAnyData ? (
        <div className={css.empty}>
          Wind data not yet available for this parcel. Climate normals fetch is required.
        </div>
      ) : (
        <>
          <div className={css.headlineGrid}>
            <div className={css.headlineStat}>
              <span className={css.statValue}>{prevailing ?? '—'}</span>
              <span className={css.statLabel}>Prevailing</span>
            </div>
            <div className={css.headlineStat}>
              <span className={css.statValue}>
                {windSpeedMs != null ? `${windSpeedMs.toFixed(1)} m/s` : '—'}
              </span>
              <span className={css.statLabel}>{tier ? TIER_LABEL[tier] : 'Mean speed'}</span>
            </div>
            <div className={css.headlineStat}>
              <span className={css.statValue}>
                {windRose?.calm_pct != null ? `${windRose.calm_pct.toFixed(0)}%` : '—'}
              </span>
              <span className={css.statLabel}>Calm hours</span>
            </div>
            <div className={css.headlineStat}>
              <span className={css.statValue}>{windbreakCount}</span>
              <span className={css.statLabel}>
                Windbreak lines{windbreakTotalLengthM > 0 ? ` (${Math.round(windbreakTotalLengthM)} m)` : ''}
              </span>
            </div>
          </div>

          {allFindings.length > 0 && (
            <>
              <div className={css.sectionLabel}>Exposure findings</div>
              <div className={css.findings}>
                {allFindings.map((f, i) => (
                  <div
                    key={i}
                    className={[
                      css.findingRow,
                      f.tier === 'caution' ? css.findingCaution : f.tier === 'green' ? css.findingGreen : css.findingInfo,
                    ].join(' ')}
                  >
                    <span className={css.findingTier}>{f.tier}</span>
                    <div className={css.findingMain}>
                      <div className={css.findingLabel}>{f.label}</div>
                      <div className={css.findingDetail}>{f.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className={css.assumption}>
            Cold-wind exposure thresholded at &gt;12.5% directional frequency (uniform = 1/16). Shelter
            effectiveness &ge; 0.4 considered buffering. Ventilation-corridor mapping (channelled flow
            through obstacle gaps, leeward eddies, structure venturi effects) requires the §9 Structures
            obstacle model and is not modelled here — the manifest item stays partial until that ships.
          </div>
        </>
      )}
    </div>
  );
}

export default memo(WindCorridorAuditCard);
