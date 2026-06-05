/**
 * stageSearchStore — ephemeral query state for the header Stage Search.
 *
 * The global AppShell header mounts a single search input (HeaderStageSearch)
 * whose query is read by the currently-active stage surface (Observe / Plan /
 * Act). While the query is non-empty the surface broadens to a flat,
 * cross-scope match list (objectives + tools + domains for that stage).
 *
 * Deliberately NOT persisted: a search term is session-transient and is
 * cleared whenever the steward switches stages (HeaderStageSearch clears it
 * on stage change), so it must never survive a reload or leak across stages.
 */

import { create } from 'zustand';

interface StageSearchState {
  /** Current raw search query (already debounced by the header input). */
  query: string;
  setQuery: (q: string) => void;
  /** Reset to empty — called on stage change and after selecting a match. */
  clear: () => void;
}

export const useStageSearchStore = create<StageSearchState>((set) => ({
  query: '',
  setQuery: (q) => set({ query: q }),
  clear: () => set({ query: '' }),
}));
