/**
 * @vitest-environment happy-dom
 *
 * olosFlags - the OLOS formal-proof feature flag. Off by default; a
 * localStorage override flips it for dev/QA without a rebuild.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { isOlosFormalProofEnabled, OLOS_FORMAL_PROOF_LS_KEY } from '../olosFlags';

beforeEach(() => {
  localStorage.clear();
});

describe('isOlosFormalProofEnabled', () => {
  it('defaults to false when no override and env unset', () => {
    expect(isOlosFormalProofEnabled()).toBe(false);
  });

  it('returns true when the localStorage override is "true"', () => {
    localStorage.setItem(OLOS_FORMAL_PROOF_LS_KEY, 'true');
    expect(isOlosFormalProofEnabled()).toBe(true);
  });

  it('returns false when the localStorage override is "false"', () => {
    localStorage.setItem(OLOS_FORMAL_PROOF_LS_KEY, 'false');
    expect(isOlosFormalProofEnabled()).toBe(false);
  });
});
