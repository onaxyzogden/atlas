/**
 * SocialNodesCard — Plan Module 3 (Zone & Circulation), readout 5/5.
 *
 * Social-node generator (Rec #6 v1 from the permaculture-alignment
 * backlog, 2026-04-28 Permaculture Scholar review).
 *
 * **Scholar's framing:** "Human movement flows like water, and placing
 * 'nets in the flow' (like benches or public spaces) slows people down to
 * foster necessary community relationships." Holmgren P8 — Integrate
 * rather than segregate; People Care ethic.
 *
 * **Algorithm.**
 *   1. Pull every `path` LineString from `landDesignStore` (category
 *      `access`, kind `path`).
 *   2. Compute all pairwise segment intersections (planar lat/lng).
 *   3. Filter intersections to those inside a `zoneStore` polygon with
 *      `permacultureZone ∈ {1, 2}` — the rec's high-traffic band.
 *   4. For each surviving intersection, check the nearest social-element
 *      point within `COVERED_RADIUS_M = 12 m`. Covered ⇒ "served"; else
 *      "social node opportunity."
 *
 * **Catalog scope (v1).** Social-element kinds counted = `prayer-pavilion`,
 * `fire-circle` — the two amenity points currently in `elementCatalog.ts`.
 * Bench / picnic table / shaded seat / signage post / gathering pavilion
 * are flagged in the backlog as "a small catalog dependency"; v1 ships
 * without them and the lede points this out. v2 adds them along with the
 * canvas pin + one-click "place bench" UX from the acceptance criterion.
 *
 * **Tier table.**
 *   - `served`   density ≥ 0.66  green
 *   - `partial`  0.33–0.66       neutral
 *   - `unserved` < 0.33          red
 *
 * **v1 scope.** Textual readout only. The map-canvas pin and one-click
 * placement are deferred (see backlog file).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useLandDesignStore } from '../../../../store/landDesignStore.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import type { DesignElement } from '../../../../store/designElementsStore.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';
import {
  COVERED_RADIUS_M,
  distanceM,
  intersectionId,
  pointInPolygon,
  segmentIntersect,
  tierForDensity,
  type DensityTier,
  type Pt,
} from './socialNodesMath.js';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const SOCIAL_KINDS = new Set<string>(['prayer-pavilion', 'fire-circle']);

const SOCIAL_KIND_LABEL: Record<string, string> = {
  'prayer-pavilion': 'Prayer pavilion',
  'fire-circle': 'Fire circle',
};

const TIER_LABEL: Record<DensityTier, string> = {
  served: 'NETS IN THE FLOW',
  partial: 'PARTIAL',
  unserved: 'UNSERVED',
};

const TIER_PILL_CLASS: Record<DensityTier, string> = {
  served: styles.pillMet ?? '',
  partial: styles.pillIncon ?? '',
  unserved: styles.pillUnmet ?? '',
};

interface Opportunity {
  id: string;
  pt: Pt;
  zoneLevel: 1 | 2;
  /** Nearest covering social element, if any within COVERED_RADIUS_M. */
  cover: { kind: string; label: string; distanceM: number } | null;
}

function pathCoords(el: DesignElement): number[][] | null {
  if (el.geometry.type !== 'LineString') return null;
  const cs = el.geometry.coordinates;
  if (!cs || cs.length < 2) return null;
  return cs;
}

