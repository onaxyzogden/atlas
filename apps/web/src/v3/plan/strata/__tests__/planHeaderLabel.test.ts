import { describe, it, expect } from 'vitest';
import { planHeaderProjectTypeLabel } from '../planHeaderLabel.js';

describe('planHeaderProjectTypeLabel', () => {
  it('returns null when no primary type is set', () => {
    expect(planHeaderProjectTypeLabel(null, [])).toBeNull();
    expect(
      planHeaderProjectTypeLabel(null, ['silvopasture', 'homestead']),
    ).toBeNull();
  });

  it('returns the human label for a known primary type', () => {
    expect(planHeaderProjectTypeLabel('silvopasture', [])).toBe('Silvopasture');
    expect(planHeaderProjectTypeLabel('homestead', [])).toBe('Homestead');
  });

  it('lists every chosen type, primary first, joined by " · "', () => {
    expect(
      planHeaderProjectTypeLabel('regenerative_farm', [
        'silvopasture',
        'orchard_food_forest',
      ]),
    ).toBe('Regenerative Farm · Silvopasture · Orchard / Food Forest');
    expect(planHeaderProjectTypeLabel('silvopasture', ['homestead'])).toBe(
      'Silvopasture · Homestead',
    );
  });

  it('shows only the primary label when there are no secondaries', () => {
    expect(planHeaderProjectTypeLabel('silvopasture', [])).toBe('Silvopasture');
  });
});
