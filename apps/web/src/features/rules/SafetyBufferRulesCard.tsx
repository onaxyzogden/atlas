/**
 * §17 SafetyBufferRulesCard — categorical safety-distance audit.
 *
 * Direct continuation of AccessEfficiencyCard (same parent manifest
 * entry: `siting-rules-privacy-solar-access-safety`). Where access
 * efficiency optimizes for daily steps, this card audits the four
 * safety distances zone planning quietly assumes:
 *
 *   1. Dwelling ↔ livestock   (manure / pathogen)        — ≥ 30 m
 *   2. Well ↔ septic          (drinking-water contam.)   — ≥ 30 m
 *   3. Kitchen ↔ egress path  (fire egress)              — ≤ 20 m to a path
 *   4. Gathering ↔ livestock  (visitor odor / safety)    — ≥ 50 m
 *
 * For each rule, computes the worst pair on the parcel (smallest
 * distance, or worst kitchen-to-path), classifies good / fair / poor
 * against the threshold, and tallies. Inline geometry helpers — no
 * new shared math, no rule-engine changes.
 *
 * Pure presentation. Mounted on DecisionSupportPanel beside
 * AccessEfficiencyCard.
 */
import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
import css from './SafetyBufferRulesCard.module.css';

interface SafetyBufferRulesCardProps {
  project: LocalProject;
}

type Tone = 'good' | 'fair' | 'poor' | 'na';

interface RuleResult {
  key: string;
  label: string;
  recommended: string;
  worstDistanceM: number | null;
  worstPair: string | null;
  tone: Tone;
  rationale: string;
  guidance: string;
}

// Thresholds (meters)
const T_DWELL_LIVESTOCK_GOOD = 30;
const T_DWELL_LIVESTOCK_FAIR = 15;
const T_WELL_SEPTIC_GOOD = 30;
const T_WELL_SEPTIC_FAIR = 15;
const T_KITCHEN_PATH_GOOD = 20; // dwelling within X m of any path
const T_KITCHEN_PATH_FAIR = 40;
const T_GATHER_LIVESTOCK_GOOD = 50;
const T_GATHER_LIVESTOCK_FAIR = 25;

// "Dwelling" structures (kitchen-bearing) for fire-egress check
const KITCHEN_BEARING = new Set(['cabin', 'earthship']);

const TONE_RANK: Record<Tone, number> = { good: 0, na: 0, fair: 1, poor: 2 };

