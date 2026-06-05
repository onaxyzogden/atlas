// ActProtoToolsRail.tsx
//
// PROTOTYPE-ONLY bottom rail. The digital tools needed to complete the chosen
// objective, grouped into collapsible categories with icon-button grids.
// Clicking a tool only sets local selection (visual stub). Delete with folder.

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { PROTO_TOOL_CATEGORIES } from './ActProtoToolsCatalog.js';
import styles from './ActProtoTierShell.module.css';

interface Props {
  activeToolId: string | null;
  onSelectTool: (toolId: string) => void;
}

export default function ActProtoToolsRail({
  activeToolId,
  onSelectTool,
}: Props) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggle(categoryId: string) {
    setCollapsed((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
  }

  return (
    <div className={styles.toolsPanel} aria-label="Digital tools">
      <div className={styles.toolsRow}>
        {PROTO_TOOL_CATEGORIES.map((category) => {
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
                <span className={styles.toolCatCount}>
                  {category.tools.length}
                </span>
              </button>
              {!isCollapsed && (
                <div className={styles.toolGrid}>
                  {category.tools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        type="button"
                        className={styles.toolBtn}
                        data-active={tool.id === activeToolId}
                        onClick={() => onSelectTool(tool.id)}
                      >
                        <span className={styles.toolIcon}>
                          <Icon size={18} aria-hidden="true" />
                        </span>
                        <span className={styles.toolLabel}>{tool.label}</span>
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
