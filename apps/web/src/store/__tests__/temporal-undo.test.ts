// @vitest-environment happy-dom
/**
 * temporal-undo — exercises the zundo `temporal()` middleware that now wraps
 * the seven OBSERVE namespace stores (Phase 5 of plan
 * consult-notebooklm-permaculture-scholar-peppy-fog.md). Each store gains a
 * `temporal` slice exposing `undo`, `redo`, `clear`, `pastStates`, and
 * `futureStates`.
 *
 * Coverage strategy: rather than spec every one of the seven stores, this
 * file tests three representative stores spanning the variety of their
 * action shapes — humanContext (single-collection list), swot (single
 * record list), and soilSample (lab-record list). All seven stores follow
 * the identical `persist(temporal(creator, { limit: 200 }), …)` pattern, so
 * if temporal works for these three it works for all.
 *
 * The vitest environment is `node`, so zustand's localStorage-backed
 * `persist` middleware is a no-op on rehydrate — that's fine; we are not
 * testing persistence here, only the in-memory undo timeline.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useHumanContextStore } from '../humanContextStore.js';
import { useSwotStore } from '../swotStore.js';
import { useSoilSampleStore } from '../soilSampleStore.js';
import { useTopographyStore } from '../topographyStore.js';
import { useExternalForcesStore } from '../externalForcesStore.js';
import { useWaterSystemsStore } from '../waterSystemsStore.js';
import { useEcologyStore } from '../ecologyStore.js';
import { useVegetationStore } from '../vegetationStore.js';

function clearTemporal(store: { temporal: { getState: () => { clear: () => void } } }): void {
  store.temporal.getState().clear();
}

describe('temporal middleware — humanContextStore', () => {
  beforeEach(() => {
    useHumanContextStore.setState({
      neighbours: [],
      households: [],
      accessRoads: [],
      permacultureZones: [],
    });
    clearTemporal(useHumanContextStore as unknown as {
      temporal: { getState: () => { clear: () => void } };
    });
  });

  it('undoes addNeighbour and redoes it', () => {
    const neighbour = {
      id: 'n-1',
      projectId: 'p-1',
      position: [-78.2, 44.5] as [number, number],
      label: 'Aunt Mariam',
      createdAt: '2026-05-06T00:00:00Z',
    };

    useHumanContextStore.getState().addNeighbour(neighbour);
    expect(useHumanContextStore.getState().neighbours).toHaveLength(1);

    (useHumanContextStore as unknown as {
      temporal: { getState: () => { undo: () => void } };
    }).temporal.getState().undo();
    expect(useHumanContextStore.getState().neighbours).toHaveLength(0);

    (useHumanContextStore as unknown as {
      temporal: { getState: () => { redo: () => void } };
    }).temporal.getState().redo();
    expect(useHumanContextStore.getState().neighbours).toHaveLength(1);
    expect(useHumanContextStore.getState().neighbours[0]?.id).toBe('n-1');
  });

  it('undoes a sequence of adds in LIFO order', () => {
    const a = {
      id: 'a',
      projectId: 'p-1',
      position: [-78.2, 44.5] as [number, number],
      createdAt: '2026-05-06T00:00:00Z',
    };
    const b = { ...a, id: 'b' };
    const c = { ...a, id: 'c' };

    useHumanContextStore.getState().addNeighbour(a);
    useHumanContextStore.getState().addNeighbour(b);
    useHumanContextStore.getState().addNeighbour(c);
    expect(useHumanContextStore.getState().neighbours.map((n) => n.id)).toEqual(['a', 'b', 'c']);

    const temporal = (useHumanContextStore as unknown as {
      temporal: { getState: () => { undo: () => void; redo: () => void } };
    }).temporal.getState();

    temporal.undo();
    expect(useHumanContextStore.getState().neighbours.map((n) => n.id)).toEqual(['a', 'b']);
    temporal.undo();
    expect(useHumanContextStore.getState().neighbours.map((n) => n.id)).toEqual(['a']);
    temporal.redo();
    expect(useHumanContextStore.getState().neighbours.map((n) => n.id)).toEqual(['a', 'b']);
  });
});

describe('temporal middleware — swotStore', () => {
  beforeEach(() => {
    useSwotStore.setState({ swot: [] });
    clearTemporal(useSwotStore as unknown as {
      temporal: { getState: () => { clear: () => void } };
    });
  });

  it('undoes addSwot and updateSwot independently', () => {
    const entry = {
      id: 's-1',
      projectId: 'p-1',
      bucket: 'S' as const,
      title: 'Strong south slope',
      createdAt: '2026-05-06T00:00:00Z',
    };

    useSwotStore.getState().addSwot(entry);
    useSwotStore.getState().updateSwot('s-1', { title: 'South slope, full sun' });
    expect(useSwotStore.getState().swot[0]?.title).toBe('South slope, full sun');

    const temporal = (useSwotStore as unknown as {
      temporal: { getState: () => { undo: () => void; redo: () => void } };
    }).temporal.getState();

    temporal.undo();
    expect(useSwotStore.getState().swot[0]?.title).toBe('Strong south slope');

    temporal.undo();
    expect(useSwotStore.getState().swot).toHaveLength(0);

    temporal.redo();
    expect(useSwotStore.getState().swot[0]?.title).toBe('Strong south slope');
  });
});

describe('temporal middleware — soilSampleStore', () => {
  beforeEach(() => {
    useSoilSampleStore.setState({ samples: [] });
    clearTemporal(useSoilSampleStore as unknown as {
      temporal: { getState: () => { clear: () => void } };
    });
  });

  it('undoes deleteSample, restoring the prior sample list', () => {
    const sample = {
      id: 'soil-1',
      projectId: 'p-1',
      sampleDate: '2026-05-01',
      label: 'North paddock topsoil',
      location: [-78.2, 44.5] as [number, number],
      depth: '0_5cm' as const,
      ph: 6.4,
      organicMatterPct: null,
      texture: null,
      cecMeq100g: null,
      ecDsM: null,
      bulkDensityGCm3: null,
      npkPpm: null,
      biologicalActivity: 'unknown' as const,
      notes: '',
      lab: null,
      createdAt: '2026-05-01T00:00:00Z',
      updatedAt: '2026-05-01T00:00:00Z',
    };

    useSoilSampleStore.getState().addSample(sample);
    useSoilSampleStore.getState().deleteSample('soil-1');
    expect(useSoilSampleStore.getState().samples).toHaveLength(0);

    const temporal = (useSoilSampleStore as unknown as {
      temporal: { getState: () => { undo: () => void } };
    }).temporal.getState();

    temporal.undo();
    expect(useSoilSampleStore.getState().samples).toHaveLength(1);
    expect(useSoilSampleStore.getState().samples[0]?.id).toBe('soil-1');
  });
});

describe('temporal middleware — topographyStore', () => {
  beforeEach(() => {
    useTopographyStore.setState({
      transects: [],
      contours: [],
      highPoints: [],
      drainageLines: [],
    });
    clearTemporal(useTopographyStore as unknown as {
      temporal: { getState: () => { clear: () => void } };
    });
  });

  it('undoes addContour', () => {
    const contour = {
      id: 'c-1',
      projectId: 'p-1',
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-78.2, 44.5],
          [-78.21, 44.5],
        ],
      },
      createdAt: '2026-05-07T00:00:00Z',
    };

    useTopographyStore.getState().addContour(contour);
    expect(useTopographyStore.getState().contours).toHaveLength(1);

    (useTopographyStore as unknown as {
      temporal: { getState: () => { undo: () => void } };
    }).temporal.getState().undo();
    expect(useTopographyStore.getState().contours).toHaveLength(0);
  });

  it('undoes a highPoint label update, reverting the title', () => {
    const highPoint = {
      id: 'h-1',
      projectId: 'p-1',
      position: [-78.2, 44.5] as [number, number],
      kind: 'high' as const,
      label: 'Peak',
      createdAt: '2026-05-07T00:00:00Z',
    };

    useTopographyStore.getState().addHighPoint(highPoint);
    useTopographyStore.getState().updateHighPoint('h-1', { label: 'Knoll' });
    expect(useTopographyStore.getState().highPoints[0]?.label).toBe('Knoll');

    (useTopographyStore as unknown as {
      temporal: { getState: () => { undo: () => void } };
    }).temporal.getState().undo();
    expect(useTopographyStore.getState().highPoints[0]?.label).toBe('Peak');
  });

  it('undoes a drainageLine removal, restoring the prior list', () => {
    const drainageLine = {
      id: 'd-1',
      projectId: 'p-1',
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-78.2, 44.5],
          [-78.22, 44.49],
        ],
      },
      createdAt: '2026-05-07T00:00:00Z',
    };

    useTopographyStore.getState().addDrainageLine(drainageLine);
    useTopographyStore.getState().removeDrainageLine('d-1');
    expect(useTopographyStore.getState().drainageLines).toHaveLength(0);

    (useTopographyStore as unknown as {
      temporal: { getState: () => { undo: () => void } };
    }).temporal.getState().undo();
    expect(useTopographyStore.getState().drainageLines).toHaveLength(1);
    expect(useTopographyStore.getState().drainageLines[0]?.id).toBe('d-1');
  });
});

describe('temporal middleware — externalForcesStore', () => {
  beforeEach(() => {
    useExternalForcesStore.setState({ hazards: [], sectors: [] });
    clearTemporal(useExternalForcesStore as unknown as {
      temporal: { getState: () => { clear: () => void } };
    });
  });

  it('undoes a hazard severity update, reverting to prior value', () => {
    const hazard = {
      id: 'hz-1',
      projectId: 'p-1',
      type: 'flood' as const,
      date: '2026-04-12',
      severity: 'med' as const,
      createdAt: '2026-05-07T00:00:00Z',
    };

    useExternalForcesStore.getState().addHazard(hazard);
    useExternalForcesStore.getState().updateHazard('hz-1', { severity: 'high' });
    expect(useExternalForcesStore.getState().hazards[0]?.severity).toBe('high');

    (useExternalForcesStore as unknown as {
      temporal: { getState: () => { undo: () => void } };
    }).temporal.getState().undo();
    expect(useExternalForcesStore.getState().hazards[0]?.severity).toBe('med');
  });

  it('undoes addSector to empty', () => {
    const sector = {
      id: 'sec-1',
      projectId: 'p-1',
      type: 'wind_prevailing' as const,
      bearingDeg: 270,
      arcDeg: 60,
    };

    useExternalForcesStore.getState().addSector(sector);
    expect(useExternalForcesStore.getState().sectors).toHaveLength(1);

    (useExternalForcesStore as unknown as {
      temporal: { getState: () => { undo: () => void } };
    }).temporal.getState().undo();
    expect(useExternalForcesStore.getState().sectors).toHaveLength(0);
  });
});

describe('temporal middleware — waterSystemsStore', () => {
  beforeEach(() => {
    useWaterSystemsStore.setState({ earthworks: [], storageInfra: [], watercourses: [] });
    clearTemporal(useWaterSystemsStore as unknown as {
      temporal: { getState: () => { clear: () => void } };
    });
  });

  it('undoes a removeEarthwork, restoring the prior list', () => {
    const earthwork = {
      id: 'ew-1',
      projectId: 'p-1',
      type: 'swale' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-78.2, 44.5],
          [-78.21, 44.5],
        ],
      },
      lengthM: 120,
      createdAt: '2026-05-07T00:00:00Z',
    };

    useWaterSystemsStore.getState().addEarthwork(earthwork);
    useWaterSystemsStore.getState().removeEarthwork('ew-1');
    expect(useWaterSystemsStore.getState().earthworks).toHaveLength(0);

    (useWaterSystemsStore as unknown as {
      temporal: { getState: () => { undo: () => void } };
    }).temporal.getState().undo();
    expect(useWaterSystemsStore.getState().earthworks).toHaveLength(1);
    expect(useWaterSystemsStore.getState().earthworks[0]?.id).toBe('ew-1');
  });

  it('undoes a storageInfra capacity update', () => {
    const cistern = {
      id: 'st-1',
      projectId: 'p-1',
      type: 'cistern' as const,
      center: [-78.2, 44.5] as [number, number],
      capacityL: 2000,
      createdAt: '2026-05-07T00:00:00Z',
    };

    useWaterSystemsStore.getState().addStorageInfra(cistern);
    useWaterSystemsStore.getState().updateStorageInfra('st-1', { capacityL: 5000 });
    expect(useWaterSystemsStore.getState().storageInfra[0]?.capacityL).toBe(5000);

    (useWaterSystemsStore as unknown as {
      temporal: { getState: () => { undo: () => void } };
    }).temporal.getState().undo();
    expect(useWaterSystemsStore.getState().storageInfra[0]?.capacityL).toBe(2000);
  });

  it('undoes addWatercourse to empty', () => {
    const watercourse = {
      id: 'wc-1',
      projectId: 'p-1',
      geometry: {
        type: 'LineString' as const,
        coordinates: [
          [-78.2, 44.5],
          [-78.22, 44.51],
        ],
      },
      kind: 'stream' as const,
      createdAt: '2026-05-07T00:00:00Z',
    };

    useWaterSystemsStore.getState().addWatercourse(watercourse);
    expect(useWaterSystemsStore.getState().watercourses).toHaveLength(1);

    (useWaterSystemsStore as unknown as {
      temporal: { getState: () => { undo: () => void } };
    }).temporal.getState().undo();
    expect(useWaterSystemsStore.getState().watercourses).toHaveLength(0);
  });
});

describe('temporal middleware — ecologyStore', () => {
  beforeEach(() => {
    useEcologyStore.setState({
      ecology: [],
      successionStageByProject: {},
    });
    clearTemporal(useEcologyStore as unknown as {
      temporal: { getState: () => { clear: () => void } };
    });
  });

  it('undoes an observation notes update', () => {
    const observation = {
      id: 'obs-1',
      projectId: 'p-1',
      species: 'Rubus idaeus',
      trophicLevel: 'producer' as const,
      observedAt: '2026-05-07',
      notes: 'Initial sighting',
    };

    useEcologyStore.getState().addObservation(observation);
    useEcologyStore.getState().updateObservation('obs-1', { notes: 'Re-sighted in patch' });
    expect(useEcologyStore.getState().ecology[0]?.notes).toBe('Re-sighted in patch');

    (useEcologyStore as unknown as {
      temporal: { getState: () => { undo: () => void } };
    }).temporal.getState().undo();
    expect(useEcologyStore.getState().ecology[0]?.notes).toBe('Initial sighting');
  });

});

describe('temporal middleware — vegetationStore', () => {
  beforeEach(() => {
    useVegetationStore.setState({ patches: [] });
    clearTemporal(useVegetationStore as unknown as {
      temporal: { getState: () => { clear: () => void } };
    });
  });

  it('undoes addPatch to empty', () => {
    const patch = {
      id: 'vp-1',
      projectId: 'p-1',
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [-78.2, 44.5],
            [-78.21, 44.5],
            [-78.21, 44.51],
            [-78.2, 44.51],
            [-78.2, 44.5],
          ],
        ],
      },
      successionStage: 'mid' as const,
      groundCover: 'sparse-grasses' as const,
      label: 'East woodlot',
      createdAt: '2026-05-07T00:00:00Z',
    };

    useVegetationStore.getState().addPatch(patch);
    expect(useVegetationStore.getState().patches).toHaveLength(1);

    (useVegetationStore as unknown as {
      temporal: { getState: () => { undo: () => void } };
    }).temporal.getState().undo();
    expect(useVegetationStore.getState().patches).toHaveLength(0);
  });
});
