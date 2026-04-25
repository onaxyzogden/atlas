/**
 * §19 WalkingTourScriptCard — auto-generated 5-stop guided-tour script
 * pinned to the longest existing path on the parcel.
 *
 * Closes the "Voiceover script export" P4 stub on EducationalAtlasDashboard.
 * The card walks the longest path, finds the closest design feature to
 * each evenly-spaced sample point, picks five distinct stops (one of each
 * available kind: structure, water utility, livestock paddock, crop area,
 * vista / endpoint), generates a narrated blurb per stop, and offers a
 * copy-to-clipboard scripted output a steward can read on tour or hand
 * to a video voiceover artist.
 *
 * Pure derivation — reads existing stores, writes nothing. Distance math
 * is flat-earth equirectangular (sufficient at parcel scale).
 */
import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { STRUCTURE_TEMPLATES } from '../structures/footprints.js';
import css from './WalkingTourScriptCard.module.css';

interface WalkingTourScriptCardProps {
  project: LocalProject;
}

type StopKind = 'structure' | 'water' | 'livestock' | 'crop' | 'vista';

interface CandidateStop {
  kind: StopKind;
  name: string;
  category: string;
  point: [number, number]; // [lng, lat]
  blurb: string;
}

interface OrderedStop extends CandidateStop {
  alongMeters: number;
  fromStartLabel: string;
}

const WATER_UTIL_TYPES = new Set(['water_tank', 'well_pump', 'rain_catchment', 'septic', 'greywater']);

