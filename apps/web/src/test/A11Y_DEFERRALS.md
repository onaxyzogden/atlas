# A11y deferrals (vitest axe checks)

Audit item **F3** wired axe-core into the apps/web vitest suite (see
[`a11y.ts`](./a11y.ts)). The suite enforces a **tractable rule allowlist**
(`A11Y_RULE_ALLOWLIST`) rather than every axe rule. This file records violations
that ARE in the allowlist but are **knowingly deferred** on a specific surface —
each one corresponds to a per-call `expectNoA11yViolations(container, ['<rule>'])`
override in a test (which drops the rule from the run set), tagged with a matching
`DEFERRED` comment.

> Rules excluded *by design* (color-contrast, region / landmark-\*,
> document-title, html-has-lang, scrollable-region-focusable, …) are NOT listed
> here — they cannot run trustworthily on an isolated JSDOM component mount and
> are documented in `a11y.ts` for a future full-page / E2E pass (item F4).

| Rule | Surface | Impact | Why deferred | Intended fix |
|---|---|---|---|---|
| `aria-required-children` | `HeaderProjectSelector` — expanded popover | critical | The popover element carries `role="listbox"` but also contains the footer "All projects →" navigation link, which is not an `option`/`group`. axe flags it as a disallowed child (`a[tabindex]`). A real WCAG 1.3.1 issue. | Render the footer link OUTSIDE the `role="listbox"` element (split the popover container from the listbox so the listbox owns only the option rows), then drop the per-call override in `HeaderProjectSelector.a11y.test.tsx`. |

_Last updated: 2026-06-26._
