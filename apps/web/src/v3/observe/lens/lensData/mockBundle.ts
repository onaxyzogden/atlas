// mockBundle — packs the existing mockData.ts fixtures into a LensDataBundle.
//
// This is the `mock` data source (the toggle's escape hatch). Values are the
// fixtures verbatim; mockData.ts stays intact as their home. The `live` source
// (./liveBundle.ts) produces the SAME bundle shape from the project's Observe
// stores.

import {
  CYCLE,
  DOMAIN_DETAIL,
  FRESHNESS,
  LENSES,
  MOCK_OBSERVATIONS,
  PROJECT,
  TYPE_ICON,
} from '../mockData.js';
import type { LensDataBundle } from '../types.js';

export const mockBundle: LensDataBundle = {
  project: PROJECT,
  lenses: LENSES,
  domainDetail: DOMAIN_DETAIL,
  observations: MOCK_OBSERVATIONS,
  map: null,
  cycle: CYCLE,
  freshness: FRESHNESS,
  typeIcon: TYPE_ICON,
};
