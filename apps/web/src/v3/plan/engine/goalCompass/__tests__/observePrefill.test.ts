// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { deriveSiteProfileFromObserve } from '../observePrefill.js';
import { useProjectStore, type LocalProject } from '../../../../../store/projectStore.js';
import { useTopographyStore, type Transect } from '../../../../../store/topographyStore.js';
import {
  useWaterSystemsStore,
  type StorageInfra,
  type Watercourse,
} from '../../../../../store/waterSystemsStore.js';
import {
  useExternalForcesStore,
  type HazardEvent,
} from '../../../../../store/externalForcesStore.js';
import {
  useHumanContextStore,
  type Household as HumanHousehold,
} from '../../../../../store/humanContextStore.js';
import { useSiteDataStore } from '../../../../../store/siteDataStore.js';
import { useSiteProfileStore } from '../../../../../store/siteProfileStore.js';

const PID = 'test-project-1';

function seedProject(overrides: Partial<LocalProject> = {}) {
  const project: LocalProject = {
    id: PID,
    name: 'Test',
    description: null,
    status: 'active',
    projectType: null,
    country: 'US',
    provinceState: null,
    conservationAuthId: null,
    address: null,
    parcelId: null,
    acreage: 10,
    dataCompletenessScore: null,
    hasParcelBoundary: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    parcelBoundaryGeojson: null,
    ownerNotes: null,
    zoningNotes: null,
    accessNotes: null,
    waterRightsNotes: null,
    visionStatement: null,
    units: 'imperial',
    attachments: [],
    ...overrides,
  };
  useProjectStore.setState({ projects: [project], activeProjectId: project.id });
}

function seedTransect(overrides: Partial<Transect> = {}) {
  const t: Transect = {
    id: 't1',
    projectId: PID,
    name: 'A-B',
    pointA: [0, 0],
    pointB: [0, 0],
    elevationProfileM: [100, 102, 104],
    totalDistanceM: 100,
    ...overrides,
  };
  useTopographyStore.setState({
    transects: [t],
    contours: [],
    highPoints: [],
    drainageLines: [],
  });
}

function seedWater(opts: { ponds?: number; cisterns?: number; watercourses?: number }) {
  const storage: StorageInfra[] = [];
  for (let i = 0; i < (opts.ponds ?? 0); i++) {
    storage.push({
      id: `pond-${i}`,
      projectId: PID,
      type: 'pond',
      center: [0, 0],
      createdAt: new Date(0).toISOString(),
    });
  }
  for (let i = 0; i < (opts.cisterns ?? 0); i++) {
    storage.push({
      id: `cistern-${i}`,
      projectId: PID,
      type: 'cistern',
      center: [0, 0],
      createdAt: new Date(0).toISOString(),
    });
  }
  const watercourses: Watercourse[] = [];
  for (let i = 0; i < (opts.watercourses ?? 0); i++) {
    watercourses.push({
      id: `wc-${i}`,
      projectId: PID,
      geometry: { type: 'LineString', coordinates: [] },
      kind: 'creek',
      createdAt: new Date(0).toISOString(),
    });
  }
  useWaterSystemsStore.setState({
    earthworks: [],
    storageInfra: storage,
    watercourses,
    waterNodes: [],
  });
}

function seedHazards(types: HazardEvent['type'][]) {
  const hazards: HazardEvent[] = types.map((type, i) => ({
    id: `hz-${i}`,
    projectId: PID,
    type,
    date: '2024-01-01',
    createdAt: new Date(0).toISOString(),
  }));
  useExternalForcesStore.setState({ hazards, sectors: [] });
}

function seedHousehold(size: number | undefined) {
  const households: HumanHousehold[] =
    size === undefined
      ? []
      : [
          {
            id: 'h1',
            projectId: PID,
            position: [0, 0],
            label: 'primary',
            householdSize: size,
            createdAt: new Date(0).toISOString(),
          },
        ];
  useHumanContextStore.setState({
    households,
    neighbours: [],
    accessRoads: [],
    permacultureZones: [],
  });
}

