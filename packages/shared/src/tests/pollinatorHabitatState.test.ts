import { describe, it, expect } from 'vitest';
import { classifyZoneHabitat } from '../ecology/pollinatorHabitatState.js';

describe('classifyZoneHabitat', () => {
  it('returns unknown band when coverClass is null', () => {
    const out = classifyZoneHabitat({ coverClass: null });
    expect(out.normalizedClass).toBe('unknown');
    expect(out.isLimiting).toBe(false);
  });

  it('classes Grassland/Herbaceous as high with full supportive weight', () => {
    const out = classifyZoneHabitat({ coverClass: 'Grassland/Herbaceous' });
    expect(out.band).toBe('high');
    expect(out.score).toBeCloseTo(1.0, 3);
    expect(out.isLimiting).toBe(false);
  });

  it('classes Cultivated Crops as low (limiting, weight 0.5)', () => {
    const out = classifyZoneHabitat({ coverClass: 'Cultivated Crops' });
    expect(out.isLimiting).toBe(true);
    expect(out.band).toBe('low');
  });

  it('classes Developed, High Intensity as hostile', () => {
    const out = classifyZoneHabitat({ coverClass: 'Developed, High Intensity' });
    expect(out.isLimiting).toBe(true);
    expect(out.band).toBe('hostile');
    expect(out.score).toBe(0);
  });

  it('scales supportive score downward with disturbance', () => {
    const pristine = classifyZoneHabitat({
      coverClass: 'Grassland/Herbaceous',
      disturbanceLevel: 0,
    });
    const disturbed = classifyZoneHabitat({
      coverClass: 'Grassland/Herbaceous',
      disturbanceLevel: 1,
    });
    expect(disturbed.score).toBeLessThan(pristine.score);
    // Fully-disturbed grassland should still not be hostile — just lower band.
    expect(disturbed.isLimiting).toBe(false);
  });

  it('limiting table wins over incidental supportive substring match', () => {
    // "Developed, High Intensity" contains no overlap with supportive keys,
    // but confirm explicitly that limiting match is applied when present.
    const out = classifyZoneHabitat({ coverClass: 'Developed, High Intensity' });
    expect(out.isLimiting).toBe(true);
  });

  it('matches substrings (e.g. "deciduous forest" lowercase variant)', () => {
    const out = classifyZoneHabitat({ coverClass: 'deciduous forest' });
    expect(out.normalizedClass).toBe('Deciduous Forest');
    expect(out.band === 'moderate' || out.band === 'low').toBe(true);
  });

  it('prefers longer-key match (Mixed Forest beats Forest)', () => {
    const out = classifyZoneHabitat({ coverClass: 'Mixed Forest' });
    expect(out.normalizedClass).toBe('Mixed Forest');
  });

  it('unknown cover class falls back to low band with explicit unknown marker', () => {
    const out = classifyZoneHabitat({ coverClass: 'Lunar Regolith' });
    expect(out.normalizedClass).toBe('unknown');
    expect(out.band).toBe('low');
  });

  it('clamps disturbanceLevel outside [0, 1]', () => {
    const over = classifyZoneHabitat({
      coverClass: 'Grassland/Herbaceous',
      disturbanceLevel: 5,
    });
    const one = classifyZoneHabitat({
      coverClass: 'Grassland/Herbaceous',
      disturbanceLevel: 1,
    });
    expect(over.score).toBeCloseTo(one.score, 5);

    const under = classifyZoneHabitat({
      coverClass: 'Grassland/Herbaceous',
      disturbanceLevel: -2,
    });
    const zero = classifyZoneHabitat({
      coverClass: 'Grassland/Herbaceous',
      disturbanceLevel: 0,
    });
    expect(under.score).toBeCloseTo(zero.score, 5);
  });
});
