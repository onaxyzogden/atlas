/**
 * DecisionRail — generic stage-aware container for the right rail.
 *
 * Replaces V3DecisionRail's placeholder body. Dispatches to a per-stage panel
 * based on the active route. RULE 4 (rail must always render something useful)
 * is enforced by every stage panel having a non-empty default body.
 */

import { lazy, Suspense } from "react";
import type { Project, LifecycleStage } from "../types.js";
import type { ObserveModule } from "../observe/types.js";
import { useProjectStore } from "../../store/projectStore.js";
import HomeRail from "./rails/HomeRail.js";
import DiscoverRail from "./rails/DiscoverRail.js";
import DiagnoseRail from "./rails/DiagnoseRail.js";
import DesignRail from "./rails/DesignRail.js";
import ProveRail from "./rails/ProveRail.js";
import BuildRail from "./rails/BuildRail.js";
import OperateRail from "./rails/OperateRail.js";
import ReportRail from "./rails/ReportRail.js";
import css from "./DecisionRail.module.css";

const SiteIntelligencePanel = lazy(
  () => import("../../components/panels/SiteIntelligencePanel.js"),
);

export type RailStage = LifecycleStage | "home" | "observe" | "plan" | "act";

export interface DecisionRailProps {
  stage: RailStage;
  project: Project | null;
  activeModule?: ObserveModule;
}

const STAGE_TITLE: Record<RailStage, string> = {
  home: "Project Home",
  discover: "Discover",
  diagnose: "Diagnose",
  design: "Design",
  prove: "Prove",
  build: "Build",
  operate: "Operate",
  report: "Report",
  observe: "Observe",
  plan: "Plan",
  act: "Act",
};

export default function DecisionRail({ stage, project, activeModule }: DecisionRailProps) {
  return (
    <div className={css.rail}>
      {stage !== "observe" && (
        <header className={css.header}>
          <span className={css.eyebrow}>Decision Rail</span>
          <h3 className={css.title}>{STAGE_TITLE[stage]}</h3>
        </header>
      )}

      <StagePanel stage={stage} project={project} activeModule={activeModule} />
    </div>
  );
}

function ObserveSiteIntelligenceRail({ projectId }: { projectId?: string }) {
  const local = useProjectStore((s) =>
    projectId ? s.projects.find((p) => p.id === projectId) ?? null : null,
  );
  if (!local) {
    return (
      <p className={css.empty}>
        Site Intelligence is available for real projects. The MTC sample ships
        with mock data only.
      </p>
    );
  }
  return (
    <Suspense fallback={<p className={css.empty}>Loading site intelligence…</p>}>
      <SiteIntelligencePanel project={local} />
    </Suspense>
  );
}

function StagePanel({
  stage,
  project,
  activeModule,
}: {
  stage: RailStage;
  project: Project | null;
  activeModule?: ObserveModule;
}) {
  if (stage === "observe") {
    return <ObserveSiteIntelligenceRail projectId={project?.id} />;
  }
  if (stage === "plan" || stage === "act") {
    return <p className={css.empty}>{stage === "plan" ? "Plan" : "Act"} rail arrives in Phase C.</p>;
  }
  if (!project) {
    return <p className={css.empty}>Select a project to see live guidance.</p>;
  }
  switch (stage) {
    case "home":     return <HomeRail project={project} />;
    case "discover": return <DiscoverRail project={project} />;
    case "diagnose": return <DiagnoseRail project={project} />;
    case "design":   return <DesignRail project={project} />;
    case "prove":    return <ProveRail project={project} />;
    case "build":    return <BuildRail project={project} />;
    case "operate":  return <OperateRail project={project} />;
    case "report":   return <ReportRail project={project} />;
  }
}
