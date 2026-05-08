import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  AppShell,
  CroppedArt,
  ProjectDataStatus,
  SlideUpPane,
  SurfaceCard,
  useToast,
} from "../components/index.js";
import { Icon } from "../icons.js";
import { observeNav } from "../data/navConfig.js";
import {
  LAND_BRIEF_MODULES,
  aggregateAlignment,
  topPriorities,
} from "../data/landBrief.js";
import { LAND_BRIEF_OVERLAYS } from "../data/landBriefOverlays.js";
import { drawModeForTool } from "../data/landBriefTools.js";
import { MAP_STYLES, DEFAULT_STYLE_ID } from "../lib/mapStyles.js";
import { LandMap } from "../components/LandMap.jsx";
import { MapToolbar } from "../components/MapToolbar.jsx";
import { DesignElementsPanel } from "../components/DesignElementsPanel.jsx";
import { ModuleTodoRail } from "../components/ModuleTodoRail.jsx";
import { LandBriefStageNavigator } from "../components/LandBriefStageNavigator.jsx";
import { CollapsiblePane } from "../components/CollapsiblePane.jsx";
import { MODULE_TODOS } from "../data/landBriefTodos.js";
import { HumanContextContent } from "./HumanContextDashboardPage.jsx";
import { MacroclimateContent } from "./MacroclimateDashboardPage.jsx";
import { TopographyContent } from "./TopographyDashboardPage.jsx";
import { EarthWaterEcologyContent } from "./EarthWaterEcologyPage.jsx";
import { SectorsMicroclimatesContent } from "./SectorsMicroclimatesDashboardPage.jsx";
import { SwotContent } from "./SwotDashboardPage.jsx";

const MODULE_CONTENT = {
  "human-context": HumanContextContent,
  macroclimate: MacroclimateContent,
  topography: TopographyContent,
  ewe: EarthWaterEcologyContent,
  sectors: SectorsMicroclimatesContent,
  swot: SwotContent,
};

const EMPTY_FC = { type: "FeatureCollection", features: [] };

