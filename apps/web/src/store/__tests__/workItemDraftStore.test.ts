/**
 * workItemDraftStore — in-memory draft channel unit tests.
 *
 * Verifies set/clear/no-op-clear semantics and confirms the source
 * file carries no financing lexicon and no spine-status mutation
 * (covenant).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  useWorkItemDraftStore,
  type WorkItemDraft,
} from '../workItemDraftStore.js';

const draft: WorkItemDraft = {
  title: 'Make-good move — overgrazed paddock a',
  notes: 'Reduce graze, schedule earlier move.',
  paddockId: 'a',
  source: 'rotation-adherence',
};

beforeEach(() => {
  useWorkItemDraftStore.setState({ draft: null });
});

describe('useWorkItemDraftStore', () => {
  it('starts with no draft', () => {
    expect(useWorkItemDraftStore.getState().draft).toBeNull();
  });

  it('setDraft stores the draft verbatim', () => {
    useWorkItemDraftStore.getState().setDraft(draft);
    expect(useWorkItemDraftStore.getState().draft).toEqual(draft);
  });

  it('clearDraft resets to null', () => {
    useWorkItemDraftStore.getState().setDraft(draft);
    useWorkItemDraftStore.getState().clearDraft();
    expect(useWorkItemDraftStore.getState().draft).toBeNull();
  });

  it('clearDraft is a no-op when already null', () => {
    expect(() => useWorkItemDraftStore.getState().clearDraft()).not.toThrow();
    expect(useWorkItemDraftStore.getState().draft).toBeNull();
  });

  it('source file carries no financing lexicon and no WorkItem.status touch', () => {
    const src = readFileSync(
      join(__dirname, '..', 'workItemDraftStore.ts'),
      'utf8',
    );
    expect(src).not.toMatch(
      /interest|riba|invest|equity|capital|financ|loan|yield|salam|gharar/i,
    );
    expect(src).not.toMatch(/WorkItem\.status|useWorkItemStore/);
    expect(src).not.toMatch(/persist|syncManifest/);
  });
});
