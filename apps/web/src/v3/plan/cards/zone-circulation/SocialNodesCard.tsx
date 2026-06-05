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

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useLandDesignStore } from '../../../../store/landDesignStore.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { useSocialNodeDismissStore } from '../../../../store/socialNodeDismissStore.js';
import type { DesignElement } from '../../../../store/designElementsStore.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';
import {
  COVERED_RADIUS_M,
  computeOpportunities,
  tierForDensity,
  type DensityTier,
  type Pt,
  type SocialElementPt,
  type SocialOpportunity,
  type SocialPath,
  type SocialZone,
} from './socialNodesMath.js';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

// Social-element kinds the coverage detector counts. v1 shipped the two amenity
// points then in the catalog (prayer pavilion, fire circle); v2 adds the five
// dedicated social-node kinds (bench, picnic table, shaded seat, signage post,
// gathering pavilion) so a placed bench immediately counts as coverage.
const SOCIAL_KINDS = new Set<string>([
  'prayer-pavilion',
  'fire-circle',
  'bench',
  'picnic-table',
  'shaded-seat',
  'signage-post',
  'gathering-pavilion',
]);

const SOCIAL_KIND_LABEL: Record<string, string> = {
  'prayer-pavilion': 'Prayer pavilion',
  'fire-circle': 'Fire circle',
  bench: 'Bench',
  'picnic-table': 'Picnic table',
  'shaded-seat': 'Shaded seat',
  'signage-post': 'Signage post',
  'gathering-pavilion': 'Gathering pavilion',
};

// Kinds the steward can place from an opportunity row. Ordered cheapest /
// lightest first — a bench is the canonical "net in the flow".
const PLACEABLE_KINDS: { kind: string; label: string }[] = [
  { kind: 'bench', label: 'Bench' },
  { kind: 'shaded-seat', label: 'Shaded seat' },
  { kind: 'picnic-table', label: 'Picnic table' },
  { kind: 'signage-post', label: 'Signage post' },
  { kind: 'gathering-pavilion', label: 'Gathering pavilion' },
];

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

function formatCoord(p: Pt): string {
  return `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
}

/** Best-effort unique id for a newly placed element (happy-dom-safe). */
function newElementId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `social-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export default function SocialNodesCard({ project }: Props) {
  const byProject = useLandDesignStore((s) => s.byProject);
  const addElement = useLandDesignStore((s) => s.add);
  const allZones = useZoneStore((s) => s.zones);
  const dismissedByProject = useSocialNodeDismissStore((s) => s.byProject);
  const dismissOpportunity = useSocialNodeDismissStore((s) => s.dismiss);
  const clearDismissed = useSocialNodeDismissStore((s) => s.clear);

  const [placeKind, setPlaceKind] = useState<string>('bench');

  const elements = useMemo(
    () => byProject[project.id] ?? [],
    [byProject, project.id],
  );

  const paths = useMemo<SocialPath[]>(
    () =>
      elements
        .filter((e) => e.kind === 'path' && e.geometry.type === 'LineString')
        .map((e) => ({
          id: e.id,
          coords: (e.geometry as GeoJSON.LineString).coordinates,
        })),
    [elements],
  );

  const socials = useMemo<SocialElementPt[]>(
    () =>
      elements
        .filter((e) => SOCIAL_KINDS.has(e.kind) && e.geometry.type === 'Point')
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

  const inhabitedZones = useMemo<SocialZone[]>(
    () =>
      allZones
        .filter(
          (z) =>
            z.projectId === project.id &&
            (z.permacultureZone === 1 || z.permacultureZone === 2),
        )
        .map((z) => ({
          geometry: z.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon,
          permacultureZone: z.permacultureZone as 1 | 2,
        })),
    [allZones, project.id],
  );

  const dismissed = useMemo(
    () => new Set(dismissedByProject[project.id] ?? []),
    [dismissedByProject, project.id],
  );

  const opportunities = useMemo<SocialOpportunity[]>(
    () => computeOpportunities(paths, inhabitedZones, socials, dismissed),
    [paths, inhabitedZones, socials, dismissed],
  );

  const dismissedCount = (dismissedByProject[project.id] ?? []).length;

  /** Place the selected social element exactly at an opportunity coordinate. */
  const placeSocialElement = (o: SocialOpportunity) => {
    const spec =
      PLACEABLE_KINDS.find((k) => k.kind === placeKind) ?? PLACEABLE_KINDS[0]!;
    const el: DesignElement = {
      id: newElementId(),
      category: 'amenity',
      kind: spec.kind,
      geometry: { type: 'Point', coordinates: [o.pt.lng, o.pt.lat] },
      phase: 'buildings',
      label: spec.label,
      createdAt: new Date().toISOString(),
      view: 'current',
    };
    addElement(project.id, el);
  };

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
          the Scholar&apos;s &quot;nets in the flow.&quot; Any social
          amenity (prayer pavilion, fire circle, bench, picnic table,
          shaded seat, signage post, gathering pavilion) within{' '}
          {COVERED_RADIUS_M} m of an intersection counts as coverage.
          Pick an element below and <strong>Place</strong> it right on an
          opportunity, or <strong>Dismiss</strong> intersections you have
          judged unsuitable. Holmgren P8 — Integrate rather than segregate.
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
              <div
                className={styles.statRow}
                style={{ alignItems: 'center', gap: 8 }}
              >
                <label htmlFor="social-place-kind">Element to place</label>
                <select
                  id="social-place-kind"
                  value={placeKind}
                  onChange={(e) => setPlaceKind(e.target.value)}
                >
                  {PLACEABLE_KINDS.map((k) => (
                    <option key={k.kind} value={k.kind}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </div>
              {dismissedCount > 0 && (
                <div className={styles.hint}>
                  {dismissedCount} dismissed this session.{' '}
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={() => clearDismissed(project.id)}
                  >
                    Restore all
                  </button>
                </div>
              )}
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
                        <>
                          <div className={styles.hint}>
                            Consider placing a social element here — bench,
                            gathering spot, sign, or shaded seat. Human
                            movement flows like water; a &quot;net in the
                            flow&quot; slows people down for chance
                            conversations.
                          </div>
                          <div className={styles.btnRow}>
                            <button
                              type="button"
                              className={styles.btn}
                              onClick={() => placeSocialElement(o)}
                            >
                              Place{' '}
                              {PLACEABLE_KINDS.find((k) => k.kind === placeKind)
                                ?.label ?? 'element'}{' '}
                              here
                            </button>
                            <button
                              type="button"
                              className={styles.btn}
                              onClick={() =>
                                dismissOpportunity(project.id, o.id)
                              }
                            >
                              Dismiss
                            </button>
                          </div>
                        </>
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
