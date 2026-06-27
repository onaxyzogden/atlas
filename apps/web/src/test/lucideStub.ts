/**
 * lucideStub — shared helper to neutralise lucide-react icons in JSDOM tests.
 *
 * lucide's forwardRef icon components spread `[undefined]` into their <svg>
 * children when rendered childless, which React 18 + happy-dom reject on
 * re-render. Replacing every icon export with a clean, childless <svg> stub
 * sidesteps that. The stub is `aria-hidden`, matching how the real icons are
 * used at the call sites (decorative) and keeping them out of the accessibility
 * tree for axe. Mirrors the long-standing inline mock in the tier-shell tests.
 *
 * Use from a vi.mock factory (the factory runs lazily, after imports resolve):
 *   import { buildLucideStub } from '<rel>/test/lucideStub.js';
 *   vi.mock('lucide-react', async (importOriginal) =>
 *     buildLucideStub(await importOriginal<Record<string, unknown>>()));
 */

import * as React from 'react';

export function buildLucideStub(
  actual: Record<string, unknown>,
): Record<string, unknown> {
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' &&
        value !== null &&
        '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', {
            ref,
            'data-lucide-icon': key,
            'aria-hidden': 'true',
          });
        },
      );
      Stub.displayName = `LucideStub(${key})`;
      stubbed[key] = Stub;
    } else {
      stubbed[key] = value;
    }
  }
  return stubbed;
}
