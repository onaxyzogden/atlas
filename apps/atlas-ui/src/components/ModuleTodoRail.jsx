import { SurfaceCard } from "./SurfaceCard.jsx";
import { Icon } from "../icons.js";
import { isTodoDone, todoProgress } from "../data/landBriefTodos.js";

export function ModuleTodoRail({
  module,
  todos,
  drawn,
  manualChecked,
  color,
  dim,
  selected,
  onToggleManual,
  onSelect,
}) {
  const { done, total } = todoProgress(todos, drawn, manualChecked);
  const cardClass =
    "module-todo-rail" +
    (dim ? " is-dim" : "") +
    (selected ? " is-selected" : "");
  return (
    <SurfaceCard className={cardClass} style={color ? { borderTopColor: color } : undefined}>
      <button
        type="button"
        className="module-todo-rail-head"
        onClick={onSelect ? () => onSelect(module?.key) : undefined}
        aria-current={selected ? "true" : undefined}
        aria-label={`${selected ? "Deselect" : "Select"} ${module?.label ?? "module"}`}
      >
        <span className="module-todo-rail-dot" style={color ? { background: color } : undefined} />
        <h1>{module?.label ?? "Module"}</h1>
        <span className="module-todo-progress" aria-label={`${done} of ${total} complete`}>
          {done} / {total}
        </span>
      </button>

      <ul className="module-todo-list">
        {todos.map((t) => {
          const done = isTodoDone(t, drawn, manualChecked);
          const isManual = !t.tag;
          const Icn = done ? Icon.circleCheck : Icon.circle;
          return (
            <li
              key={t.id}
              className={`module-todo-item${done ? " is-done" : ""}${isManual ? " is-manual" : " is-auto"}`}
            >
              <button
                type="button"
                className="module-todo-toggle"
                onClick={isManual ? () => onToggleManual?.(t.id) : undefined}
                disabled={!isManual}
                aria-pressed={done}
                title={isManual ? (done ? "Mark incomplete" : "Mark complete") : "Auto-completes when drawn on map"}
              >
                <Icn aria-hidden="true" style={done && color ? { color } : undefined} />
                <span className="module-todo-label">{t.label}</span>
                {!isManual ? <small className="module-todo-hint">auto</small> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </SurfaceCard>
  );
}
