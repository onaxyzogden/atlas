/**
 * OnboardingCapture -- a multi-mode CONTROLLED capture for the ecovillage
 * objective ev-s7-onboarding ("A sound membership onboarding & integration
 * protocol", ref EV-S7.7, 6 checklist items). Catalogue checklist order is
 * c1,c2,c3,c4,c6,c5 but the mode mapper keys by EXACT item-id slice. Six modes:
 *
 *   c1 -> application   (application + selection process register)
 *   c2 -> trial         (trial residency: duration + expectations + review
 *                        criteria -- NO mid-trial cadence field, steward dec. 4)
 *   c3 -> membership    (full membership criteria + confirmation process)
 *   c4 -> orientation   (orientation program register: governance / systems /
 *                        agreements topics)
 *   c6 -> inclusions    (Stratum-1 community agreements + dispute-resolution
 *                        pathway included in orientation -- verbatim inclusion)
 *   c5 -> mentorship    (mentorship / buddy system for new-household integration)
 *
 * Structure mirrors AdaptiveManagementCapture / SettlementPlanCapture: an
 * `onboardingModeFor(itemId)` mapper plus a single component that renders ONE mode
 * body. The third-column host (DecisionWorkingPanel) owns the chrome + gate-note;
 * this capture renders ONLY the scrollable mode body.
 *
 * ADVISORY / pure: model derived from decode(value) each render; full next model
 * emitted via onChange(encode(next)). NO local state for persisted values, NO
 * projectId, writes NOTHING. decode is TOTAL / defensive: never throws, never
 * fabricates seed/demo data. Register entries are JSON rows (JSON.stringify/parse
 * per entry, try/catch, legacy-<i> id fallback).
 *
 * Amanah / covenant: membership / orientation copy is community-integration
 * (selection, trial, agreements, mentorship) -- no capital instrument, no
 * advance-sale / salam / CSRA framing anywhere. The c6 Stratum-1 inclusion items
 * are transcribed VERBATIM.
 *
 * Pure adapter export `onboardingPipelineFrom(value)` produces
 * CommunityOnboardingStepInput[] for generateCommunityWorkPlan (Phase 4 consumer);
 * shape is { id, stage, name, owner?, window? }.
 *
 * ASCII-only: em-dash -> " -- ". Apostrophes use double-quoted JS strings. All
 * icons are lucide.
 */

import * as React from 'react';
import { ArrowRight, HeartHandshake } from 'lucide-react';

import type { CommunityOnboardingStepInput } from '@ogden/shared';
import type { FormValue } from './actToolCatalog.js';
import {
  ChoiceCardGrid,
  Dropdown,
  RegisterList,
  SectionEyebrow,
  Stepper,
} from './captures/controls/index.js';
import type { ChoiceCardOption } from './captures/controls/index.js';
import css from './OnboardingCapture.module.css';

// ---------------------------------------------------------------------------
// Mode mapper
// ---------------------------------------------------------------------------

export type OnboardingMode =
  | 'application' // c1
  | 'trial' // c2
  | 'membership' // c3
  | 'orientation' // c4
  | 'inclusions' // c6
  | 'mentorship'; // c5

export const ONBOARDING_PREFIX = 'ev-s7-onboarding';
const PREFIX_DASH = ONBOARDING_PREFIX + '-';

