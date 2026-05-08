// @vitest-environment happy-dom
/**
 * annotationExport — verifies that the OBSERVE export library can collect
 * project records from every namespace store and serialise the result as
 * GeoJSON, KML, and multi-section CSV without throwing. Each spec seeds a
 * minimal record per kind directly into the relevant store via `setState`,
 * filters by a project id, and asserts the cross-format invariants.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as turf from '@turf/turf';
import {
  collectProjectAnnotations,
  exportFilename,
  toCSV,
  toGeoJSON,
  toKML,
} from '../annotationExport.js';
import {
  DEFAULT_SECTOR_RADIUS_M,
  getSectorRadiusM,
} from '../sectorRadius.js';
import { useHumanContextStore } from '../../../../store/humanContextStore.js';
import { useTopographyStore } from '../../../../store/topographyStore.js';
import { useExternalForcesStore } from '../../../../store/externalForcesStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import { useEcologyStore } from '../../../../store/ecologyStore.js';
import { useSwotStore } from '../../../../store/swotStore.js';
import { useSoilSampleStore } from '../../../../store/soilSampleStore.js';
import { useProjectStore } from '../../../../store/projectStore.js';

const PROJECT = 'export-test-project';
const OTHER = 'other-project';

function reset(): void {
  useHumanContextStore.setState({
    neighbours: [],
    households: [],
    accessRoads: [],
    permacultureZones: [],
  });
  useTopographyStore.setState({
    contours: [],
    highPoints: [],
    drainageLines: [],
    transects: [],
  });
  useExternalForcesStore.setState({ hazards: [], sectors: [] });
  useWaterSystemsStore.setState({
    earthworks: [],
    storageInfra: [],
    watercourses: [],
  });
  useEcologyStore.setState({ ecology: [], ecologyZones: [] });
  useSwotStore.setState({ swot: [] });
  useSoilSampleStore.setState({ samples: [] });
  useProjectStore.setState({ projects: [] });
}

beforeEach(reset);
afterEach(reset);

describe('annotationExport — collection', () => {
  it('only returns records belonging to the requested project', () => {
    useHumanContextStore.setState({
      neighbours: [
        // @ts-expect-error - minimal seed shape for test
        { id: 'n-here', projectId: PROJECT, position: [-78.2, 44.5], label: 'A' },
        // @ts-expect-error - minimal seed shape for test
        { id: 'n-other', projectId: OTHER, position: [-78.3, 44.6], label: 'B' },
      ],
      households: [],
      accessRoads: [],
      permacultureZones: [],
    });
    const collected = collectProjectAnnotations(PROJECT);
    expect(collected.totalCount).toBe(1);
    expect(collected.byKind.neighbour?.[0]?.id).toBe('n-here');
  });

  it('collects across all seven namespace stores', () => {
    // One record per store, all under PROJECT.
    useHumanContextStore.setState({
      // @ts-expect-error - minimal seed shapes
      neighbours: [{ id: 'h1', projectId: PROJECT, position: [-78.2, 44.5] }],
      // @ts-expect-error
      households: [{ id: 'hh1', projectId: PROJECT, position: [-78.21, 44.51] }],
      accessRoads: [],
      permacultureZones: [],
    });
    useTopographyStore.setState({
      contours: [],
      // @ts-expect-error
      highPoints: [{ id: 'hp1', projectId: PROJECT, position: [-78.22, 44.52] }],
      drainageLines: [],
      transects: [],
    });
    useExternalForcesStore.setState({
      // @ts-expect-error
      hazards: [{ id: 'hz1', projectId: PROJECT, type: 'flood' }],
      sectors: [],
    });
    useWaterSystemsStore.setState({
      earthworks: [],
      // @ts-expect-error
      storageInfra: [{ id: 'si1', projectId: PROJECT, center: [-78.23, 44.53], capacityL: 2000 }],
      watercourses: [],
    });
    useEcologyStore.setState({
      // @ts-expect-error
      ecology: [{ id: 'eo1', projectId: PROJECT, species: 'oak' }],
      ecologyZones: [],
    });
    useSwotStore.setState({
      // @ts-expect-error
      swot: [{ id: 'sw1', projectId: PROJECT, bucket: 'S', position: [-78.24, 44.54], body: 'good soil' }],
    });
    useSoilSampleStore.setState({
      // @ts-expect-error
      samples: [{ id: 'ss1', projectId: PROJECT, location: [-78.25, 44.55] }],
    });

    const collected = collectProjectAnnotations(PROJECT);
    // 8 records: neighbour, household, highPoint, hazard, storageInfra,
    // ecologyObservation, swot, soilSample.
    expect(collected.totalCount).toBe(8);
    expect(collected.byKind.neighbour?.length).toBe(1);
    expect(collected.byKind.household?.length).toBe(1);
    expect(collected.byKind.highPoint?.length).toBe(1);
    expect(collected.byKind.hazard?.length).toBe(1);
    expect(collected.byKind.storageInfra?.length).toBe(1);
    expect(collected.byKind.ecologyObservation?.length).toBe(1);
    expect(collected.byKind.swot?.length).toBe(1);
    expect(collected.byKind.soilSample?.length).toBe(1);
  });
});

describe('annotationExport — serialisation', () => {
  beforeEach(() => {
    useHumanContextStore.setState({
      // @ts-expect-error
      neighbours: [{ id: 'n1', projectId: PROJECT, position: [-78.2, 44.5], label: 'Neighbour A' }],
      households: [],
      accessRoads: [],
      permacultureZones: [],
    });
    useTopographyStore.setState({
      contours: [],
      // @ts-expect-error
      highPoints: [{ id: 'hp1', projectId: PROJECT, position: [-78.22, 44.52], label: 'Hilltop' }],
      drainageLines: [],
      transects: [],
    });
    useSoilSampleStore.setState({
      // @ts-expect-error
      samples: [{ id: 'ss1', projectId: PROJECT, location: [-78.25, 44.55], notes: 'sandy loam' }],
    });
    useEcologyStore.setState({
      // No geometry — should be CSV-only.
      // @ts-expect-error
      ecology: [{ id: 'eo1', projectId: PROJECT, species: 'oak' }],
      ecologyZones: [],
    });
  });

  it('toGeoJSON emits one Feature per record with geometry', () => {
    const fc = toGeoJSON(collectProjectAnnotations(PROJECT));
    expect(fc.type).toBe('FeatureCollection');
    // 3 features: neighbour, highPoint, soilSample (ecology observation skipped).
    expect(fc.features.length).toBe(3);
    for (const f of fc.features) {
      expect(f.geometry).toBeTruthy();
      expect(f.properties).toHaveProperty('kind');
    }
  });

  it('toKML produces a well-formed KML 2.2 document', () => {
    const xml = toKML(collectProjectAnnotations(PROJECT));
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(xml).toContain('<kml xmlns="http://www.opengis.net/kml/2.2">');
    expect(xml).toContain('<Document>');
    // At least one Placemark and one Folder.
    expect(xml).toMatch(/<Folder>/);
    expect(xml).toMatch(/<Placemark/);
    expect(xml).toContain('</kml>');
  });

  it('toCSV produces a multi-section CSV with one block per kind', () => {
    const csv = toCSV(collectProjectAnnotations(PROJECT));
    expect(csv).toContain('# atlas-observe-export');
    // Each emitted kind gets its own section header.
    expect(csv).toContain('# kind: neighbour');
    expect(csv).toContain('# kind: highPoint');
    expect(csv).toContain('# kind: soilSample');
    expect(csv).toContain('# kind: ecologyObservation');
    // CSV has a geometryWkt column.
    expect(csv).toContain('geometryWkt');
    // Point WKT for the neighbour record.
    expect(csv).toContain('POINT(-78.2 44.5)');
  });
});

describe('annotationExport — sector wedge synthesis', () => {
  it('synthesises a Polygon for sectors when a homestead anchor exists', () => {
    useHumanContextStore.setState({
      // @ts-expect-error - minimal seed shape
      households: [{ id: 'hh1', projectId: PROJECT, position: [-78.2, 44.5] }],
      neighbours: [],
      accessRoads: [],
      permacultureZones: [],
    });
    useExternalForcesStore.setState({
      hazards: [],
      sectors: [
        {
          id: 'sec1',
          projectId: PROJECT,
          type: 'sun_summer',
          bearingDeg: 180,
          arcDeg: 60,
        },
      ],
    });

    const collected = collectProjectAnnotations(PROJECT);
    const fc = toGeoJSON(collected);
    const sectorFeatures = fc.features.filter(
      (f) => (f.properties as { kind?: string } | null)?.kind === 'sector',
    );
    expect(sectorFeatures.length).toBe(1);
    const geom = sectorFeatures[0]!.geometry as GeoJSON.Polygon;
    expect(geom.type).toBe('Polygon');
    const ring = geom.coordinates[0]!;
    // Closed ring + apex + arc steps → comfortably more than 4 vertices.
    expect(ring.length).toBeGreaterThan(4);
    const first = ring[0]!;
    const last = ring[ring.length - 1]!;
    expect(first[0]).toBe(last[0]);
    expect(first[1]).toBe(last[1]);

    const csv = toCSV(collected);
    expect(csv).toContain('# kind: sector');
    expect(csv).toContain('POLYGON((');
  });

  it('skips sectors from spatial exports when no anchor is available', () => {
    useExternalForcesStore.setState({
      hazards: [],
      sectors: [
        {
          id: 'sec-orphan',
          projectId: PROJECT,
          type: 'wind_prevailing',
          bearingDeg: 90,
          arcDeg: 45,
        },
      ],
    });

    const collected = collectProjectAnnotations(PROJECT);
    const fc = toGeoJSON(collected);
    const sectorFeatures = fc.features.filter(
      (f) => (f.properties as { kind?: string } | null)?.kind === 'sector',
    );
    expect(sectorFeatures.length).toBe(0);

    const csv = toCSV(collected);
    expect(csv).toContain('# kind: sector');
    // Sector row exists with empty geometryWkt — the trailing column is
    // the WKT cell, so the sector line ends with a comma followed by nothing.
    const sectorLine = csv
      .split('\n')
      .find((l) => l.startsWith('sec-orphan'));
    expect(sectorLine).toBeTruthy();
    expect(sectorLine!.endsWith(',')).toBe(true);
  });
});

describe('annotationExport — configurable sector radius', () => {
  it('honours metadata.sectorRadiusM when synthesising sector wedges', () => {
    const anchor: [number, number] = [-78.2, 44.5];
    useProjectStore.setState({
      projects: [
        // @ts-expect-error - minimal seed shape; passthrough() metadata
        {
          id: PROJECT,
          name: 'Test',
          metadata: { sectorRadiusM: 500 },
          attachments: [],
        },
      ],
    });
    useHumanContextStore.setState({
      // @ts-expect-error - minimal seed shape
      households: [{ id: 'hh1', projectId: PROJECT, position: anchor }],
      neighbours: [],
      accessRoads: [],
      permacultureZones: [],
    });
    useExternalForcesStore.setState({
      hazards: [],
      sectors: [
        {
          id: 'sec1',
          projectId: PROJECT,
          type: 'sun_summer',
          bearingDeg: 180,
          arcDeg: 60,
        },
      ],
    });

    const fc = toGeoJSON(collectProjectAnnotations(PROJECT));
    const sectorFeature = fc.features.find(
      (f) => (f.properties as { kind?: string } | null)?.kind === 'sector',
    );
    expect(sectorFeature).toBeTruthy();
    const ring = (sectorFeature!.geometry as GeoJSON.Polygon).coordinates[0]!;
    // ring[0] is the apex (anchor) — pick a non-apex vertex along the arc.
    const arcVertex = ring[Math.floor(ring.length / 2)]!;
    const distM =
      turf.distance(turf.point(anchor), turf.point(arcVertex), {
        units: 'kilometers',
      }) * 1000;
    expect(distM).toBeGreaterThanOrEqual(480);
    expect(distM).toBeLessThanOrEqual(520);
  });

  it('getSectorRadiusM falls back to DEFAULT_SECTOR_RADIUS_M for invalid values', () => {
    expect(DEFAULT_SECTOR_RADIUS_M).toBe(250);
    // No project at all.
    expect(getSectorRadiusM(null)).toBe(250);
    expect(getSectorRadiusM(undefined)).toBe(250);
    expect(getSectorRadiusM('missing-project')).toBe(250);

    const cases: Array<unknown> = [
      undefined,
      Number.NaN,
      0,
      -100,
      Number.POSITIVE_INFINITY,
      'not a number',
      null,
    ];
    for (const v of cases) {
      useProjectStore.setState({
        projects: [
          // @ts-expect-error - minimal seed shape; passthrough() metadata
          { id: PROJECT, name: 'Test', metadata: { sectorRadiusM: v }, attachments: [] },
        ],
      });
      expect(getSectorRadiusM(PROJECT)).toBe(250);
    }

    // Missing metadata entirely.
    useProjectStore.setState({
      // @ts-expect-error - minimal seed shape
      projects: [{ id: PROJECT, name: 'Test', attachments: [] }],
    });
    expect(getSectorRadiusM(PROJECT)).toBe(250);
  });
});

describe('annotationExport — permacultureZone + ecologyObservation spatial export', () => {
  it('expands a permacultureZone into six concentric Polygon Features in GeoJSON', () => {
    const anchor: [number, number] = [-78.2, 44.5];
    const radii = [10, 20, 30, 40, 50, 60] as const;
    useHumanContextStore.setState({
      neighbours: [],
      households: [],
      accessRoads: [],
      permacultureZones: [
        {
          id: 'pz1',
          projectId: PROJECT,
          ringRadiiM: [...radii] as [number, number, number, number, number, number],
          anchorPoint: anchor,
          createdAt: '2026-05-07T00:00:00Z',
        },
      ],
    });

    const fc = toGeoJSON(collectProjectAnnotations(PROJECT));
    const zoneFeatures = fc.features.filter(
      (f) => (f.properties as { kind?: string } | null)?.kind === 'permacultureZone',
    );
    expect(zoneFeatures.length).toBe(6);
    // Each feature carries its ring index + radius and is a Polygon.
    const seenRings = new Set<number>();
    for (const f of zoneFeatures) {
      expect(f.geometry.type).toBe('Polygon');
      const props = f.properties as { ring?: number; radiusM?: number };
      expect(typeof props.ring).toBe('number');
      expect(radii).toContain(props.radiusM as (typeof radii)[number]);
      seenRings.add(props.ring!);
    }
    expect(seenRings.size).toBe(6);

    // Ring 5 (60 m) outer vertex should be ~60 m from the anchor.
    const ring5 = zoneFeatures.find(
      (f) => (f.properties as { ring?: number }).ring === 5,
    )!;
    const outerRing = (ring5.geometry as GeoJSON.Polygon).coordinates[0]!;
    const vertex = outerRing[Math.floor(outerRing.length / 2)]!;
    const distM =
      turf.distance(turf.point(anchor), turf.point(vertex), {
        units: 'kilometers',
      }) * 1000;
    expect(distM).toBeGreaterThanOrEqual(55);
    expect(distM).toBeLessThanOrEqual(65);
  });

  it('emits a permacultureZone CSV row with MULTIPOLYGON WKT covering all six rings', () => {
    useHumanContextStore.setState({
      neighbours: [],
      households: [],
      accessRoads: [],
      permacultureZones: [
        {
          id: 'pz1',
          projectId: PROJECT,
          ringRadiiM: [10, 20, 30, 40, 50, 60],
          anchorPoint: [-78.2, 44.5],
          createdAt: '2026-05-07T00:00:00Z',
        },
      ],
    });

    const csv = toCSV(collectProjectAnnotations(PROJECT));
    expect(csv).toContain('# kind: permacultureZone');
    const zoneLine = csv.split('\n').find((l) => l.startsWith('pz1'));
    expect(zoneLine).toBeTruthy();
    // The WKT cell holds all six rings as one MULTIPOLYGON; CSV-escaping
    // wraps the cell in double quotes because it contains commas.
    expect(zoneLine!.toUpperCase()).toContain('MULTIPOLYGON(((');
    // Six "((" tokens indicate six polygon outer rings inside the
    // MULTIPOLYGON. Count without overlap.
    const matches = zoneLine!.match(/\(\(/g) ?? [];
    expect(matches.length).toBe(6);
  });

  it('emits six Placemarks under the Permaculture zone folder in KML', () => {
    useHumanContextStore.setState({
      neighbours: [],
      households: [],
      accessRoads: [],
      permacultureZones: [
        {
          id: 'pz1',
          projectId: PROJECT,
          ringRadiiM: [10, 20, 30, 40, 50, 60],
          anchorPoint: [-78.2, 44.5],
          createdAt: '2026-05-07T00:00:00Z',
        },
      ],
    });

    const xml = toKML(collectProjectAnnotations(PROJECT));
    // Slice out the Permaculture zone folder and count placemarks inside.
    const folderMatch = xml.match(
      /<Folder><name>Permaculture zone<\/name>(.*?)<\/Folder>/,
    );
    expect(folderMatch).toBeTruthy();
    const folderInner = folderMatch![1]!;
    const placemarkCount = (folderInner.match(/<Placemark/g) ?? []).length;
    expect(placemarkCount).toBe(6);
    // Per-ring placemark name carries Zone N annotation.
    expect(folderInner).toContain('Zone 0');
    expect(folderInner).toContain('Zone 5');
  });

  it('emits a Point Feature for an ecologyObservation with location set', () => {
    const loc: [number, number] = [-78.2, 44.5];
    useEcologyStore.setState({
      ecology: [
        {
          id: 'eo-located',
          projectId: PROJECT,
          species: 'oak',
          trophicLevel: 'producer',
          location: loc,
          observedAt: '2026-05-07T00:00:00Z',
        },
      ],
      ecologyZones: [],
    });

    const fc = toGeoJSON(collectProjectAnnotations(PROJECT));
    const ecoFeatures = fc.features.filter(
      (f) => (f.properties as { kind?: string } | null)?.kind === 'ecologyObservation',
    );
    expect(ecoFeatures.length).toBe(1);
    const geom = ecoFeatures[0]!.geometry as GeoJSON.Point;
    expect(geom.type).toBe('Point');
    expect(geom.coordinates[0]).toBeCloseTo(loc[0]);
    expect(geom.coordinates[1]).toBeCloseTo(loc[1]);

    const csv = toCSV(collectProjectAnnotations(PROJECT));
    const ecoLine = csv.split('\n').find((l) => l.startsWith('eo-located'));
    expect(ecoLine).toBeTruthy();
    expect(ecoLine!.toUpperCase()).toContain('POINT(-78.2 44.5)');
  });

  it('omits a locationless ecologyObservation from GeoJSON / KML but keeps it in CSV', () => {
    useEcologyStore.setState({
      ecology: [
        {
          id: 'eo-orphan',
          projectId: PROJECT,
          species: 'oak',
          trophicLevel: 'producer',
          observedAt: '2026-05-07T00:00:00Z',
        },
      ],
      ecologyZones: [],
    });

    const fc = toGeoJSON(collectProjectAnnotations(PROJECT));
    const ecoFeatures = fc.features.filter(
      (f) => (f.properties as { kind?: string } | null)?.kind === 'ecologyObservation',
    );
    expect(ecoFeatures.length).toBe(0);

    const xml = toKML(collectProjectAnnotations(PROJECT));
    expect(xml).not.toContain('Ecology observation');

    const csv = toCSV(collectProjectAnnotations(PROJECT));
    expect(csv).toContain('# kind: ecologyObservation');
    const ecoLine = csv.split('\n').find((l) => l.startsWith('eo-orphan'));
    expect(ecoLine).toBeTruthy();
    expect(ecoLine!.endsWith(',')).toBe(true);
  });

  it('skips zero / negative radii within a permacultureZone but emits the rest', () => {
    useHumanContextStore.setState({
      neighbours: [],
      households: [],
      accessRoads: [],
      permacultureZones: [
        {
          id: 'pz1',
          projectId: PROJECT,
          // Ring 1 is zero, ring 4 is negative — both should be skipped.
          ringRadiiM: [10, 0, 30, 40, -50, 60],
          anchorPoint: [-78.2, 44.5],
          createdAt: '2026-05-07T00:00:00Z',
        },
      ],
    });

    const fc = toGeoJSON(collectProjectAnnotations(PROJECT));
    const zoneFeatures = fc.features.filter(
      (f) => (f.properties as { kind?: string } | null)?.kind === 'permacultureZone',
    );
    expect(zoneFeatures.length).toBe(4);
    const rings = zoneFeatures
      .map((f) => (f.properties as { ring?: number }).ring)
      .sort();
    expect(rings).toEqual([0, 2, 3, 5]);
  });
});

describe('annotationExport — filename', () => {
  it('formats as atlas-observe-{shortId}-{YYYYMMDD}.{ext}', () => {
    const fixed = new Date('2026-05-07T12:00:00Z');
    const name = exportFilename('abcdef1234567890', 'geojson', fixed);
    expect(name).toMatch(
      /^atlas-observe-abcdef12-2026050[67]\.geojson$/,
    );
  });
});
