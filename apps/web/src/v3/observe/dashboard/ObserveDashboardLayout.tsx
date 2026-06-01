/**
 * ObserveDashboardLayout — canvas-slot host for the new Observe Dashboard
 * shell (OLOS Observe Dashboard Spec §3). Mounts the top-right
 * ObserveShellToggle overlay (mirroring PlanNavToggle / ActShellToggle
 * placement) and branches between the three dashboard surfaces:
 *
 *   - Surface 1 (UnifiedLandStateSurface)  → surface='unified' (default).
 *   - Surface 2 (DomainDetailLayout)       → surface='domain' + valid domainId.
 *   - Surface 3 (TemporalLayerSurface)     → surface='temporal' + valid
 *                                            domainId (Slice 4.5).
 *
 * The `surface` discriminator is set by ObserveLayout from the matched route
 * (the temporal route shares the `$domainId` slot with the domain-detail
 * route, so a path-based discriminator is the cleanest split). An unknown
 * `domainId` (stale link or typo) falls back to Surface 1 so the steward
 * never lands on a blank surface.
 */

import { useMemo } from 'react';
import type { UniversalDomain } from '@ogden/shared';
import { UNIVERSAL_DOMAINS } from '@ogden/shared';
import type { ObserveShellMode } from '../../../store/projectStore.js';
import ObserveShellToggle from './ObserveShellToggle.js';
import UnifiedLandStateSurface from './UnifiedLandStateSurface.js';
import DomainDetailLayout from './domain/DomainDetailLayout.js';
import TemporalLayerSurface from './temporal/TemporalLayerSurface.js';
import ObjectiveRollupSurface from './rollup/ObjectiveRollupSurface.js';
import type { SourceFilter } from './domain/observationSource.js';
import css from './ObserveDashboardLayout.module.css';

export type ObserveDashboardSurface =
  | 'unified'
  | 'domain'
  | 'temporal'
  | 'rollup';

interface Props {
  projectId: string;
  shellMode: ObserveShellMode;
  onShellModeChange: (mode: ObserveShellMode) => void;
  domainId?: string | null;
  surface?: ObserveDashboardSurface;
  /**
   * Pre-seed for the Domain Detail observation-list source filter, carried in
   * via `?source=` when the steward deep-links from an Objective Rollup card.
   * Only consumed by the domain branch; the other surfaces ignore it.
   */
  initialSource?: SourceFilter | null;
}

function isUniversalDomain(value: string): value is UniversalDomain {
  return (UNIVERSAL_DOMAINS as readonly string[]).includes(value);
}

export default function ObserveDashboardLayout({
  projectId,
  shellMode,
  onShellModeChange,
  domainId,
  surface,
  initialSource,
}: Props) {
  const validDomainId = useMemo<UniversalDomain | null>(() => {
    if (!domainId) return null;
    return isUniversalDomain(domainId) ? domainId : null;
  }, [domainId]);

  // Effective surface — only mount the temporal/domain branches when the
  // domainId actually resolves. A stale `?domainId=junk` falls back to
  // Surface 1 so the steward never lands on a blank surface. The rollup
  // surface (Surface 4) is objective-keyed, not domain-keyed, so it carries
  // no domainId requirement.
  const effectiveSurface: ObserveDashboardSurface =
    surface === 'rollup'
      ? 'rollup'
      : surface === 'temporal' && validDomainId
        ? 'temporal'
        : surface === 'domain' && validDomainId
          ? 'domain'
          : validDomainId && !surface
            ? 'domain'
            : 'unified';

  return (
    <div className={css.canvas}>
      <ObserveShellToggle mode={shellMode} onChange={onShellModeChange} />
      {effectiveSurface === 'rollup' ? (
        <ObjectiveRollupSurface projectId={projectId} />
      ) : effectiveSurface === 'temporal' && validDomainId ? (
        <TemporalLayerSurface projectId={projectId} domainId={validDomainId} />
      ) : effectiveSurface === 'domain' && validDomainId ? (
        <DomainDetailLayout
          projectId={projectId}
          domainId={validDomainId}
          initialSourceFilter={initialSource ?? undefined}
        />
      ) : (
        <UnifiedLandStateSurface projectId={projectId} />
      )}
    </div>
  );
}
