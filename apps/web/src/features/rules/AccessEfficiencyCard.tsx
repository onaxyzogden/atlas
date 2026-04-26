/**
 * §17 AccessEfficiencyCard — permaculture zone-stepping audit per dwelling.
 *
 * Closes the access-efficiency half of the §17 manifest item
 * `siting-rules-privacy-solar-access-safety`. The existing RulesEngine
 * already covers slope, setback, and solar; this card adds the
 * "how-far-does-the-steward-walk-each-day" lens that zone planning
 * exists to optimize.
 *
 * For every dwelling structure on the parcel, computes flat-earth
 * meters to the nearest:
 *   - water source   (Zone 1 — daily, target ≤ 30m)
 *   - gathering hub  (Zone 2 — daily, target ≤ 100m)
 *   - paddock        (Zone 3 — every-few-days, target ≤ 250m)
 *
 * Each leg is scored good/fair/poor against the threshold; a dwelling's
 * worst leg drives its overall tone. The card surfaces the dwelling
 * with the worst access score (most steps wasted), an aggregate
 * "median-leg" walk estimate, and a pass/fail tally.
 *
 * Pure presentation. Inline flat-earth helper, no new shared math, no
 * rule-engine changes.
 */
import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
import css from './AccessEfficiencyCard.module.css';

interface AccessEfficiencyCardProps {
  project: LocalProject;
}

type Tone = 'good' | 'fair' | 'poor';

interface LegResult {
  label: string;
  zone: 'Zone 1' | 'Zone 2' | 'Zone 3';
  distM: number | null;
  thresholdM: number;
  tone: Tone;
}

interface DwellingResult {
  id: string;
  name: string;
  legs: LegResult[];
  worstTone: Tone;
  totalSteps: number; // sum of round-trips at typical daily frequency
}

// Permaculture zone-stepping thresholds (meters, target = "good")
const T_WATER_GOOD = 30;
const T_WATER_FAIR = 80;
const T_GATHER_GOOD = 100;
const T_GATHER_FAIR = 250;
const T_PADDOCK_GOOD = 250;
const T_PADDOCK_FAIR = 600;

const WATER_UTIL_TYPES = new Set(['water_tank', 'well_pump', 'rain_catchment']);

const TONE_RANK: Record<Tone, number> = { good: 0, fair: 1, poor: 2 };

