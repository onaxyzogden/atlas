/**
 * silvopastureHosts.test — covers the resolution rules per the plan:
 *   - spatial overlap inclusion (polygon + point)
 *   - pin override (pin wins, geometry irrelevant)
 *   - pin to other host excludes from spatial home
 *   - multi-host overlap → sharedWith > 0
 *   - encode/decode round-trip
 *   - empty-project case
 */

import { describe, expect, it } from 'vitest';
import {
  encodeHostId,
  decodeHostId,
  resolveSilvopastureHosts,
  resolveMembers,
  findHostIdsForPolygon,
  findHostIdsForPoint,
} from '../silvopastureHosts.js';
import type { CropArea } from '../../../store/cropStore.js';
import type { DesignElement } from '../../../store/designElementsStore.js';
import type { Paddock } from '../../../store/livestockStore.js';
import type { Guild } from '../../../store/polycultureStore.js';

const PROJECT_ID = 'proj-1';

/** Rectangular polygon helper, [W, S, E, N] in degrees. */
function rect(w: number, s: number, e: number, n: number): GeoJSON.Polygon {
  return {
    type: 'Polygon',
    coordinates: [[
      [w, s],
      [e, s],
      [e, n],
      [w, n],
      [w, s],
    ]],
  };
}

/** Big silvopasture from cropStore covering (-10..10, -10..10). */
function silvopastureCrop(id: string, geom: GeoJSON.Polygon): CropArea {
  return {
    id,
    projectId: PROJECT_ID,
    name: `Silvo ${id}`,
    type: 'silvopasture',
    color: '#6b9b6b',
    geometry: geom,
    areaM2: 1,
    species: [],
    treeSpacingM: null,
    rowSpacingM: null,
    waterDemand: 'medium',
    irrigationType: 'rain_fed',
    phase: '',
    notes: '',
    createdAt: 'now',
    updatedAt: 'now',
  } as unknown as CropArea;
}

function silvopastureDesign(id: string, geom: GeoJSON.Polygon): DesignElement {
  return {
    id,
    category: 'agroforestry',
    kind: 'silvopasture',
    geometry: geom,
    label: `Silvo ${id}`,
    createdAt: 'now',
  } as unknown as DesignElement;
}

function paddockOf(
  id: string,
  geom: GeoJSON.Polygon,
  pin?: string,
): Paddock {
  return {
    id,
    projectId: PROJECT_ID,
    name: `Pad ${id}`,
    geometry: geom,
    areaM2: 1,
    species: ['sheep'],
    fencing: 'electric',
    stockingDensity: null,
    grazingCellGroup: null,
    guestSafeBuffer: false,
    waterPointNote: '',
    shelterNote: '',
    phase: '',
    notes: '',
    color: '#c8a97a',
    silvopastureId: pin,
    createdAt: 'now',
    updatedAt: 'now',
  } as unknown as Paddock;
}

function guildOf(
  id: string,
  center: [number, number],
  pin?: string,
): Guild {
  return {
    id,
    projectId: PROJECT_ID,
    name: `Guild ${id}`,
    anchorSpeciesId: '',
    members: [],
    center,
    centroidUv: [0.5, 0.5],
    silvopastureId: pin,
    createdAt: 'now',
  } as unknown as Guild;
}

describe('encodeHostId / decodeHostId', () => {
  it('round-trips both source kinds', () => {
    expect(decodeHostId(encodeHostId('design-element', 'abc'))).toEqual({
      source: 'design-element',
      rawId: 'abc',
    });
    expect(decodeHostId(encodeHostId('crop-area', 'xyz-1'))).toEqual({
      source: 'crop-area',
      rawId: 'xyz-1',
    });
  });

  it('rejects malformed encoded ids', () => {
    expect(decodeHostId('')).toBeNull();
    expect(decodeHostId('design-element')).toBeNull();
    expect(decodeHostId('design-element:')).toBeNull();
    expect(decodeHostId(':abc')).toBeNull();
    expect(decodeHostId('unknown-source:abc')).toBeNull();
  });
});

describe('resolveSilvopastureHosts', () => {
  it('returns empty for empty project', () => {
    expect(resolveSilvopastureHosts(PROJECT_ID, [], [])).toEqual([]);
  });

  it('merges hosts from both stores and filters by projectId', () => {
    const cropHost = silvopastureCrop('c1', rect(0, 0, 10, 10));
    const otherProject = { ...cropHost, id: 'c2', projectId: 'other' };
    const designHost = silvopastureDesign('d1', rect(-5, -5, 5, 5));
    const designOrchard = silvopastureDesign('d2', rect(0, 0, 1, 1));
    designOrchard.kind = 'orchard';

    const hosts = resolveSilvopastureHosts(
      PROJECT_ID,
      [cropHost, otherProject as unknown as CropArea],
      [designHost, designOrchard],
    );
    expect(hosts.map((h) => h.id).sort()).toEqual([
      'crop-area:c1',
      'design-element:d1',
    ]);
  });
});

