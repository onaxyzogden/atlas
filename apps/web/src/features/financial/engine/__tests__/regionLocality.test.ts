import { describe, it, expect } from 'vitest';
import { deriveCostRegion } from '../regionLocality.js';

describe('deriveCostRegion', () => {
  it('maps Canadian provinces to their distinct regions', () => {
    expect(deriveCostRegion('CA', 'ON')).toBe('ca-ontario');
    expect(deriveCostRegion('CA', 'BC')).toBe('ca-bc');
    expect(deriveCostRegion('CA', 'AB')).toBe('ca-prairies');
    expect(deriveCostRegion('CA', 'SK')).toBe('ca-prairies');
    expect(deriveCostRegion('CA', 'MB')).toBe('ca-prairies');
  });

  it('falls back to the Ontario base for other Canadian provinces', () => {
    expect(deriveCostRegion('CA', 'QC')).toBe('ca-ontario');
    expect(deriveCostRegion('CA', null)).toBe('ca-ontario');
  });

  it('buckets US states into the four US regions', () => {
    expect(deriveCostRegion('US', 'NY')).toBe('us-northeast');
    expect(deriveCostRegion('US', 'IA')).toBe('us-midwest');
    expect(deriveCostRegion('US', 'GA')).toBe('us-southeast');
    expect(deriveCostRegion('US', 'CA')).toBe('us-west');
  });

  it('falls back to us-midwest for unknown US states', () => {
    expect(deriveCostRegion('US', 'ZZ')).toBe('us-midwest');
    expect(deriveCostRegion('US', undefined)).toBe('us-midwest');
  });

  it('treats INTL / unknown country as the neutral us-midwest base', () => {
    expect(deriveCostRegion('INTL', 'anything')).toBe('us-midwest');
    expect(deriveCostRegion(undefined, undefined)).toBe('us-midwest');
    expect(deriveCostRegion('', '')).toBe('us-midwest');
  });

  it('normalizes case + whitespace', () => {
    expect(deriveCostRegion('ca', ' on ')).toBe('ca-ontario');
    expect(deriveCostRegion('us', 'ny')).toBe('us-northeast');
  });
});