export default function AccessEfficiencyCard({ project }: AccessEfficiencyCardProps) {
  const allStructures = useStructureStore((s) => s.structures);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allPaddocks = useLivestockStore((s) => s.paddocks);

  const result = useMemo(() => {
    const structures = allStructures.filter((s) => s.projectId === project.id);
    const utilities = allUtilities.filter((u) => u.projectId === project.id);
    const paddocks = allPaddocks.filter((p) => p.projectId === project.id);

    const dwellings = structures.filter((s) => {
      const tmpl = (STRUCTURE_TEMPLATES as Record<string, { category?: string }>)[s.type];
      return tmpl?.category === 'dwelling';
    });
    if (dwellings.length === 0) return { dwellings: [] as DwellingResult[], hasInputs: false };

    const waterPoints = utilities.filter((u) => WATER_UTIL_TYPES.has(u.type)).map((u) => u.center);
    const gatherPoints = structures
      .filter((s) => {
        const tmpl = (STRUCTURE_TEMPLATES as Record<string, { category?: string }>)[s.type];
        return tmpl?.category === 'gathering' || tmpl?.category === 'spiritual';
      })
      .map((s) => s.center);
    const paddockPoints = paddocks
      .map((pk) => polygonCentroid(pk.geometry.coordinates[0] as [number, number][]))
      .filter((c): c is [number, number] => c !== null);

    const results: DwellingResult[] = dwellings.map((d) => {
      const water = nearest(d.center, waterPoints);
      const gather = nearest(d.center, gatherPoints);
      const paddock = nearest(d.center, paddockPoints);

      const legs: LegResult[] = [
        {
          label: 'Water source',
          zone: 'Zone 1',
          distM: water,
          thresholdM: T_WATER_GOOD,
          tone: tone(water, T_WATER_GOOD, T_WATER_FAIR),
        },
        {
          label: 'Gathering hub',
          zone: 'Zone 2',
          distM: gather,
          thresholdM: T_GATHER_GOOD,
          tone: tone(gather, T_GATHER_GOOD, T_GATHER_FAIR),
        },
        {
          label: 'Paddock',
          zone: 'Zone 3',
          distM: paddock,
          thresholdM: T_PADDOCK_GOOD,
          tone: tone(paddock, T_PADDOCK_GOOD, T_PADDOCK_FAIR),
        },
      ];

      const worstTone = legs.reduce<Tone>((acc, l) => (TONE_RANK[l.tone] > TONE_RANK[acc] ? l.tone : acc), 'good');

      // Daily-steps estimate: water 4 round-trips, gathering 2, paddock 1 (every other day → ÷2)
      const w = water ?? 0;
      const g = gather ?? 0;
      const p = paddock ?? 0;
      const totalSteps = Math.round(((w * 2 * 4) + (g * 2 * 2) + (p * 2 * 0.5)) / 0.75);

      return {
        id: d.id,
        name: d.name || humanize(d.type),
        legs,
        worstTone,
        totalSteps,
      };
    });

    return { dwellings: results, hasInputs: true };
  }, [project.id, allStructures, allUtilities, allPaddocks]);

  const tally = useMemo(() => {
    const t = { good: 0, fair: 0, poor: 0 };
    for (const d of result.dwellings) t[d.worstTone] += 1;
    return t;
  }, [result.dwellings]);

  const worstDwelling = useMemo(() => {
    if (result.dwellings.length === 0) return null;
    return [...result.dwellings].sort((a, b) => TONE_RANK[b.worstTone] - TONE_RANK[a.worstTone] || b.totalSteps - a.totalSteps)[0]!;
  }, [result.dwellings]);

  const medianSteps = useMemo(() => {
    if (result.dwellings.length === 0) return 0;
    const sorted = [...result.dwellings].map((d) => d.totalSteps).sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? Math.round(((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2) : (sorted[mid] ?? 0);
  }, [result.dwellings]);

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Access Efficiency — Zone-Stepping Audit</h3>
          <p className={css.cardHint}>
            Permaculture zone planning measures success in steps-per-day. For every dwelling on the parcel, this card
            measures the walk to the nearest water source (Zone 1), gathering hub (Zone 2), and paddock (Zone 3),
            against the thresholds that keep daily chores efficient.
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </div>

      {!result.hasInputs && (
        <div className={css.empty}>
          Place at least one dwelling structure to evaluate access efficiency. The audit also wants water utilities,
          gathering / spiritual structures, and paddocks placed nearby so it can measure each leg.
        </div>
      )}

      {result.hasInputs && (
        <>
          <div className={css.tallyRow}>
            <Tally value={tally.good} label="Good" tone="good" />
            <Tally value={tally.fair} label="Fair" tone="fair" />
            <Tally value={tally.poor} label="Poor" tone="poor" />
            <Tally value={`~${medianSteps.toLocaleString()}`} label="Median daily steps" tone="muted" />
          </div>

          <ul className={css.dwellingList}>
            {result.dwellings.map((d) => (
              <li key={d.id} className={`${css.dwellingRow} ${css[`tone_${d.worstTone}`]}`}>
                <div className={css.dwellingHead}>
                  <span className={css.dwellingName}>{d.name}</span>
                  <span className={`${css.toneBadge} ${css[`badge_${d.worstTone}`]}`}>{d.worstTone.toUpperCase()}</span>
                </div>
                <div className={css.legGrid}>
                  {d.legs.map((leg) => (
                    <div key={leg.label} className={`${css.leg} ${css[`leg_${leg.tone}`]}`}>
                      <span className={css.legZone}>{leg.zone}</span>
                      <span className={css.legLabel}>{leg.label}</span>
                      <span className={css.legDist}>
                        {leg.distM === null ? '—' : `${Math.round(leg.distM)} m`}
                      </span>
                      <span className={css.legThreshold}>target ≤ {leg.thresholdM} m</span>
                    </div>
                  ))}
                </div>
                <div className={css.dwellingFoot}>
                  <span className={css.footKey}>Daily steps (est.)</span>
                  <span className={css.footVal}>~{d.totalSteps.toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>

          {worstDwelling && worstDwelling.worstTone !== 'good' && (
            <div className={css.recommendBlock}>
              <span className={css.recommendKey}>Worst access</span>
              <span className={css.recommendVal}>
                <strong>{worstDwelling.name}</strong> — driven by {worstDwelling.legs
                  .filter((l) => l.tone === worstDwelling.worstTone)
                  .map((l) => l.label.toLowerCase())
                  .join(' & ')}. Consider relocating the dwelling closer to its zone-1 water, or adding a buffer
                water utility (rain catchment, secondary tank) within {T_WATER_GOOD} m of the dwelling.
              </span>
            </div>
          )}
        </>
      )}

      <p className={css.footnote}>
        Thresholds: Zone 1 (water) ≤ <em>{T_WATER_GOOD} m</em>, Zone 2 (gathering) ≤ <em>{T_GATHER_GOOD} m</em>, Zone
        3 (paddock) ≤ <em>{T_PADDOCK_GOOD} m</em>. Distances are flat-earth (parcel-scale). Daily-step estimates
        assume 4 water trips, 2 gathering trips, and a half-day paddock visit per dwelling at 0.75 m / step.
      </p>
    </div>
  );
}

// ── Sub-component ──────────────────────────────────────────────────────

function Tally({ value, label, tone }: { value: number | string; label: string; tone: 'good' | 'fair' | 'poor' | 'muted' }) {
  return (
    <div className={css.tally}>
      <span className={`${css.tallyValue} ${css[`tone_${tone}`]}`}>{value}</span>
      <span className={css.tallyLabel}>{label}</span>
    </div>
  );
}

// ── Helpers (inline) ───────────────────────────────────────────────────

function tone(distM: number | null, goodMax: number, fairMax: number): Tone {
  if (distM === null) return 'poor';
  if (distM <= goodMax) return 'good';
  if (distM <= fairMax) return 'fair';
  return 'poor';
}

function nearest(from: [number, number], targets: [number, number][]): number | null {
  if (targets.length === 0) return null;
  let best = Infinity;
  for (const t of targets) {
    const d = flatEarthMeters(from, t);
    if (d < best) best = d;
  }
  return best;
}

function flatEarthMeters(a: [number, number], b: [number, number]): number {
  const meanLatRad = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dx = (b[0] - a[0]) * 111320 * Math.cos(meanLatRad);
  const dy = (b[1] - a[1]) * 110540;
  return Math.sqrt(dx * dx + dy * dy);
}

function polygonCentroid(ring: [number, number][] | undefined): [number, number] | null {
  if (!ring || ring.length < 3) return null;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const pt of ring) {
    sx += pt[0];
    sy += pt[1];
    n++;
  }
  if (n === 0) return null;
  return [sx / n, sy / n];
}

function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
