/**
 * @vitest-environment happy-dom
 *
 * livestockWorkPlanStore — proposal lifecycle + the confirm seam.
 *
 * Covenant assertions:
 *   - `applyGeneration` NEVER writes the WorkItem spine (sovereign steward);
 *     `confirmProposal` is the only writer and writes exactly one row.
 *   - dismissed-stays-dismissed across regenerations.
 *   - confirmed rows are never mutated by a regeneration — changes surface
 *     as needsReview for the operator to resolve.
 *   - `scopeNotes` reach the spine notes VERBATIM.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import type { LivestockWorkInstance, LivestockWorkRule } from '@ogden/shared';
import { useLivestockWorkPlanStore } from '../livestockWorkPlanStore.js';
import { useWorkItemStore } from '../workItemStore.js';

const P = 'p1';
const SCOPE =
  'Amanah: sale of livestock not yet possessed is bayʿ mā laysa ʿindak — forbidden.';

function inst(
  key: string,
  over: Partial<LivestockWorkInstance> = {},
): LivestockWorkInstance {
  return {
    key,
    ruleKey: key.slice(0, key.lastIndexOf('__')),
    dueDate: key.slice(key.lastIndexOf('__') + 2),
    kind: 'welfare-check',
    title: 'Weekly welfare & condition check',
    sourceKind: 'husbandry',
    inputsHash: 'hash0001',
    ...over,
  };
}

function rule(over: Partial<LivestockWorkRule> = {}): LivestockWorkRule {
  return {
    key: 'lvp__husbandry__welfare-weekly',
    kind: 'welfare-check',
    title: 'Weekly welfare & condition check',
    sourceKind: 'husbandry',
    sourceId: 'welfare-weekly',
    recurrence: 'weekly',
    inputsHash: 'hash0001',
    ...over,
  };
}

const K1 = 'lvp__husbandry__welfare-weekly__2026-06-15';
const K2 = 'lvp__husbandry__welfare-weekly__2026-06-22';

const plan = () => useLivestockWorkPlanStore.getState();
const spine = () => useWorkItemStore.getState();

beforeEach(() => {
  useLivestockWorkPlanStore.setState({ rules: [], proposals: [] });
  useWorkItemStore.setState({ items: [], migratedSources: [] });
});

describe('applyGeneration', () => {
  it('inserts new instances as proposed and stores project-tagged rules', () => {
    plan().applyGeneration(P, { rules: [rule()], instances: [inst(K1)] });
    const proposals = plan().proposals;
    expect(proposals).toHaveLength(1);
    expect(proposals[0]).toMatchObject({
      id: `lwp-${K1}`,
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
      expect(before.proposals).toContain(p); // same element references
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
      instances: [inst(K1, { inputsHash: 'hash0002', title: 'Renamed check' })],
    });
    const p = plan().proposals[0]!;
    expect(p.status).toBe('proposed');
    expect(p.instance.title).toBe('Renamed check');
  });

  it("scopes to the project — other projects' proposals are untouched", () => {
    plan().applyGeneration('p2', { rules: [], instances: [inst(K1)] });
    const other = plan().proposals[0]!;
    plan().applyGeneration(P, { rules: [], instances: [inst(K2)] });
    expect(plan().proposals).toContain(other);
    expect(plan().proposals).toHaveLength(2);
  });
});

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

describe('confirmProposal — the only spine writer', () => {
  const FULL = inst(K1, {
    detail: 'Walk the mob; condition-score 10%.',
    scopeNotes: SCOPE,
    sourceProtocolId: 'lvo-herd-health-surveillance',
    sourceObjectiveId: 'silv-sec-s4-husbandry-framework',
    species: 'sheep',
    paddockId: 'pad-1',
    suggestedCarer: 'Yousef',
    windowEnd: '2026-06-21',
  });

  it('writes exactly one spine row carrying full provenance + verbatim scopeNotes', () => {
    plan().applyGeneration(P, { rules: [], instances: [FULL] });
    plan().confirmProposal(P, K1);

    expect(spine().items).toHaveLength(1);
    const row = spine().items[0]!;
    expect(row).toMatchObject({
      id: `lvw__${K1}`,
      projectId: P,
      source: 'livestock-plan',
      overridden: false,
      generatedFromLivestockPlan: K1,
      sourceProtocolId: 'lvo-herd-health-surveillance',
      sourceObjectiveId: 'silv-sec-s4-husbandry-framework',
      title: 'Weekly welfare & condition check',
      status: 'todo',
      doneAt: null,
      phaseId: null,
      scheduledStart: '2026-06-15',
      scheduledEnd: '2026-06-21',
      linkedFeatureId: 'pad-1',
      who: 'Yousef',
      species: 'sheep',
    });
    // VERBATIM covenant: the scopeNotes string is intact inside notes.
    expect(row.notes).toContain(SCOPE);
    expect(row.notes).toBe(`Walk the mob; condition-score 10%.\n\n${SCOPE}`);

    const p = plan().proposals[0]!;
    expect(p.status).toBe('confirmed');
    expect(p.confirmedWorkItemId).toBe(`lvw__${K1}`);
  });

  it('is idempotent — double confirm still yields one row', () => {
    plan().applyGeneration(P, { rules: [], instances: [FULL] });
    plan().confirmProposal(P, K1);
    plan().confirmProposal(P, K1);
    expect(spine().items).toHaveLength(1);
  });

  it('applies operator edits (date / carer) to the confirmed row', () => {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1)] });
    plan().editProposal(P, K1, { dueDate: '2026-06-17', carer: 'Amir' });
    plan().confirmProposal(P, K1);
    const row = spine().items[0]!;
    expect(row.scheduledStart).toBe('2026-06-17');
    expect(row.who).toBe('Amir');
  });

  it('confirmAll confirms only proposed rows', () => {
    plan().applyGeneration(P, {
      rules: [],
      instances: [inst(K1), inst(K2)],
    });
    plan().dismissProposal(P, K2);
    plan().confirmAll(P);
    expect(spine().items.map((it) => it.id)).toEqual([`lvw__${K1}`]);
    expect(plan().proposals.find((p) => p.instance.key === K2)!.status).toBe(
      'dismissed',
    );
  });
});

describe('regeneration after confirmation — needsReview', () => {
  function confirmK1(over: Partial<LivestockWorkInstance> = {}) {
    plan().applyGeneration(P, { rules: [], instances: [inst(K1, over)] });
    plan().confirmProposal(P, K1);
  }
  const CHANGED = () =>
    inst(K1, { inputsHash: 'hash0002', title: 'Fortnightly welfare check' });

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
    expect(row.title).toBe('Fortnightly welfare check');
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
});
