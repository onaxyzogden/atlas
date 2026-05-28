/**
 * ObserveDashboardLayout — canvas-slot host for the new Observe Dashboard
 * shell (OLOS Observe Dashboard Spec §3). Mounts the top-right
 * ObserveShellToggle overlay (mirroring PlanNavToggle / ActShellToggle
 * placement) and branches between the three dashboard surfaces:
 *
 *   - Surface 1 (UnifiedLandStateSurface)  → no `domainId` in route.
 *   - Surface 2 (DomainDetailLayout)       → `domainId` present and valid.
 *   - Surface 3 (Temporal)                 → Slice 4.5 (TBD).
 *
 * An unknown `domainId` (stale link or typo) falls back to Surface 1 so
 * the steward never lands on a blank surface.
 */

import { useMemo } from 'react';
import type { UniversalDomain } from '@ogden/shared';
import { UNIVERSAL_DOMAINS } from '@ogden/shared';
import type { ObserveShellMode } from '../../../store/projectStore.js';
import ObserveShellToggle from './ObserveShellToggle.js';
import UnifiedLandStateSurface from './UnifiedLandStateSurface.js';
import DomainDetailLayout from './domain/DomainDetailLayout.js';
import css from './ObserveDashboardLayout.module.css';

interface Props {
  projectId: string;
  shellMode: ObserveShellMode;
  onShellModeChange: (mode: ObserveShellMode) => void;
  domainId?: string | null;
}

function isUniversalDomain(value: string): value is UniversalDomain {
  return (UNIVERSAL_DOMAINS as readonly string[]).includes(value);
}

export default function ObserveDashboardLayout({
  projectId,
  shellMode,
  onShellModeChange,
  domainId,
}: Props) {
  const validDomainId = useMemo<UniversalDomain | null>(() => {
    if (!domainId) return null;
    return isUniversalDomain(domainId) ? domainId : null;
  }, [domainId]);

  return (
    <div className={css.canvas}>
      <ObserveShellToggle mode={shellMode} onChange={onShellModeChange} />
      {validDomainId ? (
        <DomainDetailLayout projectId={projectId} domainId={validDomainId} />
      ) : (
        <UnifiedLandStateSurface projectId={projectId} />
      )}
    </div>
  );
}
