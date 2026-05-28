/**
 * ObserveDashboardLayout — canvas-slot host for the new Observe Dashboard
 * shell (OLOS Observe Dashboard Spec §3). Mounts the top-right
 * ObserveShellToggle overlay (mirroring PlanNavToggle / ActShellToggle
 * placement) and the active dashboard surface. Slice 4.2 renders
 * UnifiedLandStateSurface only; Domain Detail (4.3) and Temporal (4.5)
 * arrive at sibling routes that will branch in here when they land.
 */

import type { ObserveShellMode } from '../../../store/projectStore.js';
import ObserveShellToggle from './ObserveShellToggle.js';
import UnifiedLandStateSurface from './UnifiedLandStateSurface.js';
import css from './ObserveDashboardLayout.module.css';

interface Props {
  projectId: string;
  shellMode: ObserveShellMode;
  onShellModeChange: (mode: ObserveShellMode) => void;
}

export default function ObserveDashboardLayout({
  projectId,
  shellMode,
  onShellModeChange,
}: Props) {
  return (
    <div className={css.canvas}>
      <ObserveShellToggle mode={shellMode} onChange={onShellModeChange} />
      <UnifiedLandStateSurface projectId={projectId} />
    </div>
  );
}
