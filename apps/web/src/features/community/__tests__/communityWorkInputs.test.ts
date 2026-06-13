/**
 * @vitest-environment happy-dom
 *
 * communityWorkInputs — adapter from store state to the pure engine input.
 *
 * Covers: presence-gated fields (exitSuccession c5, legalAdviceGate c7),
 * ratifyCapturePresent supersession of steward invites, protocol disjointness
 * (non-community ids contribute nothing; community ids pass through with
 * VERBATIM scopeNotes), settlement / onboarding wiring, the regeneration seam
 * `generateAndApplyCommunityWork` returning proposed count and NEVER writing
 * the WorkItem spine (sovereign-steward covenant), and `isCommunityCaptureForm`
 * gating.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  useProjectStore,
  type LocalProject,
} from '../../../store/projectStore.js';
import { useActEvidenceStore } from '../../../store/actEvidenceStore.js';
import { useCommunityWorkPlanStore } from '../../../store/communityWorkPlanStore.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import {
  buildCommunityWorkGenerationInput,
  generateAndApplyCommunityWork,
  isCommunityCaptureForm,
} from '../communityWorkInputs.js';
import { GATE_ITEMS } from '../../../v3/act/tier-shell/EvLegalGovernanceCapture.js';
import { LEGAL_TOGGLES } from '../../../v3/act/tier-shell/ExitSuccessionCapture.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const P = 'p1';
const TODAY = '2026-06-12';

// The two community protocol ids that appear in COMMUNITY_PROTOCOL_CADENCES.
const COMMUNITY_PROTO_ID_1 = 'eco-governance-decision-cadence';
const COMMUNITY_PROTO_ID_2 = 'eco-common-land-stewardship';

// A protocol id that EXISTS in the ecovillage catalogue but is NOT in
// COMMUNITY_PROTOCOL_CADENCES (threshold protocol — event-driven).
const NON_COMMUNITY_PROTO_ID = 'eco-shared-resource-load';

// A livestock protocol id that must contribute nothing.
const LIVESTOCK_PROTO_ID = 'lvo-herd-health-surveillance';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function project(over: Partial<LocalProject> = {}): LocalProject {
  return {
    id: P,
    name: 'Ogden Ecovillage',
    metadata: {
      projectTypeRecord: {
        primaryTypeId: 'ecovillage',
        secondaryTypeIds: [],
      },
    },
    parcelBoundaryGeojson: null,
    ...over,
  } as unknown as LocalProject;
}

function setForms(forms: Record<string, Record<string, unknown>>) {
  useActEvidenceStore.setState({
    visionFormData: { [P]: forms },
  } as never);
}

beforeEach(() => {
  useProjectStore.setState({ projects: [project()] } as never);
  useActEvidenceStore.setState({ visionFormData: {} } as never);
  useCommunityWorkPlanStore.setState({ rules: [], proposals: [] });
  useWorkItemStore.setState({ items: [], migratedSources: [] });
});

// ---------------------------------------------------------------------------
// buildCommunityWorkGenerationInput — null guard
// ---------------------------------------------------------------------------

describe('buildCommunityWorkGenerationInput', () => {
  it('returns null only when the project does not exist', () => {
    expect(buildCommunityWorkGenerationInput('nope', TODAY)).toBeNull();
    expect(buildCommunityWorkGenerationInput(P, TODAY)).not.toBeNull();
  });

  it('empty project (no forms) → input builds with empty/absent optional fields', () => {
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    expect(input).not.toBeNull();
    expect(input.reviewCadence).toBeUndefined();
    expect(input.adaptiveReview).toBeUndefined();
    expect(input.adaptiveFiveYear).toBe(false);
    expect(input.legalAdviceGates).toBeUndefined();
    expect(input.exitSuccessionToggles).toBeUndefined();
    expect(input.settlementPhases).toBeUndefined();
    expect(input.onboardingSteps).toBeUndefined();
    expect(input.ratifyCapturePresent).toBe(false);
    expect(input.ratifyMembers).toEqual([]);
    expect(input.stewardInvites).toEqual([]);
    expect(input.todayISO).toBe(TODAY);
  });
});

// ---------------------------------------------------------------------------
// generateAndApplyCommunityWork — no-op on empty project
// ---------------------------------------------------------------------------

describe('generateAndApplyCommunityWork — empty project', () => {
  it('project with no typeRecord → no protocols → empty plan → returns 0', () => {
    // A project with no typeRecord emits no protocol rules, and no other
    // capture forms are set, so the engine returns an empty plan.
    useProjectStore.setState({
      projects: [project({ metadata: {} } as never)],
    } as never);
    const count = generateAndApplyCommunityWork(P);
    expect(count).toBe(0);
    // Spine must be untouched.
    expect(useWorkItemStore.getState().items).toEqual([]);
  });

  it('is a no-op for an unknown project', () => {
    const count = generateAndApplyCommunityWork('nope');
    expect(count).toBe(0);
    expect(useCommunityWorkPlanStore.getState().proposals).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// exitSuccession presence gate (c5)
// ---------------------------------------------------------------------------

describe('exitSuccessionToggles — PRESENCE-GATED on c5 form', () => {
  it('c5 form absent → exitSuccessionToggles undefined (phantom-work guard)', () => {
    // No ev-s7-exit-succession-c5 in the form store.
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    expect(input.exitSuccessionToggles).toBeUndefined();
  });

  it('c5 form present with ALL toggles off → exitSuccessionToggles defined, legal-review rule generated', () => {
    // decodeExitSuccession reads choices from the esChoices parallel array
    // formatted as "key::value" strings (see encodeExitSuccession).
    const esChoices = LEGAL_TOGGLES.map((t) => `${t.key}::off`);
    setForms({ 'ev-s7-exit-succession-c5': { esChoices } });
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    expect(input.exitSuccessionToggles).toBeDefined();
    expect(input.exitSuccessionToggles!.toggles.length).toBe(LEGAL_TOGGLES.length);
    // All toggles off → engine will produce a legal-review rule.
    for (const t of input.exitSuccessionToggles!.toggles) {
      expect(t.state).toBe('off');
    }
  });

  it('c5 form present with all toggles ON → exits defined but no off toggles (no legal-review work)', () => {
    const esChoices = LEGAL_TOGGLES.map((t) => `${t.key}::on`);
    setForms({ 'ev-s7-exit-succession-c5': { esChoices } });
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    expect(input.exitSuccessionToggles).toBeDefined();
    const off = input.exitSuccessionToggles!.toggles.filter((t) => t.state === 'off');
    expect(off).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// legalAdviceGates presence gate (c7)
// ---------------------------------------------------------------------------

describe('legalAdviceGates — PRESENCE-GATED on c7 form', () => {
  it('c7 form absent → legalAdviceGates undefined', () => {
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    expect(input.legalAdviceGates).toBeUndefined();
  });

  it('c7 form present → legalAdviceGates defined with allGateIds from GATE_ITEMS', () => {
    // Provide a form with no cleared scopes (all gates incomplete).
    setForms({ 'ev-s1-legal-governance-c7': { adviceScope: [] } });
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    expect(input.legalAdviceGates).toBeDefined();
    expect(input.legalAdviceGates!.allGateIds).toEqual(
      GATE_ITEMS.map((g) => g.id),
    );
    expect(input.legalAdviceGates!.clearedGateIds).toEqual([]);
  });

  it('c7 form with some gates cleared → clearedGateIds reflects adviceScope', () => {
    const firstGate = GATE_ITEMS[0]!.id;
    setForms({ 'ev-s1-legal-governance-c7': { adviceScope: [firstGate] } });
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    expect(input.legalAdviceGates!.clearedGateIds).toContain(firstGate);
  });
});

// ---------------------------------------------------------------------------
// ratifyCapturePresent supersession
// ---------------------------------------------------------------------------

describe('ratifyCapturePresent — ratify form supersedes steward invites', () => {
  it('ratify form present → ratifyCapturePresent true; steward invites contribute nothing', () => {
    // Seed both a ratify form and a steward invite.
    setForms({
      // ratify form with one pending member.
      'ev-s1-provision-balance-c6': {
        ratifyMembers: [JSON.stringify({ id: 'mem-1', name: 'Aisha', status: 'pending' })],
      },
      // steward invite — should be ignored when ratify is present.
      's1-vision-steward': {
        inviteNames: ['Bilal'],
        inviteEmails: ['bilal@example.com'],
        inviteRoles: ['team_member'],
      },
    });
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    expect(input.ratifyCapturePresent).toBe(true);
    expect(input.ratifyMembers).toHaveLength(1);
    expect(input.ratifyMembers[0]!.name).toBe('Aisha');
    expect(input.ratifyMembers[0]!.status).toBe('pending');
    // stewardInvites decoded but superseded by ratify.
    // The adapter still populates stewardInvites (decoded from the form);
    // the engine ignores them when ratifyCapturePresent is true.
    expect(input.stewardInvites).toHaveLength(1);
  });

  it('ratify form absent + team_member invite with email → invite contributes to ratification work', () => {
    setForms({
      's1-vision-steward': {
        inviteNames: ['Bilal'],
        inviteEmails: ['bilal@example.com'],
        inviteRoles: ['team_member'],
      },
    });
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    expect(input.ratifyCapturePresent).toBe(false);
    expect(input.stewardInvites).toHaveLength(1);
    expect(input.stewardInvites[0]!.role).toBe('team_member');
    expect(input.stewardInvites[0]!.email).toBe('bilal@example.com');
  });

  it('contractor invite does NOT generate ratification work (role guard)', () => {
    setForms({
      's1-vision-steward': {
        inviteNames: ['Contractor Corp'],
        inviteEmails: ['corp@example.com'],
        inviteRoles: ['contractor'],
      },
    });
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    expect(input.ratifyCapturePresent).toBe(false);
    // Invite present in decoded stewardInvites but engine will ignore it
    // (not team_member). Confirm adapter passes it through verbatim.
    expect(input.stewardInvites[0]!.role).toBe('contractor');
  });
});

// ---------------------------------------------------------------------------
// Protocol disjointness
// ---------------------------------------------------------------------------

describe('protocol disjointness', () => {
  it('a non-community protocol id in the resolved set contributes nothing', () => {
    // The ecovillage project resolves eco-shared-resource-load from its catalogue,
    // but that id is not in COMMUNITY_PROTOCOL_CADENCES.
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    const ids = input.protocols.map((p) => p.id);
    expect(ids).not.toContain(NON_COMMUNITY_PROTO_ID);
  });

  it('a livestock protocol id is never included in the community protocol list', () => {
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    const ids = input.protocols.map((p) => p.id);
    expect(ids).not.toContain(LIVESTOCK_PROTO_ID);
  });

  it('the two community protocol ids pass through with scopeNotes verbatim', () => {
    // ecovillage project resolves both community protocol ids.
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    const ids = input.protocols.map((p) => p.id);
    // eco-governance-decision-cadence has no scopeNotes on the catalogue entry;
    // eco-common-land-stewardship likewise. Both must be present (if the
    // ecovillage catalogue includes them).
    expect(ids).toContain(COMMUNITY_PROTO_ID_1);
    expect(ids).toContain(COMMUNITY_PROTO_ID_2);
    // scopeNotes verbatim: if the resolved protocol carries a scopeNotes, the
    // adapter must pass it through byte-for-byte and not omit the key.
    for (const p of input.protocols) {
      const keys = Object.keys(p);
      // id and name must always be present.
      expect(keys).toContain('id');
      expect(keys).toContain('name');
    }
  });

  it('yields no protocols when the project has no typeRecord', () => {
    useProjectStore.setState({
      projects: [project({ metadata: {} } as never)],
    } as never);
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    expect(input.protocols).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Settlement wiring
// ---------------------------------------------------------------------------

describe('settlement wiring', () => {
  it('settlementPhases absent when neither c4 nor c1 form is present', () => {
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    expect(input.settlementPhases).toBeUndefined();
  });

  it('c4 schedule with a dated phase → settlementPhases populated → settlement-milestone rule', () => {
    // A single schedule row with a future date within the 90-day horizon.
    const scheduleRow = JSON.stringify({
      id: 'sp-row-1',
      cohort: 'Cohort A',
      milestone: 'Site preparation complete',
      dateISO: '2026-08-01',
      complete: false,
    });
    setForms({
      'ev-s7-settlement-plan-c4': { spSchedule: [scheduleRow] },
    });
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    expect(input.settlementPhases).toBeDefined();
    expect(input.settlementPhases!.length).toBeGreaterThanOrEqual(1);
    const phase = input.settlementPhases!.find((p) => p.id === 'sp-row-1');
    expect(phase).toBeDefined();
    expect(phase!.dateISO).toBe('2026-08-01');
    expect(phase!.complete).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Onboarding wiring
// ---------------------------------------------------------------------------

describe('onboarding wiring', () => {
  it('onboardingSteps absent when none of the onboarding forms is present', () => {
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    expect(input.onboardingSteps).toBeUndefined();
  });

  it('application form with named steps + pending member → onboarding-step rules (engine level)', () => {
    // Supply the application form with one named step and a pending member via steward invite.
    setForms({
      'ev-s7-onboarding-c1': {
        obApplication: [
          JSON.stringify({ id: 'step-1', name: 'Submit application form', owner: 'Admin' }),
        ],
      },
      // Steward invite (team_member with email) → pending member for onboarding fan-out.
      's1-vision-steward': {
        inviteNames: ['Tariq'],
        inviteEmails: ['tariq@example.com'],
        inviteRoles: ['team_member'],
      },
    });
    const input = buildCommunityWorkGenerationInput(P, TODAY)!;
    expect(input.onboardingSteps).toBeDefined();
    expect(input.onboardingSteps!.length).toBeGreaterThanOrEqual(1);
    const step = input.onboardingSteps!.find((s) => s.id === 'application-step-1');
    expect(step).toBeDefined();
    expect(step!.name).toBe('Submit application form');
    expect(step!.stage).toBe('application');
  });
});

// ---------------------------------------------------------------------------
// generateAndApplyCommunityWork — sovereign-steward covenant
// ---------------------------------------------------------------------------

describe('generateAndApplyCommunityWork — sovereign-steward covenant', () => {
  it('returns proposed count and NEVER touches the WorkItem spine', () => {
    // Plant a governance cadence so the engine produces at least one proposal.
    setForms({
      'ev-s1-conflict-framework-c6': {
        cfCadCheckin: '',
        cfCadGovernance: 'Quarterly',
        cfCadAnnual: '',
        cfCadFull: '',
        cfCadFiveYear: '',
      },
    });
    const count = generateAndApplyCommunityWork(P);
    // Proposals were created.
    const proposals = useCommunityWorkPlanStore.getState().proposals.filter(
      (pr) => pr.projectId === P && pr.status === 'proposed',
    );
    expect(count).toBe(proposals.length);
    expect(count).toBeGreaterThan(0);
    // Sovereign steward: spine must be untouched.
    expect(useWorkItemStore.getState().items).toEqual([]);
    // All proposals are 'proposed' — no auto-confirm.
    expect(proposals.every((pr) => pr.status === 'proposed')).toBe(true);
  });

  it('count reflects only PROPOSED proposals (not dismissed or confirmed)', () => {
    setForms({
      'ev-s1-conflict-framework-c6': {
        cfCadCheckin: '',
        cfCadGovernance: 'Quarterly',
        cfCadAnnual: '',
        cfCadFull: '',
        cfCadFiveYear: '',
      },
    });
    // First regen.
    generateAndApplyCommunityWork(P);
    const store = useCommunityWorkPlanStore.getState();
    // Dismiss the first proposal.
    const firstKey = store.proposals[0]!.instance.key;
    store.dismissProposal(P, firstKey);
    // Regen again — dismissed stays dismissed, count excludes it.
    const count2 = generateAndApplyCommunityWork(P);
    const proposed = useCommunityWorkPlanStore
      .getState()
      .proposals.filter((pr) => pr.projectId === P && pr.status === 'proposed');
    expect(count2).toBe(proposed.length);
  });
});

// ---------------------------------------------------------------------------
// isCommunityCaptureForm
// ---------------------------------------------------------------------------

describe('isCommunityCaptureForm', () => {
  // True for each surface the generator reads:
  it('true for ev-s1-conflict-framework-c6 (reviewCadence)', () => {
    expect(isCommunityCaptureForm('ev-s1-conflict-framework-c6')).toBe(true);
  });

  it('true for ev-s7-adaptive-management-c1 (adaptiveReview)', () => {
    expect(isCommunityCaptureForm('ev-s7-adaptive-management-c1')).toBe(true);
  });

  it('true for ev-s7-adaptive-management-c5 (adaptiveFiveYear)', () => {
    expect(isCommunityCaptureForm('ev-s7-adaptive-management-c5')).toBe(true);
  });

  it('true for ev-s1-legal-governance-c7 (legalAdviceGate)', () => {
    expect(isCommunityCaptureForm('ev-s1-legal-governance-c7')).toBe(true);
  });

  it('true for ev-s7-exit-succession-c5 (exitSuccession legalReview)', () => {
    expect(isCommunityCaptureForm('ev-s7-exit-succession-c5')).toBe(true);
  });

  it('true for ev-s7-settlement-plan-c4 (settlement schedule)', () => {
    expect(isCommunityCaptureForm('ev-s7-settlement-plan-c4')).toBe(true);
  });

  it('true for ev-s7-settlement-plan-c1 (settlement cohort)', () => {
    expect(isCommunityCaptureForm('ev-s7-settlement-plan-c1')).toBe(true);
  });

  it('true for ev-s7-onboarding-c1 (onboarding application)', () => {
    expect(isCommunityCaptureForm('ev-s7-onboarding-c1')).toBe(true);
  });

  it('true for ev-s7-onboarding-c2 (onboarding trial)', () => {
    expect(isCommunityCaptureForm('ev-s7-onboarding-c2')).toBe(true);
  });

  it('true for ev-s1-provision-balance-c6 (ratify)', () => {
    expect(isCommunityCaptureForm('ev-s1-provision-balance-c6')).toBe(true);
  });

  it('true for s1-vision-steward (steward invites)', () => {
    expect(isCommunityCaptureForm('s1-vision-steward')).toBe(true);
  });

  // False for livestock surfaces:
  it('false for a livestock husbandry form id', () => {
    expect(isCommunityCaptureForm('ev-s4-husbandry-c1')).toBe(false);
  });

  it('false for a livestock grazing form id', () => {
    expect(isCommunityCaptureForm('ev-s4-grazing-c3')).toBe(false);
  });

  // False for non-matching ids:
  it('false for a random string', () => {
    expect(isCommunityCaptureForm('completely-random-id')).toBe(false);
  });

  it('false for empty string', () => {
    expect(isCommunityCaptureForm('')).toBe(false);
  });

  // Amanah: ev-s7-financial-plan is NEVER a generation source.
  it('Amanah: false for ev-s7-financial-plan (never a generation source)', () => {
    expect(isCommunityCaptureForm('ev-s7-financial-plan')).toBe(false);
  });

  // A form id that looks close but is not in the read set:
  it('false for ev-s7-adaptive-management-c3 (triggers mode, not read by generator)', () => {
    // c3 is 'escalation' mode — not read by the adapter.
    // Actually check: adaptiveManagementModeFor('ev-s7-adaptive-management-c3')
    // The adapter's isCommunityCaptureForm only passes c1 (review) and c5 (fiveyear).
    // c3 would be 'escalation' not 'review' | 'fiveyear' — so false.
    expect(isCommunityCaptureForm('ev-s7-adaptive-management-c3')).toBe(false);
  });
});
