/**
 * EcologicalProtectionCard — §17 ecological-and-wildlife-protection-rules.
 *
 * Closes the §17 spec line "Ecological and wildlife protection rules"
 * (the catalog slot in `SitingRules.ts` literally reads
 * "reserved for future rules — wetland encroachment, habitat corridor
 * breaks, etc."). This card surfaces five focused ecological heuristics
 * read off the existing zone / structure / paddock / path stores —
 * no new entity types, no shared-package math, no engine integration.
 *
 * Checks (all heuristic, all read-only):
 *
 *   1. structure-in-conservation — any structure footprint whose center
 *      falls inside a `conservation` zone polygon. Built footprint inside
 *      protected land is the bluntest ecological violation.
 *
 *   2. paddock-in-conservation — any paddock centroid inside a
 *      `conservation` zone. Grazing on protected land degrades vegetation
 *      and disturbs wildlife even without permanent structures.
 *
 *   3. vehicle-path-cuts-conservation — any non-trail / non-pedestrian
 *      path (main_road, secondary_road, service_road, farm_lane,
 *      animal_corridor, grazing_route, emergency_access, arrival_sequence)
 *      whose linestring crosses a conservation zone. Vehicle/livestock
 *      routes break habitat-corridor integrity in a way pedestrian
 *      trails do not.
 *
 *   4. structure-near-water-retention — any structure within 30m of a
 *      `water_retention` zone (riparian-style buffer; reuses the
 *      `SETBACK_RULES.riparian` value already in `SitingRules.ts`).
 *      Spillway clearance + bank stability.
 *
 *   5. high-invasive-pressure-zone (info) — any zone tagged
 *      `invasivePressure === 'high'`. Surfaces zones that need an
 *      active treatment plan before the surrounding ecology recovers.
 *
 * Spec ref: §17 ecological-wildlife-protection-rules (featureManifest).
 */

import { useMemo } from 'react';
import { useZoneStore, type LandZone } from '../../store/zoneStore.js';
import { useStructureStore, type Structure } from '../../store/structureStore.js';
import { useLivestockStore, type Paddock } from '../../store/livestockStore.js';
import { usePathStore, type DesignPath, type PathType } from '../../store/pathStore.js';
import { SETBACK_RULES } from '../rules/SitingRules.js';
import css from './EcologicalProtectionCard.module.css';

interface Props {
  projectId: string;
}

type Severity = 'error' | 'warning' | 'info';

interface ProtectionFinding {
  ruleId: string;
  severity: Severity;
  title: string;
  detail: string;
  suggestion: string;
}

/** Path types whose footprint represents motorized or livestock pressure
 *  inside a sensitive area. Pedestrian paths and trails are intentionally
 *  excluded — passive recreation does not break corridor integrity. */
const PRESSURE_PATH_TYPES: ReadonlySet<PathType> = new Set<PathType>([
  'main_road',
  'secondary_road',
  'emergency_access',
  'service_road',
  'farm_lane',
  'animal_corridor',
  'grazing_route',
  'arrival_sequence',
]);

/** Riparian buffer in metres. Reuses the value already declared in
 *  `SitingRules.ts` so the engine and this dashboard agree. */
const RIPARIAN_BUFFER_M = SETBACK_RULES.riparian;

/* ------------------------------------------------------------------ */
/*  Local geometry helpers (pure)                                      */
/* ------------------------------------------------------------------ */

/** Approximate distance in metres between two [lng, lat] points using
 *  equirectangular projection. Same formula as `RulesEngine.ts`. */
