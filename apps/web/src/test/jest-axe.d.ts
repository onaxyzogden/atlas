/**
 * Ambient typings for `jest-axe` (audit item F3).
 *
 * jest-axe@10 ships NO TypeScript declarations. Rather than depend on a
 * `@types/jest-axe` package that lags the runtime (and that augments the global
 * `jest` namespace — wrong for this vitest project), we declare exactly the
 * surface we use and borrow the result/options shapes from `axe-core`'s own
 * (bundled, accurate) types. We deliberately do NOT declare the `toHaveNoViolations`
 * matcher: the a11y helper asserts via a plain throwing function (see a11y.ts),
 * so no `expect.extend` / matcher augmentation is needed.
 */
declare module 'jest-axe' {
  import type { AxeResults, RunOptions, Spec } from 'axe-core';

  /** Runs axe against an element (or HTML string) and resolves the results. */
  export type AxeRunner = (
    html: Element | string,
    options?: RunOptions,
  ) => Promise<AxeResults>;

  /**
   * Build an axe runner with baked-in default `RunOptions` (e.g. a rule
   * allowlist via `runOnly`). Per-call options are merged on top of these.
   * `globalOptions` is forwarded to `axe.configure()` (custom rules/locale).
   */
  export function configureAxe(
    options?: RunOptions & { globalOptions?: Spec },
  ): AxeRunner;

  /** Run axe with the default (all-rules) configuration. */
  export const axe: AxeRunner;
}