export default function SafetyBufferRulesCard({ project }: SafetyBufferRulesCardProps) {
  const allStructures = useStructureStore((s) => s.structures);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allPaths = usePathStore((s) => s.paths);

  const result = useMemo(() => {
    const structures = allStructures.filter((s) => s.projectId === project.id);
    const utilities = allUtilities.filter((u) => u.projectId === project.id);
    const paddocks = allPaddocks.filter((p) => p.projectId === project.id);
    const paths = allPaths.filter((p) => p.projectId === project.id);

    const dwellings = structures.filter((s) => {
      const tmpl = (STRUCTURE_TEMPLATES as Record<string, { category?: string }>)[s.type];
      return tmpl?.category === 'dwelling';
    });
    const gatherings = structures.filter((s) => {
      const tmpl = (STRUCTURE_TEMPLATES as Record<string, { category?: string }>)[s.type];
      return tmpl?.category === 'gathering' || tmpl?.category === 'spiritual';
    });
    const wells = [
      ...utilities.filter((u) => u.type === 'well_pump').map((u) => ({ name: u.name || 'Well pump', center: u.center })),
      ...structures.filter((s) => s.type === 'well').map((s) => ({ name: s.name || 'Well', center: s.center })),
    ];
    const septics = utilities.filter((u) => u.type === 'septic').map((u) => ({ name: u.name || 'Septic', center: u.center }));

    const paddockCenters: Array<{ name: string; center: [number, number] }> = paddocks
      .map((pk) => {
        const c = polygonCentroid(pk.geometry.coordinates[0] as [number, number][]);
        return c ? { name: pk.name || 'Paddock', center: c } : null;
      })
      .filter((x): x is { name: string; center: [number, number] } => x !== null);

    const rules: RuleResult[] = [];

    // 1. Dwelling ↔ livestock
    rules.push(
      pairWorstMin({
        key: 'dwell-livestock',
        label: 'Dwelling ↔ livestock',
        recommended: `≥ ${T_DWELL_LIVESTOCK_GOOD} m`,
        groupA: dwellings.map((d) => ({ name: d.name || humanize(d.type), center: d.center })),
        groupB: paddockCenters,
        goodMin: T_DWELL_LIVESTOCK_GOOD,
        fairMin: T_DWELL_LIVESTOCK_FAIR,
        rationale: 'Manure runoff, fly load, and pathogen carry-over from grazing animals fall off sharply with distance.',
        guidance: `Move the offending paddock or dwelling so the gap is at least ${T_DWELL_LIVESTOCK_GOOD} m, or interpose a hedgerow / windbreak.`,
        emptyA: 'Place a dwelling structure to enable this check.',
        emptyB: 'Add a paddock to enable this check.',
      }),
    );

    // 2. Well ↔ septic
    rules.push(
      pairWorstMin({
        key: 'well-septic',
        label: 'Well ↔ septic',
        recommended: `≥ ${T_WELL_SEPTIC_GOOD} m`,
        groupA: wells,
        groupB: septics,
        goodMin: T_WELL_SEPTIC_GOOD,
        fairMin: T_WELL_SEPTIC_FAIR,
        rationale: 'Septic leach fields can contaminate well drawdown cones; US EPA recommends ≥ 50 ft (≈ 15 m) minimum, ≥ 100 ft (≈ 30 m) preferred.',
        guidance: `Re-site the septic field downslope and at least ${T_WELL_SEPTIC_GOOD} m laterally from the wellhead. If unavoidable, install a sealed septic tank and witness wells.`,
        emptyA: 'Place a well utility (or well structure) to enable this check.',
        emptyB: 'Place a septic utility to enable this check.',
      }),
    );

    // 3. Kitchen-bearing dwelling → nearest path (fire egress)
    rules.push(
      kitchenEgress({
        kitchens: structures
          .filter((s) => KITCHEN_BEARING.has(s.type))
          .map((s) => ({ name: s.name || humanize(s.type), center: s.center })),
        paths,
      }),
    );

    // 4. Gathering ↔ livestock
    rules.push(
      pairWorstMin({
        key: 'gather-livestock',
        label: 'Gathering ↔ livestock',
        recommended: `≥ ${T_GATHER_LIVESTOCK_GOOD} m`,
        groupA: gatherings.map((g) => ({ name: g.name || humanize(g.type), center: g.center })),
        groupB: paddockCenters,
        goodMin: T_GATHER_LIVESTOCK_GOOD,
        fairMin: T_GATHER_LIVESTOCK_FAIR,
        rationale: 'Visitor-facing gathering / spiritual spaces should be buffered from animal odors and the noise of grazing rotation.',
        guidance: `Re-site the gathering structure or buffer the paddock so the separation reaches ${T_GATHER_LIVESTOCK_GOOD} m. A planted screen of evergreens helps even at shorter distances.`,
        emptyA: 'Place a gathering or spiritual structure to enable this check.',
        emptyB: 'Add a paddock to enable this check.',
      }),
    );

    return rules;
  }, [project.id, allStructures, allUtilities, allPaddocks, allPaths]);

  const tally = useMemo(() => {
    const t = { good: 0, fair: 0, poor: 0, na: 0 };
    for (const r of result) t[r.tone] += 1;
    return t;
  }, [result]);

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Safety Buffer Rules</h3>
          <p className={css.cardHint}>
            Four safety distances zone planning quietly assumes — manure separation, drinking-water protection, fire
            egress, and visitor-facing buffering. Each rule reports the worst pair on the parcel.
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </div>

      <div className={css.tallyRow}>
        <Tally value={tally.poor} label="Poor" tone="poor" />
        <Tally value={tally.fair} label="Fair" tone="fair" />
        <Tally value={tally.good} label="Good" tone="good" />
        <Tally value={tally.na} label="Not enough inputs" tone="muted" />
      </div>

      <ul className={css.ruleList}>
        {result.map((r) => (
          <li key={r.key} className={`${css.ruleRow} ${css[`rule_${r.tone}`]}`}>
            <div className={css.ruleHead}>
              <span className={css.ruleLabel}>{r.label}</span>
              <span className={`${css.ruleBadge} ${css[`badge_${r.tone}`]}`}>{r.tone.toUpperCase()}</span>
            </div>
            <div className={css.ruleStats}>
              <div className={css.statBlock}>
                <span className={css.statKey}>Recommended</span>
                <span className={css.statVal}>{r.recommended}</span>
              </div>
              <div className={css.statBlock}>
                <span className={css.statKey}>Worst observed</span>
                <span className={css.statVal}>
                  {r.worstDistanceM === null ? '—' : `${Math.round(r.worstDistanceM)} m`}
                </span>
              </div>
              <div className={css.statBlock}>
                <span className={css.statKey}>Worst pair</span>
                <span className={css.statVal}>{r.worstPair ?? '—'}</span>
              </div>
            </div>
            <p className={css.ruleRationale}>{r.rationale}</p>
            {r.tone !== 'good' && r.tone !== 'na' && (
              <div className={css.ruleGuidance}>
                <span className={css.guidanceKey}>Next step</span>
                <span className={css.guidanceVal}>{r.guidance}</span>
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className={css.footnote}>
        Distances are flat-earth (parcel-scale). Thresholds reflect general permaculture / regulatory guidance and
        may be tightened by local code — verify against the project's <em>regulatory risk notes</em> before finalizing
        layout.
      </p>
    </div>
  );
}

// ── Sub-component ──────────────────────────────────────────────────────

function Tally({ value, label, tone }: { value: number; label: string; tone: 'good' | 'fair' | 'poor' | 'muted' }) {
  return (
    <div className={css.tally}>
      <span className={`${css.tallyValue} ${css[`tone_${tone}`]}`}>{value}</span>
      <span className={css.tallyLabel}>{label}</span>
    </div>
  );
}

// ── Rule helpers ───────────────────────────────────────────────────────

interface PairArgs {
  key: string;
  label: string;
  recommended: string;
  groupA: Array<{ name: string; center: [number, number] }>;
  groupB: Array<{ name: string; center: [number, number] }>;
  goodMin: number;
  fairMin: number;
  rationale: string;
  guidance: string;
  emptyA: string;
  emptyB: string;
}

function pairWorstMin(args: PairArgs): RuleResult {
  if (args.groupA.length === 0 || args.groupB.length === 0) {
    return {
      key: args.key,
      label: args.label,
      recommended: args.recommended,
      worstDistanceM: null,
      worstPair: null,
      tone: 'na',
      rationale: args.groupA.length === 0 ? args.emptyA : args.emptyB,
      guidance: '',
    };
  }
  let worst = { distM: Infinity, pair: '' };
  for (const a of args.groupA) {
    for (const b of args.groupB) {
      const d = flatEarthMeters(a.center, b.center);
      if (d < worst.distM) worst = { distM: d, pair: `${a.name} ↔ ${b.name}` };
    }
  }
  return {
    key: args.key,
    label: args.label,
    recommended: args.recommended,
    worstDistanceM: worst.distM,
    worstPair: worst.pair,
    tone: worst.distM >= args.goodMin ? 'good' : worst.distM >= args.fairMin ? 'fair' : 'poor',
    rationale: args.rationale,
    guidance: args.guidance,
  };
}

function kitchenEgress(args: {
  kitchens: Array<{ name: string; center: [number, number] }>;
  paths: Array<{ geometry: { coordinates: number[][] } }>;
}): RuleResult {
  if (args.kitchens.length === 0) {
    return {
      key: 'kitchen-egress',
      label: 'Kitchen ↔ egress path',
      recommended: `≤ ${T_KITCHEN_PATH_GOOD} m to path`,
      worstDistanceM: null,
      worstPair: null,
      tone: 'na',
      rationale: 'Place a kitchen-bearing structure (cabin, earthship) to enable this check.',
      guidance: '',
    };
  }
  if (args.paths.length === 0) {
    return {
      key: 'kitchen-egress',
      label: 'Kitchen ↔ egress path',
      recommended: `≤ ${T_KITCHEN_PATH_GOOD} m to path`,
      worstDistanceM: null,
      worstPair: null,
      tone: 'na',
      rationale: 'Draw at least one path or main road to enable fire-egress evaluation.',
      guidance: '',
    };
  }
  // For each kitchen, distance to nearest path point on any segment
  let worst = { distM: 0, pair: '' };
  for (const k of args.kitchens) {
    let nearestM = Infinity;
    for (const p of args.paths) {
      const coords = p.geometry.coordinates as [number, number][];
      for (let i = 1; i < coords.length; i++) {
        const a = coords[i - 1]!;
        const b = coords[i]!;
        const proj = projectOntoSegment(k.center, a, b);
        if (proj.distM < nearestM) nearestM = proj.distM;
      }
    }
    if (nearestM > worst.distM) worst = { distM: nearestM, pair: k.name };
  }
  return {
    key: 'kitchen-egress',
    label: 'Kitchen ↔ egress path',
    recommended: `≤ ${T_KITCHEN_PATH_GOOD} m to path`,
    worstDistanceM: worst.distM,
    worstPair: worst.pair,
    tone: worst.distM <= T_KITCHEN_PATH_GOOD ? 'good' : worst.distM <= T_KITCHEN_PATH_FAIR ? 'fair' : 'poor',
    rationale: 'A kitchen-bearing dwelling needs a clear, drivable egress path within reach for fire-service vehicles and rapid evacuation.',
    guidance: `Add a path branch or driveway spur reaching within ${T_KITCHEN_PATH_GOOD} m of the dwelling. The egress path should be wide enough for a fire engine (≥ 3.5 m).`,
  };
}

// ── Geometry helpers (inline, flat-earth at parcel scale) ──────────────

function flatEarthMeters(a: [number, number], b: [number, number]): number {
  const meanLatRad = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dx = (b[0] - a[0]) * 111320 * Math.cos(meanLatRad);
  const dy = (b[1] - a[1]) * 110540;
  return Math.sqrt(dx * dx + dy * dy);
}

function projectOntoSegment(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): { t: number; distM: number } {
  const meanLatRad = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const ax = a[0] * 111320 * Math.cos(meanLatRad);
  const ay = a[1] * 110540;
  const bx = b[0] * 111320 * Math.cos(meanLatRad);
  const by = b[1] * 110540;
  const px = p[0] * 111320 * Math.cos(meanLatRad);
  const py = p[1] * 110540;
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    const ddx = px - ax;
    const ddy = py - ay;
    return { t: 0, distM: Math.sqrt(ddx * ddx + ddy * ddy) };
  }
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  const ddx = px - projX;
  const ddy = py - projY;
  return { t, distM: Math.sqrt(ddx * ddx + ddy * ddy) };
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
