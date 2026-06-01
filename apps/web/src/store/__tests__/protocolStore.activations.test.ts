// @vitest-environment happy-dom
/**
 * protocolStore - immutable activations slice (Phase B1).
 *
 * The `activations` array is append-only: recordActivation pushes a frozen
 * ProtocolActivation and NEVER mutates an existing activation or the legacy
 * `records` lifecycle array. Defaults id / activatedAt / triggerContext when
 * the caller omits them, but accepts caller-supplied values for deterministic
 * tests. getActivations returns this project's activations newest-first.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useProtocolStore } from '../protocolStore.js';

function reset(): void {
  useProtocolStore.setState({ records: [], activations: [] });
  window.localStorage.clear();
}

const RECIPE = {
  name: 'High Pest Pressure Protocol',
  condition: 'Pest count exceeds threshold',
  response: 'Deploy poultry to affected block',
};

describe('protocolStore - recordActivation', () => {
  beforeEach(() => reset());

  it('appends one activation with defaulted id / activatedAt / triggerContext', () => {
    const s = useProtocolStore.getState();
    s.recordActivation({
      projectId: 'proj-A',
      templateId: 'tmpl-1',
      severityTier: 'respond',
      confirmationStatus: 'confirmed',
      recipeSnapshot: RECIPE,
    });

    const acts = useProtocolStore.getState().activations;
    expect(acts).toHaveLength(1);
    const a = acts[0]!;
    expect(a.projectId).toBe('proj-A');
    expect(a.confirmationStatus).toBe('confirmed');
    expect(a.triggerContext).toBe('act_proof_capture');
    expect(typeof a.id).toBe('string');
    expect(a.id.length).toBeGreaterThan(0);
    expect(typeof a.activatedAt).toBe('string');
    expect(a.recipeSnapshot.name).toBe(RECIPE.name);
  });

  it('honours caller-supplied id / activatedAt / triggerContext', () => {
    const s = useProtocolStore.getState();
    s.recordActivation({
      id: 'act-fixed',
      activatedAt: '2026-06-01T00:00:00.000Z',
      projectId: 'proj-A',
      templateId: 'tmpl-1',
      severityTier: 'respond',
      confirmationStatus: 'pending_review',
      recipeSnapshot: RECIPE,
      triggerContext: 'observe_domain_detail',
    });
    const a = useProtocolStore.getState().activations[0]!;
    expect(a.id).toBe('act-fixed');
    expect(a.activatedAt).toBe('2026-06-01T00:00:00.000Z');
    expect(a.triggerContext).toBe('observe_domain_detail');
  });

  it('does NOT mutate an existing records-lifecycle entry', () => {
    const s = useProtocolStore.getState();
    s.activateProtocol('proj-A', 'tmpl-1');
    const before = useProtocolStore.getState().records[0]!;
    expect(before.status).toBe('active');

    s.recordActivation({
      projectId: 'proj-A',
      templateId: 'tmpl-1',
      severityTier: 'respond',
      confirmationStatus: 'confirmed',
      recipeSnapshot: RECIPE,
    });

    const after = useProtocolStore.getState().records[0]!;
    expect(after.status).toBe('active');
    expect(useProtocolStore.getState().records).toHaveLength(1);
  });

  it('appends immutably - prior activation objects are untouched', () => {
    const s = useProtocolStore.getState();
    s.recordActivation({
      id: 'act-1',
      projectId: 'proj-A',
      templateId: 'tmpl-1',
      severityTier: 'respond',
      confirmationStatus: 'confirmed',
      recipeSnapshot: RECIPE,
    });
    const first = useProtocolStore.getState().activations[0]!;
    s.recordActivation({
      id: 'act-2',
      projectId: 'proj-A',
      templateId: 'tmpl-2',
      severityTier: 'watch',
      confirmationStatus: 'confirmed',
      recipeSnapshot: RECIPE,
    });
    expect(useProtocolStore.getState().activations).toHaveLength(2);
    // same object reference for the first entry - not rewritten
    expect(useProtocolStore.getState().activations[0]).toBe(first);
  });
});

describe('protocolStore - getActivations', () => {
  beforeEach(() => reset());

  it('returns only this project, newest-first', () => {
    const s = useProtocolStore.getState();
    s.recordActivation({
      id: 'old',
      activatedAt: '2026-01-01T00:00:00.000Z',
      projectId: 'proj-A',
      templateId: 'tmpl-1',
      severityTier: 'respond',
      confirmationStatus: 'confirmed',
      recipeSnapshot: RECIPE,
    });
    s.recordActivation({
      id: 'new',
      activatedAt: '2026-06-01T00:00:00.000Z',
      projectId: 'proj-A',
      templateId: 'tmpl-2',
      severityTier: 'respond',
      confirmationStatus: 'confirmed',
      recipeSnapshot: RECIPE,
    });
    s.recordActivation({
      id: 'other',
      projectId: 'proj-B',
      templateId: 'tmpl-1',
      severityTier: 'respond',
      confirmationStatus: 'confirmed',
      recipeSnapshot: RECIPE,
    });

    const got = useProtocolStore.getState().getActivations('proj-A');
    expect(got.map((a) => a.id)).toEqual(['new', 'old']);
  });
});
