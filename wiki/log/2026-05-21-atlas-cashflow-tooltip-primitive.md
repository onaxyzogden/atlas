# 2026-05-21 — Atlas cashflow per-program tooltip primitive

**Slice 8-F** of the 2026-05-21 habitat-features unification. Closes the
deferred "richer ARIA-grade tooltip primitive" bullet under the Slice
8-D-2 closure note in the ADR.

## What landed

- `apps/web/src/features/economics/StewardshipProgramsCashflowCard.tsx` —
  - Imported `Tooltip` from `apps/web/src/components/ui/Tooltip.tsx`.
  - Dropped the `title?: string` prop on the local `Td` component.
  - Added a new internal `BreakdownTrigger` component that wraps each
    non-Phase cell's value in a `Tooltip`. The tooltip content renders
    the four-line per-program breakdown (Cover-crop / Habitat /
    Agroforestry / Tree-planting) as a small stacked `<div>` block.
    The trigger is a `<span tabIndex={0}>` so the tooltip surfaces on
    keyboard focus (WCAG 2.1 SC 1.4.13 — Content on Hover or Focus).
  - The data model on `PhaseCashflowRow` is unchanged — the four
    `ProgramSubtotal` fields are still losslessly addressable. The
    refactor is presentation-only.
- `apps/web/src/features/economics/__tests__/StewardshipProgramsCashflowCard.test.tsx` —
  rewrote the `getAttribute('title')` assertions to assert presence of
  `role="tooltip"` descendants on each cell and verify the four
  per-program substrings inside the tooltip's `textContent`. Added a
  `span[tabindex="0"]` assertion to lock in keyboard focusability.
- `wiki/decisions/2026-05-21-atlas-habitat-features-unification.md` —
  struck through the "richer ARIA-grade tooltip primitive deferred"
  bullet and added the closure note.

## Why

Native `title=""` is invisible on touch devices (no hover), inconsistently
exposed by screen readers, and unstyleable. The codebase already ships a
hand-rolled, WAI-ARIA-compliant tooltip (`role="tooltip"` +
`aria-describedby` + CSS-token-styled arrow) used by `IconSidebar`,
`AtlasAIPanel`, `DesignToolsPanel`, and `CropMatchingSection`. Slice 8-F
swaps the cashflow card onto that primitive so the per-program
breakdown is reachable through hover, focus, and tap.

## Accessibility checklist

- `role="tooltip"` on the popup (inherited from `Tooltip`).
- `aria-describedby` on the trigger linking to the tooltip id
  (inherited — `Tooltip.tsx` clones the child with the prop).
- Keyboard-focusable trigger (`<span tabIndex={0}>`).
- Tooltip remains visible while hovered via the wrapper's
  `onMouseEnter` / `onMouseLeave` state.
- Content is readable by screen readers via `aria-describedby`
  association.

## Verification

- `npx vitest run src/features/economics/__tests__/StewardshipProgramsCashflowCard.test.tsx` → 6/6 green.
- Covenant grep across the modified files → only the in-file
  disclaimer line matches.

## Out of scope

- Migration of `title=""` on other economics cards. None use it (scout
  confirmed during Slice 8-D-2 planning).
- Custom tooltip primitive (e.g. `@floating-ui/react`).
- Rich tooltip content (charts, icons, links).
- Escape-to-dismiss handler upstream in `Tooltip.tsx` — the existing
  blur+mouseleave hide path is sufficient for v1.