export function onboardingModeFor(itemId: string): OnboardingMode | null {
  if (!itemId.startsWith(PREFIX_DASH)) return null;
  switch (itemId.slice(PREFIX_DASH.length)) {
    case 'c1':
      return 'application';
    case 'c2':
      return 'trial';
    case 'c3':
      return 'membership';
    case 'c4':
      return 'orientation';
    case 'c6':
      return 'inclusions';
    case 'c5':
      return 'mentorship';
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Verbatim canonical content (never reword)
// ---------------------------------------------------------------------------

/** Trial-duration options (c2) -- duration is one explicit choice. */
export const TRIAL_DURATION_OPTIONS: readonly string[] = [
  '3 months',
  '6 months',
  '12 months',
];

/**
 * The two Stratum-1 inclusion items (c6) carried VERBATIM from the catalogue
 * prose -- must be included in new-member orientation.
 */
export interface InclusionItem {
  id: string;
  title: string;
  desc: string;
}
export const INCLUSION_ITEMS: readonly InclusionItem[] = [
  {
    id: 'communityAgreements',
    title: 'Stratum 1 community agreements',
    desc: 'Include the founding community agreements in new member orientation.',
  },
  {
    id: 'disputePathway',
    title: 'Dispute resolution pathway',
    desc: 'Include the community dispute resolution pathway in new member orientation.',
  },
];

/** Mentorship / buddy-system model options (c5). */
export const MENTORSHIP_OPTIONS: readonly ChoiceCardOption[] = [
  {
    id: 'buddy',
    title: 'Buddy system',
    description:
      'Each new household is paired with an established household for the trial period.',
  },
  {
    id: 'mentor',
    title: 'Nominated mentor',
    description:
      'A founding member mentors the new household through governance and systems.',
  },
  {
    id: 'circle',
    title: 'Integration circle',
    description:
      'A small group of members supports the new household through integration.',
  },
];

/** Orientation-topic stage options (c4) -- provenance only on the engine step. */
export const ORIENTATION_STAGES: readonly string[] = [
  'governance',
  'systems',
  'agreements',
];

// ---------------------------------------------------------------------------
// Register row models (JSON-row persisted)
// ---------------------------------------------------------------------------

export interface ApplicationStepRow {
  id: string;
  /** the application / selection step */
  name: string;
  /** who owns this step (optional) */
  owner: string;
}

export interface OrientationTopicRow {
  id: string;
  /** topic name */
  name: string;
  /** governance | systems | agreements (provenance stage) */
  stage: string;
  /** who delivers it (optional) */
  owner: string;
  /** when in the onboarding window (optional) */
  window: string;
}

// ---------------------------------------------------------------------------
// Mode models
// ---------------------------------------------------------------------------

export interface ApplicationModel {
  kind: 'application';
  steps: ApplicationStepRow[];
}

export interface TrialModel {
  kind: 'trial';
  /** trial residency duration (constrained to TRIAL_DURATION_OPTIONS). */
  duration: string;
  /** expectations during the trial residency (free text). */
  expectations: string;
  /** review criteria for advancing from trial to membership (free text). */
  reviewCriteria: string;
}

export interface MembershipModel {
  kind: 'membership';
  /** full membership criteria (free text). */
  criteria: string;
  /** confirmation process (free text). */
  confirmation: string;
}

export interface OrientationModel {
  kind: 'orientation';
  topics: OrientationTopicRow[];
}

export interface InclusionsModel {
  kind: 'inclusions';
  /** ids of INCLUSION_ITEMS confirmed included in orientation. */
  included: string[];
}

export interface MentorshipModel {
  kind: 'mentorship';
  /** chosen mentorship model id(s) (subset of MENTORSHIP_OPTIONS ids). */
  models: string[];
  /** mentorship duration in weeks. */
  durationWeeks: number;
}

export type OnboardingModel =
  | ApplicationModel
  | TrialModel
  | MembershipModel
  | OrientationModel
  | InclusionsModel
  | MentorshipModel;

// ---------------------------------------------------------------------------
// FormValue coercion + JSON-row helpers
// ---------------------------------------------------------------------------

function asStr(v: FormValue[string] | undefined): string {
  return typeof v === 'string' ? v : '';
}

function asNum(v: FormValue[string] | undefined): number {
  const n = Number(asStr(v));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function asStrArr(v: FormValue[string] | undefined): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  return typeof v === 'string' && v !== '' ? [v] : [];
}

function asJsonArr(v: FormValue[string] | undefined): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string' && v !== '') return [v];
  return [];
}

function makeRowId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `row-${Math.random().toString(36).slice(2, 10)}`;
  }
}

function constrain(raw: string, allowed: readonly string[]): string {
  return allowed.includes(raw) ? raw : '';
}

function constrainSubset(raw: string[], allowed: readonly string[]): string[] {
  return raw.filter((x) => allowed.includes(x));
}

// ---------------------------------------------------------------------------
// JSON-row decode per register
// ---------------------------------------------------------------------------

