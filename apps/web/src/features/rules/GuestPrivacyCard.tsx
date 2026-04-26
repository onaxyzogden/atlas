/**
 * §17 GuestPrivacyCard — final slice of `siting-rules-privacy-solar-access-safety`.
 *
 * Companion to AccessEfficiencyCard (steps-per-day) and
 * SafetyBufferRulesCard (manure / well / fire / odor). This card
 * audits the privacy half: for every guest accommodation on the
 * parcel, can the owner dwelling see into the guest unit, and
 * vice versa?
 *
 * For each guest unit we compute three privacy signals:
 *   1. Distance to owner dwelling     (≥ 40 m visual privacy)
 *   2. Relative facing                (does the guest face owner?)
 *   3. Walk-distance to nearest path  (≥ 5 m off-path → arrival privacy)
 *
 * Owner dwelling is identified as the largest dwelling structure
 * (by widthM × depthM) on the parcel. Guests are the remaining
 * dwellings plus tent_glamping units. Bearing math uses the
 * structure's `rotationDeg` (degrees clockwise from north) — we
 * assume the long axis of the footprint faces along that bearing.
 *
 * Pure presentation. Inline geometry helpers, no rule-engine
 * changes. Mounted on DecisionSupportPanel beside the access /
 * safety siblings. Once shipped, manifest entry
 * `siting-rules-privacy-solar-access-safety` flips to done.
 */
import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
import css from './GuestPrivacyCard.module.css';

interface GuestPrivacyCardProps {
  project: LocalProject;
}

type Tone = 'good' | 'fair' | 'poor';

interface GuestResult {
  id: string;
  name: string;
  distM: number;
  bearingDeltaDeg: number; // [0, 180] — 0 = faces owner head-on, 180 = faces away
  facingTone: Tone;
  facingLabel: string;
  pathOffsetM: number | null;
  worstTone: Tone;
}

const T_DIST_GOOD = 40;
const T_DIST_FAIR = 20;
const T_PATH_GOOD = 5;
const T_PATH_FAIR = 2;

const GUEST_TYPES = new Set(['tent_glamping', 'yurt']);

const TONE_RANK: Record<Tone, number> = { good: 0, fair: 1, poor: 2 };

