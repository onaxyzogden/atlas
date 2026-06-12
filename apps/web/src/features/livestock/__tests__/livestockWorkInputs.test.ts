/**
 * @vitest-environment happy-dom
 *
 * livestockWorkInputs — adapter from store state to the pure engine input.
 *
 * Covers: capture decode mapping (husbandry / grazing / livestock-intent
 * FormValues through the captures' own decoders), species union with
 * paddock assignments, protocol curation with VERBATIM scopeNotes,
 * hemisphere derivation, null/missing handling, and the regeneration seam
 * (`generateAndApplyLivestockWork`) never writing the WorkItem spine.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { PROTOCOL_CADENCES, resolveProjectProtocols } from '@ogden/shared';
import {
  useProjectStore,
  type LocalProject,
} from '../../../store/projectStore.js';
import { useLivestockStore, type Paddock } from '../../../store/livestockStore.js';
import { useActEvidenceStore } from '../../../store/actEvidenceStore.js';
import { useLivestockWorkPlanStore } from '../../../store/livestockWorkPlanStore.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import { HUSBANDRY_PREFIX } from '../../../v3/act/tier-shell/HusbandryCapture.js';
import { GRAZING_PREFIX } from '../../../v3/act/tier-shell/GrazingSystemCapture.js';
import { LIVESTOCK_INTENT_PREFIX } from '../../../v3/act/tier-shell/LivestockIntentCapture.js';
import {
  buildLivestockWorkGenerationInput,
  generateAndApplyLivestockWork,
} from '../livestockWorkInputs.js';

const P = 'p1';
const TODAY = '2026-06-12';

function project(over: Partial<LocalProject> = {}): LocalProject {
  return {
    id: P,
    name: 'Test holding',
    metadata: {
      projectTypeRecord: {
        primaryTypeId: 'homestead',
        secondaryTypeIds: ['silvopasture'],
      },
    },
    parcelBoundaryGeojson: null,
    ...over,
  } as unknown as LocalProject;
}

function paddock(over: Partial<Paddock> = {}): Paddock {
  return {
    id: 'pad-1',
    projectId: P,
    name: 'North paddock',
    species: [],
    ...over,
  } as unknown as Paddock;
}

const SOUTHERN_BOUNDARY = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [153.0, -27.0],
            [153.01, -27.0],
            [153.01, -27.01],
            [153.0, -27.01],
            [153.0, -27.0],
          ],
        ],
      },
    },
  ],
} as GeoJSON.FeatureCollection;

function setForms(forms: Record<string, Record<string, unknown>>) {
  useActEvidenceStore.setState({
    visionFormData: { [P]: forms },
  } as never);
}

beforeEach(() => {
  useProjectStore.setState({ projects: [project()] } as never);
  useActEvidenceStore.setState({ visionFormData: {} } as never);
  useLivestockStore.setState({ paddocks: [] } as never);
  useLivestockWorkPlanStore.setState({ rules: [], proposals: [] });
  useWorkItemStore.setState({ items: [], migratedSources: [] });
});

describe('buildLivestockWorkGenerationInput', () => {
  it('returns null only when the project does not exist', () => {
    expect(buildLivestockWorkGenerationInput('nope', TODAY)).toBeNull();
    expect(buildLivestockWorkGenerationInput(P, TODAY)).not.toBeNull();
  });

  it('missing captures decode to null fields (engine retires stale work)', () => {
    const input = buildLivestockWorkGenerationInput(P, TODAY)!;
    expect(input.husbandry).toEqual({
      health: null,
      breeding: null,
      welfare: null,
      halal: null,
      records: null,
    });
    expect(input.grazing).toEqual({
      grazeRest: null,
      treeProtection: null,
      contingency: null,
    });
    expect(input.speciesPresent).toEqual([]);
    expect(input.carers).toEqual({ primaryCarer: '', reliefCarers: [] });
  });

  it('decodes husbandry capture entries through the canonical decoders', () => {
    setForms({
      [`${HUSBANDRY_PREFIX}-c1`]: { hbVetNotes: 'Vet: Dr Ali, annual visit' },
      [`${HUSBANDRY_PREFIX}-c2`]: { hbStrategy: 'autumn' },
      [`${HUSBANDRY_PREFIX}-c3`]: { hbWelfareNotes: 'Check troughs daily' },
      [`${HUSBANDRY_PREFIX}-c4`]: { hbPathwayAck: 'yes' },
    });
    const input = buildLivestockWorkGenerationInput(P, TODAY)!;
    expect(input.husbandry.health).toMatchObject({
      vetNotes: 'Vet: Dr Ali, annual visit',
    });
    expect(input.husbandry.breeding).toMatchObject({ strategy: 'autumn' });
    expect(input.husbandry.welfare).toMatchObject({
      notes: 'Check troughs daily',
    });
    expect(input.husbandry.halal).toMatchObject({ pathwayAcknowledged: true });
    expect(input.husbandry.records).toBeNull();
  });

  it('an unacknowledged halal pathway decodes as NOT acknowledged', () => {
    setForms({ [`${HUSBANDRY_PREFIX}-c4`]: { hbPathwayAck: '' } });
    const input = buildLivestockWorkGenerationInput(P, TODAY)!;
    expect(input.husbandry.halal).toMatchObject({
      pathwayAcknowledged: false,
    });
  });

  it('decodes grazing capture entries (graze/rest seasons, tree stages, contingency)', () => {
    setForms({
      [`${GRAZING_PREFIX}-c3`]: {
        seasonGraze: ['3', '5', '4', '2'],
        seasonRest: ['45', '90', '60', '30'],
        seasonIndicator: ['height 10cm', '', '', ''],
      },
      [`${GRAZING_PREFIX}-c4`]: {
        treeStageNotes: ['full exclusion', 'guards', 'browse-tolerant'],
      },
      [`${GRAZING_PREFIX}-c5`]: {
        contTrigger: ['30d no rain', '', '', ''],
        contAction: ['destock 20%', '', '', ''],
      },
    });
    const input = buildLivestockWorkGenerationInput(P, TODAY)!;
    expect(input.grazing.grazeRest!.seasons).toHaveLength(4);
    expect(input.grazing.grazeRest!.seasons[0]).toEqual({
      grazePeriod: '3',
      restPeriod: '45',
      indicator: 'height 10cm',
    });
    expect(input.grazing.treeProtection!.stageNotes).toEqual([
      'full exclusion',
      'guards',
      'browse-tolerant',
    ]);
    expect(input.grazing.contingency!.tiers[0]).toEqual({
      trigger: '30d no rain',
      action: 'destock 20%',
    });
  });

  it('speciesPresent is the union of intent species and paddock species', () => {
    setForms({
      [`${LIVESTOCK_INTENT_PREFIX}-c2`]: {
        liSpecies: ['sheep', 'not-a-species'],
      },
    });
    useLivestockStore.setState({
      paddocks: [
        paddock({ id: 'pad-1', species: ['cattle'] as never }),
        paddock({ id: 'pad-2', projectId: 'other', species: ['goats'] as never }),
      ],
    } as never);
    const input = buildLivestockWorkGenerationInput(P, TODAY)!;
    expect([...input.speciesPresent].sort()).toEqual(['cattle', 'sheep']);
  });

  it('reads the carer roster from the intent capacity capture', () => {
    setForms({
      [`${LIVESTOCK_INTENT_PREFIX}-c4`]: {
        liPrimaryCarer: 'Yousef',
        liReliefCarers: ['Amir', 'Fatima'],
      },
    });
    const input = buildLivestockWorkGenerationInput(P, TODAY)!;
    expect(input.carers).toEqual({
      primaryCarer: 'Yousef',
      reliefCarers: ['Amir', 'Fatima'],
    });
  });

  it('curates resolved protocols to livestock relevance with VERBATIM scopeNotes', () => {
    const input = buildLivestockWorkGenerationInput(P, TODAY)!;
    const resolved = resolveProjectProtocols({
      primaryTypeId: 'homestead',
      secondaryTypeIds: ['silvopasture'],
    });
    const expected = resolved.protocols.filter(
      (p) => p.feeds.includes('Animals') || p.id in PROTOCOL_CADENCES,
    );
    expect(input.protocols.map((p) => p.id)).toEqual(expected.map((p) => p.id));
    expect(input.protocols.length).toBeGreaterThan(0);
    // Verbatim covenant: every carried scopeNotes string is byte-identical.
    for (const p of input.protocols) {
      const src = expected.find((e) => e.id === p.id)!;
      expect(p.response).toBe(src.response);
      if (src.scopeNotes !== undefined) {
        expect(p.scopeNotes).toBe(src.scopeNotes);
      } else {
        expect('scopeNotes' in p).toBe(false);
      }
    }
  });

  it('yields no protocols when the project has no type record', () => {
    useProjectStore.setState({
      projects: [project({ metadata: {} } as never)],
    } as never);
    const input = buildLivestockWorkGenerationInput(P, TODAY)!;
    expect(input.protocols).toEqual([]);
  });

  it('derives hemisphere from the parcel boundary (null → northern)', () => {
    expect(
      buildLivestockWorkGenerationInput(P, TODAY)!.isSouthernHemisphere,
    ).toBe(false);
    useProjectStore.setState({
      projects: [
        project({ parcelBoundaryGeojson: SOUTHERN_BOUNDARY } as never),
      ],
    } as never);
    expect(
      buildLivestockWorkGenerationInput(P, TODAY)!.isSouthernHemisphere,
    ).toBe(true);
  });

  it('threads the capture objective ids through for provenance', () => {
    const input = buildLivestockWorkGenerationInput(P, TODAY)!;
    expect(input.husbandryObjectiveId).toBe(HUSBANDRY_PREFIX);
    expect(input.grazingObjectiveId).toBe(GRAZING_PREFIX);
    expect(input.todayISO).toBe(TODAY);
  });
});

describe('generateAndApplyLivestockWork — the regeneration seam', () => {
  it('refreshes proposals and NEVER writes the WorkItem spine', () => {
    setForms({
      [`${LIVESTOCK_INTENT_PREFIX}-c2`]: { liSpecies: ['sheep'] },
      [`${HUSBANDRY_PREFIX}-c3`]: { hbWelfareNotes: 'Daily walk-through' },
    });
    generateAndApplyLivestockWork(P);
    const s = useLivestockWorkPlanStore.getState();
    expect(s.proposals.length).toBeGreaterThan(0);
    expect(s.proposals.every((p) => p.status === 'proposed')).toBe(true);
    expect(s.proposals.every((p) => p.projectId === P)).toBe(true);
    // Sovereign steward: generation alone leaves the spine untouched.
    expect(useWorkItemStore.getState().items).toEqual([]);
  });

  it('is a no-op for an unknown project', () => {
    generateAndApplyLivestockWork('nope');
    expect(useLivestockWorkPlanStore.getState().proposals).toEqual([]);
  });
});
