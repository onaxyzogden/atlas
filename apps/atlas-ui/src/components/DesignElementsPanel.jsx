import { Icon } from "../icons.js";
import { MODULE_TOOLS } from "../data/landBriefTools.js";

export function DesignElementsPanel({
  modules,
  overlayColors,
  activeToolId,
  onPickTool,
  drawnByModule,
  onClearModule,
  selectedModuleKey,
  onSelectModule,
}) {
  return (
    <aside className="design-elements-panel" aria-label="Design elements">
      <header className="design-elements-header">
        <h2>Design Elements</h2>
      </header>
      <div className="design-elements-scroll">
        {modules.map((m) => {
          const tools = MODULE_TOOLS[m.key] ?? [];
          if (!tools.length) return null;
          const color = overlayColors?.[m.key];
          const moduleHasDrawings = !!drawnByModule?.[m.key]?.features?.length;
          const isSelected = selectedModuleKey === m.key;
          const isDim = !!selectedModuleKey && !isSelected;
          return (
            <section
              key={m.key}
              className={`design-elements-section${isSelected ? " is-selected" : ""}${isDim ? " is-dim" : ""}`}
              style={isSelected && color ? { borderLeftColor: color } : undefined}
            >
              <div className="design-elements-section-head-row">
                <button
                  type="button"
                  className="design-elements-section-head"
                  onClick={() => onSelectModule?.(m.key)}
                  aria-current={isSelected ? "true" : undefined}
                  aria-label={`${isSelected ? "Deselect" : "Select"} ${m.label}`}
                >
                  <span className="design-elements-section-dot" style={color ? { background: color } : undefined} />
                  <h3>{m.label}</h3>
                </button>
                <button
                  type="button"
                  className="design-elements-section-clear"
                  disabled={!moduleHasDrawings}
                  onClick={(e) => { e.stopPropagation(); onClearModule(m.key); }}
                  title={moduleHasDrawings ? `Clear ${m.label} drawings` : "No drawings"}
                  aria-label={`Clear ${m.label} drawings`}
                >
                  <Icon.x aria-hidden="true" />
                </button>
              </div>
              <div className="design-elements-grid">
                {tools.map((t) => {
                  const Icn = Icon[t.iconKey] ?? Icon.circle;
                  const isActive = activeToolId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`design-element-tile${isActive ? " is-on" : ""}`}
                      aria-pressed={isActive}
                      onClick={() => onPickTool(m.key, t)}
                      style={isActive && color ? { borderColor: color } : undefined}
                    >
                      <span className="design-element-icon">
                        <Icn aria-hidden="true" />
                      </span>
                      <span className="design-element-label">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </aside>
  );
}