export default function WalkingTourScriptCard({ project }: WalkingTourScriptCardProps) {
  const allStructures = useStructureStore((st) => st.structures);
  const allPaddocks = useLivestockStore((st) => st.paddocks);
  const allCrops = useCropStore((st) => st.cropAreas);
  const allPaths = usePathStore((st) => st.paths);
  const allUtilities = useUtilityStore((st) => st.utilities);

  const [copied, setCopied] = useState(false);

  const tour = useMemo(() => {
    const paths = allPaths.filter((p) => p.projectId === project.id);
    if (paths.length === 0) return null;

    // Pick the longest path with at least 2 points
    const longest = paths
      .filter((p) => p.geometry.coordinates.length >= 2)
      .sort((a, b) => b.lengthM - a.lengthM)[0];
    if (!longest) return null;

    const coords = longest.geometry.coordinates as [number, number][];

    // Cumulative along-path meters for each vertex
    const cumul: number[] = [0];
    for (let i = 1; i < coords.length; i++) {
      cumul.push(cumul[i - 1]! + flatEarthMeters(coords[i - 1]!, coords[i]!));
    }
    const totalM = cumul[cumul.length - 1] ?? 0;
    if (totalM < 10) return null;

    // ── Gather candidate stops from placed entities ────────────────────
    const candidates: CandidateStop[] = [];
    const structures = allStructures.filter((s) => s.projectId === project.id);
    const paddocks = allPaddocks.filter((p) => p.projectId === project.id);
    const crops = allCrops.filter((c) => c.projectId === project.id);
    const utilities = allUtilities.filter((u) => u.projectId === project.id);

    for (const s of structures) {
      const tmpl = STRUCTURE_TEMPLATES[s.type];
      const cat = tmpl?.category ?? 'structure';
      candidates.push({
        kind: 'structure',
        name: s.name || humanize(s.type),
        category: humanize(cat),
        point: s.center,
        blurb: structureBlurb(s.type, s.name || humanize(s.type)),
      });
    }
    for (const u of utilities) {
      if (!WATER_UTIL_TYPES.has(u.type)) continue;
      candidates.push({
        kind: 'water',
        name: u.name || humanize(u.type),
        category: 'Water system',
        point: u.center,
        blurb: waterBlurb(u.type, u.name || humanize(u.type)),
      });
    }
    for (const pk of paddocks) {
      const c = polygonCentroid(pk.geometry.coordinates[0] as [number, number][]);
      if (!c) continue;
      candidates.push({
        kind: 'livestock',
        name: pk.name || 'Paddock',
        category: 'Livestock',
        point: c,
        blurb: livestockBlurb(pk.name || 'Paddock', pk.species),
      });
    }
    for (const cr of crops) {
      const c = polygonCentroid(cr.geometry.coordinates[0] as [number, number][]);
      if (!c) continue;
      candidates.push({
        kind: 'crop',
        name: cr.name || humanize(cr.type),
        category: humanize(cr.type),
        point: c,
        blurb: cropBlurb(cr.type, cr.name || humanize(cr.type)),
      });
    }

    if (candidates.length === 0) return null;

    // ── Snap each candidate to the path; record nearest along-distance ─
    interface Snapped extends CandidateStop {
      alongMeters: number;
      perpMeters: number;
    }
    const snapped: Snapped[] = candidates.map((c) => {
      let best = { alongM: 0, perpM: Infinity };
      for (let i = 1; i < coords.length; i++) {
        const a = coords[i - 1]!;
        const b = coords[i]!;
        const proj = projectOntoSegment(c.point, a, b);
        const along = cumul[i - 1]! + proj.t * flatEarthMeters(a, b);
        if (proj.distM < best.perpM) best = { alongM: along, perpM: proj.distM };
      }
      return { ...c, alongMeters: best.alongM, perpMeters: best.perpM };
    });

    // Drop candidates that are >150m off the path (not realistically a tour stop)
    const onPath = snapped.filter((s) => s.perpMeters <= 150);
    if (onPath.length === 0) return null;

    // ── Pick up to 5 stops, prefer kind diversity, then proximity ──────
    const seenKinds = new Set<StopKind>();
    const picked: Snapped[] = [];

    // Sort by perpendicular distance (closest first), then push diverse kinds
    const byProx = [...onPath].sort((a, b) => a.perpMeters - b.perpMeters);
    for (const s of byProx) {
      if (picked.length >= 5) break;
      if (!seenKinds.has(s.kind)) {
        picked.push(s);
        seenKinds.add(s.kind);
      }
    }
    // Fill remaining slots with closest stops regardless of kind, dedup by name
    for (const s of byProx) {
      if (picked.length >= 5) break;
      if (!picked.some((p) => p.name === s.name)) picked.push(s);
    }

    // Add a vista stop at the path endpoint if we still have <5 stops
    if (picked.length < 5) {
      const endPt = coords[coords.length - 1]!;
      picked.push({
        kind: 'vista',
        name: 'Vista — path terminus',
        category: 'Overlook',
        point: endPt,
        blurb:
          'A natural end-point along the longest corridor. Pause here to take in the surrounding landscape and reflect on how the design choices upstream made this view possible.',
        alongMeters: totalM,
        perpMeters: 0,
      });
    }

    // Order by along-path distance (the actual walking order)
    picked.sort((a, b) => a.alongMeters - b.alongMeters);

    const ordered: OrderedStop[] = picked.map((s, i) => ({
      ...s,
      fromStartLabel: i === 0 ? 'Start' : `${Math.round(s.alongMeters)} m from start`,
    }));

    return {
      pathName: longest.name || humanize(longest.type),
      pathLengthM: Math.round(totalM),
      stops: ordered,
    };
  }, [project.id, allStructures, allPaddocks, allCrops, allPaths, allUtilities]);

  const handleCopy = () => {
    if (!tour) return;
    const lines: string[] = [];
    lines.push(`Walking Tour — ${project.name}`);
    lines.push(`Route: ${tour.pathName} (${tour.pathLengthM} m)`);
    lines.push('');
    tour.stops.forEach((s, i) => {
      lines.push(`Stop ${i + 1}: ${s.name}`);
      lines.push(`(${s.fromStartLabel} · ${s.category})`);
      lines.push(s.blurb);
      lines.push('');
    });
    navigator.clipboard?.writeText(lines.join('\n')).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      },
      () => {
        /* clipboard unavailable — silent */
      },
    );
  };

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Walking Tour Script</h3>
          <p className={css.cardHint}>
            Auto-generated 5-stop tour pinned to the longest path on the parcel. Each stop's narration blurb is
            derived from the placed feature's type and name — read it on a site walk or hand it to a voiceover
            artist for video.
          </p>
        </div>
        <span className={css.heuristicBadge}>AI DRAFT</span>
      </div>

      {!tour && (
        <div className={css.empty}>
          Draw at least one path (≥ 10 m) and place at least one structure, water system, paddock, or crop area to
          generate a tour. The card snaps each placed feature to its closest point on the longest path.
        </div>
      )}

      {tour && (
        <>
          <div className={css.routeBlock}>
            <div className={css.routeRow}>
              <span className={css.routeKey}>Route</span>
              <span className={css.routeVal}>{tour.pathName}</span>
            </div>
            <div className={css.routeRow}>
              <span className={css.routeKey}>Length</span>
              <span className={css.routeVal}>{tour.pathLengthM} m</span>
            </div>
            <div className={css.routeRow}>
              <span className={css.routeKey}>Stops</span>
              <span className={css.routeVal}>{tour.stops.length}</span>
            </div>
          </div>

          <ol className={css.stopList}>
            {tour.stops.map((s, i) => (
              <li key={`${s.name}-${i}`} className={`${css.stopRow} ${css[`kind_${s.kind}`]}`}>
                <div className={css.stopHead}>
                  <span className={css.stopIndex}>Stop {i + 1}</span>
                  <span className={css.stopName}>{s.name}</span>
                  <span className={css.stopMeta}>{s.fromStartLabel} · {s.category}</span>
                </div>
                <p className={css.stopBlurb}>{s.blurb}</p>
              </li>
            ))}
          </ol>

          <button type="button" className={css.copyBtn} onClick={handleCopy}>
            {copied ? '✓ Copied to clipboard' : 'Copy script to clipboard'}
          </button>
        </>
      )}

      <p className={css.footnote}>
        Stops are picked to maximize <em>kind</em> diversity (structure / water / livestock / crop), then ordered
        along the path. Off-path features (&gt; 150 m from the route) are excluded. To re-shape the tour, redraw
        the route or rename features for richer narration.
      </p>
    </div>
  );
}

