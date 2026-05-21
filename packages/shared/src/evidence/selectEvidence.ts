// apps/web/src/lib/evidence/selectEvidence.ts
//
// Phase E.2 — Top-level evidence dispatcher.
//
// Each call site supplies a panel-key-tagged input bundle; the
// dispatcher routes to the matching per-panel selector and returns
// the resulting EvidenceItem. Unknown panel keys return null so the
// caller's <EvidenceSection> can gracefully hide the disclosure.

import type { EvidenceItem, PanelKey } from './types.js';
import {
  selectVerdictEvidence,
  type VerdictEvidenceInputs,
} from './selectors/verdict.js';
import {
  selectTriadEvidence,
  type TriadEvidenceInputs,
} from './selectors/triad.js';
import {
  selectSiteNarrativeEvidence,
  type SiteNarrativeEvidenceInputs,
} from './selectors/siteNarrative.js';
import {
  selectWaterStorageEvidence,
  type WaterStorageEvidenceInputs,
} from './selectors/waterStorage.js';
import {
  selectThreeEthicsEvidence,
  type ThreeEthicsEvidenceInputs,
} from './selectors/threeEthics.js';
import {
  selectWaterRouterEvidence,
  type WaterRouterEvidenceInputs,
} from './selectors/waterRouter.js';
import {
  selectCapitalPartnerEvidence,
  type CapitalPartnerEvidenceInputs,
} from './selectors/capitalPartner.js';
import {
  selectHostCanopyUnionEvidence,
  type HostCanopyUnionEvidenceInputs,
} from './selectors/hostCanopyUnion.js';

/**
 * Discriminated input bundle keyed by `panelKey`. Adding a new panel
 * means: (a) extend PanelKey in types.ts, (b) add a new selector,
 * (c) add a new arm to this union, (d) add the dispatch case below.
 */
export type EvidenceDispatchInputs =
  | { panelKey: 'land-verdict'; inputs: VerdictEvidenceInputs }
  | { panelKey: 'decision-triad'; inputs: TriadEvidenceInputs }
  | { panelKey: 'site-narrative'; inputs: SiteNarrativeEvidenceInputs }
  | { panelKey: 'water-storage'; inputs: WaterStorageEvidenceInputs }
  | { panelKey: 'three-ethics'; inputs: ThreeEthicsEvidenceInputs }
  | { panelKey: 'water-router'; inputs: WaterRouterEvidenceInputs }
  | { panelKey: 'capital-partner'; inputs: CapitalPartnerEvidenceInputs }
  | { panelKey: 'host-canopy-union'; inputs: HostCanopyUnionEvidenceInputs };

export function selectEvidenceFor(
  bundle: EvidenceDispatchInputs,
): EvidenceItem | null {
  switch (bundle.panelKey) {
    case 'land-verdict':
      return selectVerdictEvidence(bundle.inputs);
    case 'decision-triad':
      return selectTriadEvidence(bundle.inputs);
    case 'site-narrative':
      return selectSiteNarrativeEvidence(bundle.inputs);
    case 'water-storage':
      return selectWaterStorageEvidence(bundle.inputs);
    case 'three-ethics':
      return selectThreeEthicsEvidence(bundle.inputs);
    case 'water-router':
      return selectWaterRouterEvidence(bundle.inputs);
    case 'capital-partner':
      return selectCapitalPartnerEvidence(bundle.inputs);
    case 'host-canopy-union':
      return selectHostCanopyUnionEvidence(bundle.inputs);
    default:
      // Exhaustiveness check. If a new PanelKey is added without a
      // corresponding dispatch arm, this assignment fails to compile.
      return assertExhaustive(bundle);
  }
}

function assertExhaustive(_value: never): null {
  return null;
}

// Re-export type surface so callers can import everything from the
// barrel without reaching into selectors/.
export type { EvidenceItem, EvidenceFragment, EvidenceSource, PanelKey } from './types.js';
export type { VerdictEvidenceInputs } from './selectors/verdict.js';
export type { TriadEvidenceInputs } from './selectors/triad.js';
export type { SiteNarrativeEvidenceInputs } from './selectors/siteNarrative.js';
export type { WaterStorageEvidenceInputs } from './selectors/waterStorage.js';
export type { ThreeEthicsEvidenceInputs } from './selectors/threeEthics.js';
export type { WaterRouterEvidenceInputs } from './selectors/waterRouter.js';
export type { CapitalPartnerEvidenceInputs } from './selectors/capitalPartner.js';
export type {
  HostCanopyUnionEntry,
  HostCanopyUnionEvidenceInputs,
} from './selectors/hostCanopyUnion.js';
