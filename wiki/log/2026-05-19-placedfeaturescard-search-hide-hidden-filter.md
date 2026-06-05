# 2026-05-19 — PlacedFeaturesCard search + hide-hidden filter


**Branch.** `feat/atlas-permaculture`. Third placed-features follow-up:
the card now has a search input + a "Hide hidden" pill at the top of
the expanded body, mirroring the existing `DesignElementPalette` search
pattern (same Lucide `Search` icon + bordered transparent input).

Filter is UI-local — no hook or store changes. `PlacedFeaturesCard`
gained two `useState` hooks (query string + `hideHidden` boolean) and a
`useMemo` that filters `rows` by case-insensitive substring against
`label`/`groupLabel`/`kind` plus the hide-hidden flag. Grouped sections
recompute from the filtered list while the header rollup stays on the
unfiltered totals — the summary reads as "what is placed", the body as
"what is currently shown". Zero-match fallback shows "No placed
features match your filter." while keeping the toolbar in place.

Tests. New `PlacedFeaturesCard.test.tsx` (3 cases): search narrows
body rows, hide-hidden pill drops hidden rows, header rollup stays
anchored to the unfiltered total when a search is active. Test file
re-uses the established `vi.mock('lucide-react', …)` forwardRef-stub
pattern from `V3LifecycleSidebar.test.tsx` since this is the first
card-level test in the placedFeatures slice and lucide icons can't
render under happy-dom without it. **17/17 vitest cases passing**
(14 hook + 3 card).

Files. UI: `apps/web/src/features/shared/placedFeatures/{PlacedFeaturesCard.tsx,
PlacedFeaturesCard.module.css, PlacedFeaturesCard.test.tsx (new),
CONTEXT.md}`. Wiki: this log entry + the entity page section.
