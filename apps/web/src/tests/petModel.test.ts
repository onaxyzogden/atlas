import { describe, it, expect } from 'vitest';
import { blaneyCriddleAnnualMm, penmanMonteithAnnualMm, computePet } from '../lib/petModel';

describe('blaneyCriddleAnnualMm', () => {
  it('matches the legacy formula (0.46·T + 8.13)·365', () => {
    const T = 12.8; // DC annual mean
    expect(blaneyCriddleAnnualMm(T)).toBeCloseTo((0.46 * T + 8.13) * 365, 6);
  });

  it('clamps negative temperatures to 0 (frozen soil assumption)', () => {
    expect(blaneyCriddleAnnualMm(-5)).toBeCloseTo(8.13 * 365, 6);
  });
});

describe('penmanMonteithAnnualMm', () => {
  // DC-like reference: T≈12.8 °C, solar≈4.0 kWh/m²/day, wind≈3.7 m/s, RH≈66 %, lat≈38.9
  const DC_INPUTS = {
    annualTempC: 12.8,
    solarRadKwhM2Day: 4.0,
    windMs: 3.67,
    rhPct: 66.2,
    latitudeDeg: 38.9,
    elevationM: 20,
  };

  it('produces a physically reasonable ETo for a temperate site (700-1400 mm/yr)', () => {
    const pet = penmanMonteithAnnualMm(DC_INPUTS);
    expect(pet).toBeGreaterThan(700);
    expect(pet).toBeLessThan(1400);
  });

  it('increases monotonically with temperature (holding other inputs constant)', () => {
    const cool = penmanMonteithAnnualMm({ ...DC_INPUTS, annualTempC: 5 });
    const warm = penmanMonteithAnnualMm({ ...DC_INPUTS, annualTempC: 25 });
    expect(warm).toBeGreaterThan(cool);
  });

  it('increases monotonically with solar radiation (energy-limited dimension)', () => {
    const low = penmanMonteithAnnualMm({ ...DC_INPUTS, solarRadKwhM2Day: 2.5 });
    const high = penmanMonteithAnnualMm({ ...DC_INPUTS, solarRadKwhM2Day: 6.0 });
    expect(high).toBeGreaterThan(low);
  });

  it('increases with wind speed (advective term)', () => {
    const calm = penmanMonteithAnnualMm({ ...DC_INPUTS, windMs: 1.0 });
    const windy = penmanMonteithAnnualMm({ ...DC_INPUTS, windMs: 6.0 });
    expect(windy).toBeGreaterThan(calm);
  });

  it('decreases with higher relative humidity (es - ea shrinks)', () => {
    const dry = penmanMonteithAnnualMm({ ...DC_INPUTS, rhPct: 30 });
    const humid = penmanMonteithAnnualMm({ ...DC_INPUTS, rhPct: 90 });
    expect(dry).toBeGreaterThan(humid);
  });

  it('never returns negative (guards against pathological inputs)', () => {
    const pet = penmanMonteithAnnualMm({
      annualTempC: -20,
      solarRadKwhM2Day: 0.5,
      windMs: 0.5,
      rhPct: 100,
      latitudeDeg: 70,
    });
    expect(pet).toBeGreaterThanOrEqual(0);
  });
});

describe('computePet dispatch', () => {
  it('uses Penman-Monteith when all four NASA/lat fields are present', () => {
    const result = computePet({
      annualTempC: 12.8,
      solarRadKwhM2Day: 4.0,
      windMs: 3.67,
      rhPct: 66.2,
      latitudeDeg: 38.9,
    });
    expect(result.method).toBe('penman-monteith');
    expect(result.petMm).toBeGreaterThan(0);
  });

  it('falls back to Blaney-Criddle when solar is missing', () => {
    const result = computePet({
      annualTempC: 12.8,
      windMs: 3.67,
      rhPct: 66.2,
      latitudeDeg: 38.9,
    });
    expect(result.method).toBe('blaney-criddle');
  });

  it('falls back when wind is missing', () => {
    const result = computePet({
      annualTempC: 12.8,
      solarRadKwhM2Day: 4.0,
      rhPct: 66.2,
      latitudeDeg: 38.9,
    });
    expect(result.method).toBe('blaney-criddle');
  });

  it('falls back when latitude is missing', () => {
    const result = computePet({
      annualTempC: 12.8,
      solarRadKwhM2Day: 4.0,
      windMs: 3.67,
      rhPct: 66.2,
    });
    expect(result.method).toBe('blaney-criddle');
  });

  it('Blaney-Criddle fallback returns rounded integer mm/yr', () => {
    const result = computePet({ annualTempC: 12.8 });
    expect(Number.isInteger(result.petMm)).toBe(true);
    expect(result.petMm).toBeCloseTo(Math.round((0.46 * 12.8 + 8.13) * 365), 0);
  });
});
