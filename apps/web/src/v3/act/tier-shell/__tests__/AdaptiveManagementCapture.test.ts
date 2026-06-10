/**
 * AdaptiveManagementCapture contract tests -- pure logic only, no rendering.
 *
 * Covers: mode mapper (c1..c5), decode/encode round-trip for all 5 modes,
 * decode defensiveness (no fabricated demo defaults; foreign values dropped),
 * validity gates, and summaries (including the empty-value path). The mockup's
 * default-on toggles are UI demo defaults ONLY -- decode of an empty FormValue
 * must yield all toggles off and all selects at "".
 */

import { describe, it, expect } from 'vitest';
import type { FormValue } from '../actToolCatalog.js';
import {
  ADAPTIVE_MANAGEMENT_PREFIX,
  adaptiveManagementModeFor,
  decodeAdaptiveManagement,
  encodeAdaptiveManagement,
  isAdaptiveManagementValid,
  summariseAdaptiveManagement,
  REVIEW_TIMING_OPTIONS,
  REVIEW_DURATION_OPTIONS,
  REVIEW_FACILITATOR_OPTIONS,
  AGENDA_ITEMS,
  TRIGGERS,
  ESC_TIERS,
  ESC_FILED_OPTIONS,
  DOC_ITEMS,
  DOC_FILED_OPTIONS,
  DOC_EFFECTIVE_OPTIONS,
  DOC_NOTIFIED_OPTIONS,
  FIVE_STRUCTURE,
  SCOPE_ITEMS,
  type AdaptiveManagementMode,
  type ReviewModel,
  type TriggersModel,
  type EscalationModel,
  type DocumentationModel,
  type FiveYearModel,
} from '../AdaptiveManagementCapture.js';

const P = ADAPTIVE_MANAGEMENT_PREFIX;
const TRIGGER_ROW_COUNT = TRIGGERS.reduce((n, t) => n + t.rows.length, 0);
const ESC_ROW_COUNT = ESC_TIERS.reduce((n, t) => n + t.rows.length, 0);

// ---------------------------------------------------------------------------
// adaptiveManagementModeFor
// ---------------------------------------------------------------------------

