/**
 * silvopastureHosts — pure selector module that resolves which orchards,
 * guilds, and paddocks belong to each silvopasture polygon on a parcel.
 *
 * Silvopasture is a host pattern: trees + grazing + understory. Today
 * Atlas draws silvopasture as a free-standing polygon in two stores
 * (`designElementsStore` kind='silvopasture' and the legacy
 * `cropStore` type='silvopasture') with no structural pointer from
 * members to host. This module restores that relationship at read-time.
 *
 * Membership is **hybrid**:
 *   1. Explicit pin via `member.silvopastureId === encodeHostId(...)`
 *      wins absolutely — the member belongs to that host and to no
 *      other, regardless of geometry.
 *   2. Absent pin, spatial overlap with the host polygon decides:
 *      polygons via `turf.booleanIntersects`, point-anchored guilds
 *      via `turf.booleanPointInPolygon`.
 *   3. A pinless member overlapping multiple hosts appears under each
 *      with `sharedWith` set to (count - 1) so the card can flag it.
 *
 * Host IDs cross store boundaries, so we namespace them
 * `<source>:<rawId>` — see `encodeHostId` / `decodeHostId`.
 */

import * as turf from '@turf/turf';
import type { CropArea } from '../../store/cropStore.js';
import type { DesignElement } from '../../store/designElementsStore.js';
import type { Paddock } from '../../store/livestockStore.js';
import type { Guild } from '../../store/polycultureStore.js';

export type SilvopastureHostSource = 'design-element' | 'crop-area';

export function encodeHostId(source: SilvopastureHostSource, rawId: string): string {
  return `${source}:${rawId}`;
}

export function decodeHostId(
  encoded: string,
): { source: SilvopastureHostSource; rawId: string } | null {
  const idx = encoded.indexOf(':');
  if (idx <= 0) return null;
  const source = encoded.slice(0, idx);
  const rawId = encoded.slice(idx + 1);
  if (source !== 'design-element' && source !== 'crop-area') return null;
  if (rawId.length === 0) return null;
  return { source, rawId };
}

export interface SilvopastureHost {
  /** Encoded `<source>:<rawId>` — use as React key and for pin matching. */
  id: string;
  source: SilvopastureHostSource;
  rawId: string;
  /** Steward-visible label. */
  name: string;
  geometry: GeoJSON.Polygon;
}

export interface SilvopastureMember<T> {
  entity: T;
  /** True when `entity.silvopastureId === host.id`. */
  pinned: boolean;
  /** Number of *other* hosts this member also overlaps with (pin-free
   *  members only). 0 when the member has a single home. */
  sharedWith: number;
}

export interface SilvopastureMembers {
  orchardsFromCrops: SilvopastureMember<CropArea>[];
  orchardsFromDesign: SilvopastureMember<DesignElement>[];
  paddocks: SilvopastureMember<Paddock>[];
  guilds: SilvopastureMember<Guild>[];
}

/**
 * Resolve every silvopasture host on the parcel from both stores.
 * The same `projectId` filter is applied across all sources.
 */
export function resolveSilvopastureHosts(
  projectId: string,
  cropAreas: CropArea[],
  designElements: DesignElement[],
): SilvopastureHost[] {
  const hosts: SilvopastureHost[] = [];
  for (const c of cropAreas) {
    if (c.projectId !== projectId) continue;
    if (c.type !== 'silvopasture') continue;
    hosts.push({
      id: encodeHostId('crop-area', c.id),
      source: 'crop-area',
      rawId: c.id,
      name: c.name || 'Silvopasture',
      geometry: c.geometry,
    });
  }
  for (const el of designElements) {
    if (el.kind !== 'silvopasture') continue;
    if (el.geometry.type !== 'Polygon') continue;
    hosts.push({
      id: encodeHostId('design-element', el.id),
      source: 'design-element',
      rawId: el.id,
      name: el.label || 'Silvopasture',
      geometry: el.geometry,
    });
  }
  return hosts;
}

/**
 * Find the encoded ids of every host whose polygon contains the given
 * polygon (booleanIntersects). Used by draw tools to auto-pin a freshly
 * drawn orchard/paddock to its enclosing silvopasture.
 */
export function findHostIdsForPolygon(
  geom: GeoJSON.Polygon,
  hosts: SilvopastureHost[],
): string[] {
  const out: string[] = [];
  const target = turf.feature(geom);
  for (const h of hosts) {
    try {
      if (turf.booleanIntersects(target, turf.feature(h.geometry))) {
        out.push(h.id);
      }
    } catch {
      /* degenerate geometry — skip */
    }
  }
  return out;
}