function decodeApplicationSteps(v: FormValue[string] | undefined): ApplicationStepRow[] {
  const out: ApplicationStepRow[] = [];
  asJsonArr(v).forEach((entry, i) => {
    try {
      const parsed = JSON.parse(entry) as Partial<ApplicationStepRow>;
      out.push({
        id: typeof parsed.id === 'string' && parsed.id ? parsed.id : `legacy-${i}`,
        name: typeof parsed.name === 'string' ? parsed.name : '',
        owner: typeof parsed.owner === 'string' ? parsed.owner : '',
      });
    } catch {
      out.push({ id: `legacy-${i}`, name: entry, owner: '' });
    }
  });
  return out;
}

function decodeOrientationTopics(v: FormValue[string] | undefined): OrientationTopicRow[] {
  const out: OrientationTopicRow[] = [];
  asJsonArr(v).forEach((entry, i) => {
    try {
      const parsed = JSON.parse(entry) as Partial<OrientationTopicRow>;
      out.push({
        id: typeof parsed.id === 'string' && parsed.id ? parsed.id : `legacy-${i}`,
        name: typeof parsed.name === 'string' ? parsed.name : '',
        stage: constrain(
          typeof parsed.stage === 'string' ? parsed.stage : '',
          ORIENTATION_STAGES,
        ),
        owner: typeof parsed.owner === 'string' ? parsed.owner : '',
        window: typeof parsed.window === 'string' ? parsed.window : '',
      });
    } catch {
      out.push({ id: `legacy-${i}`, name: entry, stage: '', owner: '', window: '' });
    }
  });
  return out;
}

// ---------------------------------------------------------------------------
// decode: FormValue -> OnboardingModel (TOTAL / defensive)
// ---------------------------------------------------------------------------

