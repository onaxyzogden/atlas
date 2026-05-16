/**
 * generatorDraftStore — tracks the current Auto-Design generation run and
 * the steward's accept/discard decisions over its draft output.
 *
 * Part of the Observe-Driven Auto-Design pipeline (ADR
 * `wiki/decisions/2026-05-14-auto-design-pipeline.md`). `runAutoDesign`
 * (Phase 5 wiring) writes draft elements into `landDesignStore` and
 * `livestockStore` carrying `draft: true` + a shared `generationId`.
 * This store records which generation is "live" on the DraftReviewBar and
 * applies the three review verbs by mutating those stores:
 *
 *   - `commit(genId)`        — promote: clears `draft` on every row of the
 *                              generation so it becomes a normal element.
 *   - `discard(genId)`       — cascade-delete every draft row of the
 *                              generation across both stores.
 *   - `discardClass(genId, draftClass)` — delete only one feature-class
 *                              bucket ("livestock" | "water" | "trees" | …)
 *                              of the generation; the rest stay in review.
 *
 * Holds no draft geometry itself — the geometry lives in the two design
 * stores so existing canvas layers and cascade-delete keep working. This
 * store is just the run pointer + the verbs.
 */

import { create } from 'zustand';
import { useLandDesignStore } from './landDesignStore.js';
import { useLivestockStore } from './livestockStore.js';

interface GeneratorDraftState {
  /** The generation currently surfaced on the DraftReviewBar, or null. */
  activeGenerationId: string | null;
  /** Project the active generation belongs to. */
  activeProjectId: string | null;

  /** Open a fresh generation for review (called by runAutoDesign wiring). */
  beginGeneration: (projectId: string, generationId: string) => void;

  /** Promote every draft row of `generationId` to a normal element. */
  commit: (generationId: string) => void;

  /** Cascade-delete every draft row of `generationId` across both stores. */
  discard: (generationId: string) => void;

  /** Delete only the `draftClass` bucket of `generationId`. */
  discardClass: (generationId: string, draftClass: string) => void;
}

export const useGeneratorDraftStore = create<GeneratorDraftState>()((set) => ({
  activeGenerationId: null,
  activeProjectId: null,

  beginGeneration: (projectId, generationId) =>
    set({ activeProjectId: projectId, activeGenerationId: generationId }),

  commit: (generationId) => {
    const land = useLandDesignStore.getState();
    for (const [projectId, list] of Object.entries(land.byProject)) {
      for (const el of list) {
        if (el.draft && el.generationId === generationId) {
          land.update(projectId, el.id, {
            draft: false,
            generationId: undefined,
            draftClass: undefined,
          });
        }
      }
    }

    const ls = useLivestockStore.getState();
    for (const p of ls.paddocks) {
      if (p.draft && p.generationId === generationId) {
        ls.updatePaddock(p.id, { draft: false, generationId: undefined });
      }
    }
    for (const f of ls.fenceLines) {
      if (f.draft && f.generationId === generationId) {
        ls.updateFenceLine(f.id, { draft: false, generationId: undefined });
      }
    }

    set((s) =>
      s.activeGenerationId === generationId
        ? { activeGenerationId: null, activeProjectId: null }
        : s,
    );
  },

  discard: (generationId) => {
    const land = useLandDesignStore.getState();
    for (const [projectId, list] of Object.entries(land.byProject)) {
      for (const el of list) {
        if (el.draft && el.generationId === generationId) {
          land.remove(projectId, el.id);
        }
      }
    }

    const ls = useLivestockStore.getState();
    for (const p of ls.paddocks) {
      if (p.draft && p.generationId === generationId) ls.deletePaddock(p.id);
    }
    for (const f of ls.fenceLines) {
      if (f.draft && f.generationId === generationId) {
        ls.deleteFenceLine(f.id);
      }
    }

    set((s) =>
      s.activeGenerationId === generationId
        ? { activeGenerationId: null, activeProjectId: null }
        : s,
    );
  },

  discardClass: (generationId, draftClass) => {
    const land = useLandDesignStore.getState();
    for (const [projectId, list] of Object.entries(land.byProject)) {
      for (const el of list) {
        if (
          el.draft &&
          el.generationId === generationId &&
          el.draftClass === draftClass
        ) {
          land.remove(projectId, el.id);
        }
      }
    }
    // Livestock rows belong to the "livestock" class bucket.
    if (draftClass === 'livestock') {
      const ls = useLivestockStore.getState();
      for (const p of ls.paddocks) {
        if (p.draft && p.generationId === generationId) ls.deletePaddock(p.id);
      }
      for (const f of ls.fenceLines) {
        if (f.draft && f.generationId === generationId) {
          ls.deleteFenceLine(f.id);
        }
      }
    }
  },
}));