describe('resolveMembers — spatial overlap', () => {
  it('includes a paddock whose polygon overlaps the host', () => {
    const host = silvopastureCrop('c1', rect(0, 0, 10, 10));
    const inside = paddockOf('p1', rect(1, 1, 3, 3));
    const outside = paddockOf('p2', rect(20, 20, 22, 22));
    const hosts = resolveSilvopastureHosts(PROJECT_ID, [host], []);
    const members = resolveMembers(
      hosts[0]!,
      { cropAreas: [host], designElements: [], paddocks: [inside, outside], guilds: [] },
      hosts,
    );
    expect(members.paddocks.map((m) => m.entity.id)).toEqual(['p1']);
    expect(members.paddocks[0]).toMatchObject({ pinned: false, sharedWith: 0 });
  });

  it('includes a guild whose center sits inside the host', () => {
    const host = silvopastureCrop('c1', rect(0, 0, 10, 10));
    const inside = guildOf('g1', [5, 5]);
    const outside = guildOf('g2', [50, 50]);
    const hosts = resolveSilvopastureHosts(PROJECT_ID, [host], []);
    const members = resolveMembers(
      hosts[0]!,
      { cropAreas: [host], designElements: [], paddocks: [], guilds: [inside, outside] },
      hosts,
    );
    expect(members.guilds.map((m) => m.entity.id)).toEqual(['g1']);
  });
});

describe('resolveMembers — pin override', () => {
  it('pin to this host wins even when geometry is outside', () => {
    const host = silvopastureCrop('c1', rect(0, 0, 10, 10));
    const pinned = paddockOf('p1', rect(20, 20, 22, 22), 'crop-area:c1');
    const hosts = resolveSilvopastureHosts(PROJECT_ID, [host], []);
    const members = resolveMembers(
      hosts[0]!,
      { cropAreas: [host], designElements: [], paddocks: [pinned], guilds: [] },
      hosts,
    );
    expect(members.paddocks).toHaveLength(1);
    expect(members.paddocks[0]!.pinned).toBe(true);
  });

  it('pin to other host excludes the member from its spatial home', () => {
    const hostA = silvopastureCrop('a', rect(0, 0, 10, 10));
    const hostB = silvopastureCrop('b', rect(100, 100, 110, 110));
    // Paddock geometry overlaps hostA, but pinned to hostB.
    const paddock = paddockOf('p1', rect(1, 1, 3, 3), 'crop-area:b');
    const hosts = resolveSilvopastureHosts(PROJECT_ID, [hostA, hostB], []);
    const byA = resolveMembers(
      hosts.find((h) => h.rawId === 'a')!,
      { cropAreas: [hostA, hostB], designElements: [], paddocks: [paddock], guilds: [] },
      hosts,
    );
    expect(byA.paddocks).toHaveLength(0);
    const byB = resolveMembers(
      hosts.find((h) => h.rawId === 'b')!,
      { cropAreas: [hostA, hostB], designElements: [], paddocks: [paddock], guilds: [] },
      hosts,
    );
    expect(byB.paddocks).toHaveLength(1);
    expect(byB.paddocks[0]!.pinned).toBe(true);
  });
});

describe('resolveMembers — sharedWith', () => {
  it('reports sharedWith > 0 when overlapping multiple hosts pinless', () => {
    const hostA = silvopastureCrop('a', rect(0, 0, 10, 10));
    const hostB = silvopastureCrop('b', rect(5, 5, 15, 15));
    const paddock = paddockOf('p1', rect(6, 6, 8, 8));
    const hosts = resolveSilvopastureHosts(PROJECT_ID, [hostA, hostB], []);
    const byA = resolveMembers(
      hosts.find((h) => h.rawId === 'a')!,
      { cropAreas: [hostA, hostB], designElements: [], paddocks: [paddock], guilds: [] },
      hosts,
    );
    expect(byA.paddocks).toHaveLength(1);
    expect(byA.paddocks[0]!.sharedWith).toBe(1);
  });
});

describe('findHostIdsForPolygon / findHostIdsForPoint', () => {
  it('returns the encoded ids of overlapping hosts', () => {
    const host = silvopastureCrop('c1', rect(0, 0, 10, 10));
    const hosts = resolveSilvopastureHosts(PROJECT_ID, [host], []);
    expect(findHostIdsForPolygon(rect(1, 1, 2, 2), hosts)).toEqual(['crop-area:c1']);
    expect(findHostIdsForPolygon(rect(50, 50, 60, 60), hosts)).toEqual([]);
    expect(findHostIdsForPoint([5, 5], hosts)).toEqual(['crop-area:c1']);
    expect(findHostIdsForPoint([50, 50], hosts)).toEqual([]);
  });
});
