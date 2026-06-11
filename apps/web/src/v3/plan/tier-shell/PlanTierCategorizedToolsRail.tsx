// PlanTierCategorizedToolsRail.tsx
//
// Bottom rail for the Plan tier-shell — the Plan twin of
// ActTierCategorizedToolsRail. The per-objective tools come from the same
// explicit objective->tool map (getObjectiveActTools, packages/shared) joined
// against the app-layer catalog (resolvePlanTools, which delegates to the Act
// catalog), so the design/capture tools group exactly as they do in Act.
//
// The ONE Plan-specific difference: the `modules` category (PLAN_MODULE_TOOLS)
// is ALWAYS appended, independent of the selected objective. The legacy
// PlanModuleBar is present on every Plan view, so the module panels must stay
// reachable from every objective here too — even an objective with no design
// tools still shows the Modules group. Because of that, this rail also renders
// (with only the Modules group) when NO objective is selected, where the Act
// rail short-circuits to an empty "select an objective" state.
//
// Arm semantics mirror Act for 'map'/'form'/'flow'/'zone-action'; the Plan-only
// 'module' arm has no persistent armed state (it opens a slide-up), so it never
// reports active. The shell's onActivate dispatcher handles each arm kind.

import { useEffect, useRef, useState } from 'react';
import type { PlanStratumObjective } from '@ogden/shared';
import { getObjectiveActTools } from '@ogden/shared';
import { useMapToolStore } from '../../observe/components/measure/useMapToolStore.js';
import { QUICK_LOGS } from '../../act/quickLogs.js';
import {
  PLAN_TOOL_CATEGORIES,
  PLAN_MODULE_TOOLS,
  resolvePlanTools,
  type PlanTool,
} from './planToolCatalog.js';
import styles from '../../act/tier-shell/ActTierShell.module.css';

interface Props {
  objective: PlanStratumObjective | null;
  disabled?: boolean;
  onActivate: (tool: PlanTool) => void;
  /** formId of the currently-open VisionFormsTabsModal, or null. Highlights the
   *  tile whose form is open, matching the armed-tool gold-border pattern. */
  activeFormId?: string | null;
}

/** Return true if the tool should show as "armed" / active. */
function isToolArmed(
  tool: PlanTool,
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
  // 'flow' opens a modal, 'zone-action' runs once, 'module' opens a slide-up —
  // none carry persistent armed state, so none ever highlight.
  if (arm.kind === 'flow' || arm.kind === 'zone-action' || arm.kind === 'module') {
    return false;
  }
  // 'log': check the toolId the QuickLog arms on the map. Hoisted so the
  // discriminant narrowing survives into the .find closure.
  const log = QUICK_LOGS.find((l) => l.id === arm.quickLogId);
  return !!activeTool && !!log?.toolId && log.toolId === activeTool;
}

export default function PlanTierCategorizedToolsRail({
  objective,
  disabled,
  onActivate,
  activeFormId,
}: Props) {
  const activeTool = useMapToolStore((s) => s.activeTool);

  // Refs + active-page state for the dots navigator. The row is the scroll
  // viewport; each .toolCat is a snap target whose visibility drives activeIndex.
  const rowRef = useRef<HTMLDivElement>(null);
  const catRefs = useRef<(HTMLElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Per-objective tools (empty when no objective) PLUS the always-present
  // Modules tools. The Modules group is objective-independent so the legacy
  // module panels stay reachable from anywhere in Plan.
  const objectiveTools = objective
    ? resolvePlanTools(getObjectiveActTools(objective))
    : [];
  const tools: PlanTool[] = [...objectiveTools, ...PLAN_MODULE_TOOLS];
  const visibleCats = PLAN_TOOL_CATEGORIES.map((category) => ({
    category,
    catTools: tools.filter((t) => t.category === category.id),
  })).filter((c) => c.catTools.length > 0);

  const objectiveId = objective?.id ?? null;
  const visibleCount = visibleCats.length;

  // Track which category is framed in the viewport so the matching dot lights up.
  useEffect(() => {
    const root = rowRef.current;
    if (!root || visibleCount <= 1) {
      setActiveIndex(0);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        let best = -1;
        let bestRatio = 0;
        for (const entry of entries) {
          const idx = catRefs.current.indexOf(entry.target as HTMLElement);
          if (idx >= 0 && entry.intersectionRatio > bestRatio) {
            bestRatio = entry.intersectionRatio;
            best = idx;
          }
        }
        if (best >= 0) setActiveIndex(best);
      },
      { root, threshold: [0.25, 0.5, 0.75, 1] },
    );
    for (const el of catRefs.current) {
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [objectiveId, visibleCount]);

  // Unlike the Act rail, we never short-circuit to an empty state: the Modules
  // group guarantees visibleCats is non-empty even with no objective selected.
  const headerLabel = objective ? 'Tools for this objective' : 'Modules';
  const headerHint = objective
    ? 'Arm a tool, then place it on the map'
    : 'Open a module panel, or pick an objective for its tools';

  return (
    <div className={styles.toolsPanel} aria-label="Objective tools">
      <div className={styles.toolsHeader}>
        <span className={styles.toolsLabel}>{headerLabel}</span>
        <span className={styles.toolsHint}>{headerHint}</span>
      </div>
      <div className={styles.toolsBody}>
        <div className={styles.toolsRow} ref={rowRef}>
          {visibleCats.map(({ category, catTools }, index) => (
            <section
              key={category.id}
              className={styles.toolCat}
              ref={(el) => {
                catRefs.current[index] = el;
              }}
            >
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
                      <span className={styles.catTileLabel}>{tool.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        {visibleCats.length > 1 && (
          <nav className={styles.toolsDots} aria-label="Tool categories">
            {visibleCats.map(({ category }, index) => (
              <button
                key={category.id}
                type="button"
                className={styles.toolDot}
                data-active={index === activeIndex}
                aria-current={index === activeIndex}
                aria-label={`Show ${category.label}`}
                onClick={() =>
                  catRefs.current[index]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })
                }
              />
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
