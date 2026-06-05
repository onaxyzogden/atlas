// LensDataContext — single source of the resolved lens-data bundle.
//
// ObserveLensDashboard resolves ONE LensDataBundle (mock fixtures OR a live
// projection of the project's Observe stores) and provides it here. Every lens
// component (spine, detail-rail, map, intelligence panel, cycle bar, slide-up)
// reads the bundle via useLensData() instead of importing mockData.ts directly,
// so the same component tree renders either source with no prop-drilling.

import { createContext, useContext, type ReactNode } from 'react';
import type { LensDataBundle } from '../types.js';

const LensDataContext = createContext<LensDataBundle | null>(null);

export function LensDataProvider({
  bundle,
  children,
}: {
  bundle: LensDataBundle;
  children: ReactNode;
}) {
  return (
    <LensDataContext.Provider value={bundle}>
      {children}
    </LensDataContext.Provider>
  );
}

export function useLensData(): LensDataBundle {
  const ctx = useContext(LensDataContext);
  if (!ctx) {
    throw new Error('useLensData must be used within a LensDataProvider');
  }
  return ctx;
}
