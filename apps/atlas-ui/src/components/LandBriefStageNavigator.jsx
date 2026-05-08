import { MemoryRouter } from "react-router-dom";
import { LevelNavigator } from "@ogden/ui-components";
import { MODULE_TODOS, isTodoDone } from "../data/landBriefTodos.js";

const STAGES = [
  {
    key: "diagnose",
    label: "STAGE 1",
    subtitle: "(OBSERVE)",
    title: "Diagnose",
    desc: "Read the land — surface its patterns, constraints and gifts before any design move.",
    color: "#a5c736",
  },
  {
    key: "plan",
    label: "STAGE 2",
    subtitle: "(DESIGN)",
    title: "Plan",
    desc: "Translate diagnosis into a phased design — zones, structures, water and access.",
    color: "#4ab8a8",
  },
  {
    key: "act",
    label: "STAGE 3",
    subtitle: "(IMPLEMENT)",
    title: "Act",
    desc: "Stage and execute the work — track installs, observations and adjustments.",
    color: "#c8a96e",
  },
];

export function LandBriefStageNavigator({
  modules,
  activeOverlayKeys,
  drawnByModule,
  manualTodoState,
  selectedModuleKey,
  onToggleOverlay,
  onSelectModule,
}) {
  const pillars = modules.map((m) => ({ id: m.key, label: m.label }));

  const pillarTasks = {};
  for (const m of modules) {
    const todos = MODULE_TODOS[m.key] ?? [];
    const drawn = drawnByModule?.[m.key];
    const manual = manualTodoState?.[m.key];
    pillarTasks[m.key] = todos.map((t) => {
      const done = isTodoDone(t, drawn, manual);
      return {
        id: t.id,
        title: t.label,
        columnId: done ? "todo_done" : "todo_to_do",
      };
    });
  }

  return (
    <div className="land-brief-stage-nav">
      <MemoryRouter>
        <LevelNavigator
          levels={STAGES}
          controlledLevel="diagnose"
          onLevelChange={() => { /* future: switch to /plan, /act routes */ }}
          pillars={pillars}
          pillarTasks={pillarTasks}
          currentPillarId={selectedModuleKey ?? undefined}
          onSegmentClick={(pillarId) => {
            onToggleOverlay?.(pillarId);
            onSelectModule?.(pillarId);
          }}
          onSubsegClick={(_taskId, pillarId) => {
            onSelectModule?.(pillarId);
          }}
          showDiacritics={false}
          tooltipsEnabled={false}
          compact
        />
      </MemoryRouter>
      {activeOverlayKeys ? (
        <div className="land-brief-stage-nav-active" aria-live="polite">
          {modules
            .filter((m) => activeOverlayKeys.has(m.key))
            .map((m) => (
              <span key={m.key} className="land-brief-stage-nav-active-chip">
                {m.label}
              </span>
            ))}
        </div>
      ) : null}
    </div>
  );
}
