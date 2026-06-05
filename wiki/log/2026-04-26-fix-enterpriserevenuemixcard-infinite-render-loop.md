# 2026-04-26 — Fix: EnterpriseRevenueMixCard infinite render loop


Bug → Economics panel's `EnterpriseRevenueMixCard` crashed the
ErrorBoundary on mount with "Maximum update depth exceeded". Root
cause: three Zustand selectors at lines 102-110 each returned a
fresh `.filter()` array per call, so referential equality failed
on every subscribe tick → infinite re-render.

**Files:**
- [`apps/web/src/features/economics/EnterpriseRevenueMixCard.tsx`](apps/web/src/features/economics/EnterpriseRevenueMixCard.tsx) — selectors now pull raw `structures` / `paddocks` / `cropAreas` arrays; project-id filtering moved into three `useMemo` blocks.

**Verification.** Console clean (no "Maximum update depth"); only
pre-existing axe-core color-contrast warnings remained. `tsc
--noEmit` for `apps/web` clean for the file.

**Pattern note.** Codebase has no `useShallow` / `zustand/shallow`
usage — the established convention is "select primitive arrays,
filter via `useMemo`". Other cards using the same anti-pattern
(in-selector `.filter`) are likely lurking; sibling
`StageRevealNarrativeCard` already had a similar fix earlier
(commit `844a3e5`).
