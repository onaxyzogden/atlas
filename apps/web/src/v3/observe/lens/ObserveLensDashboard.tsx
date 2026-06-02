// ObserveLensDashboard.tsx — mock-backed Observe lens surface (NOT yet wired to live data)
//
// Root of the "observational lens" Observe dashboard. Promoted from the prior
// `prototype/` namespace; this is now the live `module-bar` Observe shell
// (mounted by ObserveLayout) as well as the chrome-free debug route
// /v3/prototype/observe-lens. Self-contained state; no project context,
// no live data, no MapLibre — fed entirely by local mock fixtures.
// Lens identity/order/domains come from @ogden/shared OBSERVE_LENSES (live);
// all rich display values are local mock fixtures (see ./mockData).
//
// TYPOGRAPHY / SIZING: the entire UI is proportionally enlarged via a single
// CSS `zoom` factor (Z) on the wrapper below, so the smallest source font
// (7px) renders at 12px while every other dimension scales by the same ratio.
// This keeps ./components.tsx pixel-faithful to the original concept — no
// per-value rescaling. `zoom` is Chromium/Safari/FF>=126 (Atlas is Chromium-first).

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

// Proportional true-zoom factor: smallest source font 7px -> 12px.
const Z = 12 / 7;

export default function ObserveLensDashboard() {
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
    // Outer fills the host (StageShell canvas or the standalone route). The inner
    // box is pre-sized to host/Z then `zoom: Z` scales it back to fill exactly —
    // so the layout fits with no overflow while every length renders Z larger.
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: C.bg }}>
      <div style={{ width: `calc(100% / ${Z})`, height: `calc(100% / ${Z})`, zoom: Z }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: C.bg, color: C.textPrimary, fontFamily: F.sans, overflow: 'hidden' }}>
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
      </div>
    </div>
  );
}
