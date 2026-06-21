/**
 * projectAreaLabel unit conversion (area-label fix).
 *
 * `project.acreage` is stored canonically in acres (see lib/geo). The label must
 * convert to the project's display unit: hectares for metric, acres for imperial.
 * Regression guard for the bug where a metric project rendered the raw acres
 * value under a "ha" suffix (e.g. "122 ha" for a 122-acre parcel).
 */
import { describe, it, expect } from 'vitest';
import type { LocalProject } from '../../../store/projectStore.js';
import { projectAreaLabel } from '../portfolioModel.js';

const project = (acreage: unknown, units?: 'metric' | 'imperial'): LocalProject =>
  ({ id: 'p', name: 'P', acreage, units } as unknown as LocalProject);

describe('projectAreaLabel', () => {
  it('converts canonical acres to hectares for a metric project', () => {
    // 122 ac × 0.404686 = 49.37 ha → rounds to 49
    expect(projectAreaLabel(project(122, 'metric'))).toBe('49 ha');
  });

  it('defaults to metric (hectares) when units is omitted', () => {
    expect(projectAreaLabel(project(122))).toBe('49 ha');
  });

  it('leaves acres unchanged for an imperial project', () => {
    expect(projectAreaLabel(project(122, 'imperial'))).toBe('122 ac');
  });

  it('keeps one-decimal rounding for converted values below 10', () => {
    // 20 ac × 0.404686 = 8.09 ha → one decimal → 8.1
    expect(projectAreaLabel(project(20, 'metric'))).toBe('8.1 ha');
  });

  it('returns "Area unknown" for missing, zero, or non-finite acreage', () => {
    expect(projectAreaLabel(project(undefined, 'metric'))).toBe('Area unknown');
    expect(projectAreaLabel(project(0, 'metric'))).toBe('Area unknown');
    expect(projectAreaLabel(project(Number.NaN, 'metric'))).toBe('Area unknown');
  });
});
