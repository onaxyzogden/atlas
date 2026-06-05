import { describe, it, expect } from 'vitest';
import { formatLngLat } from '../MapCoordinateReadout.js';

describe('formatLngLat', () => {
  it('formats with 5 decimal places by default', () => {
    expect(formatLngLat(-79.8, 43.5)).toBe('Lat 43.50000  Lng -79.80000');
  });

  it('zero-pads to fixed precision', () => {
    expect(formatLngLat(0, 0)).toBe('Lat 0.00000  Lng 0.00000');
  });

  it('preserves negative signs for both hemispheres', () => {
    expect(formatLngLat(-122.41942, -37.81234)).toBe('Lat -37.81234  Lng -122.41942');
  });

  it('rounds to the requested precision', () => {
    expect(formatLngLat(10.123456, 20.987654)).toBe('Lat 20.98765  Lng 10.12346');
  });

  it('honors a custom digit count', () => {
    expect(formatLngLat(-79.8, 43.5, 2)).toBe('Lat 43.50  Lng -79.80');
  });
});