export function decodeOnboarding(
  mode: OnboardingMode,
  value: FormValue,
): OnboardingModel {
  switch (mode) {
    case 'application':
      return { kind: 'application', steps: decodeApplicationSteps(value.obApplication) };
    case 'trial':
      return {
        kind: 'trial',
        duration: constrain(asStr(value.obTrialDuration), TRIAL_DURATION_OPTIONS),
        expectations: asStr(value.obTrialExpectations),
        reviewCriteria: asStr(value.obTrialReviewCriteria),
      };
    case 'membership':
      return {
        kind: 'membership',
        criteria: asStr(value.obMembershipCriteria),
        confirmation: asStr(value.obMembershipConfirmation),
      };
    case 'orientation':
      return { kind: 'orientation', topics: decodeOrientationTopics(value.obOrientation) };
    case 'inclusions':
      return {
        kind: 'inclusions',
        included: constrainSubset(
          asStrArr(value.obInclusions),
          INCLUSION_ITEMS.map((it) => it.id),
        ),
      };
    case 'mentorship':
      return {
        kind: 'mentorship',
        models: constrainSubset(
          asStrArr(value.obMentorshipModels),
          MENTORSHIP_OPTIONS.map((o) => o.id),
        ),
        durationWeeks: asNum(value.obMentorshipWeeks),
      };
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown OnboardingMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// encode: OnboardingModel -> FormValue (lossless inverse of decode)
// ---------------------------------------------------------------------------

export function encodeOnboarding(model: OnboardingModel): FormValue {
  switch (model.kind) {
    case 'application':
      return { obApplication: model.steps.map((s) => JSON.stringify(s)) };
    case 'trial':
      return {
        obTrialDuration: model.duration,
        obTrialExpectations: model.expectations,
        obTrialReviewCriteria: model.reviewCriteria,
      };
    case 'membership':
      return {
        obMembershipCriteria: model.criteria,
        obMembershipConfirmation: model.confirmation,
      };
    case 'orientation':
      return { obOrientation: model.topics.map((t) => JSON.stringify(t)) };
    case 'inclusions':
      return { obInclusions: [...model.included] };
    case 'mentorship':
      return {
        obMentorshipModels: [...model.models],
        obMentorshipWeeks: String(model.durationWeeks),
      };
    default: {
      const _exhaustive: never = model;
      throw new Error(`Unknown OnboardingModel kind: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// validity gates (sees own value only)
// ---------------------------------------------------------------------------

export function isOnboardingValid(mode: OnboardingMode, value: FormValue): boolean {
  switch (mode) {
    case 'application': {
      const m = decodeOnboarding('application', value) as ApplicationModel;
      return m.steps.some((s) => s.name.trim() !== '');
    }
    case 'trial': {
      const m = decodeOnboarding('trial', value) as TrialModel;
      // Steward decision 4: trial requires duration + expectations + review
      // criteria (NO mid-trial cadence field exists).
      return (
        m.duration !== '' &&
        m.expectations.trim() !== '' &&
        m.reviewCriteria.trim() !== ''
      );
    }
    case 'membership': {
      const m = decodeOnboarding('membership', value) as MembershipModel;
      return m.criteria.trim() !== '' && m.confirmation.trim() !== '';
    }
    case 'orientation': {
      const m = decodeOnboarding('orientation', value) as OrientationModel;
      return m.topics.some((t) => t.name.trim() !== '');
    }
    case 'inclusions': {
      const m = decodeOnboarding('inclusions', value) as InclusionsModel;
      // Both Stratum-1 inclusions must be confirmed in orientation.
      return m.included.length === INCLUSION_ITEMS.length;
    }
    case 'mentorship': {
      const m = decodeOnboarding('mentorship', value) as MentorshipModel;
      return m.models.length >= 1;
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown OnboardingMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// summaries (defensive; never throw; handle empty value)
// ---------------------------------------------------------------------------

export function summariseOnboarding(mode: OnboardingMode, value: FormValue): string {
  switch (mode) {
    case 'application': {
      const m = decodeOnboarding('application', value) as ApplicationModel;
      const filled = m.steps.filter((s) => s.name.trim() !== '').length;
      return `${filled} application / selection step(s)`;
    }
    case 'trial': {
      const m = decodeOnboarding('trial', value) as TrialModel;
      return `Trial: ${m.duration || 'duration TBD'}${
        m.reviewCriteria.trim() !== '' ? ', review criteria set' : ''
      }`;
    }
    case 'membership': {
      const m = decodeOnboarding('membership', value) as MembershipModel;
      const parts: string[] = [];
      if (m.criteria.trim() !== '') parts.push('criteria');
      if (m.confirmation.trim() !== '') parts.push('confirmation process');
      return parts.length ? `Membership ${parts.join(' + ')} defined` : 'Membership not yet defined';
    }
    case 'orientation': {
      const m = decodeOnboarding('orientation', value) as OrientationModel;
      const filled = m.topics.filter((t) => t.name.trim() !== '').length;
      return `${filled} orientation topic(s)`;
    }
    case 'inclusions': {
      const m = decodeOnboarding('inclusions', value) as InclusionsModel;
      return `${m.included.length} of ${INCLUSION_ITEMS.length} Stratum-1 inclusions confirmed`;
    }
    case 'mentorship': {
      const m = decodeOnboarding('mentorship', value) as MentorshipModel;
      return m.models.length
        ? `${m.models.length} mentorship model(s), ${m.durationWeeks} week(s)`
        : 'No mentorship model chosen';
    }
    default: {
      const _exhaustive: never = mode;
      throw new Error(`Unknown OnboardingMode: ${String(_exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Pure adapter export -> generateCommunityWorkPlan onboardingSteps input
// ---------------------------------------------------------------------------

/**
 * onboardingPipelineFrom -- map the recorded onboarding stages onto
 * CommunityOnboardingStepInput[] for the engine. The engine fans these out per
 * pending member (capped at the first 12). Pure: no store, no Date.now().
 *
 *   { id, stage, name, owner?, window? }
 *
 * Composed in pipeline order:
 *   1. application steps (c1)   -- stage 'application'
 *   2. trial review (c2)        -- one synthetic 'trial' step when the trial is
 *                                  defined (duration set)
 *   3. orientation topics (c4)  -- stage carried from the topic row (governance /
 *                                  systems / agreements), default 'orientation'
 *   4. inclusions (c6)          -- one 'orientation' step per confirmed Stratum-1
 *                                  inclusion (verbatim title)
 *   5. mentorship (c5)          -- one 'integration' step per chosen model
 *
 * owner / window are passed through only when non-empty.
 */
export function onboardingPipelineFrom(
  applicationValue: FormValue,
  trialValue: FormValue,
  orientationValue: FormValue,
  inclusionsValue: FormValue,
  mentorshipValue: FormValue,
): CommunityOnboardingStepInput[] {
  const out: CommunityOnboardingStepInput[] = [];

  // 1. application / selection steps
  for (const step of decodeApplicationSteps(applicationValue.obApplication)) {
    if (step.name.trim() === '') continue;
    out.push({
      id: `application-${step.id}`,
      stage: 'application',
      name: step.name.trim(),
      ...(step.owner.trim() !== '' ? { owner: step.owner.trim() } : {}),
    });
  }

  // 2. trial review (single synthetic step when the trial is defined)
  const trial = decodeOnboarding('trial', trialValue) as TrialModel;
  if (trial.duration !== '') {
    out.push({
      id: 'trial-review',
      stage: 'trial',
      name: `Trial residency review -- ${trial.duration}`,
    });
  }

  // 3. orientation topics
  for (const topic of decodeOrientationTopics(orientationValue.obOrientation)) {
    if (topic.name.trim() === '') continue;
    out.push({
      id: `orientation-${topic.id}`,
      stage: topic.stage !== '' ? topic.stage : 'orientation',
      name: topic.name.trim(),
      ...(topic.owner.trim() !== '' ? { owner: topic.owner.trim() } : {}),
      ...(topic.window.trim() !== '' ? { window: topic.window.trim() } : {}),
    });
  }

  // 4. Stratum-1 inclusions (verbatim)
  const inclusions = decodeOnboarding('inclusions', inclusionsValue) as InclusionsModel;
  for (const id of inclusions.included) {
    const item = INCLUSION_ITEMS.find((it) => it.id === id);
    if (!item) continue;
    out.push({
      id: `inclusion-${item.id}`,
      stage: 'orientation',
      name: item.title,
    });
  }

  // 5. mentorship / integration
  const mentorship = decodeOnboarding('mentorship', mentorshipValue) as MentorshipModel;
  for (const id of mentorship.models) {
    const opt = MENTORSHIP_OPTIONS.find((o) => o.id === id);
    if (!opt) continue;
    out.push({
      id: `mentorship-${opt.id}`,
      stage: 'integration',
      name: opt.title,
      ...(mentorship.durationWeeks > 0
        ? { window: `${mentorship.durationWeeks} week(s)` }
        : {}),
    });
  }

  return out;
}

// ===========================================================================
// React component + 6 mode bodies
// ===========================================================================

export interface OnboardingCaptureProps {
  mode: OnboardingMode;
  value: FormValue;
  onChange: (next: FormValue) => void;
  /** this capture's own checklist item id (e.g. ev-s7-onboarding-c1). */
  itemId: string;
  /** full per-item FormValue map; reserved -- this capture reads no siblings. */
  siblingValues?: Record<string, FormValue>;
}

export function OnboardingCapture({
  mode,
  value,
  onChange,
  itemId,
  siblingValues = {},
}: OnboardingCaptureProps): React.JSX.Element {
  void itemId;
  void siblingValues;

  // -- c1: application ------------------------------------------------------
  if (mode === 'application') {
    const model = decodeOnboarding('application', value) as ApplicationModel;
    const update = (steps: ApplicationStepRow[]): void =>
      onChange(encodeOnboarding({ kind: 'application', steps }));
    return (
      <div className={css.root} data-ob-mode="application">
        <SectionEyebrow>Application & selection process for new members</SectionEyebrow>
        <RegisterList<ApplicationStepRow>
          items={model.steps}
          ariaLabel="Application and selection steps"
          addLabel="Add step"
          emptyHint="No application steps yet. Add each step of how a prospective household applies and is selected."
          makeEmpty={() => ({ id: makeRowId(), name: '', owner: '' })}
          onChange={update}
          renderRow={(row, _i, patch) => (
            <div className={css.regRow}>
              <input
                type="text"
                className={css.regInput}
                value={row.name}
                placeholder="Application / selection step"
                aria-label="Application step"
                onChange={(e) => patch({ name: e.target.value })}
              />
              <input
                type="text"
                className={css.regInputSm}
                value={row.owner}
                placeholder="Owner (optional)"
                aria-label="Step owner"
                onChange={(e) => patch({ owner: e.target.value })}
              />
            </div>
          )}
        />
        <FeedsNote>
          The application pipeline feeds the{' '}
          <strong>onboarding work plan</strong> -- each step becomes an onboarding
          work item per pending member.
        </FeedsNote>
      </div>
    );
  }

  // -- c2: trial (duration + expectations + review criteria) ----------------
  if (mode === 'trial') {
    const model = decodeOnboarding('trial', value) as TrialModel;
    const set = (patch: Partial<TrialModel>): void =>
      onChange(encodeOnboarding({ ...model, ...patch }));
    return (
      <div className={css.root} data-ob-mode="trial">
        <div className={css.row}>
          <span className={css.rowLbl}>Trial residency duration</span>
          <Dropdown
            options={TRIAL_DURATION_OPTIONS}
            value={model.duration}
            placeholder="Choose a trial duration"
            ariaLabel="Trial residency duration"
            onChange={(v) => set({ duration: v })}
          />
        </div>
        <div>
          <SectionEyebrow>Expectations during trial residency</SectionEyebrow>
          <textarea
            className={css.textarea}
            value={model.expectations}
            placeholder="What is expected of a household during the trial -- participation, contribution, conduct."
            aria-label="Trial expectations"
            rows={3}
            onChange={(e) => set({ expectations: e.target.value })}
          />
        </div>
        <div>
          <SectionEyebrow>Review criteria</SectionEyebrow>
          <textarea
            className={css.textarea}
            value={model.reviewCriteria}
            placeholder="How the trial is reviewed before advancing to full membership."
            aria-label="Trial review criteria"
            rows={3}
            onChange={(e) => set({ reviewCriteria: e.target.value })}
          />
        </div>
        <FeedsNote>
          The trial review feeds the <strong>full membership confirmation</strong>{' '}
          (decision 3) -- the review criteria are the bar for advancing.
        </FeedsNote>
      </div>
    );
  }

  // -- c3: membership -------------------------------------------------------
  if (mode === 'membership') {
    const model = decodeOnboarding('membership', value) as MembershipModel;
    const set = (patch: Partial<MembershipModel>): void =>
      onChange(encodeOnboarding({ ...model, ...patch }));
    return (
      <div className={css.root} data-ob-mode="membership">
        <div>
          <SectionEyebrow>Full membership criteria</SectionEyebrow>
          <textarea
            className={css.textarea}
            value={model.criteria}
            placeholder="What a household must meet to become a full member."
            aria-label="Full membership criteria"
            rows={3}
            onChange={(e) => set({ criteria: e.target.value })}
          />
        </div>
        <div>
          <SectionEyebrow>Confirmation process</SectionEyebrow>
          <textarea
            className={css.textarea}
            value={model.confirmation}
            placeholder="How full membership is confirmed -- who decides, what record is made."
            aria-label="Membership confirmation process"
            rows={3}
            onChange={(e) => set({ confirmation: e.target.value })}
          />
        </div>
        <FeedsNote>
          Confirmed members enter the <strong>ratification queue</strong> -- the
          confirmation process is the gate before a household is ratified.
        </FeedsNote>
      </div>
    );
  }

  // -- c4: orientation ------------------------------------------------------
  if (mode === 'orientation') {
    const model = decodeOnboarding('orientation', value) as OrientationModel;
    const update = (topics: OrientationTopicRow[]): void =>
      onChange(encodeOnboarding({ kind: 'orientation', topics }));
    return (
      <div className={css.root} data-ob-mode="orientation">
        <SectionEyebrow>
          Orientation program{' '}
          <span className={css.hintInline}>(governance, systems, agreements)</span>
        </SectionEyebrow>
        <RegisterList<OrientationTopicRow>
          items={model.topics}
          ariaLabel="Orientation topics"
          addLabel="Add topic"
          emptyHint="No orientation topics yet. Add each topic a new member is oriented on."
          makeEmpty={() => ({
            id: makeRowId(),
            name: '',
            stage: '',
            owner: '',
            window: '',
          })}
          onChange={update}
          renderRow={(row, _i, patch) => (
            <div className={css.regRow}>
              <input
                type="text"
                className={css.regInput}
                value={row.name}
                placeholder="Orientation topic"
                aria-label="Orientation topic"
                onChange={(e) => patch({ name: e.target.value })}
              />
              <div className={css.orientMeta}>
                <Dropdown
                  options={ORIENTATION_STAGES}
                  value={row.stage}
                  placeholder="Stage"
                  ariaLabel="Orientation stage"
                  onChange={(v) => patch({ stage: v })}
                />
                <input
                  type="text"
                  className={css.regInputSm}
                  value={row.owner}
                  placeholder="Owner (optional)"
                  aria-label="Topic owner"
                  onChange={(e) => patch({ owner: e.target.value })}
                />
                <input
                  type="text"
                  className={css.regInputSm}
                  value={row.window}
                  placeholder="When (optional)"
                  aria-label="Topic window"
                  onChange={(e) => patch({ window: e.target.value })}
                />
              </div>
            </div>
          )}
        />
        <FeedsNote>
          Orientation topics feed the <strong>onboarding work plan</strong> -- and
          must include the Stratum-1 agreements & dispute pathway (decision 6).
        </FeedsNote>
      </div>
    );
  }

  // -- c6: inclusions (verbatim Stratum-1 items) ----------------------------
  if (mode === 'inclusions') {
    const model = decodeOnboarding('inclusions', value) as InclusionsModel;
    const toggle = (id: string): void => {
      const included = model.included.includes(id)
        ? model.included.filter((x) => x !== id)
        : [...model.included, id];
      onChange(encodeOnboarding({ kind: 'inclusions', included }));
    };
    return (
      <div className={css.root} data-ob-mode="inclusions">
        <SectionEyebrow>
          Stratum 1 inclusions in new member orientation
        </SectionEyebrow>
        <p className={css.modeHint}>
          Both items must be included in orientation so every new member arrives
          with the community agreements and a dispute pathway.
        </p>
        <div className={css.inclusionList}>
          {INCLUSION_ITEMS.map((item) => {
            const on = model.included.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                className={css.inclusionRow}
                data-on={on}
                aria-pressed={on}
                onClick={() => toggle(item.id)}
              >
                <span className={css.signDot} aria-hidden="true" />
                <span className={css.inclusionBody}>
                  <span className={css.inclusionTitle}>{item.title}</span>
                  <span className={css.inclusionDesc}>{item.desc}</span>
                </span>
              </button>
            );
          })}
        </div>
        <FeedsNote>
          Confirmed inclusions feed the <strong>orientation program</strong>{' '}
          (decision 4) -- they are required topics, not optional ones.
        </FeedsNote>
      </div>
    );
  }

  // -- c5: mentorship -------------------------------------------------------
  const model = decodeOnboarding('mentorship', value) as MentorshipModel;
  const setModels = (models: string[]): void =>
    onChange(encodeOnboarding({ ...model, models }));
  const setWeeks = (durationWeeks: number): void =>
    onChange(encodeOnboarding({ ...model, durationWeeks }));
  return (
    <div className={css.root} data-ob-mode="mentorship">
      <SectionEyebrow>
        <HeartHandshake size={13} aria-hidden="true" /> Mentorship or buddy system
      </SectionEyebrow>
      <ChoiceCardGrid
        options={MENTORSHIP_OPTIONS}
        value={model.models}
        multi
        ariaLabel="Mentorship model"
        onChange={setModels}
      />
      <div className={css.row}>
        <span className={css.rowLbl}>Mentorship duration (weeks)</span>
        <Stepper
          value={model.durationWeeks}
          min={0}
          ariaLabel="Mentorship duration in weeks"
          onChange={setWeeks}
        />
      </div>
      <FeedsNote>
        The mentorship model feeds the <strong>integration work plan</strong> --
        each chosen model becomes an integration step per new household.
      </FeedsNote>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

/** Feeds callout (mockup `.fb`). */
function FeedsNote({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className={css.feedsBlock}>
      <ArrowRight size={13} className={css.feedsIcon} aria-hidden="true" />
      <div className={css.feedsTxt}>{children}</div>
    </div>
  );
}

export default OnboardingCapture;
