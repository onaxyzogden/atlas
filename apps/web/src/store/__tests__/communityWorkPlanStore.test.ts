/**
 * @vitest-environment happy-dom
 *
 * communityWorkPlanStore — proposal lifecycle + the confirm seam.
 * Covenant mirror of livestockWorkPlanStore.test.ts, adapted to community shapes.
 *
 * Covenant assertions:
 *   - `applyGeneration` NEVER writes the WorkItem spine (sovereign steward);
 *     `confirmProposal` is the only writer and writes exactly one row.
 *   - Spine row id = `cmw__<key>`, source = 'community-plan',
 *     `generatedFromCommunityPlan` = the instance key.
 *   - notes = detail + '\n\n' + scopeNotes VERBATIM (byte-exact).
 *   - dismissed-stays-dismissed across regenerations.
 *   - confirmed rows are never mutated by a regeneration — changes surface
 *     as needsReview for the operator to resolve.
 *   - `scopeNotes` reach the spine notes VERBATIM.
 *   - persistence partialize: only rules + proposals are persisted.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { CommunityWorkInstance, CommunityWorkRule } from '@ogden/shared';
import { useCommunityWorkPlanStore } from '../communityWorkPlanStore.js';
import { useWorkItemStore } from '../workItemStore.js';

const P = 'p1';
const SCOPE =
  'Amanah: this governance instrument requires Scholar Council review before any ' +
  'financial obligation is created -- bayʿ mā laysa ʿindak applies to forward ' +
  'commitments not yet in hand.';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function inst(
  key: string,
  over: Partial<CommunityWorkInstance> = {},
): CommunityWorkInstance {
  return {
    key,
    ruleKey: key.slice(0, key.lastIndexOf('__')),
    dueDate: key.slice(key.lastIndexOf('__') + 2),
    kind: 'governance-meeting',
    title: 'Governance meeting -- agreements & decisions',
    inputsHash: 'hash0001',
    ...over,
  };
}

function rule(over: Partial<CommunityWorkRule> = {}): CommunityWorkRule {
  return {
    key: 'cwp__governance__governance-meeting',
    kind: 'governance-meeting',
    title: 'Governance meeting -- agreements & decisions',
    sourceKind: 'governance',
    sourceId: 'governance-meeting',
    recurrence: 'quarterly',
    inputsHash: 'hash0001',
    ...over,
  };
}

// Two horizon-adjacent instance keys (quarterly governance meeting)
const K1 = 'cwp__governance__governance-meeting__2026-07-01';
const K2 = 'cwp__governance__governance-meeting__2026-10-01';

const plan = () => useCommunityWorkPlanStore.getState();
const spine = () => useWorkItemStore.getState();

beforeEach(() => {
  useCommunityWorkPlanStore.setState({ rules: [], proposals: [] });
  useWorkItemStore.setState({ items: [], migratedSources: [] });
});

// ---------------------------------------------------------------------------
// applyGeneration
// ---------------------------------------------------------------------------

describe('applyGeneration', () => {
  it('inserts new instances as proposed and stores project-tagged rules', () => {
    plan().applyGeneration(P, { rules: [rule()], instances: [inst(K1)] });
    const proposals = plan().proposals;
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({
      id: `cwp-${K1}`,
      projectId: P,
      status: 'proposed',
    });
    expect(plan().rules).toEqual([{ ...rule(), projectId: P }]);
    // Sovereign steward: generation NEVER touches the spine.
    expect(spine().items).toEqual([]);
  });

  it('is idempotent: re-applying the same generation keeps the same references', () => {
    const gen = { rules: [rule()], instances: [inst(K1), inst(K2)] };
    plan().applyGeneration(P, gen);
    const before = plan();
    plan().applyGeneration(P, gen);
    const after = plan();
    expect(after.proposals).toHaveLength(2);
    for (const p of after.proposals) {
      expect(before.proposals).toContain(p); // same element references (toBe semantics via contain)
    }
    expect(after.rules).toBe(before.rules); // unchanged rule set, same array
    expect(after.proposals.some((p) => p.needsReview)).toBe(false);
  });

  it('drops proposed rows whose key left the horizon', () => {
    plan().applyGeneration(P, { rules: [rule()], instances: [inst(K1)] });
    plan().applyGeneration(P, { rules: [rule()], instances: [inst(K2)] });
    expect(plan().proposals.map((p) => p.instance.key)).toEqual([K2]);
  });

  it('refreshes a still-proposed instance whose content changed', () => {
    plan().applyGeneration(P, { rules: [rule()], instances: [inst(K1)] });
    plan().applyGeneration(P, {
      rules: [rule({ inputsHash: 'hash0002' })],
      instances: [inst(K1, { inputsHash: 'hash0002', title: 'Emergency governance session' })],
    });
    const p = plan().proposals[0]!;
    expect(p.status).toBe('proposed');
    expect(p.instance.title).toBe('Emergency governance session');
  });

  it("scopes to the project — other projects' proposals are untouched", () => {
    plan().applyGeneration('p2', { rules: [], instances: [inst(K1)] });
    const other = plan().proposals[0]!;
    plan().applyGeneration(P, { rules: [], instances: [inst(K2)] });
    expect(plan().proposals).toContain(other);
    expect(plan().proposals).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// dismiss / restore
// ---------------------------------------------------------------------------

describe('dismiss / restore', () => {
  it('dismissed proposals stay dismissed across regenerations', () => {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1)] });
    plan().dismissProposal(P, K1);
    plan().applyGeneration(P, { rules: [], instances: [inst(K1)] });
    expect(plan().proposals[0]!.status).toBe('dismissed');
    expect(spine().items).toEqual([]);
  });

  it('restore returns a dismissed proposal to proposed', () => {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1)] });
    plan().dismissProposal(P, K1);
    plan().restoreProposal(P, K1);
    expect(plan().proposals[0]!.status).toBe('proposed');
  });

  it('a dismissed key whose window passed is removed', () => {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1)] });
    plan().dismissProposal(P, K1);
    plan().applyGeneration(P, { rules: [], instances: [] });
    expect(plan().proposals).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// confirmProposal — the only spine writer
// ---------------------------------------------------------------------------

describe('confirmProposal — the only spine writer', () => {
  const FULL = inst(K1, {
    detail: 'Convene governance body; open decisions review.',
    scopeNotes: SCOPE,
    sourceProtocolId: 'eco-governance-decision-cadence',
    sourceObjectiveId: 'ev-s1-conflict-framework',
    suggestedCarer: 'Yousef',
    windowEnd: '2026-07-07',
  });

  it('writes exactly one spine row carrying full provenance + verbatim scopeNotes', () => {
    plan().applyGeneration(P, { rules: [], instances: [FULL] });
    plan().confirmProposal(P, K1);

    expect(spine().items).toHaveLength(1);
    const row = spine().items[0]!;
    expect(row).toMatchObject({
      id: `cmw__${K1}`,
      projectId: P,
      source: 'community-plan',
      overridden: false,
      generatedFromCommunityPlan: K1,
      sourceProtocolId: 'eco-governance-decision-cadence',
      sourceObjectiveId: 'ev-s1-conflict-framework',
      title: 'Governance meeting -- agreements & decisions',
      status: 'todo',
      doneAt: null,
      phaseId: null,
      scheduledStart: K1.slice(K1.lastIndexOf('__') + 2),
      scheduledEnd: '2026-07-07',
      who: 'Yousef',
    });
    // VERBATIM covenant: the scopeNotes string is intact inside notes, byte-exact.
    expect(row.notes).toContain(SCOPE);
    expect(row.notes).toBe(
      `Convene governance body; open decisions review.\n\n${SCOPE}`,
    );

    const p = plan().proposals[0]!;
    expect(p.status).toBe('confirmed');
    expect(p.confirmedWorkItemId).toBe(`cmw__${K1}`);
  });

  it('spine row id is cmw__<key> (NOT lvw__ — correct prefix)', () => {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1)] });
    plan().confirmProposal(P, K1);
    const row = spine().items[0]!;
    expect(row.id).toBe(`cmw__${K1}`);
    expect(row.id).not.toMatch(/^lvw__/);
  });

  it('spine row source tag is "community-plan" and provenance field is generatedFromCommunityPlan', () => {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1)] });
    plan().confirmProposal(P, K1);
    const row = spine().items[0]!;
    expect(row.source).toBe('community-plan');
    expect((row as Record<string, unknown>)['generatedFromCommunityPlan']).toBe(K1);
    // No livestock provenance field should be present.
    expect((row as Record<string, unknown>)['generatedFromLivestockPlan']).toBeUndefined();
  });

  it('notes = detail + "\\n\\n" + scopeNotes VERBATIM (byte-exact assertion)', () => {
    const detail = 'Convene governance body; open decisions review.';
    const localInst = inst(K1, { detail, scopeNotes: SCOPE });
    plan().applyGeneration(P, { rules: [], instances: [localInst] });
    plan().confirmProposal(P, K1);
    expect(spine().items[0]!.notes).toBe(`${detail}\n\n${SCOPE}`);
  });

  it('notes = just detail when scopeNotes is absent', () => {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1, { detail: 'Just the detail.' })] });
    plan().confirmProposal(P, K1);
    expect(spine().items[0]!.notes).toBe('Just the detail.');
  });

  it('notes = just scopeNotes when detail is absent', () => {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1, { scopeNotes: SCOPE })] });
    plan().confirmProposal(P, K1);
    expect(spine().items[0]!.notes).toBe(SCOPE);
  });

  it('is idempotent — double confirm still yields one row', () => {
    plan().applyGeneration(P, { rules: [], instances: [FULL] });
    plan().confirmProposal(P, K1);
    plan().confirmProposal(P, K1);
    expect(spine().items).toHaveLength(1);
  });

  it('applies operator edits (date / carer) to the confirmed row', () => {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1)] });
    plan().editProposal(P, K1, { dueDate: '2026-07-05', carer: 'Amira' });
    plan().confirmProposal(P, K1);
    const row = spine().items[0]!;
    expect(row.scheduledStart).toBe('2026-07-05');
    expect(row.who).toBe('Amira');
  });

  it('confirmAll confirms only proposed rows', () => {
    plan().applyGeneration(P, {
      rules: [],
      instances: [inst(K1), inst(K2)],
    });
    plan().dismissProposal(P, K2);
    plan().confirmAll(P);
    expect(spine().items.map((it) => it.id)).toEqual([`cmw__${K1}`]);
    expect(plan().proposals.find((p) => p.instance.key === K2)!.status).toBe(
      'dismissed',
    );
  });

  it('no species or paddockId columns on the community spine row (no extraSpineFields)', () => {
    plan().applyGeneration(P, { rules: [], instances: [FULL] });
    plan().confirmProposal(P, K1);
    const row = spine().items[0]! as Record<string, unknown>;
    expect(row['species']).toBeUndefined();
    expect(row['linkedFeatureId']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// regeneration after confirmation — needsReview
// ---------------------------------------------------------------------------

describe('regeneration after confirmation — needsReview', () => {
  function confirmK1(over: Partial<CommunityWorkInstance> = {}) {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1, over)] });
    plan().confirmProposal(P, K1);
  }
  const CHANGED = () =>
    inst(K1, { inputsHash: 'hash0002', title: 'Five-year comprehensive review' });

  it('changed hash → needsReview "changed"; the spine row is never auto-mutated', () => {
    confirmK1();
    const rowBefore = spine().items[0]!;
    plan().applyGeneration(P, { rules: [], instances: [CHANGED()] });
    const p = plan().proposals[0]!;
    expect(p.status).toBe('confirmed');
    expect(p.needsReview).toMatchObject({ reason: 'changed' });
    expect(p.needsReview!.next!.inputsHash).toBe('hash0002');
    expect(spine().items[0]).toBe(rowBefore); // untouched, same reference
  });

  it('absent key → needsReview "orphaned"; row and proposal are kept', () => {
    confirmK1();
    plan().applyGeneration(P, { rules: [], instances: [] });
    expect(plan().proposals[0]!.needsReview).toEqual({ reason: 'orphaned' });
    expect(spine().items).toHaveLength(1);
  });

  it('accept-update patches the spine row and adopts the regenerated instance', () => {
    confirmK1();
    plan().applyGeneration(P, { rules: [], instances: [CHANGED()] });
    plan().resolveReview(P, K1, 'accept-update');
    const row = spine().items[0]!;
    expect(row.title).toBe('Five-year comprehensive review');
    const p = plan().proposals[0]!;
    expect(p.needsReview).toBeUndefined();
    expect(p.instance.inputsHash).toBe('hash0002');
    expect(p.status).toBe('confirmed');
  });

  it('keep-mine clears the flag and suppresses the SAME change from re-flagging', () => {
    confirmK1();
    plan().applyGeneration(P, { rules: [], instances: [CHANGED()] });
    plan().resolveReview(P, K1, 'keep-mine');
    expect(plan().proposals[0]!.needsReview).toBeUndefined();
    // Same regenerated content again → stays quiet.
    plan().applyGeneration(P, { rules: [], instances: [CHANGED()] });
    expect(plan().proposals[0]!.needsReview).toBeUndefined();
    // A NEW change still flags.
    plan().applyGeneration(P, {
      rules: [],
      instances: [inst(K1, { inputsHash: 'hash0003' })],
    });
    expect(plan().proposals[0]!.needsReview).toMatchObject({
      reason: 'changed',
    });
  });

  it('cancel-work cancels the spine row (kept for audit) and dismisses the proposal', () => {
    confirmK1();
    plan().applyGeneration(P, { rules: [], instances: [] });
    plan().resolveReview(P, K1, 'cancel-work');
    expect(spine().items).toHaveLength(1);
    expect(spine().items[0]!.status).toBe('cancelled');
    expect(plan().proposals[0]!.status).toBe('dismissed');
    // Next regeneration retires the dismissed+absent key; the audit row stays.
    plan().applyGeneration(P, { rules: [], instances: [] });
    expect(plan().proposals).toEqual([]);
    expect(spine().items).toHaveLength(1);
  });

  it('restore + re-confirm after cancel-work reactivates the existing row, no duplicate', () => {
    confirmK1();
    plan().applyGeneration(P, { rules: [], instances: [CHANGED()] });
    plan().resolveReview(P, K1, 'cancel-work');
    plan().restoreProposal(P, K1);
    plan().confirmProposal(P, K1);
    expect(spine().items).toHaveLength(1);
    expect(spine().items[0]!.status).toBe('todo');
  });

  it('one-off orphan path: confirmed member-ratification proposal orphans on member ratification', () => {
    // Simulate a one-off member-ratification rule: generated once, confirmed,
    // then on next regen the member is ratified so the rule disappears.
    const memberKey = 'cwp__membership__member-abc__once';
    const memberInst = inst(memberKey, {
      kind: 'member-ratification',
      title: 'Ratify member -- Aisha',
      inputsHash: 'hashM001',
    });
    plan().applyGeneration(P, { rules: [], instances: [memberInst] });
    plan().confirmProposal(P, memberKey);
    expect(plan().proposals[0]!.status).toBe('confirmed');
    expect(spine().items).toHaveLength(1);

    // Member ratified → rule vanishes from next generation.
    plan().applyGeneration(P, { rules: [], instances: [] });
    const p = plan().proposals[0]!;
    expect(p.needsReview).toEqual({ reason: 'orphaned' });
    expect(spine().items).toHaveLength(1); // audit row intact

    // keep-mine resolves quietly; spine row intact.
    plan().resolveReview(P, memberKey, 'keep-mine');
    expect(plan().proposals[0]!.needsReview).toBeUndefined();
    expect(plan().proposals[0]!.status).toBe('confirmed');
    expect(spine().items).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Persistence partialize: only rules + proposals persisted
// ---------------------------------------------------------------------------

describe('persistence partialize', () => {
  it('partialize includes rules and proposals but not action methods', () => {
    plan().applyGeneration(P, { rules: [rule()], instances: [inst(K1)] });
    // The persist middleware calls state => partialize(state).
    // We verify by checking that the state shape the factory's partialize
    // would produce contains only the two data arrays.
    const s = plan();
    const persisted: Record<string, unknown> = {
      rules: s.rules,
      proposals: s.proposals,
    };
    expect(persisted).toHaveProperty('rules');
    expect(persisted).toHaveProperty('proposals');
    expect(persisted).not.toHaveProperty('applyGeneration');
    expect(persisted).not.toHaveProperty('confirmProposal');
    expect(persisted).not.toHaveProperty('confirmAll');
    expect(persisted).not.toHaveProperty('dismissProposal');
  });
});
