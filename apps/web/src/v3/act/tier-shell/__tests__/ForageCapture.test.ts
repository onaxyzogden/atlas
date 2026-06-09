/**
 * ForageCapture contract tests (F1) -- pure logic only, no rendering.
 *
 * Covers: mode mapper, decode/encode round-trip for all 5 modes, decode
 * defensiveness + coercion, validity gates, and summaries (including the
 * capacity/constraints sibling-reading path and the Cape-tulip high-risk
 * prefix). Demo numbers mirror the mockup (South 8.5 ha, North 12.0 ha,
 * Creek 2.0 ha => 22.5 ha total).
 */

import { describe, it, expect } from 'vitest';
import type { FormValue } from '../actToolCatalog.js';
import { DSE_PRESETS } from '../forageZoneSync.js';
import {
  FORAGE_PREFIX,
  forageModeFor,
  decodeForage,
  encodeForage,
  isForageValid,
  summariseForage,
  TOXIC_PLANTS,
  type ForageMode,
  type ForageModel,
  type ForageZonesModel,
  type ForageSeasonalModel,
  type ForageCapacityModel,
  type ForageConstraintsModel,
  type ForageToxicModel,
} from '../ForageCapture.js';

// ---------------------------------------------------------------------------
// forageModeFor
// ---------------------------------------------------------------------------