/**
 * Find every host whose polygon contains the given point. Used for
 * guild auto-pinning (guilds anchor on a point, not a polygon).
 */
export function findHostIdsForPoint(
  point: [number, number],
  hosts: SilvopastureHost[],
): string[] {
  const out: string[] = [];
  const pt = turf.point(point);
  for (const h of hosts) {
    try {
      if (turf.booleanPointInPolygon(pt, turf.feature(h.geometry))) {
        out.push(h.id);
      }
    } catch {
      /* degenerate geometry — skip */
    }
  }
  return out;
}

interface ResolveMembersArgs {
  cropAreas: CropArea[];
  designElements: DesignElement[];
  paddocks: Paddock[];
  guilds: Guild[];
}

function polygonOverlapsHost(
  geom: GeoJSON.Polygon,
  host: SilvopastureHost,
): boolean {
  try {
    return turf.booleanIntersects(
      turf.feature(geom),
      turf.feature(host.geometry),
    );
  } catch {
    return false;
  }
}

function pointInHost(point: [number, number], host: SilvopastureHost): boolean {
  try {
    return turf.booleanPointInPolygon(
      turf.point(point),
      turf.feature(host.geometry),
    );
  } catch {
    return false;
  }
}

/**
 * Resolve the members (orchards, paddocks, guilds) of a single host.
 *
 * Members are passed in pre-filtered by `projectId` — the caller already
 * scoped them via the existing project-scoped selectors. Both polygon
 * `orchard` flavours (cropStore `type==='orchard'` and designElements
 * `kind==='orchard'`) are surfaced in distinct buckets so the card can
 * label each source.
 */
export function resolveMembers(
  host: SilvopastureHost,
  all: ResolveMembersArgs,
  allHosts: SilvopastureHost[],
): SilvopastureMembers {
  return {
    orchardsFromCrops: pickPolygonMembers(
      host,
      allHosts,
      all.cropAreas.filter((c) => c.type === 'orchard'),
      (c) => c.geometry,
      (c) => c.silvopastureId,
    ),
    orchardsFromDesign: pickPolygonMembers(
      host,
      allHosts,
      all.designElements.filter(
        (el) => el.kind === 'orchard' && el.geometry.type === 'Polygon',
      ),
      (el) => el.geometry as GeoJSON.Polygon,
      (el) => el.silvopastureId,
    ),
    paddocks: pickPolygonMembers(
      host,
      allHosts,
      all.paddocks,
      (p) => p.geometry,
      (p) => p.silvopastureId,
    ),
    guilds: pickPointMembers(
      host,
      allHosts,
      all.guilds,
      (g) => g.center ?? null,
      (g) => g.silvopastureId,
    ),
  };
}

function pickPolygonMembers<T>(
  host: SilvopastureHost,
  allHosts: SilvopastureHost[],
  entities: T[],
  getGeom: (e: T) => GeoJSON.Polygon,
  getPin: (e: T) => string | undefined,
): SilvopastureMember<T>[] {
  const out: SilvopastureMember<T>[] = [];
  for (const e of entities) {
    const pin = getPin(e);
    if (pin) {
      if (pin === host.id) {
        out.push({ entity: e, pinned: true, sharedWith: 0 });
      }
      continue;
    }
    const geom = getGeom(e);
    if (!polygonOverlapsHost(geom, host)) continue;
    let sharedWith = 0;
    for (const h2 of allHosts) {
      if (h2.id === host.id) continue;
      if (polygonOverlapsHost(geom, h2)) sharedWith += 1;
    }
    out.push({ entity: e, pinned: false, sharedWith });
  }
  return out;
}

function pickPointMembers<T>(
  host: SilvopastureHost,
  allHosts: SilvopastureHost[],
  entities: T[],
  getCenter: (e: T) => [number, number] | null,
  getPin: (e: T) => string | undefined,
): SilvopastureMember<T>[] {
  const out: SilvopastureMember<T>[] = [];
  for (const e of entities) {
    const pin = getPin(e);
    if (pin) {
      if (pin === host.id) {
        out.push({ entity: e, pinned: true, sharedWith: 0 });
      }
      continue;
    }
    const c = getCenter(e);
    if (!c) continue;
    if (!pointInHost(c, host)) continue;
    let sharedWith = 0;
    for (const h2 of allHosts) {
      if (h2.id === host.id) continue;
      if (pointInHost(c, h2)) sharedWith += 1;
    }
    out.push({ entity: e, pinned: false, sharedWith });
  }
  return out;
}
