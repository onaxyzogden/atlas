/**
 * @vitest-environment happy-dom
 *
 * waitForTarget -- polls the DOM for a tour anchor, resolving its rect on
 * appearance and `null` on timeout. Driven with fake timers (the helper uses
 * Date.now() deadlines precisely so vitest's faked clock advances both the timer
 * queue and the deadline together).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { waitForTarget } from '../useWaitForTarget.js';

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('waitForTarget', () => {
  it('resolves with the rect once the element appears', async () => {
    vi.useFakeTimers();
    const pending = waitForTarget('[data-tour="late"]', 4000, 60);

    // Not present for the first couple of polls...
    await vi.advanceTimersByTimeAsync(120);
    const el = document.createElement('div');
    el.setAttribute('data-tour', 'late');
    document.body.appendChild(el);

    // ...then it appears on the next poll.
    await vi.advanceTimersByTimeAsync(60);
    const rect = await pending;
    expect(rect).not.toBeNull();
    expect(typeof rect?.top).toBe('number');
  });

  it('resolves null when the element never appears before the deadline', async () => {
    vi.useFakeTimers();
    const pending = waitForTarget('[data-tour="never"]', 200, 60);
    await vi.advanceTimersByTimeAsync(400);
    expect(await pending).toBeNull();
  });

  it('resolves immediately when the element is already present', async () => {
    vi.useFakeTimers();
    const el = document.createElement('div');
    el.setAttribute('data-tour', 'present');
    document.body.appendChild(el);

    const rect = await waitForTarget('[data-tour="present"]', 4000, 60);
    expect(rect).not.toBeNull();
  });
});