// ── Geometry helpers (inline — flat-earth at parcel scale) ─────────────

function flatEarthMeters(a: [number, number], b: [number, number]): number {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const meanLatRad = ((lat1 + lat2) / 2) * (Math.PI / 180);
  const dx = (lng2 - lng1) * 111320 * Math.cos(meanLatRad);
  const dy = (lat2 - lat1) * 110540;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Project point p onto segment [a,b]; return parameter t in [0,1] and perpendicular distance in meters. */
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

// ── Narration ──────────────────────────────────────────────────────────

function structureBlurb(type: string, name: string): string {
  const tmpl = (STRUCTURE_TEMPLATES as Record<string, { category?: string }>)[type];
  const cat: string = tmpl?.category ?? 'structure';
  if (cat === 'dwelling') {
    return `${name} is the primary dwelling on the parcel. Notice how it's oriented to capture light and how the surrounding zones step out from the home — the most visited spaces should always sit closest to where people sleep.`;
  }
  if (cat === 'spiritual') {
    return `${name} is a contemplative space — placed away from working noise, oriented for stillness. Pause here for a moment of quiet before continuing.`;
  }
  if (cat === 'gathering' || cat === 'communal') {
    return `${name} is a gathering space, sized for the community this land is meant to serve. The path widens here on purpose — community moves through choke-points slowly.`;
  }
  if (cat === 'agricultural' || cat === 'agriculture' || cat === 'livestock' || cat === 'utility' || cat === 'infrastructure') {
    return `${name} houses the working systems of the farm. Look for the proximity of water and feed storage — the goal is to minimize daily steps for the steward.`;
  }
  return `${name} (${humanize(cat)}) is one of the design's structural anchors. Observe how the path approaches it, and how the surrounding zones support its function.`;
}

function waterBlurb(type: string, name: string): string {
  if (type === 'well_pump') {
    return `${name} draws from the aquifer below — the deepest layer of the site's water cycle. Test water annually and listen for changes in pump cycle as a leading indicator of seasonal drawdown.`;
  }
  if (type === 'water_tank') {
    return `${name} is the surface buffer between catchment and use. A full tank means a healthy upstream catchment and sized-correctly downstream demand.`;
  }
  if (type === 'rain_catchment') {
    return `${name} captures roof runoff. Every square meter of roof contributes ~1 L per mm of rain — multiply your roof area by your average monthly precipitation to feel the harvest.`;
  }
  if (type === 'septic') {
    return `${name} is the wastewater treatment cell. It needs distance from wells, distance from gardens, and gentle access for periodic pump-out.`;
  }
  if (type === 'greywater') {
    return `${name} re-circulates household water back to the landscape — a quiet hand-off between domestic and agricultural water cycles.`;
  }
  return `${name} is a water-system component. Trace where it draws from and where it sends water — every drop should have a story.`;
}

function livestockBlurb(name: string, species: string[]): string {
  const sp = species.length > 0 ? species.map(humanize).join(' & ') : 'livestock';
  return `${name} carries ${sp}. Notice the fencing condition, the water access, and how the paddock connects to the rotation cycle. Resting paddocks should feel taller, greener, and quieter than active ones.`;
}

function cropBlurb(type: string, name: string): string {
  return `${name} is a ${humanize(type).toLowerCase()} planting. Look at the spacing, the companion species, and the season the design assumes. A planting plan only succeeds if the rotation is honoured year over year.`;
}

function humanize(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