describe('adaptiveManagementModeFor', () => {
  it('maps c1..c5 to the right modes', () => {
    expect(adaptiveManagementModeFor(`${P}-c1`)).toBe('review');
    expect(adaptiveManagementModeFor(`${P}-c2`)).toBe('triggers');
    expect(adaptiveManagementModeFor(`${P}-c3`)).toBe('escalation');
    expect(adaptiveManagementModeFor(`${P}-c4`)).toBe('documentation');
    expect(adaptiveManagementModeFor(`${P}-c5`)).toBe('fiveyear');
  });

  it('returns null for an unknown suffix', () => {
    expect(adaptiveManagementModeFor(`${P}-c6`)).toBeNull();
    expect(adaptiveManagementModeFor(`${P}-xyz`)).toBeNull();
    expect(adaptiveManagementModeFor(`${P}-`)).toBeNull();
  });

  it('returns null for a non-prefixed id', () => {
    expect(adaptiveManagementModeFor('something-else-c1')).toBeNull();
    expect(adaptiveManagementModeFor('')).toBeNull();
    expect(adaptiveManagementModeFor('ev-s7-adaptive-management')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// round-trip: encode(decode(x)) is idempotent on the canonical FormValue
// ---------------------------------------------------------------------------

function roundTrips(mode: AdaptiveManagementMode, value: FormValue): void {
  const model = decodeAdaptiveManagement(mode, value);
  const encoded = encodeAdaptiveManagement(mode, model);
  const reDecoded = decodeAdaptiveManagement(mode, encoded);
  expect(reDecoded).toEqual(model);
}

describe('decode/encode round-trip', () => {
  it('review round-trips with selections + agenda subset', () => {
    const value: FormValue = {
      amRevTiming: REVIEW_TIMING_OPTIONS[0]!,
      amRevDuration: REVIEW_DURATION_OPTIONS[1]!,
      amRevFacilitator: REVIEW_FACILITATOR_OPTIONS[2]!,
      amRevAgenda: [AGENDA_ITEMS[0]!.name, AGENDA_ITEMS[3]!.name],
    };
    roundTrips('review', value);
    const m = decodeAdaptiveManagement('review', value) as ReviewModel;
    expect(m.timing).toBe(REVIEW_TIMING_OPTIONS[0]);
    expect(m.duration).toBe(REVIEW_DURATION_OPTIONS[1]);
    expect(m.facilitator).toBe(REVIEW_FACILITATOR_OPTIONS[2]);
    expect(m.agenda).toEqual([AGENDA_ITEMS[0]!.name, AGENDA_ITEMS[3]!.name]);
  });

  it('triggers round-trips with positional responses', () => {
    const responses = TRIGGERS.flatMap((t) => t.rows).map(
      (r) => r.options[0]!,
    );
    roundTrips('triggers', { amTrigResponses: responses });
    const m = decodeAdaptiveManagement('triggers', {
      amTrigResponses: responses,
    }) as TriggersModel;
    expect(m.responses).toEqual(responses);
    expect(m.responses).toHaveLength(TRIGGER_ROW_COUNT);
  });

  it('escalation round-trips with rows + filedIn', () => {
    const rows = ESC_TIERS.flatMap((t) => t.rows).map((r) => r.options[0]!);
    const value: FormValue = {
      amEscRows: rows,
      amEscFiledIn: ESC_FILED_OPTIONS[1]!,
    };
    roundTrips('escalation', value);
    const m = decodeAdaptiveManagement('escalation', value) as EscalationModel;
    expect(m.rows).toEqual(rows);
    expect(m.filedIn).toBe(ESC_FILED_OPTIONS[1]);
  });

  it('documentation round-trips with items + selects', () => {
    const value: FormValue = {
      amDocItems: [DOC_ITEMS[0]!.name, DOC_ITEMS[5]!.name],
      amDocFiledIn: DOC_FILED_OPTIONS[2]!,
      amDocEffective: DOC_EFFECTIVE_OPTIONS[0]!,
      amDocNotified: DOC_NOTIFIED_OPTIONS[1]!,
    };
    roundTrips('documentation', value);
    const m = decodeAdaptiveManagement(
      'documentation',
      value,
    ) as DocumentationModel;
    expect(m.documented).toEqual([DOC_ITEMS[0]!.name, DOC_ITEMS[5]!.name]);
    expect(m.filedIn).toBe(DOC_FILED_OPTIONS[2]);
    expect(m.effectiveFrom).toBe(DOC_EFFECTIVE_OPTIONS[0]);
    expect(m.notified).toBe(DOC_NOTIFIED_OPTIONS[1]);
  });

  it('fiveyear round-trips with structure + scope', () => {
    const structure = FIVE_STRUCTURE.map((r) => r.options[0]!);
    const value: FormValue = {
      amFiveStructure: structure,
      amFiveScope: [SCOPE_ITEMS[1]!.name, SCOPE_ITEMS[4]!.name],
    };
    roundTrips('fiveyear', value);
    const m = decodeAdaptiveManagement('fiveyear', value) as FiveYearModel;
    expect(m.structure).toEqual(structure);
    expect(m.scope).toEqual([SCOPE_ITEMS[1]!.name, SCOPE_ITEMS[4]!.name]);
  });
});

// ---------------------------------------------------------------------------
// decode defensiveness -- empty / malformed value, no fabricated defaults
// ---------------------------------------------------------------------------

describe('decode is total and never fabricates demo defaults', () => {
  it('empty value -> review all selects "" and agenda empty', () => {
    const m = decodeAdaptiveManagement('review', {}) as ReviewModel;
    expect(m.timing).toBe('');
    expect(m.duration).toBe('');
    expect(m.facilitator).toBe('');
    expect(m.agenda).toEqual([]);
  });

  it('empty value -> triggers all "" but correctly padded to row count', () => {
    const m = decodeAdaptiveManagement('triggers', {}) as TriggersModel;
    expect(m.responses).toHaveLength(TRIGGER_ROW_COUNT);
    expect(m.responses.every((r) => r === '')).toBe(true);
  });

  it('empty value -> escalation rows padded, filedIn ""', () => {
    const m = decodeAdaptiveManagement('escalation', {}) as EscalationModel;
    expect(m.rows).toHaveLength(ESC_ROW_COUNT);
    expect(m.rows.every((r) => r === '')).toBe(true);
    expect(m.filedIn).toBe('');
  });

  it('empty value -> documentation empty + selects ""', () => {
    const m = decodeAdaptiveManagement(
      'documentation',
      {},
    ) as DocumentationModel;
    expect(m.documented).toEqual([]);
    expect(m.filedIn).toBe('');
    expect(m.effectiveFrom).toBe('');
    expect(m.notified).toBe('');
  });

  it('empty value -> fiveyear structure padded "", scope empty', () => {
    const m = decodeAdaptiveManagement('fiveyear', {}) as FiveYearModel;
    expect(m.structure).toHaveLength(FIVE_STRUCTURE.length);
    expect(m.structure.every((s) => s === '')).toBe(true);
    expect(m.scope).toEqual([]);
  });

  it('drops foreign / stale values not in the option set', () => {
    const review = decodeAdaptiveManagement('review', {
      amRevTiming: 'not a real option',
      amRevAgenda: ['ghost agenda item', AGENDA_ITEMS[2]!.name],
    }) as ReviewModel;
    expect(review.timing).toBe('');
    expect(review.agenda).toEqual([AGENDA_ITEMS[2]!.name]);

    const trig = decodeAdaptiveManagement('triggers', {
      amTrigResponses: ['bogus', TRIGGERS[0]!.rows[1]!.options[1]!],
    }) as TriggersModel;
    // flat index 0 = T0.rows[0] (bogus -> ""); flat index 1 = T0.rows[1]
    // (a valid option for THAT row -> kept)
    expect(trig.responses[0]).toBe('');
    expect(trig.responses[1]).toBe(TRIGGERS[0]!.rows[1]!.options[1]!);
  });

  it('does not throw on wrong-typed FormValue fields', () => {
    const bad = {
      amRevAgenda: 'a single string not an array',
      amTrigResponses: 'scalar',
    } as unknown as FormValue;
    expect(() => decodeAdaptiveManagement('review', bad)).not.toThrow();
    expect(() => decodeAdaptiveManagement('triggers', bad)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// validity gates
// ---------------------------------------------------------------------------

describe('isAdaptiveManagementValid', () => {
  it('review needs >= 1 agenda item', () => {
    expect(isAdaptiveManagementValid('review', {})).toBe(false);
    expect(
      isAdaptiveManagementValid('review', { amRevAgenda: [AGENDA_ITEMS[0]!.name] }),
    ).toBe(true);
  });

  it('triggers needs >= 1 response set', () => {
    expect(isAdaptiveManagementValid('triggers', {})).toBe(false);
    expect(
      isAdaptiveManagementValid('triggers', {
        amTrigResponses: [TRIGGERS[0]!.rows[0]!.options[0]!],
      }),
    ).toBe(true);
  });

  it('escalation needs >= 1 row or filedIn', () => {
    expect(isAdaptiveManagementValid('escalation', {})).toBe(false);
    expect(
      isAdaptiveManagementValid('escalation', {
        amEscFiledIn: ESC_FILED_OPTIONS[0]!,
      }),
    ).toBe(true);
    expect(
      isAdaptiveManagementValid('escalation', {
        amEscRows: [ESC_TIERS[0]!.rows[0]!.options[0]!],
      }),
    ).toBe(true);
  });

  it('documentation needs >= 1 item', () => {
    expect(isAdaptiveManagementValid('documentation', {})).toBe(false);
    expect(
      isAdaptiveManagementValid('documentation', {
        amDocItems: [DOC_ITEMS[0]!.name],
      }),
    ).toBe(true);
  });

  it('fiveyear needs >= 1 scope item', () => {
    expect(isAdaptiveManagementValid('fiveyear', {})).toBe(false);
    expect(
      isAdaptiveManagementValid('fiveyear', { amFiveScope: [SCOPE_ITEMS[0]!.name] }),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// summaries -- defensive, handle empty
// ---------------------------------------------------------------------------

describe('summariseAdaptiveManagement', () => {
  it('summarises empty values without throwing', () => {
    expect(summariseAdaptiveManagement('review', {})).toBe(
      `0 of ${AGENDA_ITEMS.length} agenda items selected`,
    );
    expect(summariseAdaptiveManagement('triggers', {})).toBe(
      `0 of ${TRIGGER_ROW_COUNT} trigger responses set`,
    );
    expect(summariseAdaptiveManagement('escalation', {})).toBe(
      `0 of ${ESC_ROW_COUNT + 1} escalation responses set`,
    );
    expect(summariseAdaptiveManagement('documentation', {})).toBe(
      `0 of ${DOC_ITEMS.length} documentation items selected`,
    );
    expect(summariseAdaptiveManagement('fiveyear', {})).toBe(
      `0 of ${SCOPE_ITEMS.length} review scope items selected`,
    );
  });

  it('counts set agenda / scope / responses', () => {
    expect(
      summariseAdaptiveManagement('review', {
        amRevAgenda: [AGENDA_ITEMS[0]!.name, AGENDA_ITEMS[1]!.name],
      }),
    ).toBe(`2 of ${AGENDA_ITEMS.length} agenda items selected`);
    expect(
      summariseAdaptiveManagement('escalation', {
        amEscRows: [ESC_TIERS[0]!.rows[0]!.options[0]!],
        amEscFiledIn: ESC_FILED_OPTIONS[0]!,
      }),
    ).toBe(`2 of ${ESC_ROW_COUNT + 1} escalation responses set`);
  });
});
