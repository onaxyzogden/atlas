/**
 * a11y.ts — shared accessibility (axe-core) assertion helper for apps/web
 * Vitest component tests.
 *
 * Audit item F3 (scripts/audit-out/ATLAS_DEEP_AUDIT_2026-06-26.md); folds in the
 * maps-1 / maps-2 a11y coverage gap.
 *
 * Design notes
 * ------------
 * • These are JSDOM/happy-dom UNIT-level checks, never browser/preview-driven —
 *   the v3 ceremony shell hangs the preview tool on Observe-lens mounts, so a11y
 *   coverage lives here in the bounded vitest suite (pool:'forks'), not E2E.
 * • We START from a TRACTABLE ALLOWLIST (A11Y_RULE_ALLOWLIST) rather than running
 *   every axe rule and failing the suite on day one. The allowlist is the set of
 *   rules that (a) are meaningful without real layout/paint — so they give a
 *   trustworthy verdict under happy-dom — and (b) the audited surfaces pass
 *   today. Ratchet UP by adding rules here as more surfaces are hardened.
 * • Rules deliberately EXCLUDED — they cannot run trustworthily on an isolated
 *   JSDOM component mount (no real CSS box model, no document chrome, no
 *   landmarks). Excluding them is NOT a claim the surfaces pass them; they are
 *   unverifiable here and belong to a future full-page / E2E axe pass (item F4):
 *     - color-contrast              (needs computed colors + layout geometry)
 *     - region / landmark-*         (a component mounted alone has no landmarks)
 *     - document-title, html-has-lang, html-lang-valid, bypass, meta-viewport
 *     - scrollable-region-focusable (needs real scroll/overflow geometry)
 *
 * Usage:
 *   import { expectNoA11yViolations } from '<rel>/test/a11y.js';
 *   const { container } = render(<Thing />);
 *   await expectNoA11yViolations(container);
 *
 * To knowingly DEFER one allowlisted rule on a single surface, pass its id in the
 * second arg and record WHY inline (also log it in A11Y_DEFERRALS.md):
 *   // DEFERRED (audit maps-2): <reason>. Tracked for the full-page a11y pass (F4).
 *   await expectNoA11yViolations(container, ['some-rule']);
 *
 * NOTE on the mechanism: a deferral DROPS the rule from the run set; it is not a
 * `rules: { id: { enabled: false } }` toggle. With axe-core's
 * `runOnly: { type: 'rule', values }`, every id in `values` is force-run and a
 * `rules` disable for an id INSIDE that list is ignored — so the only way to skip
 * an allowlisted rule is to remove it from `values`, which is what this does.
 */

import { axe } from 'jest-axe';
import type { AxeResults, Result } from 'axe-core';

/**
 * The curated, JSDOM-trustworthy rule set the suite enforces today. Every rule
 * here is WCAG-relevant AND computable without real paint/layout. Add to this
 * list to ratchet coverage up; do NOT silently remove a rule (that lowers the
 * bar for every surface at once — defer it per-call with a reason instead).
 */
export const A11Y_RULE_ALLOWLIST = [
  // Accessible names for interactive controls
  'button-name',
  'link-name',
  'select-name',
  'input-button-name',
  'aria-command-name',
  'aria-input-field-name',
  'aria-toggle-field-name',
  // Form field labelling
  'label',
  // ARIA correctness — attributes, roles, required structure
  'aria-allowed-attr',
  'aria-allowed-role',
  'aria-required-attr',
  'aria-required-children',
  'aria-required-parent',
  'aria-roles',
  'aria-valid-attr',
  'aria-valid-attr-value',
  'aria-hidden-focus',
  // Images / SVG accessible names
  'image-alt',
  'role-img-alt',
  'svg-img-alt',
  // List structure
  'list',
  'listitem',
  // Interaction model
  'nested-interactive',
  // Duplicate ids referenced by ARIA relationships
  'duplicate-id-aria',
] as const;

/**
 * Run the allowlisted axe rules against a rendered container. `disableRules` is
 * the (documented) set of allowlisted rule ids to skip for THIS surface — they
 * are removed from the run set entirely (see the module note on why a `rules`
 * toggle would not work alongside `runOnly`).
 */
export function runA11y(
  container: Element,
  disableRules: readonly string[] = [],
): Promise<AxeResults> {
  const skip = new Set(disableRules);
  const values = A11Y_RULE_ALLOWLIST.filter((rule) => !skip.has(rule));
  return axe(container, { runOnly: { type: 'rule', values } });
}

/**
 * Assert a rendered container has zero violations among the allowlisted rules
 * (minus any documented `disableRules`). Throws a readable, multi-line report
 * (rule id, impact, help URL, offending node targets) on failure — no custom
 * matcher / `expect.extend` needed, so this stays type-clean under `tsc` and
 * matches the project's matcher-free tests.
 */
export async function expectNoA11yViolations(
  container: Element,
  disableRules: readonly string[] = [],
): Promise<void> {
  const { violations } = await runA11y(container, disableRules);
  if (violations.length > 0) {
    throw new Error(formatViolations(violations));
  }
}

function formatViolations(violations: Result[]): string {
  const blocks = violations.map((v) => {
    const nodes = v.nodes
      .map((n) => {
        const target = Array.isArray(n.target)
          ? n.target.join(' ')
          : String(n.target);
        const summary = (n.failureSummary ?? '').replace(/\n/g, '\n        ');
        return `      • ${target}\n        ${summary}`;
      })
      .join('\n');
    return `  [${v.impact ?? 'n/a'}] ${v.id} — ${v.help}\n    ${v.helpUrl}\n${nodes}`;
  });
  return (
    `axe-core found ${violations.length} accessibility violation(s) ` +
    `among the allowlisted rules:\n\n${blocks.join('\n\n')}`
  );
}
