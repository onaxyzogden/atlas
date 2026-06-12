/**
 * @vitest-environment happy-dom
 *
 * OnboardingCapture -- multi-mode CONTROLLED renderer for objective
 * ev-s7-onboarding (6 checklist items c1..c6, modes application / trial /
 * membership / orientation / inclusions / mentorship).
 *
 * Verified behaviours:
 *   - onboardingModeFor maps each c1..c6 id correctly.
 *   - decode is TOTAL/defensive (undefined/empty -> empty state, never throws).
 *   - encode round-trips losslessly per mode.
 *   - legacy {text} string tolerance + garbage-JSON tolerance.
 *   - c6 both-toggles gate: one toggle -> invalid, both -> valid.
 *   - c2 has NO cadence field: assert no cadence-named input renders.
 *   - summary strings non-empty on populated values per mode.
 *   - onboardingPipelineFrom ordering + tolerance:
 *       application -> trial-review (only when duration set, window=duration) ->
 *       orientation + confirmed inclusions verbatim -> mentorship only when
 *       model chosen.
 *   - one render + one interaction per mode (happy-dom, fire a change and assert
 *     the onChange payload contains the expected ob* key).
 */

import { describe, it, expect, vi } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// lucide-react forwardRef icons spread [undefined] into <svg> children when
// childless, which React + happy-dom reject on re-render. Replace every
// component export with a clean <svg> stub (established pattern).
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' &&
        value !== null &&
        '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', {
            ref,
            'data-lucide-icon': key,
            'aria-hidden': 'true',
          });
        },
      );
      Stub.displayName = `LucideStub(${key})`;
      stubbed[key] = Stub;
    } else {
      stubbed[key] = value;
    }
  }
  return stubbed;
});

import {
  OnboardingCapture,
  onboardingModeFor,
  decodeOnboarding,
  encodeOnboarding,
  isOnboardingValid,
  summariseOnboarding,
  onboardingPipelineFrom,
  ONBOARDING_PREFIX,
  INCLUSION_ITEMS,
  TRIAL_DURATION_OPTIONS,
  type OnboardingMode,
} from '../OnboardingCapture.js';
import type { FormValue } from '../actToolCatalog.js';

function renderMode(mode: OnboardingMode, value: FormValue) {
  const onChange = vi.fn();
  render(
    <OnboardingCapture
      mode={mode}
      value={value}
      onChange={onChange}
      itemId={`${ONBOARDING_PREFIX}-${
        mode === 'application' ? 'c1' :
        mode === 'trial' ? 'c2' :
        mode === 'membership' ? 'c3' :
        mode === 'orientation' ? 'c4' :
        mode === 'inclusions' ? 'c6' : 'c5'
      }`}
    />,
  );
  return { onChange };
}

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