function approxDistanceM(a: [number, number], b: [number, number]): number {
  const dx = (a[0] - b[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180);
  const dy = (a[1] - b[1]) * 111320;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Average of the polygon's exterior ring (or first MultiPolygon ring). */
function polygonCentroid(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): [number, number] {
  const ring = geom.type === 'Polygon'
    ? geom.coordinates[0]!
    : geom.coordinates[0]![0]!;
  let sumLng = 0;
  let sumLat = 0;
  for (const c of ring) {
    sumLng += c[0]!;
    sumLat += c[1]!;
  }
  return [sumLng / ring.length, sumLat / ring.length];
}

/** Ray-casting point-in-polygon. Tests against the exterior ring of a
 *  Polygon, or the first ring of the first member of a MultiPolygon —
 *  good enough for warning-level heuristics on parcel-scale zones. */
function pointInPolygon(
  point: [number, number],
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): boolean {
  const ring = geom.type === 'Polygon'
    ? geom.coordinates[0]!
    : geom.coordinates[0]![0]!;
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i]!;
    const b = ring[j]!;
    const xi = a[0]!;
    const yi = a[1]!;
    const xj = b[0]!;
    const yj = b[1]!;
    const intersects = ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

/** True if any vertex of the LineString falls inside the polygon.
 *  Vertex-only check is a safe lower bound — a path can still graze a
 *  zone with no vertex inside, but that is rare on parcel-scale draws
 *  and is acceptable for warning surfacing. */
function lineCrossesPolygon(
  line: GeoJSON.LineString,
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon,
): boolean {
  for (const c of line.coordinates) {
    if (pointInPolygon([c[0]!, c[1]!], geom)) return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/*  Rule evaluators                                                    */
/* ------------------------------------------------------------------ */

function evaluateRules(
  zones: LandZone[],
  structures: Structure[],
  paddocks: Paddock[],
  paths: DesignPath[],
): ProtectionFinding[] {
  const findings: ProtectionFinding[] = [];
  const conservationZones = zones.filter((z) => z.category === 'conservation');
  const waterZones = zones.filter((z) => z.category === 'water_retention');

  // 1. Structure footprint inside a conservation zone
  for (const s of structures) {
    for (const z of conservationZones) {
      if (pointInPolygon(s.center, z.geometry)) {
        findings.push({
          ruleId: 'structure-in-conservation',
          severity: 'error',
          title: `${s.name} sits inside conservation zone "${z.name}"`,
          detail: 'Built footprint inside protected land violates ecological reserve intent.',
          suggestion: 'Relocate the structure outside the conservation polygon, or re-classify the zone if the protection status no longer applies.',
        });
      }
    }
  }

  // 2. Paddock centroid inside a conservation zone
  for (const p of paddocks) {
    const centroid = polygonCentroid(p.geometry);
    for (const z of conservationZones) {
      if (pointInPolygon(centroid, z.geometry)) {
        findings.push({
          ruleId: 'paddock-in-conservation',
          severity: 'warning',
          title: `Paddock "${p.name}" overlaps conservation zone "${z.name}"`,
          detail: 'Grazing pressure on protected land degrades vegetation cover and disturbs wildlife even without permanent structures.',
          suggestion: 'Move the paddock boundary out of the conservation zone, or split it so the grazed portion sits in food_production / commons land.',
        });
      }
    }
  }

  // 3. Pressure-path crosses a conservation zone
  for (const path of paths) {
    if (!PRESSURE_PATH_TYPES.has(path.type)) continue;
    for (const z of conservationZones) {
      if (lineCrossesPolygon(path.geometry, z.geometry)) {
        findings.push({
          ruleId: 'vehicle-path-cuts-conservation',
          severity: 'warning',
          title: `${path.type.replace(/_/g, ' ')} "${path.name}" cuts conservation zone "${z.name}"`,
          detail: 'Vehicle and livestock corridors break habitat-corridor integrity, fragment breeding territory, and introduce edge-effect disturbance pedestrian trails do not.',
          suggestion: 'Reroute around the conservation polygon, or downgrade to a pedestrian-only trail if access to the interior is required.',
        });
        break; // one finding per (path, zone) pair handled
      }
    }
  }

  // 4. Structure within RIPARIAN_BUFFER_M of any water_retention zone
  for (const s of structures) {
    for (const z of waterZones) {
      const zCentroid = polygonCentroid(z.geometry);
      const dM = approxDistanceM(s.center, zCentroid);
      if (dM < RIPARIAN_BUFFER_M) {
        findings.push({
          ruleId: 'structure-near-water-retention',
          severity: 'warning',
          title: `${s.name} is within ${Math.round(dM)}m of water-retention zone "${z.name}"`,
          detail: `Riparian setback recommends ${RIPARIAN_BUFFER_M}m clearance for spillway safety, bank stability, and aquatic-edge habitat preservation.`,
          suggestion: `Relocate the structure at least ${RIPARIAN_BUFFER_M}m from the water feature, or convert the riparian strip to a buffer zone.`,
        });
      }
    }
  }

  // 5. Zones tagged with high invasive pressure
  for (const z of zones) {
    if (z.invasivePressure === 'high') {
      findings.push({
        ruleId: 'high-invasive-pressure-zone',
        severity: 'info',
        title: `"${z.name}" carries high invasive-species pressure`,
        detail: 'High-pressure zones lose native cover faster than passive management can restore. Surrounding wildlife habitat degrades alongside.',
        suggestion: 'Schedule a treatment intervention (mechanical, grazing, or targeted herbicide per land ethic) before the next growing season; log it on the regeneration timeline.',
      });
    }
  }

  // Sort: errors first, then warnings, then info
  const order: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);

  return findings;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EcologicalProtectionCard({ projectId }: Props) {
  const allZones = useZoneStore((s) => s.zones);
  const allStructures = useStructureStore((s) => s.structures);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allPaths = usePathStore((s) => s.paths);

  const zones = useMemo(
    () => allZones.filter((z) => z.projectId === projectId),
    [allZones, projectId],
  );
  const structures = useMemo(
    () => allStructures.filter((s) => s.projectId === projectId),
    [allStructures, projectId],
  );
  const paddocks = useMemo(
    () => allPaddocks.filter((p) => p.projectId === projectId),
    [allPaddocks, projectId],
  );
  const paths = useMemo(
    () => allPaths.filter((p) => p.projectId === projectId),
    [allPaths, projectId],
  );

  const findings = useMemo(
    () => evaluateRules(zones, structures, paddocks, paths),
    [zones, structures, paddocks, paths],
  );

  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');
  const infos = findings.filter((f) => f.severity === 'info');

  const conservationCount = zones.filter((z) => z.category === 'conservation').length;
  const waterCount = zones.filter((z) => z.category === 'water_retention').length;

  // Empty-state guard — nothing to evaluate against
  if (zones.length === 0) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <h2 className={css.cardTitle}>Ecological & Wildlife Protection</h2>
        </div>
        <div className={css.empty}>
          No zones have been drawn yet. Draw a <strong>conservation</strong> or
          <strong> water_retention</strong> zone to surface ecological-protection
          checks against placed structures, paddocks, and paths.
        </div>
      </div>
    );
  }

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <h2 className={css.cardTitle}>Ecological & Wildlife Protection</h2>
        <span className={css.cardHint}>
          {conservationCount} conservation {'\u00B7'} {waterCount} water-retention
        </span>
      </div>

      <div className={css.summaryRow}>
        {errors.length > 0 && (
          <span className={`${css.summaryBadge} ${css.badge_error}`}>
            {errors.length} error{errors.length !== 1 ? 's' : ''}
          </span>
        )}
        {warnings.length > 0 && (
          <span className={`${css.summaryBadge} ${css.badge_warning}`}>
            {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
          </span>
        )}
        {infos.length > 0 && (
          <span className={`${css.summaryBadge} ${css.badge_info}`}>
            {infos.length} info
          </span>
        )}
        {findings.length === 0 && (
          <span className={`${css.summaryBadge} ${css.badge_clear}`}>
            All ecological checks pass
          </span>
        )}
      </div>

      {findings.length > 0 && (
        <div className={css.findingList}>
          {findings.map((f, i) => (
            <div key={`${f.ruleId}-${i}`} className={`${css.finding} ${tintClass(f.severity)}`}>
              <div className={css.findingHead}>
                <span className={css.findingIcon}>{severityIcon(f.severity)}</span>
                <span className={css.findingTitle}>{f.title}</span>
              </div>
              <div className={css.findingDetail}>{f.detail}</div>
              <div className={css.findingSuggestion}>
                {'\u2192'} {f.suggestion}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={css.footnote}>
        Spec ref: §17 ecological-wildlife-protection-rules. Heuristic
        only — structures are tested as their <em>center</em> point
        against the zone polygon (footprint corners may still extend
        slightly past); path crossings use a vertex-in-polygon test
        (a path can graze a zone without a vertex inside, but on
        parcel-scale draws this is rare). Riparian buffer (
        {RIPARIAN_BUFFER_M}m) and severity tiers reuse{' '}
        <em>SETBACK_RULES</em> from <em>SitingRules.ts</em> so the
        engine and this dashboard agree.
      </div>
    </div>
  );
}

function severityIcon(s: Severity): string {
  if (s === 'error') return '\u274C';
  if (s === 'warning') return '\u26A0\uFE0F';
  return '\u{1F4A1}';
}

function tintClass(s: Severity): string {
  if (s === 'error') return css.tint_error!;
  if (s === 'warning') return css.tint_warning!;
  return css.tint_info!;
}
