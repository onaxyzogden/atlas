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
// LAYOUT: this is now composed on Atlas's real StageShell (between-rails),
// mirroring act/tier-shell/ActTierShell. The top ObserveLensSpine is now a
// minimal filter-chip bar (icon + label + freshness dot, filter-only); the rich
// per-lens cards (meta, divergence, summary) moved DOWN into ObserveLensDetailRail,
// mounted in StageShell's `bottomTray` (between-rails) so it sits under the map
// canvas between the full-height left/right rails. A whole-card click in that
// rail opens the lens's DomainDetailSlideUp (each card carries a button-styled
// "View all observations" CTA; filter reset lives in the top spine chips). The
// right rail stacks Land Intelligence atop a vertical Recent
// Observations list (one shared scroll, via IntelligencePanel's `footer`). The
// internal TopBar was dropped (it duplicated the global app-shell header). The
// old CSS `zoom` box is gone; the UI renders at Act's natural proportions (see
// the de-zoom rebake in ./components.tsx and the spine in ./ObserveLensSpine.tsx).

import { useState } from 'react';
import type { ObserveLensId } from '@ogden/shared';
import StageShell from '../../_shell/StageShell.js';
import { C, F } from './tokens.js';
import { LensDataProvider } from './lensData/LensDataContext.js';
import { mockBundle } from './lensData/mockBundle.js';
import type { MockObservation } from './types.js';
import ObserveLensSpine from './ObserveLensSpine.js';
import ObserveLensDetailRail from './ObserveLensDetailRail.js';
import {
  CycleTimelineBar,
  DomainDetailSlideUp,
  IntelligencePanel,
  PseudoMap,
  RecentObservationsStrip,
} from './components.js';
import css from './ObserveLensDashboard.module.css';

export default function ObserveLensDashboard() {
  const [activeLens, setActiveLens] = useState<string>('all');
  const [selectedObs, setSelectedObs] = useState<MockObservation | null>(null);
  const [detailLens, setDetailLens] = useState<ObserveLensId | null>(null);

  // Phase 2: still the mock bundle. Phase 5 swaps this for a live/mock choice
  // driven by the per-project data-source toggle. Every lens component reads it
  // through LensDataProvider/useLensData instead of importing mockData directly.
  const bundle = mockBundle;

  const handleLensChange = (id: string) => {
    setActiveLens(id);
    setSelectedObs(null);
  };

  const handleObsClick = (obs: MockObservation) => {
    setSelectedObs((prev) => (prev?.id === obs.id ? null : obs));
  };

  return (
    // .lensShell is position:relative so the absolute slide-up (a SIBLING below,
    // NOT StageShell's `overlay` slot) covers the spine + shell — matching
    // today's full-bleed slide-up and Act's sibling-modal pattern.
    // The internal TopBar was removed: it duplicated the global app-shell header
    // (OGDEN / Land OS + stage chips + Share/Present); TopBar stays exported in
    // components.tsx (no-deletion) for the chrome-free debug route's use.
    // LensDataProvider feeds the resolved bundle to every lens component below
    // (spine, rails, map, panel, slide-up) via useLensData — renders no DOM node.
    <LensDataProvider bundle={bundle}>
    <div
      className={css.lensShell}
      style={{ color: C.textPrimary, fontFamily: F.sans }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *::-webkit-scrollbar { width: 7px; height: 7px; }
        *::-webkit-scrollbar-track { background: ${C.bg}; }
        *::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 4px; }
        *::-webkit-scrollbar-thumb:hover { background: ${C.borderLight}; }
      `}</style>

      {/* Lens selector — top spine (ActTierSpine-style); replaces the former
          horizontal DomainsView strip as the sole lens selector. */}
      <ObserveLensSpine
        activeLens={activeLens}
        onSelectLens={handleLensChange}
        projectTitle={bundle.project.name}
        projectType={bundle.project.type}
      />

      <div className={css.shellWrap}>
        <StageShell
          bottomPlacement="between-rails"
          symmetricRails
          canvasLabel="Observe lens map"
          leftRailLabel="Cycle timeline"
          rightRailLabel="Land intelligence"
          leftRail={<CycleTimelineBar vertical />}
          canvas={
            <PseudoMap
              activeLens={activeLens}
              onObsClick={handleObsClick}
              selectedObs={selectedObs}
            />
          }
          rightRail={
            <IntelligencePanel
              activeLens={activeLens}
              selectedObs={selectedObs}
              onOpenDetail={setDetailLens}
              footer={
                <RecentObservationsStrip
                  vertical
                  activeLens={activeLens}
                  selectedObs={selectedObs}
                  onObsClick={handleObsClick}
                />
              }
            />
          }
          bottomTray={
            <ObserveLensDetailRail
              activeLens={activeLens}
              onSelectLens={handleLensChange}
              onOpenDetail={setDetailLens}
            />
          }
        />
      </div>

      {/* Domain detail slide-up — sibling overlay (covers spine + shell). */}
      {detailLens && (
        <DomainDetailSlideUp lensId={detailLens} onClose={() => setDetailLens(null)} />
      )}
    </div>
    </LensDataProvider>
  );
}
