/**
 * @vitest-environment happy-dom
 *
 * Sentinel guard for the React-resolution + zustand-dedupe machinery.
 *
 * Two regressions this locks against:
 *
 *  1. Worktree react-resolution masking. If `vitest.config.ts`'s react alias
 *     regresses to a hardcoded relative path, every React-importing test
 *     fails to *collect* in a worktree — a partial-green run that hides real
 *     coverage. This file imports React and renders, so it would be among
 *     the casualties; paired with `scripts/check-react-resolution.mjs` (a
 *     loud pre-test fail) the regression can no longer pass unnoticed.
 *
 *  2. Second-React-instance crash. zustand ships a nested react copy. Without
 *     the `react`/`react-dom` alias + `dedupe` + `server.deps.inline:[zustand]`
 *     trio, a store-bound hook rendered in a component test hits a second
 *     React and throws "Cannot read properties of null (reading 'useState')".
 *     This test drives exactly that path with a self-contained store (no app
 *     imports) so it stays a pure canary for the wiring, not the app.
 */

import { describe, it, expect } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { create } from 'zustand';

const useCounter = create<{ n: number; inc: () => void }>((set) => ({
  n: 0,
  inc: () => set((s) => ({ n: s.n + 1 })),
}));

function Counter() {
  const n = useCounter((s) => s.n);
  const inc = useCounter((s) => s.inc);
  return (
    <button type="button" onClick={inc}>
      count: {n}
    </button>
  );
}

describe('react-resolution + zustand-dedupe sentinel', () => {
  it('resolves a single React copy (hooks usable, no null dispatcher)', () => {
    expect(typeof React.useState).toBe('function');
    expect(React.version).toMatch(/^18\./);
  });

  it('renders a zustand-store-bound hook without a second-React crash', () => {
    render(<Counter />);
    const btn = screen.getByRole('button');
    expect(btn.textContent).toBe('count: 0');
    fireEvent.click(btn);
    expect(btn.textContent).toBe('count: 1');
  });
});