function seedClimate(hardiness: string | undefined) {
  const layers = hardiness
    ? [
        {
          layerType: 'climate',
          summary: { hardiness_zone: hardiness },
        } as unknown as never,
      ]
    : [];
  useSiteDataStore.setState({
    dataByProject: {
      [PID]: {
        layers,
        isLive: false,
        liveCount: 0,
        fetchedAt: 0,
        status: 'complete',
      },
    },
  });
}

function resetAll() {
  useProjectStore.setState({ projects: [], activeProjectId: null });
  useTopographyStore.setState({
    transects: [],
    contours: [],
    highPoints: [],
    drainageLines: [],
  });
  useWaterSystemsStore.setState({
    earthworks: [],
    storageInfra: [],
    watercourses: [],
    waterNodes: [],
  });
  useExternalForcesStore.setState({ hazards: [], sectors: [] });
  useHumanContextStore.setState({
    households: [],
    neighbours: [],
    accessRoads: [],
    permacultureZones: [],
  });
  useSiteDataStore.setState({ dataByProject: {} });
  useSiteProfileStore.setState({ profilesByProject: {} });
}

describe('deriveSiteProfileFromObserve', () => {
  beforeEach(resetAll);

  it('returns six candidates for a fully-populated Observe fixture', () => {
    seedProject({ acreage: 10 });
    seedTransect({ elevationProfileM: [100, 102, 104], totalDistanceM: 100 });
    seedClimate('5a');
    seedWater({ ponds: 1, watercourses: 1 });
    seedHazards(['frost', 'frost']);
    seedHousehold(4);

    const out = deriveSiteProfileFromObserve(PID);

    expect(out.acres?.value).toBe(10);
    expect(out.acres?.observeFieldRef).toContain('projectStore');
    expect(out.avgSlopePct?.value).toBeCloseTo(4, 1);
    expect(out.climateZone?.value).toBe('5a');
    expect(out.waterPosture?.value).toBe('mixed');
    expect(out.hazards?.value).toEqual(['frost', 'frost']);
    expect(out.household?.value).toEqual({ adults: 4, children: 0 });
    expect(Object.keys(out).sort()).toEqual(
      ['acres', 'avgSlopePct', 'climateZone', 'hazards', 'household', 'waterPosture'].sort(),
    );
  });

  it('returns an empty result when Observe stores are empty', () => {
    seedProject({ acreage: null });
    const out = deriveSiteProfileFromObserve(PID);
    expect(Object.keys(out)).toEqual([]);
  });

  it('derives pond-fed water posture when only a pond is recorded', () => {
    seedProject();
    seedWater({ ponds: 1 });
    const out = deriveSiteProfileFromObserve(PID);
    expect(out.waterPosture?.value).toBe('pond-fed');
  });

  it('derives irrigated when only a cistern is recorded', () => {
    seedProject();
    seedWater({ cisterns: 1 });
    const out = deriveSiteProfileFromObserve(PID);
    expect(out.waterPosture?.value).toBe('irrigated');
  });

  it('omits waterPosture when no storage and no watercourse exist', () => {
    seedProject();
    seedWater({});
    const out = deriveSiteProfileFromObserve(PID);
    expect(out.waterPosture).toBeUndefined();
  });

  it('prefers hazard description over type label', () => {
    seedProject();
    useExternalForcesStore.setState({
      hazards: [
        {
          id: 'h1',
          projectId: PID,
          type: 'flood',
          date: '2024-01-01',
          description: 'Spring melt overtops creek',
          createdAt: new Date(0).toISOString(),
        },
      ],
      sectors: [],
    });
    const out = deriveSiteProfileFromObserve(PID);
    expect(out.hazards?.value).toEqual(['Spring melt overtops creek']);
  });

  it('skips facets whose source data is missing', () => {
    seedProject({ acreage: null });
    seedHazards(['frost']);
    const out = deriveSiteProfileFromObserve(PID);
    expect(out.acres).toBeUndefined();
    expect(out.hazards?.value).toEqual(['frost']);
  });
});
