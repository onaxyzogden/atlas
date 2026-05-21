# 2026-05-30 — B4 tooltip i18n seam (Slice N)

**Status.** Accepted. Slice N of the B4 tooltip remaining-deferrals roadmap.

**Branch.** `feat/atlas-permaculture` (shipped as `claude/zealous-hawking-a75e25`).

## Context

The tooltip surface ships with several user-facing English strings
hard-coded inline in
[HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx):
row labels ("Union footprint", "Raw π·r² sum", "Saved overlap"),
the " m²" unit suffix, and the counts line that pluralizes
"guild"/"guilds" and "member"/"members" inline with `count === 1`
ternaries.

The B4 remaining-deferrals roadmap calls out tooltip i18n as Slice N
with a blocker: `react-i18next` + `i18next` are listed in
`apps/web/package.json` dependencies, but a grep across
`apps/web/src` returns **zero** `useTranslation` or `i18n.init` call
sites. Doing tooltip i18n in isolation would force this slice to
become "stand up project-wide i18n + apply to the tooltip" — a much
larger ADR than the other B4 slices, with bundle-size implications
and a new top-of-tree provider wrapper.

The roadmap proposed two paths:

- **Path 1 (bigger slice)**: bootstrap i18next (resource files,
  `I18nextProvider` near the app root, default `en` namespace, stub
  `ar` resource), then convert the tooltip's strings as the pilot
  consumer.
- **Path 2 (smaller slice)**: extract the tooltip's strings into a
  constants module with a comment marking the seam for future i18n.
  Defer the bootstrap.

## Decision

Ship **path 2**. Add a new
[tooltipStrings.ts](../../apps/web/src/v3/plan/layers/tooltipStrings.ts)
colocated with the tooltip component. Move every English string
the tooltip surfaces into either the `tooltipStrings` object (for
plain labels) or one of two formatter functions (`formatAreaM2`,
`formatHostCounts`) that encapsulate pluralization + unit-suffix
formatting. The module's header doc-comment is explicit about
(a) why path 2 was chosen, (b) the exact migration steps to path 1,
and (c) which signature constraints stay stable so call sites can
be ported one-for-one when i18next is wired up.

The tooltip component imports `formatAreaM2`, `formatHostCounts`,
and `tooltipStrings`, and replaces every inline literal at usage
points. The previous local `formatM2` helper is removed (callers
go through `formatAreaM2` directly).

## Why path 2 now

`react-i18next` is a dep but never imported. Bootstrapping it
requires:

- An `apps/web/src/i18n/index.ts` init module (i18next instance,
  detection plugin, default namespace).
- An `<I18nextProvider>` wrapper near the app root — affects
  startup time, must be tested for SSR (currently CSR-only, but
  pending Atlas-portal SSR work might land first).
- A resource-file structure (likely `apps/web/src/i18n/locales/
  <lang>/<namespace>.json` per industry convention) — needs a
  decision on namespace boundaries (one giant `common`? per-feature
  namespaces? per-surface namespaces?).
- A bundle-size assessment — `i18next` + `react-i18next` add ~30kB
  gzipped if naively bundled; with lazy-loading per namespace,
  smaller but more complex.
- A copy migration policy — every other hard-coded string in the
  app (Plan side, Hub, etc.) becomes a backlog item.

Each of those is a separate ADR-worthy decision. The tooltip slice
should not force five other decisions; the constants module gets
the tooltip's strings *organised* without forcing a project-wide
infrastructure bet.

## Why a TS module, not a JSON file

A JSON resource file is the standard i18next layout but it can't
hold the two formatter functions (pluralization, unit-suffix
appending). The formatters belong with the strings — splitting
them now would leave a half-organised seam. When i18next lands,
the formatters become a thin shim around `t()` calls and the
string-constant object's contents migrate to JSON; the file
becomes very small or disappears entirely.

## Why keep English n===1 pluralization in-module