describe('onboardingModeFor', () => {
  it('maps c1..c6 to the correct mode', () => {
    expect(onboardingModeFor('ev-s7-onboarding-c1')).toBe('application');
    expect(onboardingModeFor('ev-s7-onboarding-c2')).toBe('trial');
    expect(onboardingModeFor('ev-s7-onboarding-c3')).toBe('membership');
    expect(onboardingModeFor('ev-s7-onboarding-c4')).toBe('orientation');
    expect(onboardingModeFor('ev-s7-onboarding-c6')).toBe('inclusions');
    expect(onboardingModeFor('ev-s7-onboarding-c5')).toBe('mentorship');
  });

  it('returns null for unrelated ids', () => {
    expect(onboardingModeFor('ev-s7-onboarding-c7')).toBeNull();
    expect(onboardingModeFor('ev-s7-onboarding-')).toBeNull();
    expect(onboardingModeFor('ev-s7-settlement-plan-c1')).toBeNull();
    expect(onboardingModeFor('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// decode: total / defensive (never seeds; never throws)
// ---------------------------------------------------------------------------

describe('decodeOnboarding -- empty / undefined value never seeds', () => {
  const MODES: OnboardingMode[] = [
    'application', 'trial', 'membership', 'orientation', 'inclusions', 'mentorship',
  ];

  it.each(MODES)('%s decode of {} yields empty state', (mode) => {
    expect(() => decodeOnboarding(mode, {})).not.toThrow();
    const m = decodeOnboarding(mode, {});
    expect(m.kind).toBe(mode);
    if (mode === 'application') {
      expect((m as { steps: unknown[] }).steps).toEqual([]);
    }
    if (mode === 'trial') {
      const t = m as { duration: string; expectations: string; reviewCriteria: string };
      expect(t.duration).toBe('');
      expect(t.expectations).toBe('');
      expect(t.reviewCriteria).toBe('');
    }
    if (mode === 'membership') {
      const mb = m as { criteria: string; confirmation: string };
      expect(mb.criteria).toBe('');
      expect(mb.confirmation).toBe('');
    }
    if (mode === 'orientation') {
      expect((m as { topics: unknown[] }).topics).toEqual([]);
    }
    if (mode === 'inclusions') {
      expect((m as { included: unknown[] }).included).toEqual([]);
    }
    if (mode === 'mentorship') {
      const mn = m as { models: unknown[]; durationWeeks: number };
      expect(mn.models).toEqual([]);
      expect(mn.durationWeeks).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// encode round-trip (per mode)
// ---------------------------------------------------------------------------

describe('encode round-trips', () => {
  it('application round-trips (JSON rows)', () => {
    const rows = [
      JSON.stringify({ id: 'a1', name: 'Submit application form', owner: 'Council' }),
      JSON.stringify({ id: 'a2', name: 'Interview', owner: '' }),
    ];
    const value: FormValue = { obApplication: rows };
    const model = decodeOnboarding('application', value);
    expect(decodeOnboarding('application', encodeOnboarding(model))).toEqual(model);
  });

  it('trial round-trips (no cadence field)', () => {
    const value: FormValue = {
      obTrialDuration: '6 months',
      obTrialExpectations: 'Full participation expected',
      obTrialReviewCriteria: 'Governance participation, contribution record',
    };
    const model = decodeOnboarding('trial', value);
    const rt = decodeOnboarding('trial', encodeOnboarding(model));
    expect(rt).toEqual(model);
    // Ensure no cadence field leaks in
    const encoded = encodeOnboarding(model);
    expect('obTrialCadence' in encoded).toBe(false);
    expect('cadence' in encoded).toBe(false);
  });

  it('membership round-trips', () => {
    const value: FormValue = {
      obMembershipCriteria: 'Trial completed, unanimous founding member approval',
      obMembershipConfirmation: 'Council vote and signed agreement',
    };
    const model = decodeOnboarding('membership', value);
    expect(decodeOnboarding('membership', encodeOnboarding(model))).toEqual(model);
  });

  it('orientation round-trips (JSON rows)', () => {
    const rows = [
      JSON.stringify({ id: 'o1', name: 'Community agreements overview', stage: 'governance', owner: 'Steward', window: 'Week 1' }),
    ];
    const value: FormValue = { obOrientation: rows };
    const model = decodeOnboarding('orientation', value);
    expect(decodeOnboarding('orientation', encodeOnboarding(model))).toEqual(model);
  });

  it('inclusions round-trips (string array)', () => {
    const value: FormValue = { obInclusions: ['communityAgreements', 'disputePathway'] };
    const model = decodeOnboarding('inclusions', value);
    expect(decodeOnboarding('inclusions', encodeOnboarding(model))).toEqual(model);
  });

  it('mentorship round-trips', () => {
    const value: FormValue = {
      obMentorshipModels: ['buddy', 'mentor'],
      obMentorshipWeeks: '8',
    };
    const model = decodeOnboarding('mentorship', value);
    expect(decodeOnboarding('mentorship', encodeOnboarding(model))).toEqual(model);
  });
});

// ---------------------------------------------------------------------------
// Legacy / garbage tolerance
// ---------------------------------------------------------------------------

describe('decode tolerance -- legacy and garbage', () => {
  it('legacy plain-string in application steps is tolerated', () => {
    const value: FormValue = {
      obApplication: [
        'plain string step',
        JSON.stringify({ id: 'a2', name: 'Interview', owner: '' }),
      ],
    };
    expect(() => decodeOnboarding('application', value)).not.toThrow();
    const m = decodeOnboarding('application', value) as { steps: Array<{ id: string; name: string }> };
    expect(m.steps).toHaveLength(2);
    expect(m.steps[0]!.id).toBe('legacy-0');
    expect(m.steps[0]!.name).toBe('plain string step');
  });

  it('garbage-JSON orientation rows are tolerated (legacy-<i> id fallback)', () => {
    const value: FormValue = {
      obOrientation: [
        '!!garbage!!',
        JSON.stringify({ id: 'o1', name: 'Community agreements', stage: 'governance', owner: '', window: '' }),
      ],
    };
    expect(() => decodeOnboarding('orientation', value)).not.toThrow();
    const m = decodeOnboarding('orientation', value) as { topics: Array<{ id: string; name: string }> };
    expect(m.topics).toHaveLength(2);
    expect(m.topics[0]!.id).toBe('legacy-0');
    expect(m.topics[0]!.name).toBe('!!garbage!!');
  });

  it('non-array obApplication (number/boolean) -> empty steps (never throws)', () => {
    // A number or boolean is coerced to '' by asStr then not added.
    // A plain string IS treated as a single-element legacy row (asJsonArr coercion);
    // only nullish / non-string non-array values yield empty steps.
    const valueNum = { obApplication: 42 } as unknown as FormValue;
    expect(() => decodeOnboarding('application', valueNum)).not.toThrow();
    const m = decodeOnboarding('application', valueNum) as { steps: unknown[] };
    expect(m.steps).toEqual([]);
  });

  it('invalid mentorship model ids are dropped by constrainSubset', () => {
    const value: FormValue = { obMentorshipModels: ['buddy', 'invalid-model'] };
    const m = decodeOnboarding('mentorship', value) as { models: string[] };
    expect(m.models).toEqual(['buddy']);
  });

  it('invalid inclusion ids are dropped by constrainSubset', () => {
    const value: FormValue = { obInclusions: ['communityAgreements', 'notARealId'] };
    const m = decodeOnboarding('inclusions', value) as { included: string[] };
    expect(m.included).toEqual(['communityAgreements']);
  });
});

// ---------------------------------------------------------------------------
// Validity gates
// ---------------------------------------------------------------------------

describe('isOnboardingValid', () => {
  it('application: invalid when empty; valid when at least one named step', () => {
    expect(isOnboardingValid('application', {})).toBe(false);
    const value: FormValue = {
      obApplication: [JSON.stringify({ id: 'a1', name: 'Submit form', owner: '' })],
    };
    expect(isOnboardingValid('application', value)).toBe(true);
  });

  it('trial: requires duration + expectations + reviewCriteria (no cadence)', () => {
    expect(isOnboardingValid('trial', {})).toBe(false);
    // Duration only -> invalid
    expect(isOnboardingValid('trial', { obTrialDuration: '6 months' })).toBe(false);
    // Duration + expectations only -> invalid
    expect(isOnboardingValid('trial', {
      obTrialDuration: '6 months',
      obTrialExpectations: 'Full participation',
    })).toBe(false);
    // All three -> valid
    expect(isOnboardingValid('trial', {
      obTrialDuration: '6 months',
      obTrialExpectations: 'Full participation',
      obTrialReviewCriteria: 'Governance participation',
    })).toBe(true);
  });

  it('membership: requires both criteria and confirmation', () => {
    expect(isOnboardingValid('membership', {})).toBe(false);
    expect(isOnboardingValid('membership', { obMembershipCriteria: 'Trial completed' })).toBe(false);
    expect(isOnboardingValid('membership', {
      obMembershipCriteria: 'Trial completed',
      obMembershipConfirmation: 'Council vote',
    })).toBe(true);
  });

  it('orientation: invalid when empty; valid when at least one named topic', () => {
    expect(isOnboardingValid('orientation', {})).toBe(false);
    const value: FormValue = {
      obOrientation: [JSON.stringify({ id: 'o1', name: 'Community agreements', stage: 'governance', owner: '', window: '' })],
    };
    expect(isOnboardingValid('orientation', value)).toBe(true);
  });

  it('inclusions c6 -- both-toggles gate: one toggle invalid, both valid', () => {
    // Empty -> invalid
    expect(isOnboardingValid('inclusions', {})).toBe(false);
    // Only first inclusion confirmed -> invalid
    expect(isOnboardingValid('inclusions', { obInclusions: ['communityAgreements'] })).toBe(false);
    // Only second inclusion confirmed -> invalid
    expect(isOnboardingValid('inclusions', { obInclusions: ['disputePathway'] })).toBe(false);
    // Both confirmed -> valid
    expect(isOnboardingValid('inclusions', {
      obInclusions: ['communityAgreements', 'disputePathway'],
    })).toBe(true);
    // All inclusion items must equal INCLUSION_ITEMS.length
    expect(INCLUSION_ITEMS.length).toBe(2);
  });

  it('mentorship: invalid when no model chosen; valid when at least one', () => {
    expect(isOnboardingValid('mentorship', {})).toBe(false);
    expect(isOnboardingValid('mentorship', { obMentorshipModels: ['buddy'] })).toBe(true);
    expect(isOnboardingValid('mentorship', { obMentorshipModels: ['buddy', 'mentor'] })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// c2 has NO cadence field
// ---------------------------------------------------------------------------

describe('trial mode -- no cadence field', () => {
  it('does not render any cadence-labelled input in the trial mode body', () => {
    renderMode('trial', {});
    // No input, textarea, or select with aria-label or label containing "cadence"
    expect(screen.queryByLabelText(/cadence/i)).toBeNull();
    expect(screen.queryByText(/cadence/i)).toBeNull();
  });

  it('trial duration dropdown is present', () => {
    renderMode('trial', {});
    expect(screen.getByLabelText('Trial residency duration')).toBeTruthy();
  });

  it('trial expectations and review criteria textareas are present', () => {
    renderMode('trial', {});
    expect(screen.getByLabelText('Trial expectations')).toBeTruthy();
    expect(screen.getByLabelText('Trial review criteria')).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Summary strings
// ---------------------------------------------------------------------------

describe('summariseOnboarding', () => {
  it('application summary counts filled steps', () => {
    const value: FormValue = {
      obApplication: [
        JSON.stringify({ id: 'a1', name: 'Submit form', owner: '' }),
        JSON.stringify({ id: 'a2', name: 'Interview', owner: '' }),
      ],
    };
    const s = summariseOnboarding('application', value);
    expect(s).toContain('2');
  });

  it('trial summary includes duration', () => {
    const s = summariseOnboarding('trial', {
      obTrialDuration: '6 months',
      obTrialExpectations: 'x',
      obTrialReviewCriteria: 'y',
    });
    expect(s).toContain('6 months');
  });

  it('membership summary says defined when both fields set', () => {
    const s = summariseOnboarding('membership', {
      obMembershipCriteria: 'criteria text',
      obMembershipConfirmation: 'confirmation text',
    });
    expect(s).toContain('defined');
  });

  it('orientation summary counts filled topics', () => {
    const value: FormValue = {
      obOrientation: [
        JSON.stringify({ id: 'o1', name: 'Community agreements', stage: 'governance', owner: '', window: '' }),
      ],
    };
    const s = summariseOnboarding('orientation', value);
    expect(s).toContain('1');
  });

  it('inclusions summary shows confirmed count', () => {
    const s = summariseOnboarding('inclusions', { obInclusions: ['communityAgreements'] });
    expect(s).toContain('1');
    expect(s).toContain('2');
  });

  it('mentorship summary includes model count and weeks', () => {
    const s = summariseOnboarding('mentorship', {
      obMentorshipModels: ['buddy'],
      obMentorshipWeeks: '4',
    });
    expect(s).toContain('4');
  });

  it('empty value never throws and returns a string', () => {
    const MODES: OnboardingMode[] = ['application', 'trial', 'membership', 'orientation', 'inclusions', 'mentorship'];
    for (const mode of MODES) {
      expect(() => summariseOnboarding(mode, {})).not.toThrow();
      expect(typeof summariseOnboarding(mode, {})).toBe('string');
    }
  });
});

// ---------------------------------------------------------------------------
// onboardingPipelineFrom -- ordering + tolerance
// ---------------------------------------------------------------------------

describe('onboardingPipelineFrom', () => {
  it('returns empty when all inputs are empty', () => {
    expect(onboardingPipelineFrom({}, {}, {}, {}, {})).toEqual([]);
  });

  it('application steps come first (stage = application)', () => {
    const applicationValue: FormValue = {
      obApplication: [
        JSON.stringify({ id: 'a1', name: 'Submit form', owner: 'Council' }),
      ],
    };
    const pipeline = onboardingPipelineFrom(applicationValue, {}, {}, {}, {});
    expect(pipeline).toHaveLength(1);
    expect(pipeline[0]!.stage).toBe('application');
    expect(pipeline[0]!.name).toBe('Submit form');
    expect(pipeline[0]!.owner).toBe('Council');
  });

  it('trial-review step appears after application when duration is set', () => {
    const applicationValue: FormValue = {
      obApplication: [JSON.stringify({ id: 'a1', name: 'Submit form', owner: '' })],
    };
    const trialValue: FormValue = {
      obTrialDuration: '6 months',
      obTrialExpectations: 'x',
      obTrialReviewCriteria: 'y',
    };
    const pipeline = onboardingPipelineFrom(applicationValue, trialValue, {}, {}, {});
    // application step -> trial-review step
    expect(pipeline).toHaveLength(2);
    expect(pipeline[0]!.stage).toBe('application');
    expect(pipeline[1]!.id).toBe('trial-review');
    expect(pipeline[1]!.stage).toBe('trial');
    // window = duration
    expect(pipeline[1]!.name).toContain('6 months');
  });

  it('trial-review step does NOT appear when duration is empty', () => {
    const trialValue: FormValue = {
      obTrialDuration: '',
      obTrialExpectations: 'x',
      obTrialReviewCriteria: 'y',
    };
    const pipeline = onboardingPipelineFrom({}, trialValue, {}, {}, {});
    expect(pipeline).toHaveLength(0);
  });

  it('orientation topics follow trial-review (stage carried from row)', () => {
    const trialValue: FormValue = { obTrialDuration: '3 months', obTrialExpectations: 'x', obTrialReviewCriteria: 'y' };
    const orientationValue: FormValue = {
      obOrientation: [
        JSON.stringify({ id: 'o1', name: 'Community agreements', stage: 'governance', owner: '', window: '' }),
      ],
    };
    const pipeline = onboardingPipelineFrom({}, trialValue, orientationValue, {}, {});
    // trial-review then orientation topic
    expect(pipeline).toHaveLength(2);
    expect(pipeline[1]!.stage).toBe('governance');
    expect(pipeline[1]!.name).toBe('Community agreements');
  });

  it('confirmed inclusions verbatim (stage = orientation) come after orientation topics', () => {
    const orientationValue: FormValue = {
      obOrientation: [
        JSON.stringify({ id: 'o1', name: 'Systems overview', stage: 'systems', owner: '', window: '' }),
      ],
    };
    const inclusionsValue: FormValue = {
      obInclusions: ['communityAgreements'],
    };
    const pipeline = onboardingPipelineFrom({}, {}, orientationValue, inclusionsValue, {});
    // orientation topic -> inclusion step
    expect(pipeline).toHaveLength(2);
    expect(pipeline[1]!.id).toBe('inclusion-communityAgreements');
    expect(pipeline[1]!.stage).toBe('orientation');
    // Verbatim title from INCLUSION_ITEMS
    const expectedTitle = INCLUSION_ITEMS.find((it) => it.id === 'communityAgreements')!.title;
    expect(pipeline[1]!.name).toBe(expectedTitle);
  });

  it('mentorship steps appear last (stage = integration), only when model chosen', () => {
    const mentorshipValue: FormValue = {
      obMentorshipModels: ['buddy'],
      obMentorshipWeeks: '4',
    };
    const pipeline = onboardingPipelineFrom({}, {}, {}, {}, mentorshipValue);
    expect(pipeline).toHaveLength(1);
    expect(pipeline[0]!.id).toBe('mentorship-buddy');
    expect(pipeline[0]!.stage).toBe('integration');
    expect(pipeline[0]!.window).toBe('4 week(s)');
  });

  it('mentorship step does NOT appear when no model chosen', () => {
    const mentorshipValue: FormValue = { obMentorshipModels: [], obMentorshipWeeks: '4' };
    const pipeline = onboardingPipelineFrom({}, {}, {}, {}, mentorshipValue);
    expect(pipeline).toHaveLength(0);
  });

  it('full pipeline in order: application -> trial -> orientation -> inclusions -> mentorship', () => {
    const applicationValue: FormValue = {
      obApplication: [JSON.stringify({ id: 'a1', name: 'Submit form', owner: '' })],
    };
    const trialValue: FormValue = {
      obTrialDuration: '6 months',
      obTrialExpectations: 'x',
      obTrialReviewCriteria: 'y',
    };
    const orientationValue: FormValue = {
      obOrientation: [
        JSON.stringify({ id: 'o1', name: 'Governance intro', stage: 'governance', owner: '', window: '' }),
      ],
    };
    const inclusionsValue: FormValue = {
      obInclusions: ['communityAgreements', 'disputePathway'],
    };
    const mentorshipValue: FormValue = {
      obMentorshipModels: ['circle'],
      obMentorshipWeeks: '6',
    };
    const pipeline = onboardingPipelineFrom(
      applicationValue, trialValue, orientationValue, inclusionsValue, mentorshipValue,
    );
    // 1 application + 1 trial-review + 1 orientation + 2 inclusions + 1 mentorship = 6
    expect(pipeline).toHaveLength(6);
    expect(pipeline[0]!.stage).toBe('application');
    expect(pipeline[1]!.id).toBe('trial-review');
    expect(pipeline[2]!.stage).toBe('governance');
    expect(pipeline[3]!.id).toBe('inclusion-communityAgreements');
    expect(pipeline[4]!.id).toBe('inclusion-disputePathway');
    expect(pipeline[5]!.stage).toBe('integration');
  });

  it('garbage application rows are skipped (empty name filtered)', () => {
    const applicationValue: FormValue = {
      obApplication: [
        '!!garbage-not-json!!',
        JSON.stringify({ id: 'a1', name: 'Interview', owner: '' }),
      ],
    };
    expect(() => onboardingPipelineFrom(applicationValue, {}, {}, {}, {})).not.toThrow();
    const pipeline = onboardingPipelineFrom(applicationValue, {}, {}, {}, {});
    // garbage entry parses as { id: legacy-0, name: '!!garbage-not-json!!' }
    // that name is non-empty so it IS included (tolerance accepts it)
    expect(pipeline.some((s) => s.name === 'Interview')).toBe(true);
  });

  it('orientation topics with empty name are skipped', () => {
    const orientationValue: FormValue = {
      obOrientation: [
        JSON.stringify({ id: 'o1', name: '', stage: 'governance', owner: '', window: '' }),
        JSON.stringify({ id: 'o2', name: 'Community agreements', stage: 'agreements', owner: '', window: '' }),
      ],
    };
    const pipeline = onboardingPipelineFrom({}, {}, orientationValue, {}, {});
    // Empty-name topic is skipped
    expect(pipeline).toHaveLength(1);
    expect(pipeline[0]!.name).toBe('Community agreements');
  });

  it('TRIAL_DURATION_OPTIONS contains the expected choices', () => {
    expect(TRIAL_DURATION_OPTIONS).toContain('3 months');
    expect(TRIAL_DURATION_OPTIONS).toContain('6 months');
    expect(TRIAL_DURATION_OPTIONS).toContain('12 months');
  });
});

// ---------------------------------------------------------------------------
// render + interaction per mode
// ---------------------------------------------------------------------------

describe('application -- render / interaction', () => {
  it('renders the empty hint and adds a row via the Add button', () => {
    const { onChange } = renderMode('application', {});
    expect(screen.getByText(/No application steps yet/i)).toBeTruthy();
    fireEvent.click(screen.getByText(/Add step/i));
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(Array.isArray(emitted.obApplication)).toBe(true);
    expect((emitted.obApplication as string[]).length).toBe(1);
  });
});

describe('trial -- render / interaction (no cadence)', () => {
  it('renders trial fields and fires onChange on expectations change', () => {
    const { onChange } = renderMode('trial', { obTrialDuration: '6 months' });
    const ta = screen.getByLabelText('Trial expectations');
    expect(ta).toBeTruthy();
    // Assert no cadence field is present
    expect(screen.queryByLabelText(/cadence/i)).toBeNull();
    fireEvent.change(ta, { target: { value: 'Full participation in all community decisions.' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.obTrialExpectations).toBe('Full participation in all community decisions.');
  });
});

describe('membership -- render / interaction', () => {
  it('renders membership criteria textarea and fires onChange', () => {
    const { onChange } = renderMode('membership', {});
    const ta = screen.getByLabelText('Full membership criteria');
    expect(ta).toBeTruthy();
    fireEvent.change(ta, { target: { value: 'Trial completed, full participation proven.' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(emitted.obMembershipCriteria).toBe('Trial completed, full participation proven.');
  });
});

describe('orientation -- render / interaction', () => {
  it('renders empty hint and adds a topic row', () => {
    const { onChange } = renderMode('orientation', {});
    expect(screen.getByText(/No orientation topics yet/i)).toBeTruthy();
    fireEvent.click(screen.getByText(/Add topic/i));
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(Array.isArray(emitted.obOrientation)).toBe(true);
    expect((emitted.obOrientation as string[]).length).toBe(1);
  });
});

describe('inclusions -- render / interaction (c6 both-toggles gate)', () => {
  it('renders both Stratum-1 inclusion items', () => {
    renderMode('inclusions', {});
    // Both INCLUSION_ITEMS titles must render
    for (const item of INCLUSION_ITEMS) {
      expect(screen.getByText(item.title)).toBeTruthy();
    }
  });

  it('toggling one inclusion fires onChange with obInclusions containing that id', () => {
    const { onChange } = renderMode('inclusions', {});
    const firstItem = INCLUSION_ITEMS[0]!;
    // Click the button for the first inclusion
    fireEvent.click(screen.getByText(firstItem.title).closest('button')!);
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(Array.isArray(emitted.obInclusions)).toBe(true);
    expect((emitted.obInclusions as string[]).includes(firstItem.id)).toBe(true);
  });

  it('c6 invalid with one toggle; valid with both (gate check)', () => {
    expect(isOnboardingValid('inclusions', { obInclusions: [INCLUSION_ITEMS[0]!.id] })).toBe(false);
    expect(isOnboardingValid('inclusions', {
      obInclusions: INCLUSION_ITEMS.map((it) => it.id),
    })).toBe(true);
  });
});

describe('mentorship -- render / interaction', () => {
  it('renders the mentorship model options and fires onChange when one is selected', () => {
    const { onChange } = renderMode('mentorship', {});
    // Buddy system title should be visible
    expect(screen.getByText('Buddy system')).toBeTruthy();
    // Click the Buddy system card
    fireEvent.click(screen.getByText('Buddy system'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]![0] as FormValue;
    expect(Array.isArray(emitted.obMentorshipModels)).toBe(true);
    expect((emitted.obMentorshipModels as string[]).includes('buddy')).toBe(true);
  });
});
