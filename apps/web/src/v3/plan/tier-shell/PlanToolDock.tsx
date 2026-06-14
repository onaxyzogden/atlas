/**
 * PlanToolDock — collapse-aware wrapper around PlanTierCategorizedToolsRail for
 * the Plan tier-shell bottom tray.
 *
 * Expanded (default): a slim bar with a "Collapse tools" control above the full
 * categorized tools rail. Collapsed: ONLY a "Show tools" handle is rendered --
 * the rail is unmounted, so StageShell's center canvas (flex: 1 1 auto) reclaims
 * the vertical space (e.g. so the IF/THEN threshold editor is unobstructed in
 * Protocols mode). The collapsed/expanded choice is a global, persisted uiStore
 * preference (mirrors rightPanelCollapsed) and applies in both Objectives and
 * Protocols mode.
 */

import { ChevronDown, ChevronUp } from 'lucide-react';
import type { PlanStratumObjective } from '@ogden/shared';
import { useUIStore } from '../../../store/uiStore.js';
import PlanTierCategorizedToolsRail from './PlanTierCategorizedToolsRail.js';
import type { PlanTool } from './planToolCatalog.js';
import css from './PlanToolDock.module.css';

interface Props {
  objective: PlanStratumObjective | null;
  disabled?: boolean;
  onActivate: (tool: PlanTool) => void;
  activeFormId?: string | null;
}

export default function PlanToolDock({
  objective,
  disabled,
  onActivate,
  activeFormId,
}: Props) {
  const collapsed = useUIStore((s) => s.planToolDockCollapsed);
  const toggle = useUIStore((s) => s.togglePlanToolDockCollapsed);

  if (collapsed) {
    return (
      <div className={css.dock} data-testid="plan-tool-dock" data-collapsed="true">
        <button
          type="button"
          className={css.handle}
          onClick={toggle}
          aria-expanded={false}
          aria-label="Show tools"
        >
          <ChevronUp size={16} strokeWidth={1.8} aria-hidden="true" />
          <span className={css.handleLabel}>Tools</span>
        </button>
      </div>
    );
  }

  return (
    <div className={css.dock} data-testid="plan-tool-dock" data-collapsed="false">
      <div className={css.bar}>
        <button
          type="button"
          className={css.handle}
          onClick={toggle}
          aria-expanded={true}
          aria-label="Collapse tools"
        >
          <ChevronDown size={16} strokeWidth={1.8} aria-hidden="true" />
          <span className={css.handleLabel}>Tools</span>
        </button>
      </div>
      <PlanTierCategorizedToolsRail
        objective={objective}
        disabled={disabled}
        onActivate={onActivate}
        activeFormId={activeFormId}
      />
    </div>
  );
}