export default function GuestPrivacyCard({ project }: GuestPrivacyCardProps) {
  const allStructures = useStructureStore((s) => s.structures);
  const allPaths = usePathStore((s) => s.paths);

  const result = useMemo(() => {
    const structures = allStructures.filter((s) => s.projectId === project.id);
    const paths = allPaths.filter((p) => p.projectId === project.id);

    const dwellings = structures.filter((s) => {
      const tmpl = (STRUCTURE_TEMPLATES as Record<string, { category?: string }>)[s.type];
      return tmpl?.category === 'dwelling';
    });

    if (dwellings.length === 0) {
      return { kind: 'no-dwelling' as const };
    }

    // Owner = largest dwelling by footprint area
    const owner = [...dwellings].sort((a, b) => b.widthM * b.depthM - a.widthM * a.depthM)[0]!;

    const guests = [
      ...dwellings.filter((d) => d.id !== owner.id),
      ...structures.filter((s) => GUEST_TYPES.has(s.type)),
    ];

    if (guests.length === 0) {
      return { kind: 'no-guests' as const, ownerName: owner.name || humanize(owner.type) };
    }

    const evaluations: GuestResult[] = guests.map((g) => {
      const distM = flatEarthMeters(g.center, owner.center);
      const bearingToOwner = bearingDeg(g.center, owner.center); // [0, 360)
      const guestFacing = ((g.rotationDeg % 360) + 360) % 360;
      let delta = Math.abs(bearingToOwner - guestFacing);
      if (delta > 180) delta = 360 - delta;
      const facingTone: Tone = delta < 60 ? 'poor' : delta < 120 ? 'fair' : 'good';
      const facingLabel = delta < 60 ? 'Faces owner' : delta < 120 ? 'Perpendicular' : 'Faces away';

      let pathOffsetM: number | null = null;
      if (paths.length > 0) {
        let best = Infinity;
        for (const p of paths) {
          const coords = p.geometry.coordinates as [number, number][];
          for (let i = 1; i < coords.length; i++) {
            const a = coords[i - 1]!;
            const b = coords[i]!;
            const proj = projectOntoSegment(g.center, a, b);
            if (proj.distM < best) best = proj.distM;
          }
        }
        pathOffsetM = best;
      }

      const distTone: Tone = distM >= T_DIST_GOOD ? 'good' : distM >= T_DIST_FAIR ? 'fair' : 'poor';
      const pathTone: Tone =
        pathOffsetM === null
          ? 'good'
          : pathOffsetM >= T_PATH_GOOD
            ? 'good'
            : pathOffsetM >= T_PATH_FAIR
              ? 'fair'
              : 'poor';

      const worstTone = ([distTone, facingTone, pathTone] as Tone[]).reduce(
        (acc, t) => (TONE_RANK[t] > TONE_RANK[acc] ? t : acc),
        'good',
      );

      return {
        id: g.id,
        name: g.name || humanize(g.type),
        distM,
        bearingDeltaDeg: delta,
        facingTone,
        facingLabel,
        pathOffsetM,
        worstTone,
      };
    });

    return {
      kind: 'evaluated' as const,
      ownerName: owner.name || humanize(owner.type),
      guests: evaluations,
    };
  }, [project.id, allStructures, allPaths]);

  if (result.kind === 'no-dwelling') {
    return <EmptyCard message="Place a dwelling structure to identify the owner unit; guest privacy is measured relative to it." />;
  }
  if (result.kind === 'no-guests') {
    return (
      <EmptyCard
        message={`Owner dwelling identified as ${result.ownerName}. Add a guest accommodation (second cabin, yurt, tent_glamping) to evaluate privacy.`}
      />
    );
  }

  const tally = { good: 0, fair: 0, poor: 0 };
  for (const g of result.guests) tally[g.worstTone] += 1;

  const worst = [...result.guests].sort((a, b) => TONE_RANK[b.worstTone] - TONE_RANK[a.worstTone] || a.distM - b.distM)[0]!;

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Guest Privacy</h3>
          <p className={css.cardHint}>
            Owner dwelling: <strong>{result.ownerName}</strong> (largest by footprint). Each guest unit is scored on
            three privacy signals — distance to owner, facing direction (does the guest face the owner?), and
            arrival privacy off the nearest path.
          </p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </div>

      <div className={css.tallyRow}>
        <Tally value={tally.poor} label="Poor" tone="poor" />
        <Tally value={tally.fair} label="Fair" tone="fair" />
        <Tally value={tally.good} label="Good" tone="good" />
        <Tally value={result.guests.length} label="Guests evaluated" tone="muted" />
      </div>

      <ul className={css.guestList}>
        {result.guests.map((g) => (
          <li key={g.id} className={`${css.guestRow} ${css[`tone_${g.worstTone}`]}`}>
            <div className={css.guestHead}>
              <span className={css.guestName}>{g.name}</span>
              <span className={`${css.toneBadge} ${css[`badge_${g.worstTone}`]}`}>{g.worstTone.toUpperCase()}</span>
            </div>
            <div className={css.signalGrid}>
              <Signal
                label="Distance to owner"
                value={`${Math.round(g.distM)} m`}
                threshold={`target ≥ ${T_DIST_GOOD} m`}
                tone={g.distM >= T_DIST_GOOD ? 'good' : g.distM >= T_DIST_FAIR ? 'fair' : 'poor'}
              />
              <Signal
                label="Facing"
                value={g.facingLabel}
                threshold={`Δ${Math.round(g.bearingDeltaDeg)}° from owner bearing`}
                tone={g.facingTone}
              />
              <Signal
                label="Path offset"
                value={g.pathOffsetM === null ? '—' : `${Math.round(g.pathOffsetM)} m`}
                threshold={g.pathOffsetM === null ? 'no paths drawn' : `target ≥ ${T_PATH_GOOD} m`}
                tone={
                  g.pathOffsetM === null
                    ? 'good'
                    : g.pathOffsetM >= T_PATH_GOOD
                      ? 'good'
                      : g.pathOffsetM >= T_PATH_FAIR
                        ? 'fair'
                        : 'poor'
                }
              />
            </div>
          </li>
        ))}
      </ul>

      {worst.worstTone !== 'good' && (
        <div className={css.recommendBlock}>
          <span className={css.recommendKey}>Worst privacy</span>
          <span className={css.recommendVal}>
            <strong>{worst.name}</strong> — {worst.worstTone === 'poor' ? 'fails' : 'flagged on'}{' '}
            {worst.distM < T_DIST_FAIR ? 'distance, ' : ''}
            {worst.facingTone === 'poor' ? 'facing, ' : ''}
            {worst.pathOffsetM !== null && worst.pathOffsetM < T_PATH_FAIR ? 'path offset, ' : ''}
            against the privacy thresholds. Consider rotating the guest unit to face away from the owner dwelling,
            interposing a hedgerow / planted screen, or relocating to gain at least {T_DIST_GOOD} m of separation.
          </span>
        </div>
      )}

      <p className={css.footnote}>
        Owner is the largest dwelling on the parcel; guests are remaining dwellings plus <em>tent_glamping</em> /{' '}
        <em>yurt</em> units. Facing is derived from each structure's <em>rotationDeg</em> assuming the long axis
        points forward. Distances are flat-earth (parcel-scale).
      </p>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function EmptyCard({ message }: { message: string }) {
  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Guest Privacy</h3>
          <p className={css.cardHint}>{message}</p>
        </div>
        <span className={css.heuristicBadge}>HEURISTIC</span>
      </div>
    </div>
  );
}

function Tally({ value, label, tone }: { value: number; label: string; tone: 'good' | 'fair' | 'poor' | 'muted' }) {
  return (
    <div className={css.tally}>
      <span className={`${css.tallyValue} ${css[`tone_${tone}`]}`}>{value}</span>
      <span className={css.tallyLabel}>{label}</span>
    </div>
  );
}

function Signal({ label, value, threshold, tone }: { label: string; value: string; threshold: string; tone: Tone }) {
  return (
    <div className={`${css.signal} ${css[`signal_${tone}`]}`}>
      <span className={css.signalLabel}>{label}</span>
      <span className={css.signalVal}>{value}</span>
      <span className={css.signalThreshold}>{threshold}</span>
    </div>
  );
}

// ── Geometry helpers (inline, flat-earth at parcel scale) ──────────────

function flatEarthMeters(a: [number, number], b: [number, number]): number {
  const meanLatRad = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dx = (b[0] - a[0]) * 111320 * Math.cos(meanLatRad);
  const dy = (b[1] - a[1]) * 110540;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Initial bearing from a to b in degrees clockwise from north [0, 360). */
function bearingDeg(a: [number, number], b: [number, number]): number {
  const meanLatRad = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dx = (b[0] - a[0]) * 111320 * Math.cos(meanLatRad);
  const dy = (b[1] - a[1]) * 110540;
  let theta = Math.atan2(dx, dy) * (180 / Math.PI); // east of north
  if (theta < 0) theta += 360;
  return theta;
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

function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
