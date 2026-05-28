import { describe, it, expect } from 'vitest';
import { computeObserveRevisionFlag } from '../observeRevisionTrigger.js';
import type { UniversalDomain } from '../../schemas/universalDomain.schema.js';

const SOIL: UniversalDomain = 'soil';
const HYDRO: UniversalDomain = 'hydrology';
const CLIMATE: UniversalDomain = 'climate';

describe('computeObserveRevisionFlag', () => {
  it('returns false when the objective has no mapped domains', () => {
    expect(
      computeObserveRevisionFlag({
        objectiveDomainIds: [],
        divergedDataPointDomains: [SOIL, HYDRO],
        divergedFeedDomains: [CLIMATE],
      }),
    ).toBe(false);
  });

  it('returns true when a diverged data point matches an objective domain', () => {
    expect(
      computeObserveRevisionFlag({
        objectiveDomainIds: [SOIL],
        divergedDataPointDomains: [SOIL],
        divergedFeedDomains: [],
      }),
    ).toBe(true);
  });

  it('returns true when a diverged feed entry matches an objective domain', () => {
    expect(
      computeObserveRevisionFlag({
        objectiveDomainIds: [HYDRO],
        divergedDataPointDomains: [],
        divergedFeedDomains: [HYDRO],
      }),
    ).toBe(true);
  });

  it('returns false when neither signal set overlaps the objective domains', () => {
    expect(
      computeObserveRevisionFlag({
        objectiveDomainIds: [SOIL],
        divergedDataPointDomains: [CLIMATE],
        divergedFeedDomains: [HYDRO],
      }),
    ).toBe(false);
  });

  it('returns true on partial overlap when objective covers multiple domains', () => {
    expect(
      computeObserveRevisionFlag({
        objectiveDomainIds: [SOIL, HYDRO, CLIMATE],
        divergedDataPointDomains: [],
        divergedFeedDomains: [HYDRO],
      }),
    ).toBe(true);
  });

  it('returns false when both signal arrays are empty', () => {
    expect(
      computeObserveRevisionFlag({
        objectiveDomainIds: [SOIL],
        divergedDataPointDomains: [],
        divergedFeedDomains: [],
      }),
    ).toBe(false);
  });
});
