// ObserveLensPrototype.tsx — PROTOTYPE ONLY (deletable)
//
// Root of the faithful, mock-backed "observational lens" Observe concept.
// Renamed from the source `App`. Self-contained state; no project context,
// no live data, no MapLibre — mounted standalone at /v3/prototype/observe-lens.
// Lens identity/order/domains come from @ogden/shared OBSERVE_LENSES (live);
// all rich display values are local mock fixtures (see ./mockData).

import { useState } from 'react';
import type { ObserveLensId } from '@ogden/shared';
import { C, F } from './tokens.js';
import type { MockObservation } from './types.js';
import {
  CycleTimelineBar,
  DomainDetailSlideUp,
  DomainsRail,
  IntelligencePanel,
  LensBar,
  PseudoMap,
  TopBar,
} from './components.js';

export default function ObserveLensPrototype() {
  const [activeLens, setActiveLens] = useState<string>('all');
  const [selectedObs, setSelectedObs] = useState<MockObservation | null>(null);
  const [detailLens, setDetailLens] = useState<ObserveLensId | null>(null);

  const handleLensChange = (id: string) => {
    setActiveLens(id);
    setSelectedObs(null);
  };

  const handleObsClick = (obs: MockObservation) => {
    setSelectedObs((prev) => (prev?.id === obs.id ? null : obs));
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: C.bg, color: C.textPrimary, fontFamily: F.sans, overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *::-webkit-scrollbar { width: 7px; height: 7px; }
        *::-webkit-scrollbar-track { background: ${C.bg}; }
        *::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        *::-webkit-scrollbar-thumb:hover { background: ${C.borderLight}; }
      `}</style>

      <TopBar />
      <CycleTimelineBar />
      <LensBar activeLens={activeLens} onLensChange={handleLensChange} />

      {/* Main body: rail | map | intelligence */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden', minHeight: 0 }}>
        <DomainsRail activeLens={activeLens} onSelectLens={handleLensChange} onOpenDetail={setDetailLens} />

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <PseudoMap activeLens={activeLens} onObsClick={handleObsClick} selectedObs={selectedObs} />
        </div>

        <div style={{ width: 300, flexShrink: 0 }}>
          <IntelligencePanel activeLens={activeLens} selectedObs={selectedObs} onOpenDetail={setDetailLens} />
        </div>

        {/* Domain detail slide-up overlay */}
        {detailLens && (
          <DomainDetailSlideUp lensId={detailLens} onClose={() => setDetailLens(null)} />
        )}
      </div>
    </div>
  );
}