function formatCoord(p: Pt): string {
  return `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
}

export default function SocialNodesCard({ project }: Props) {
  const byProject = useLandDesignStore((s) => s.byProject);
  const allZones = useZoneStore((s) => s.zones);

  const elements = useMemo(
    () => byProject[project.id] ?? [],
    [byProject, project.id],
  );

  const paths = useMemo(
    () =>
      elements.filter(
        (e) => e.kind === 'path' && e.geometry.type === 'LineString',
      ),
    [elements],
  );

  const socials = useMemo(
    () =>
      elements
        .filter(
          (e) =>
            SOCIAL_KINDS.has(e.kind) && e.geometry.type === 'Point',
        )
        .map((e) => {
          const c = (e.geometry as GeoJSON.Point).coordinates;
          return {
            id: e.id,
            kind: e.kind,
            label: e.label || SOCIAL_KIND_LABEL[e.kind] || e.kind,
            pt: { lng: c[0]!, lat: c[1]! } as Pt,
          };
        }),
    [elements],
  );

  const inhabitedZones = useMemo(
    () =>
      allZones.filter(
        (z) =>
          z.projectId === project.id &&
          (z.permacultureZone === 1 || z.permacultureZone === 2),
      ),
    [allZones, project.id],
  );

  const opportunities = useMemo<Opportunity[]>(() => {
    if (paths.length < 2 || inhabitedZones.length === 0) return [];
    const seen = new Map<string, Opportunity>();

    // Pairwise paths
    for (let i = 0; i < paths.length; i++) {
      const a = paths[i]!;
      const csA = pathCoords(a);
      if (!csA) continue;
      for (let j = i + 1; j < paths.length; j++) {
        const b = paths[j]!;
        const csB = pathCoords(b);
        if (!csB) continue;
        // Pairwise segments
        for (let m = 0; m < csA.length - 1; m++) {
          const p1: Pt = { lng: csA[m]![0]!, lat: csA[m]![1]! };
          const p2: Pt = { lng: csA[m + 1]![0]!, lat: csA[m + 1]![1]! };
          for (let n = 0; n < csB.length - 1; n++) {
            const p3: Pt = { lng: csB[n]![0]!, lat: csB[n]![1]! };
            const p4: Pt = {
              lng: csB[n + 1]![0]!,
              lat: csB[n + 1]![1]!,
            };
            const hit = segmentIntersect(p1, p2, p3, p4);
            if (!hit) continue;
            // Which Z1/Z2 zone (if any)?
            let zoneLevel: 1 | 2 | null = null;
            for (const z of inhabitedZones) {
              if (pointInPolygon(hit, z.geometry)) {
                zoneLevel = z.permacultureZone as 1 | 2;
                break;
              }
            }
            if (zoneLevel === null) continue;
            const id = intersectionId(a.id, b.id, hit);
            if (seen.has(id)) continue;
            // Nearest social element
            let cover: Opportunity['cover'] = null;
            let bestD = Infinity;
            for (const s of socials) {
              const d = distanceM(hit, s.pt);
              if (d < bestD) {
                bestD = d;
                cover =
                  d <= COVERED_RADIUS_M
                    ? { kind: s.kind, label: s.label, distanceM: d }
                    : null;
              }
            }
            seen.set(id, { id, pt: hit, zoneLevel, cover });
          }
        }
      }
    }

    // Sort: uncovered first; ties broken by zone (Z1 before Z2).
    return Array.from(seen.values()).sort((a, b) => {
      const aCov = a.cover ? 1 : 0;
      const bCov = b.cover ? 1 : 0;
      if (aCov !== bCov) return aCov - bCov;
      return a.zoneLevel - b.zoneLevel;
    });
  }, [paths, inhabitedZones, socials]);

  const totalCount = opportunities.length;
  const coveredCount = opportunities.filter((o) => o.cover).length;
  const opportunityCount = totalCount - coveredCount;
  const density = totalCount === 0 ? 0 : coveredCount / totalCount;
  const tier = tierForDensity(coveredCount, totalCount);

  const hasInputs = paths.length >= 2 && inhabitedZones.length > 0;
  const missing: string[] = [];
  if (paths.length < 2) missing.push('two or more footpaths');
  if (inhabitedZones.length === 0)
    missing.push('one or more zones tagged Z1 or Z2');

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 3 · Zone &amp; Circulation</span>
        <h1 className={styles.title}>Social nodes</h1>
        <p className={styles.lede}>
          Path intersections inside Z1 / Z2 zones are high-traffic
          decision points. Placing a bench, shaded seat, or gathering
          spot there slows people down enough for chance conversations —
          the Scholar&apos;s &quot;nets in the flow.&quot; v1 counts
          existing amenity points (prayer pavilion, fire circle) as
          coverage within {COVERED_RADIUS_M} m of an intersection; a
          richer social-element catalog (bench, picnic table, signage)
          lands in v2 along with one-click placement. Holmgren P8 —
          Integrate rather than segregate.
        </p>
      </header>

      {!hasInputs && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Inputs needed</h2>
          <p className={styles.empty}>
            The audit needs {missing.join(' and ')}. Footpaths live in the
            Plan tool rail (Access category); zone level is set from
            Module 3 → Zone level layer.
          </p>
        </div>
      )}

      {hasInputs && (
        <>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Site rollup</h2>
            <div className={styles.statRow}>
              <span>Footpaths</span>
              <span>{paths.length}</span>
            </div>
            <div className={styles.statRow}>
              <span>Inhabited zones (Z1 + Z2)</span>
              <span>{inhabitedZones.length}</span>
            </div>
            <div className={styles.statRow}>
              <span>Intersections inside Z1 / Z2</span>
              <span>{totalCount}</span>
            </div>
            <div className={styles.statRow}>
              <span>Covered · Opportunities</span>
              <span>
                {coveredCount} · {opportunityCount}
                {totalCount > 0 && (
                  <>
                    {' · '}
                    <span
                      className={`${styles.pill} ${TIER_PILL_CLASS[tier]}`}
                    >
                      socialNodeDensity {density.toFixed(2)}
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>

          {totalCount === 0 && (
            <div className={styles.section}>
              <p className={styles.empty}>
                No path intersections fall inside a Z1 / Z2 zone yet. Draw
                two paths that cross inside an inhabited zone to surface
                a social-node opportunity.
              </p>
            </div>
          )}

          {totalCount > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Per-intersection audit</h2>
              <ul className={styles.list}>
                {opportunities.map((o) => (
                  <li key={o.id} className={styles.listRow}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong>
                          {o.cover
                            ? 'Social node served'
                            : 'Social node opportunity'}
                        </strong>
                        <span className={styles.listMeta}>
                          Z{o.zoneLevel}
                        </span>
                        <span
                          className={`${styles.pill} ${
                            o.cover
                              ? (styles.pillMet ?? '')
                              : (styles.pillUnmet ?? '')
                          }`}
                        >
                          {o.cover ? 'COVERED' : 'OPPORTUNITY'}
                        </span>
                      </div>
                      <div className={styles.listMeta}>
                        intersection at {formatCoord(o.pt)}
                      </div>
                      {o.cover ? (
                        <div className={styles.hint}>
                          Covered by{' '}
                          <strong>{o.cover.label}</strong>{' '}
                          ({o.cover.distanceM.toFixed(1)} m away).
                        </div>
                      ) : (
                        <div className={styles.hint}>
                          Consider placing a social element here — bench,
                          gathering spot, sign, or shaded seat. Human
                          movement flows like water; a &quot;net in the
                          flow&quot; slows people down for chance
                          conversations.
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