describe('forageModeFor', () => {
  it('maps c1..c5 to the right modes', () => {
    expect(forageModeFor(`${FORAGE_PREFIX}-c1`)).toBe('zones');
    expect(forageModeFor(`${FORAGE_PREFIX}-c2`)).toBe('seasonal');
    expect(forageModeFor(`${FORAGE_PREFIX}-c3`)).toBe('capacity');
    expect(forageModeFor(`${FORAGE_PREFIX}-c4`)).toBe('constraints');
    expect(forageModeFor(`${FORAGE_PREFIX}-c5`)).toBe('toxic');
  });

  it('returns null for an unknown suffix', () => {
    expect(forageModeFor(`${FORAGE_PREFIX}-c6`)).toBeNull();
    expect(forageModeFor(`${FORAGE_PREFIX}-xyz`)).toBeNull();
    expect(forageModeFor(`${FORAGE_PREFIX}-`)).toBeNull();
  });

  it('returns null for a non-prefixed id', () => {
    expect(forageModeFor('something-else-c1')).toBeNull();
    expect(forageModeFor('')).toBeNull();
    // a prefix-like-but-not id
    expect(forageModeFor('silv-sec-s3-forage-survey')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// round-trip helpers
// ---------------------------------------------------------------------------

function roundTripModel(mode: ForageMode, model: ForageModel): void {
  const encoded = encodeForage(mode, model);
  const decoded = decodeForage(mode, encoded);
  expect(decoded).toEqual(model);
}

function roundTripValue(mode: ForageMode, value: FormValue): void {
  const m1 = decodeForage(mode, value);
  const v1 = encodeForage(mode, m1);
  const m2 = decodeForage(mode, v1);
  expect(m2).toEqual(m1);
}

// ---------------------------------------------------------------------------
// decode/encode round-trip -- all 5 modes
// ---------------------------------------------------------------------------

describe('decode/encode round-trip', () => {
  it('zones', () => {
    const model: ForageZonesModel = {
      kind: 'zones',
      zones: [
        { id: 'z-south', forageType: 'improved', name: 'South', areaHa: '8.5', condition: 'good', composition: 'ryegrass clover' },
        { id: 'z-north', forageType: 'native', name: 'North', areaHa: '12.0', condition: 'fair', composition: 'kangaroo grass' },
        { id: 'z-creek', forageType: 'riparian', name: 'Creek', areaHa: '2.0', condition: 'poor', composition: 'reeds' },
      ],
      candidateSpecies: ['sheep', 'cattle'],
    };
    roundTripModel('zones', model);
  });

  it('seasonal', () => {
    const model: ForageSeasonalModel = {
      kind: 'seasonal',
      calendars: [
        { zoneId: 'z-south', months: [2, 2, 2, 1, 1, 0, 0, 0, 1, 2, 2, 2] },
        { zoneId: 'z-north', months: [1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1] },
      ],
    };
    roundTripModel('seasonal', model);
  });

  it('capacity', () => {
    const model: ForageCapacityModel = {
      kind: 'capacity',
      classByZone: [
        { zoneId: 'z-south', conditionClass: 'improved-good' },
        { zoneId: 'z-north', conditionClass: 'native-fair' },
        { zoneId: 'z-creek', conditionClass: '' },
      ],
    };
    roundTripModel('capacity', model);
  });

  it('constraints', () => {
    const model: ForageConstraintsModel = {
      kind: 'constraints',
      rows: [
        { id: 'con-shelter', kind: 'shelter', title: 'Windbreak', detail: 'North ridge', areaHa: '0' },
        { id: 'con-excl', kind: 'exclusion', title: 'Creek buffer', detail: 'Riparian fence', areaHa: '1.2' },
      ],
    };
    roundTripModel('constraints', model);
  });

  it('toxic', () => {
    const states = TOXIC_PLANTS.map((_, i) =>
      i === 0 ? ('present' as const) : i === 1 ? ('absent' as const) : ('not-surveyed' as const),
    );
    const model: ForageToxicModel = { kind: 'toxic', states };
    roundTripModel('toxic', model);
  });

  it('value -> decode -> encode -> decode is stable for all modes', () => {
    roundTripValue('zones', {
      zoneIds: ['z-a'],
      forageTypes: ['improved'],
      zoneNames: ['A'],
      areaHas: ['5'],
      conditions: ['good'],
      compositions: ['mix'],
      candidateSpecies: ['sheep'],
    });
    roundTripValue('seasonal', { calZoneIds: ['z-a'], calMonths: ['222111000222'] });
    roundTripValue('capacity', { capZoneIds: ['z-a'], capClasses: ['improved-good'] });
    roundTripValue('constraints', {
      conIds: ['c-a'],
      conKinds: ['exclusion'],
      conTitles: ['T'],
      conDetails: ['D'],
      conAreas: ['1.2'],
    });
    roundTripValue('toxic', { toxicStates: ['present', 'absent'] });
  });
});

// ---------------------------------------------------------------------------
// decode defensiveness -- empty {} per mode
// ---------------------------------------------------------------------------

describe('decode defensiveness (empty input)', () => {
  it('zones -> no fabricated rows, empty species', () => {
    expect(decodeForage('zones', {})).toEqual({ kind: 'zones', zones: [], candidateSpecies: [] });
  });
  it('seasonal -> empty calendars', () => {
    expect(decodeForage('seasonal', {})).toEqual({ kind: 'seasonal', calendars: [] });
  });
  it('capacity -> empty classByZone', () => {
    expect(decodeForage('capacity', {})).toEqual({ kind: 'capacity', classByZone: [] });
  });
  it('constraints -> empty rows', () => {
    expect(decodeForage('constraints', {})).toEqual({ kind: 'constraints', rows: [] });
  });
  it('toxic -> all not-surveyed with correct length', () => {
    const m = decodeForage('toxic', {}) as ForageToxicModel;
    expect(m.kind).toBe('toxic');
    expect(m.states).toHaveLength(TOXIC_PLANTS.length);
    expect(m.states.every((s) => s === 'not-surveyed')).toBe(true);
  });
  it('decode never throws on garbage', () => {
    expect(() => decodeForage('zones', { zoneIds: 'oops' as unknown as string[] })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// decode coercion
// ---------------------------------------------------------------------------

describe('decode coercion', () => {
  it('zones: missing zone id synthesized as zone-${i}; raw type/condition kept', () => {
    const m = decodeForage('zones', {
      zoneIds: ['', 'z-2'],
      forageTypes: ['improved', 'weird'],
      zoneNames: ['A', 'B'],
      areaHas: ['5', '6'],
      conditions: ['good', 'nonsense'],
      compositions: ['x', 'y'],
    }) as ForageZonesModel;
    expect(m.zones[0].id).toBe('zone-0');
    expect(m.zones[1].id).toBe('z-2');
    // raw kept (defensive, not validated at decode)
    expect(m.zones[1].forageType).toBe('weird');
    expect(m.zones[1].condition).toBe('nonsense');
  });

  it('zones: unknown candidate species dropped', () => {
    const m = decodeForage('zones', {
      candidateSpecies: ['sheep', 'dragons', 'cattle', 'unicorn'],
    }) as ForageZonesModel;
    expect(m.candidateSpecies).toEqual(['sheep', 'cattle']);
  });

  it('seasonal: out-of-range digits -> 0; padded/truncated to exactly 12', () => {
    const m = decodeForage('seasonal', {
      calZoneIds: ['z-a', 'z-b', 'z-c'],
      // too short, has invalid chars; too long
      calMonths: ['21', '2x9120120120', '222222222222222'],
    }) as ForageSeasonalModel;
    expect(m.calendars).toHaveLength(3);
    for (const c of m.calendars) {
      expect(c.months).toHaveLength(12);
      expect(c.months.every((n) => n === 0 || n === 1 || n === 2)).toBe(true);
    }
    // '21' padded to 12 with zeros
    expect(m.calendars[0].months).toEqual([2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    // '2x9120120120' -> x->0, 9->0
    expect(m.calendars[1].months).toEqual([2, 0, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0]);
    // truncated to 12
    expect(m.calendars[2].months).toEqual([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
  });

  it('capacity: invalid conditionClass -> empty string', () => {
    const m = decodeForage('capacity', {
      capZoneIds: ['z-a', 'z-b', 'z-c'],
      capClasses: ['improved-good', 'bogus-class', ''],
    }) as ForageCapacityModel;
    expect(m.classByZone[0].conditionClass).toBe('improved-good');
    expect(m.classByZone[1].conditionClass).toBe('');
    expect(m.classByZone[2].conditionClass).toBe('');
  });

  it('constraints: missing id synthesized as con-${i}; kind kept raw', () => {
    const m = decodeForage('constraints', {
      conIds: ['', 'c-2'],
      conKinds: ['shelter', 'whatever'],
      conTitles: ['T1', 'T2'],
      conDetails: ['D1', 'D2'],
      conAreas: ['0', 'TBD'],
    }) as ForageConstraintsModel;
    expect(m.rows[0].id).toBe('con-0');
    expect(m.rows[1].id).toBe('c-2');
    expect(m.rows[1].kind).toBe('whatever');
    expect(m.rows[1].areaHa).toBe('TBD');
  });

  it('toxic: unknown state -> not-surveyed; present/absent kept', () => {
    const m = decodeForage('toxic', {
      toxicStates: ['present', 'absent', 'garbage'],
    }) as ForageToxicModel;
    expect(m.states[0]).toBe('present');
    expect(m.states[1]).toBe('absent');
    expect(m.states[2]).toBe('not-surveyed');
    expect(m.states).toHaveLength(TOXIC_PLANTS.length);
  });
});

// ---------------------------------------------------------------------------
// isForageValid
// ---------------------------------------------------------------------------

describe('isForageValid', () => {
  it('zones: false when empty', () => {
    expect(isForageValid('zones', {})).toBe(false);
  });
  it('zones: false when species missing', () => {
    expect(
      isForageValid('zones', {
        zoneIds: ['z-a'],
        forageTypes: ['improved'],
        zoneNames: ['A'],
        areaHas: ['5'],
        conditions: ['good'],
        compositions: [''],
      }),
    ).toBe(false);
  });
  it('zones: false when no positive-area typed zone', () => {
    expect(
      isForageValid('zones', {
        zoneIds: ['z-a'],
        forageTypes: ['improved'],
        zoneNames: ['A'],
        areaHas: ['0'],
        conditions: ['good'],
        compositions: [''],
        candidateSpecies: ['sheep'],
      }),
    ).toBe(false);
    expect(
      isForageValid('zones', {
        zoneIds: ['z-a'],
        forageTypes: [''],
        zoneNames: ['A'],
        areaHas: ['5'],
        conditions: ['good'],
        compositions: [''],
        candidateSpecies: ['sheep'],
      }),
    ).toBe(false);
  });
  it('zones: true when a typed positive-area zone + species exist', () => {
    expect(
      isForageValid('zones', {
        zoneIds: ['z-a'],
        forageTypes: ['improved'],
        zoneNames: ['A'],
        areaHas: ['5'],
        conditions: ['good'],
        compositions: [''],
        candidateSpecies: ['sheep'],
      }),
    ).toBe(true);
  });
  it('other modes always true', () => {
    expect(isForageValid('seasonal', {})).toBe(true);
    expect(isForageValid('capacity', {})).toBe(true);
    expect(isForageValid('constraints', {})).toBe(true);
    expect(isForageValid('toxic', {})).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// summariseForage
// ---------------------------------------------------------------------------

// Demo c1 zones FormValue used by sibling-reading summaries.
const DEMO_C1: FormValue = {
  zoneIds: ['z-south', 'z-north', 'z-creek'],
  forageTypes: ['improved', 'native', 'riparian'],
  zoneNames: ['South', 'North', 'Creek'],
  areaHas: ['8.5', '12.0', '2.0'],
  conditions: ['good', 'fair', 'poor'],
  compositions: ['', '', ''],
  candidateSpecies: ['sheep', 'cattle'],
};

describe('summariseForage', () => {
  it('zones: count, total ha, species', () => {
    expect(summariseForage('zones', DEMO_C1)).toBe('3 forage zones, 22.5 ha, 2 candidate species');
  });
  it('zones: empty -> No forage zones recorded', () => {
    expect(summariseForage('zones', {})).toBe('No forage zones recorded');
  });
  it('zones: singular zone', () => {
    expect(
      summariseForage('zones', {
        zoneIds: ['z-a'],
        forageTypes: ['improved'],
        zoneNames: ['A'],
        areaHas: ['5'],
        conditions: ['good'],
        compositions: [''],
        candidateSpecies: ['sheep'],
      }),
    ).toBe('1 forage zone, 5.0 ha, 1 candidate species');
  });

  it('seasonal: counts feed-gap months (min across zones === 0)', () => {
    const value: FormValue = {
      calZoneIds: ['z-a', 'z-b'],
      // month 5 (idx) both 0; month 0 a=2,b=0 -> min 0 too
      calMonths: ['200000222222', '022222222222'],
    };
    // idx0: min(2,0)=0 gap; idx1..: a has 0s at 1..5 but b non-zero -> not gap except where both 0
    // a: 2,0,0,0,0,0,2,2,2,2,2,2 ; b: 0,2,2,2,2,2,2,2,2,2,2,2
    // min: 0,0,0,0,0,0,2,2,2,2,2,2 -> 6 gap months
    expect(summariseForage('seasonal', value)).toBe('6 feed-gap months');
  });
  it('seasonal: no gaps', () => {
    expect(
      summariseForage('seasonal', { calZoneIds: ['z-a'], calMonths: ['222222222222'] }),
    ).toBe('No feed gaps across zones');
  });
  it('seasonal: no calendars', () => {
    expect(summariseForage('seasonal', {})).toBe('No feed gaps across zones');
  });

  it('capacity: reads c1 sibling areas, computes DSE', () => {
    const value: FormValue = {
      capZoneIds: ['z-south', 'z-north', 'z-creek'],
      capClasses: ['improved-good', 'native-fair', 'riparian-fair'],
    };
    // south 8.5*10=85; north 12.0*3=36; creek 2.0*1=2 ; total 123
    // ewes 123, cattle round(123/8)=15
    const out = summariseForage('capacity', value, { [`${FORAGE_PREFIX}-c1`]: DEMO_C1 });
    expect(out).toBe('~123 DSE total (~123 ewes / 15 cattle)');
  });
  it('capacity: no classified zones', () => {
    expect(
      summariseForage('capacity', { capZoneIds: ['z-south'], capClasses: [''] }, {
        [`${FORAGE_PREFIX}-c1`]: DEMO_C1,
      }),
    ).toBe('Carrying capacity not yet estimated');
  });

  it('constraints: exclusions reduce effective area (abs of signed)', () => {
    const value: FormValue = {
      conIds: ['c1', 'c2'],
      conKinds: ['shelter', 'exclusion'],
      conTitles: ['Windbreak', 'Creek buffer'],
      conDetails: ['', ''],
      conAreas: ['0', '-1.2'],
    };
    // total 22.5; excluded 1.2; effective 21.3
    const out = summariseForage('constraints', value, { [`${FORAGE_PREFIX}-c1`]: DEMO_C1 });
    expect(out).toBe('2 constraints, 1.2 ha excluded, 21.3 ha effective');
  });
  it('constraints: none', () => {
    expect(summariseForage('constraints', {})).toBe('No grazeable-area constraints');
  });

  it('toxic: counts present/absent/not-surveyed (no Cape tulip prefix when states[0] absent)', () => {
    const value: FormValue = { toxicStates: ['absent', 'absent', 'absent', 'present', 'not-surveyed'] };
    expect(summariseForage('toxic', value)).toBe('1 present, 3 absent, 1 not surveyed');
  });
  it('toxic: Cape tulip present prefix (states[0] present)', () => {
    const value: FormValue = { toxicStates: ['present', 'absent', 'absent', 'absent', 'not-surveyed'] };
    expect(summariseForage('toxic', value)).toBe(
      'High risk -- Cape tulip present. 1 present, 3 absent, 1 not surveyed',
    );
  });
  it('toxic: empty defaults to all not surveyed', () => {
    expect(summariseForage('toxic', {})).toBe(
      `0 present, 0 absent, ${TOXIC_PLANTS.length} not surveyed`,
    );
  });
});

// ---------------------------------------------------------------------------
// DSE_PRESETS referenced correctly
// ---------------------------------------------------------------------------

describe('DSE_PRESETS', () => {
  it('improved-good is 10', () => {
    expect(DSE_PRESETS['improved-good']).toBe(10);
  });
  it('has 14 entries', () => {
    expect(Object.keys(DSE_PRESETS)).toHaveLength(14);
  });
});
