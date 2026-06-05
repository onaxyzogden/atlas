/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ErrorInfo } from 'react';

// Hoisted mock so the boundary's lazy `import('../lib/clientErrorLog.js')`
// resolves to a spy. The dynamic import resolves to this same mocked module.
const { recordClientError } = vi.hoisted(() => ({ recordClientError: vi.fn() }));
vi.mock('../../lib/clientErrorLog', () => ({ recordClientError }));
// tokens.js is imported at module load; keep it real (cheap, no side effects).

import ErrorBoundary, { GlobalErrorBoundary } from '../ErrorBoundary';

const info: ErrorInfo = { componentStack: '\n  at Foo\n  at Bar' };

// The boundary fires `import('../lib/clientErrorLog.js').then(...)` — a
// dynamic-import + microtask chain. A macrotask tick reliably flushes it
// (awaiting a couple of microtasks is not enough once module resolution is in
// the chain).
const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

// Silence the boundary's console.error so test output stays clean.
beforeEach(() => {
  recordClientError.mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ErrorBoundary telemetry', () => {
  it('default ErrorBoundary reports react_error_boundary with the boundary name', async () => {
    const boundary = new ErrorBoundary({ children: null, name: 'WaterCard' });
    const err = new TypeError('render blew up');
    boundary.componentDidCatch(err, info);

    await flushAsync();

    expect(recordClientError).toHaveBeenCalledTimes(1);
    expect(recordClientError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'react_error_boundary',
        name: 'TypeError',
        message: 'render blew up',
        context: expect.objectContaining({ boundary: 'WaterCard' }),
      }),
    );
  });

  it('GlobalErrorBoundary reports with boundary "global"', async () => {
    const boundary = new GlobalErrorBoundary({ children: null });
    boundary.componentDidCatch(new Error('top-level crash'), info);

    await flushAsync();

    expect(recordClientError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'react_error_boundary',
        message: 'top-level crash',
        context: expect.objectContaining({ boundary: 'global' }),
      }),
    );
  });

  it('falls back to "unnamed" when the default boundary has no name', async () => {
    const boundary = new ErrorBoundary({ children: null });
    boundary.componentDidCatch(new Error('x'), info);

    await flushAsync();

    expect(recordClientError).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ boundary: 'unnamed' }),
      }),
    );
  });
});
