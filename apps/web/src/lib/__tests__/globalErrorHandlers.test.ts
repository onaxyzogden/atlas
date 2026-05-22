/**
 * @vitest-environment happy-dom
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mock for clientErrorLog so we can assert on recordClientError without
// driving the whole telemetry buffer.
const { recordClientError } = vi.hoisted(() => ({ recordClientError: vi.fn() }));
vi.mock('../clientErrorLog', () => ({ recordClientError }));

import { installGlobalErrorHandlers } from '../globalErrorHandlers';

const dispatchRejection = (reason: unknown) => {
  const e = new Event('unhandledrejection');
  (e as unknown as { reason: unknown }).reason = reason;
  window.dispatchEvent(e);
};

describe('globalErrorHandlers', () => {
  // NOTE: deliberately do NOT reset the module's `installed` guard between
  // tests. The guard prevents duplicate listener registration; resetting it
  // would let each install() add another `window` listener (happy-dom keeps
  // the same window across a file), inflating call counts. Installing once and
  // asserting the single persistent listener is exactly the real-world path.
  beforeEach(() => {
    recordClientError.mockClear();
  });

  it('records an unhandled_rejection from an Error reason', () => {
    installGlobalErrorHandlers();
    dispatchRejection(new Error('boom'));

    expect(recordClientError).toHaveBeenCalledTimes(1);
    expect(recordClientError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'unhandled_rejection',
        name: 'Error',
        message: 'boom',
      }),
    );
  });

  it('coerces a non-Error reason to a string message', () => {
    installGlobalErrorHandlers();
    dispatchRejection('plain string reason');

    expect(recordClientError).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'unhandled_rejection',
        name: 'UnhandledRejection',
        message: 'plain string reason',
      }),
    );
  });

  it('installs the listener only once across repeated calls', () => {
    installGlobalErrorHandlers();
    installGlobalErrorHandlers();
    installGlobalErrorHandlers();

    dispatchRejection(new Error('once'));
    expect(recordClientError).toHaveBeenCalledTimes(1);
  });
});
