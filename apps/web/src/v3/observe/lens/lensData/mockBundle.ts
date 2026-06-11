// mockBundle — packs the existing mockData.ts fixtures into a LensDataBundle.
//
// This is the `mock` data source (the toggle's escape hatch). Values are the
// fixtures verbatim; mockData.ts stays intact as their home. The `live` source
// (./liveBundle.ts) produces the SAME bundle shape from the project's Observe
// stores.

import type { ObserveLensId } from '@ogden/shared';
import {
  CYCLE,
  DOMAIN_DETAIL,
  FRESHNESS,
  LENSES,
  MOCK_OBSERVATIONS,
  PROJECT,
  TYPE_ICON,
} from '../mockData.js';
import type { LensDataBundle, LensTemporal } from '../types.js';

// Timeline series fixtures -- moved VERBATIM from the inline TEMPORAL_DATA
// const in components.tsx when TemporalView was rewired to read the bundle
// (mock visuals stay pixel-identical; mockData.ts stays byte-untouched).
const MOCK_TEMPORAL: Partial<Record<ObserveLensId, LensTemporal>> = {
  water: { metric: 'Infiltration rate (mm/hr)', points: [{ cycle: 'Baseline', date: 'Oct 24', value: 28, location: 'Zone A' }, { cycle: 'Baseline', date: 'Oct 24', value: 41, location: 'Zone B' }, { cycle: 'Baseline', date: 'Nov 24', value: 35, location: 'Zone C' }, { cycle: 'Cycle 1', date: 'Jan 25', value: 62, location: 'Zone A' }, { cycle: 'Cycle 1', date: 'Feb 25', value: 58, location: 'Zone B' }] },
  living: { metric: 'Soil pH', points: [{ cycle: 'Baseline', date: 'Mar 24', value: 5.2, location: 'Zone 1' }, { cycle: 'Baseline', date: 'Mar 24', value: 5.4, location: 'Zone 2' }, { cycle: 'Baseline', date: 'Mar 24', value: 6.1, location: 'Zone 3' }] },
};

export const mockBundle: LensDataBundle = {
  project: PROJECT,
  lenses: LENSES,
  domainDetail: DOMAIN_DETAIL,
  observations: MOCK_OBSERVATIONS,
  map: null,
  cycle: CYCLE,
  freshness: FRESHNESS,
  typeIcon: TYPE_ICON,
  temporal: MOCK_TEMPORAL,
};
