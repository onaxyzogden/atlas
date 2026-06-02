/**
 * @vitest-environment happy-dom
 *
 * cascadeDeleteProject — local-cache cleanup on hard-delete. Asserts that the
 * project-keyed OLOS Act/Plan/Observe stores, the four planStratumStore maps,
 * and siteDataStore are all purged for the deleted project, while a sibling
 * project's data is left intact. (Regression guard for the orphan gap closed
 * 2026-06-02 — these stores were previously missing from the cascade.)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// geodataCache hits IndexedDB (fire-and-forget) — stub it so the test env
// doesn't need a working idb. cascadeDelete imports it as '../lib/geodataCache.js'.
vi.mock('../../lib/geodataCache.js', () => ({
  geodataCache: {
    remove: async () => {},
    removeByPrefix: async () => {},
  },
}));

import { cascadeDeleteProject } from '../cascadeDelete';
import { useActTaskStore } from '../olos/actTaskStore';
import { useProofRecordStore } from '../olos/proofRecordStore';
import { useVerificationRecordStore } from '../olos/verificationRecordStore';
import { useEscalationRecordStore } from '../olos/escalationRecordStore';
import { useStewardshipRoutineStore } from '../olos/stewardshipRoutineStore';
import { useObservationRecordStore } from '../olos/observationRecordStore';
import { usePlanDecisionRecordStore } from '../olos/planDecisionRecordStore';
import { useActHandoffPackageStore } from '../olos/actHandoffPackageStore';
import { useChecklistProgressStore } from '../olos/checklistProgressStore';
import { usePlanStratumProgressStore } from '../planStratumStore';
import { useSiteDataStore } from '../siteDataStore';

const P1 = 'project-doomed';
const P2 = 'project-kept';

// A loose per-project value — the cascade only cares about key presence.
const stub = {} as never;

/** Minimal shape shared by every project-keyed store, so we can drive them
 *  uniformly without TypeScript trying to call a union of setState signatures. */
interface ByProjectStore {
  setState: (partial: { byProject: Record<string, unknown> }) => void;
  getState: () => { byProject: Record<string, unknown> };
}

// Stores keyed by a single `byProject` map.
const byProjectStores = [
  useActTaskStore,
  useProofRecordStore,
  useVerificationRecordStore,
  useEscalationRecordStore,
  useStewardshipRoutineStore,
  useObservationRecordStore,
  usePlanDecisionRecordStore,
  useActHandoffPackageStore,
  useChecklistProgressStore,
] as unknown as ByProjectStore[];

beforeEach(() => {
  localStorage.clear();
  for (const store of byProjectStores) {
    store.setState({ byProject: { [P1]: stub, [P2]: stub } });
  }
  usePlanStratumProgressStore.setState({
    byProject: { [P1]: stub, [P2]: stub },
    celebratedByProject: { [P1]: [], [P2]: [] },
    deferredByProject: { [P1]: [], [P2]: [] },
    valuesByProject: { [P1]: stub, [P2]: stub },
  });
  useSiteDataStore.setState({ dataByProject: { [P1]: stub, [P2]: stub } });
});

describe('cascadeDeleteProject', () => {
  it('drops the deleted project from every OLOS byProject store, keeps the sibling', () => {
    cascadeDeleteProject(P1);
    for (const store of byProjectStores) {
      const { byProject } = store.getState();
      expect(byProject[P1]).toBeUndefined();
      expect(byProject[P2]).toBeDefined();
    }
  });

  it('drops the deleted project from all four planStratumStore maps', () => {
    cascadeDeleteProject(P1);
    const s = usePlanStratumProgressStore.getState();
    for (const map of [
      s.byProject,
      s.celebratedByProject,
      s.deferredByProject,
      s.valuesByProject,
    ]) {
      expect(map[P1]).toBeUndefined();
      expect(map[P2]).toBeDefined();
    }
  });

  it('clears siteData for the deleted project, keeps the sibling', () => {
    cascadeDeleteProject(P1);
    const { dataByProject } = useSiteDataStore.getState();
    expect(dataByProject[P1]).toBeUndefined();
    expect(dataByProject[P2]).toBeDefined();
  });
});