export function LandBriefPage() {
  const [paneKey, setPaneKey] = useState(null);
  const [activeOverlayKeys, setActiveOverlayKeys] = useState(() => new Set(["topography"]));
  const [styleId, setStyleId] = useState(DEFAULT_STYLE_ID);
  const [pitch, setPitch] = useState(0);
  const [drawIntent, setDrawIntent] = useState(null);
  const [activeToolId, setActiveToolId] = useState(null);
  const [lastMeasureKm, setLastMeasureKm] = useState(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [drawnByModule, setDrawnByModule] = useState({});
  const [selectedModuleKey, setSelectedModuleKey] = useState(null);
  const [manualTodoState, setManualTodoState] = useState({});

  const aggregate = aggregateAlignment();
  const priorities = topPriorities();
  const paneModule = paneKey ? LAND_BRIEF_MODULES.find((m) => m.key === paneKey) : null;
  const PaneContent = paneKey ? MODULE_CONTENT[paneKey] : null;
  const selectedModule = selectedModuleKey
    ? LAND_BRIEF_MODULES.find((m) => m.key === selectedModuleKey)
    : null;

  const overlayColors = useMemo(() => {
    const out = {};
    Object.entries(LAND_BRIEF_OVERLAYS).forEach(([k, v]) => { out[k] = v.color; });
    return out;
  }, []);

  const styleUrl = useMemo(() => MAP_STYLES[styleId]?.url ?? MAP_STYLES[DEFAULT_STYLE_ID].url, [styleId]);

  const toggleOverlay = (key) => {
    setActiveOverlayKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const onPickTool = (moduleKey, tool) => {
    if (activeToolId === tool.id) {
      setDrawIntent(null);
      setActiveToolId(null);
      return;
    }
    const mode = drawModeForTool(tool);
    if (!mode) return;
    // Auto-show the overlay for the module whose tool was picked, so user
    // sees the synthetic context they're drawing into.
    setActiveOverlayKeys((prev) => {
      if (prev.has(moduleKey)) return prev;
      const next = new Set(prev);
      next.add(moduleKey);
      return next;
    });
    setDrawIntent({ mode, tag: tool.tag, moduleKey });
    setActiveToolId(tool.id);
    setLastMeasureKm(null);
  };

  const onClearModule = (moduleKey) => {
    setDrawnByModule((prev) => {
      const next = { ...prev };
      delete next[moduleKey];
      return next;
    });
  };

  const onSelectModule = (moduleKey) => {
    setSelectedModuleKey((prev) => (prev === moduleKey ? null : moduleKey));
  };

  const onToggleManualTodo = (moduleKey, todoId) => {
    setManualTodoState((prev) => {
      const current = prev[moduleKey] ?? new Set();
      const next = new Set(current);
      if (next.has(todoId)) next.delete(todoId);
      else next.add(todoId);
      return { ...prev, [moduleKey]: next };
    });
  };

  const onMeasureToggle = () => {
    if (drawIntent?.tag === "measure") {
      setDrawIntent(null);
      setLastMeasureKm(null);
      return;
    }
    setDrawIntent({ mode: "draw_line_string", tag: "measure" });
    setActiveToolId(null);
    setLastMeasureKm(null);
  };

  const onFeatureCreated = (moduleKey, feature) => {
    setDrawnByModule((prev) => {
      const existing = prev[moduleKey] ?? EMPTY_FC;
      return {
        ...prev,
        [moduleKey]: { type: "FeatureCollection", features: [...existing.features, feature] },
      };
    });
    // After a draw completes, return to idle so the user has to re-arm to draw again.
    setDrawIntent(null);
    setActiveToolId(null);
  };

  const onMeasureResult = (km) => {
    setLastMeasureKm(km);
    // Measure stays armed until user toggles it off.
  };

  return (
    <AppShell
      navConfig={observeNav}
      leftSidebar={
        <DesignElementsPanel
          modules={LAND_BRIEF_MODULES}
          overlayColors={overlayColors}
          activeToolId={activeToolId}
          onPickTool={onPickTool}
          drawnByModule={drawnByModule}
          onClearModule={onClearModule}
          selectedModuleKey={selectedModuleKey}
          onSelectModule={onSelectModule}
        />
      }
      leftSidebarTitle="Design Elements"
      rightSidebar={
        <>
          <LandBriefGenerateCta aggregate={aggregate} />
          {LAND_BRIEF_MODULES.map((m) => (
            <ModuleTodoRail
              key={m.key}
              module={m}
              todos={MODULE_TODOS[m.key] ?? []}
              drawn={drawnByModule[m.key]}
              manualChecked={manualTodoState[m.key] ?? new Set()}
              color={overlayColors[m.key]}
              selected={selectedModuleKey === m.key}
              dim={!!selectedModuleKey && selectedModuleKey !== m.key}
              onToggleManual={(id) => onToggleManualTodo(m.key, id)}
              onSelect={onSelectModule}
            />
          ))}
        </>
      }
      rightSidebarTitle="Module Checklists"
    >
      <div className="land-brief-page">
        <ProjectDataStatus />
        <CollapsiblePane direction="down" title="Stages">
          <LandBriefStageNavigator
            modules={LAND_BRIEF_MODULES}
            activeOverlayKeys={activeOverlayKeys}
            drawnByModule={drawnByModule}
            manualTodoState={manualTodoState}
            selectedModuleKey={selectedModuleKey}
            onToggleOverlay={toggleOverlay}
            onSelectModule={onSelectModule}
          />
        </CollapsiblePane>
        <section className="land-brief-body land-brief-body--map">
          <MapToolbar
            styleId={styleId}
            onStyleChange={setStyleId}
            pitch={pitch}
            onPitchToggle={() => setPitch((p) => (p === 0 ? 60 : 0))}
            measuring={drawIntent?.tag === "measure"}
            onMeasureToggle={onMeasureToggle}
            lastMeasureKm={lastMeasureKm}
            onReset={() => {
              setPitch(0);
              setResetSignal((n) => n + 1);
            }}
          />
          <LandMap
            styleUrl={styleUrl}
            overlays={LAND_BRIEF_OVERLAYS}
            activeKeys={activeOverlayKeys}
            pitch={pitch}
            drawIntent={drawIntent}
            drawnByModule={drawnByModule}
            onMeasureResult={onMeasureResult}
            onFeatureCreated={onFeatureCreated}
            resetSignal={resetSignal}
          />
        </section>
        <CollapsiblePane direction="up" title="Module Deep-Dives" defaultCollapsed>
          <LandBriefThumbStrip
            modules={LAND_BRIEF_MODULES}
            onSelect={(key) => setPaneKey(key)}
          />
        </CollapsiblePane>
      </div>
      <SlideUpPane
        open={!!paneKey}
        title={paneModule?.label ?? ""}
        onClose={() => setPaneKey(null)}
      >
        {PaneContent ? <PaneContent /> : null}
      </SlideUpPane>
    </AppShell>
  );
}

function LandBriefGenerateCta({ aggregate }) {
  const toast = useToast();
  return (
    <SurfaceCard className="land-brief-generate-cta">
      <button
        type="button"
        className="land-brief-cta"
        onClick={() => toast.info("Draft brief generation — coming soon")}
      >
        Generate Draft Brief
      </button>
      <div className="land-brief-generate-cta-meta">
        <div className="land-brief-meta-item">
          <span>Completeness</span>
          <div className="land-brief-meta-bar" role="progressbar" aria-valuenow={aggregate.avgPct} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${aggregate.avgPct}%` }} />
          </div>
          <b>{aggregate.avgPct}%</b>
        </div>
        <div className="land-brief-meta-item">
          <span>Confidence</span>
          <em className={`land-brief-confidence is-${aggregate.confidenceTier.toLowerCase()}`} aria-hidden="true" />
          <b>{aggregate.confidenceTier}</b>
        </div>
      </div>
    </SurfaceCard>
  );
}

function LandVerdictRail({ aggregate, priorities }) {
  return (
    <SurfaceCard className="land-brief-verdict">
      <h1>{aggregate.verdictLabel}</h1>
      <p>{aggregate.verdictCopy}</p>

      <div className="land-brief-verdict-meta">
        <div>
          <span>Confidence</span>
          <ConfidenceDots tier={aggregate.confidenceTier} />
          <b>{aggregate.confidenceTier}</b>
        </div>
        <div>
          <span>Data completeness</span>
          <div className="land-brief-meta-bar">
            <i style={{ width: `${aggregate.avgPct}%` }} />
          </div>
          <b>{aggregate.avgPct}%</b>
        </div>
      </div>

      <div className="land-brief-priorities">
        <h2>Top Priorities</h2>
        <ul>
          {priorities.map((p) => {
            const Icn = Icon[p.iconKey] ?? Icon.circle;
            return (
              <li key={`${p.moduleKey}-${p.text}`}>
                <Icn aria-hidden="true" />
                <span>{p.text}</span>
                <small>{p.moduleLabel}</small>
              </li>
            );
          })}
        </ul>
      </div>

      <Link to="/observe" className="land-brief-secondary">
        View All Insights <Icon.arrowRight aria-hidden="true" />
      </Link>
    </SurfaceCard>
  );
}

function ConfidenceDots({ tier }) {
  const filled = tier === "High" ? 5 : tier === "Moderate" ? 3 : 2;
  return (
    <span className="land-brief-confidence-dots" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <i key={i} className={i < filled ? "is-on" : ""} />
      ))}
    </span>
  );
}

function LandBriefThumbStrip({ modules, onSelect }) {
  return (
    <div className="land-brief-thumbstrip" role="tablist" aria-label="Module deep-dives">
      {modules.map((m, i) => {
        const Icn = Icon[m.iconKey] ?? Icon.circle;
        return (
          <button
            key={m.key}
            type="button"
            role="tab"
            className="land-brief-thumb"
            onClick={() => onSelect(m.key)}
          >
            <span className="land-brief-thumb-num">{i + 1}</span>
            <span className="land-brief-thumb-label">{m.label}</span>
            <span className="land-brief-thumb-pct">{m.progressPct}%</span>
            <div className="land-brief-thumb-art">
              {m.heroImage ? (
                <CroppedArt src={m.heroImage} className="land-brief-thumb-image" />
              ) : (
                <div className="land-brief-thumb-fallback">
                  <Icn aria-hidden="true" />
                </div>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
