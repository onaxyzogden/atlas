import { describe, it, expect } from 'vitest';
import { planHeaderProjectTypeLabel } from '../planHeaderLabel.js';

describe('planHeaderProjectTypeLabel', () => {
  it('returns null when no primary type is set', () => {
    expect(planHeaderProjectTypeLabel(null, 0)).toBeNull();
    expect(planHeaderProjectTypeLabel(null, 3)).toBeNull();
  });

  it('returns the human label for a known primary type', () => {
    expect(planHeaderProjectTypeLabel('silvopasture', 0)).toBe('Silvopasture');
    expect(planHeaderProjectTypeLabel('homestead', 0)).toBe('Homestead');
  });

  it('appends a · +N suffix when secondary types are present', () => {
    expect(planHeaderProjectTypeLabel('silvopasture', 2)).toBe('Silvopasture · +2');
    expect(planHeaderProjectTypeLabel('homestead', 1)).toBe('Homestead · +1');
  });

  it('does not append a suffix for zero secondaries', () => {
    expect(planHeaderProjectTypeLabel('silvopasture', 0)).toBe('Silvopasture');
  });
});