The roadmap noted that a real i18n library will replace English's
binary n===1 with CLDR plural-rule lookups per locale (Arabic has
six plural forms — zero / one / two / few / many / other; Russian
has three; etc.). The current formatter's signature is **narrow on
purpose**: `(count, count) => string` — caller passes counts, gets
formatted line. A future migration replaces the implementation
with `t('tooltip.hostCounts', { guildCount, memberCount })` and
the CLDR rules kick in via i18next's `count` interpolation. No
call site changes.

## Consequences

**Touched.**

- [apps/web/src/v3/plan/layers/tooltipStrings.ts](../../apps/web/src/v3/plan/layers/tooltipStrings.ts)
  (NEW): `tooltipStrings` const object (3 row labels), two
  formatter functions (`formatAreaM2`, `formatHostCounts`),
  paragraph-length header docstring documenting the path-1 vs
  path-2 decision + the i18n migration recipe.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx):
  imports the three exports from `tooltipStrings.js`; the local
  `formatM2` helper is removed; the `HostBlock` JSX now reads
  `{tooltipStrings.unionFootprint}` etc and calls
  `formatAreaM2()`, `formatHostCounts()` instead of the previous
  inline ternaries.
- [apps/web/src/v3/plan/layers/__tests__/tooltipStrings.test.ts](../../apps/web/src/v3/plan/layers/__tests__/tooltipStrings.test.ts)
  (NEW): 6 formatter tests — area rounding (including
  toward-zero edge), plural/singular guild + member combinations,
  the zero-as-plural English convention, mixed singular+plural.

**Preserved.**

- Every visible string is byte-identical to the pre-extraction
  ship — including the " · " separator, the "canopy-bearing"
  qualifier, and the n===1 binary pluralization. The existing
  rendering tests in
  [HostCanopyUnionTooltip.test.tsx](../../apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx)
  all pass without modification — strong evidence that the
  refactor changed nothing observable.
- All Slice K invariants (scroll-cap carve-out, data-scrollable
  threshold). All Slice J / I / H invariants. All earlier B4
  invariants.

**Unlocks.** Future i18n bootstrap (path 1) can be a small slice
when needed — wire up i18next, point this module's
implementations at `t()` calls, ship a stub `ar`/`fr` resource
file, no call-site changes required.

**Out of scope.**

- Bootstrapping i18next (path 1) — deferred until a second locale
  is confirmed needed.
- Extracting strings from any other surface — separate slices
  per surface as they get touched. This slice is tooltip-only by
  scope.
- Number formatting beyond the m² unit suffix — locale-aware
  decimal separators, large-number grouping, etc. become
  available once i18next lands; until then English convention
  (no grouping, "." as decimal) matches the existing surface.
- RTL layout — Arabic / Hebrew text direction is a separate
  infrastructure question (CSS logical properties + a `[dir]`
  attribute on `<html>`); the constants module doesn't touch
  layout.

## Verification

- `npx vitest run src/v3/plan/layers` — 24/24 green (12 tooltip
  + 6 memberDragMath + 6 new tooltipStrings).
- `npx vitest run src/v3/plan src/features/agroforestry` —
  284/284 green (36 files; +6 over the Slice K ship).
- `npx tsc --noEmit` — zero new errors on touched files;
  pre-existing unrelated errors elsewhere in the tree confirmed
  unchanged.
- Preview-server visual check not possible in this worktree
  (Vite resolves against worktree-root `node_modules` which
  doesn't exist) — stated explicitly per project CLAUDE.md "say
  so rather than assuming success." The refactor is a pure
  extraction whose visible-string output is verified
  byte-identical by the unchanged rendering tests.

## References

- Roadmap defining Slice N (tooltip i18n):
  `~/.claude/plans/vitest-covering-the-staleness-delegated-quill.md`
- Slice K ship that preceded this slice:
  [2026-05-30-atlas-b4-tooltip-scroll-cap.md](2026-05-30-atlas-b4-tooltip-scroll-cap.md)
