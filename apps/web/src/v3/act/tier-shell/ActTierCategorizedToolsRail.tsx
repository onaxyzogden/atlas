// ActTierCategorizedToolsRail.tsx
//
// Bottom rail for the Act tier-shell: a CATEGORIZED tools panel whose visible
// tools are filtered by the currently-selected objective. Replaces the old
// always-on three-log ActTierToolsRail (kept on disk, no longer mounted).
//
// Tools come from the explicit objective->tool map
// (getObjectiveActTools, packages/shared) joined against the app-layer
// ACT_TOOL_CATALOG. Each tool arms a REAL action: kind 'map' arms a placement/
// draw tool via setActiveTool (picked up by ObserveDrawHost / PlanDrawHost on
// the Act canvas); kind 'log' routes through the shell's QuickLog handler
// (ActDrawHost); kind 'form' opens a VisionFormModal for text/decision capture
// on non-spatial items. Field logs (harvest / water / livestock) and form tools
// now appear only when the selected objective calls for them.

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { PlanStratumObjective } from '@ogden/shared';
import { getObjectiveActTools } from '@ogden/shared';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import { QUICK_LOGS } from '../quickLogs.js';
import {
  ACT_TOOL_CATEGORIES,
  resolveActTools,
  type ActTool,
} from './actToolCatalog.js';
import styles from './ActTierShell.module.css';

interface Props {
  objective: PlanStratumObjective | null;
  disabled?: boolean;
  onActivate: (tool: ActTool) => void;
  /** formId of the currently-open VisionFormModal, or null. Used to highlight
   *  the tile whose form is open, matching the armed-tool gold-border pattern. */
  activeFormId?: string | null;
}

/** Return true if the tool should show as "armed" / active. */
function isToolArmed(
  tool: ActTool,
  activeTool: string | null,
  activeFormId: string | null | undefined,
): boolean {
  const arm = tool.arm;
  if (arm.kind === 'map') {
    return !!activeTool && arm.mapToolId === activeTool;
  }
  if (arm.kind === 'form') {
    return activeFormId === arm.formId;
  }
  // kind === 'log': check the toolId the QuickLog arms on the map.
  // Hoisted to a const so the discriminant narrowing survives into the
  // `.find` closure below (TS drops narrowing of a parameter property inside
  // a nested function).
  const log = QUICK_LOGS.find((l) => l.id === arm.quickLogId);
  return !!activeTool && !!log?.toolId && log.toolId === activeTool;
}

export default function ActTierCategorizedToolsRail({
  objective,
  disabled,
  onActivate,
  activeFormId,
}: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggle(categoryId: string) {
    setCollapsed((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  }

  if (!objective) {
    return (
      <div className={styles.toolsPanel} aria-label="Objective tools">
        <p className={styles.toolsEmpty}>
          Select an objective to see its tools
        </p>
      </div>
    );
  }

  const tools = resolveActTools(getObjectiveActTools(objective));

  if (tools.length === 0) {
    return (
      <div className={styles.toolsPanel} aria-label="Objective tools">
        <div className={styles.toolsHeader}>
          <span className={styles.toolsLabel}>{objective.title}</span>
        </div>
        <p className={styles.toolsEmpty}>This objective has no tools</p>
      </div>
    );
  }

  return (
    <div className={styles.toolsPanel} aria-label="Objective tools">
      <div className={styles.toolsHeader}>
        <span className={styles.toolsLabel}>Tools for this objective</span>
        <span className={styles.toolsHint}>
          Arm a tool, then place it on the map
        </span>
      </div>
      <div className={styles.toolsRow}>
        {ACT_TOOL_CATEGORIES.map((category) => {
          const catTools = tools.filter((t) => t.category === category.id);
          if (catTools.length === 0) return null;
          const isCollapsed = collapsed[category.id] ?? false;
          return (
            <section key={category.id} className={styles.toolCat}>
              <button
                type="button"
                className={styles.toolCatHeader}
                aria-expanded={!isCollapsed}
                onClick={() => toggle(category.id)}
              >
                {isCollapsed ? (
                  <ChevronRight size={14} aria-hidden="true" />
                ) : (
                  <ChevronDown size={14} aria-hidden="true" />
                )}
                <span className={styles.toolCatLabel}>{category.label}</span>
                <span className={styles.toolCatCount}>{catTools.length}</span>
              </button>
              {!isCollapsed && (
                <div className={styles.toolGrid}>
                  {catTools.map((tool) => {
                    const Icon = tool.icon;
                    const isArmed = isToolArmed(tool, activeTool, activeFormId);
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        className={styles.catTile}
                        data-active={isArmed}
                        disabled={disabled}
                        onClick={() => onActivate(tool)}
                        title={tool.label}
                      >
                        <span className={styles.catTileIcon} aria-hidden="true">
                          <Icon size={18} strokeWidth={1.7} />
                        </span>
                        <span className={styles.catTileLabel}>
                          {tool.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
