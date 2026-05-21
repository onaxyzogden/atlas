# 2026-05-30 — B4 tooltip i18n seam (Slice N)

**Branch.** `feat/atlas-permaculture` (shipped as
`claude/zealous-hawking-a75e25`). Closes Slice N of the [B4 tooltip
remaining-deferrals roadmap](2026-05-30-b4-tooltip-perblock-fade-and-reverse.md).
Full design context in
[2026-05-30 ADR](../decisions/2026-05-30-atlas-b4-tooltip-i18n-seam.md).

**What changed.**

- [apps/web/src/v3/plan/layers/tooltipStrings.ts](../../apps/web/src/v3/plan/layers/tooltipStrings.ts)
  (NEW): single source-of-truth module for every English string
  the tooltip surfaces — `tooltipStrings` const object (3 row
  labels: `unionFootprint`, `rawDiskSum`, `savedOverlap`), plus
  two formatter functions: `formatAreaM2(n)` (rounds + appends
  " m²") and `formatHostCounts(guildCount, memberCount)`
  (English n===1 binary pluralization for "guild"/"guilds" and
  "member"/"members", with the " · " separator and the
  "canopy-bearing" qualifier baked in). Paragraph-length header
  docstring documents (a) the path-1 vs path-2 decision, (b) the
  exact migration recipe to `useTranslation` when i18next is
  bootstrapped, and (c) why the formatter signatures stay narrow
  so call sites port one-for-one.
- [apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx](../../apps/web/src/v3/plan/layers/HostCanopyUnionTooltip.tsx):
  removes the inline `formatM2` helper; imports
  `formatAreaM2`, `formatHostCounts`, `tooltipStrings` from
  `./tooltipStrings.js`; the `HostBlock` JSX swaps inline
  ternaries (`guildCount === 1 ? 'guild' : 'guilds'` etc) for
  the formatter call and reads `{tooltipStrings.unionFootprint}`
  etc instead of bare string literals.
- [apps/web/src/v3/plan/layers/__tests__/tooltipStrings.test.ts](../../apps/web/src/v3/plan/layers/__tests__/tooltipStrings.test.ts)
  (NEW): 6 formatter unit tests — area rounding (incl.
  toward-zero edge for 0.49), plural/singular guild + member
  combinations, mixed singular guild + plural member, and the
  zero-as-plural English convention.

**Why path 2 (constants module), not path 1 (bootstrap i18next).**
`react-i18next` + `i18next` are in `apps/web/package.json` but
**zero** `useTranslation` or `i18n.init` call sites exist
anywhere in `apps/web/src` — the tooltip would be the first
consumer in the whole web app. Path 1 would force five other
ADR-worthy decisions in this slice's scope: i18next bootstrap
location, `<I18nextProvider>` wrapper near the app root
(startup-time + pending Atlas-portal SSR consideration), resource-
file layout (namespace boundaries), bundle-size assessment (~30kB
gzipped naively bundled), and a project-wide copy-migration
policy. The constants module gets the tooltip's strings *organised*
without forcing any of those bets; path 1 stays available as a
small follow-up slice when a second locale is confirmed.

**Why a TS module, not a JSON resource file.** JSON is the standard
i18next layout but can't hold the two formatter functions
(pluralization, unit-suffix). The formatters belong colocated with
the strings — splitting them now would leave a half-organised seam.
When i18next lands, formatters become a thin shim around `t()` and
the string-constant object migrates to JSON; the file shrinks or
disappears.

**Why keep English n===1 binary pluralization in-module.** A real
i18n library will replace it with CLDR plural-rule lookups per
locale (Arabic: six forms; Russian: three; etc.). The current
formatter signature is narrow on purpose: `(count, count) =>
string`. Future migration swaps the implementation for
`t('tooltip.hostCounts', { guildCount, memberCount })` with no
call-site changes.

**Verification.**
- `npx vitest run src/v3/plan/layers` → 24/24 green (12 tooltip +
  6 memberDragMath + 6 new tooltipStrings).
- `npx vitest run src/v3/plan src/features/agroforestry` →
  284/284 green (36 files; +6 over the Slice K ship).
- `npx tsc --noEmit` clean on touched files; pre-existing
  unrelated errors elsewhere unchanged.
- Preview-server visual check not possible in this worktree (Vite
  resolves against worktree-root `node_modules` which doesn't
  exist) — stated explicitly per project CLAUDE.md "say so rather
  than assuming success." The refactor is a pure extraction whose
  visible-string output is verified byte-identical by the
  unchanged tooltip rendering tests.

**Strings preserved byte-identically.** Row labels ("Union
footprint", "Raw π·r² sum", "Saved overlap"), unit suffix (" m²"),
counts-line separator (" · "), "canopy-bearing" qualifier, and
the n===1 binary pluralization are all unchanged. The existing
rendering tests in
[HostCanopyUnionTooltip.test.tsx](../../apps/web/src/v3/plan/layers/__tests__/HostCanopyUnionTooltip.test.tsx)
all pass without modification — strong evidence the refactor
changed nothing observable.

**Invariants preserved.** All Slice K invariants (scroll-cap
carve-out at threshold=4, data-scrollable activation). All Slice J
/ I / H invariants. All earlier B4 invariants (mouseleave-driven
dismiss in hover mode + small-pinned, single-pin, multi-feature
fan-out, touch tap-outside dismiss, enter + exit + per-block +
reverse-in-flight fade machinery, `prefers-reduced-motion`).

**Out of scope.** Bootstrapping i18next (path 1, deferred).
Extracting strings from any other surface (tooltip-only by scope).
Number formatting beyond m² suffix (locale-aware decimal
separators, large-number grouping — available once i18next lands).
RTL layout (separate infrastructure question — CSS logical
properties + `[dir]` attribute on `<html>`). All other prior
deferrals from earlier B4 ADRs remain deferred per [the roadmap](../../../.claude/plans/vitest-covering-the-staleness-delegated-quill.md).
