/**
 * /v3/project/:projectId/prove — Feasibility Engine.
 *
 * Layout (top to bottom):
 *   [StageHero]                  Vision Fit verdict + actions
 *   [Blocking Issues]            up to 4 BlockerCards
 *   [Best Uses table]            ranked uses against the vision
 *   [Vision Fit Analysis]        6 ScoreBars (category vs. benchmark)
 *   [Execution Reality]          5 MetricCards (labor, FTE, $, peak cash, intensity)
 *   [Design Rules & Safety]      Pass / Warning / Blocked grid
 *
 * Right rail is mounted by V3ProjectLayout → DecisionRail → ProveRail.
 *
 * Phase 6.2 (per `.claude/plans/few-concerns-shiny-quokka.md`): the
 * StageHero CTAs are now wired:
 *   - Fix on Map: pushes a request to `useMapFocusStore` and routes
 *     the user to the Design canvas. DesignMap consumes the request
 *     once mounted and flies to the parcel centroid. Re-clicking the
 *     CTA re-fires (requestedAt is monotonic).
 *   - Generate Brief: builds a Markdown feasibility brief from
 *     `project.prove` and triggers a client-side download. A future
 *     server-side render can replace `downloadProveBrief` without
 *     changing this call site.
 */

import { useNavigate, useParams } from "@tanstack/react-router";
import StageHero from "../components/StageHero.js";
import BlockerCard from "../components/BlockerCard.js";
import BestUsesTable from "../components/BestUsesTable.js";
import ScoreBar from "../components/ScoreBar.js";
import MetricCard from "../components/MetricCard.js";
import DesignRulesGrid from "../components/DesignRulesGrid.js";
import { useV3Project } from "../data/useV3Project.js";
import { useMapFocusStore } from "../../store/mapFocusStore.js";
import { downloadProveBrief } from "../data/generateProveBrief.js";
import "../styles/chrome.css";
import css from "./ProvePage.module.css";

function polygonCentroid(poly: GeoJSON.Polygon): [number, number] | null {
  const ring = poly.coordinates[0];
  if (!ring || ring.length === 0) return null;
  let lng = 0;
  let lat = 0;
  let n = 0;
  for (const pt of ring) {
    const x = pt[0];
    const y = pt[1];
    if (x === undefined || y === undefined) continue;
    lng += x;
    lat += y;
    n += 1;
  }
  if (n === 0) return null;
  return [lng / n, lat / n];
}

export default function ProvePage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const project = useV3Project(params.projectId);
  const navigate = useNavigate();
  const focus = useMapFocusStore((s) => s.focus);

  if (!project) {
    return <p className={css.empty}>No project loaded.</p>;
  }

  const brief = project.prove;
  if (!brief) {
    return <div className={css.page}>Feasibility brief is not yet available for this project.</div>;
  }

  const verdict = brief.verdict ?? project.verdict;

  const onFixOnMap = () => {
    const centroid = project.location.boundary
      ? polygonCentroid(project.location.boundary)
      : null;
    if (centroid) {
      focus({ projectId: project.id, center: centroid, zoom: 16 });
    }
    void navigate({
      to: "/v3/project/$projectId/design",
      params: { projectId: project.id },
    });
  };

  const onGenerateBrief = () => {
    downloadProveBrief(project);
  };

  return (
    <div className={css.page}>
      <StageHero
        eyebrow="Prove"
        title="Feasibility Engine"
        verdict={verdict}
        meta={`${project.location.region} · ${project.location.acreage} ${project.location.acreageUnit}`}
        actions={[
          { label: "Fix on Map", variant: "primary", onClick: onFixOnMap },
          { label: "Generate Brief", variant: "secondary", onClick: onGenerateBrief },
        ]}
      />

      <section id="prove-blockers" className={css.section} aria-label="Blocking issues">
        <header className={css.sectionHeader}>
          <p className="eyebrow">Test · Blockers</p>
          <h2 className={css.sectionTitle}>Blocking Issues</h2>
          <p className={css.sectionSub}>What's standing between this design and a green light.</p>
        </header>
        <div className={css.blockerGrid}>
          {brief.blockers.map((b) => (
            <BlockerCard key={b.id} blocker={b} onAction={onFixOnMap} />
          ))}
        </div>
      </section>

      <section id="prove-best-uses" className={css.section} aria-label="Best uses">
        <header className={css.sectionHeader}>
          <p className="eyebrow">Test · Land Fit</p>
          <h2 className={css.sectionTitle}>Best Uses for this Parcel</h2>
          <p className={css.sectionSub}>Land uses ranked by alignment with the project vision.</p>
        </header>
        <BestUsesTable uses={brief.bestUses} />
      </section>

      <section id="prove-vision-fit" className={css.section} aria-label="Vision fit analysis">
        <header className={css.sectionHeader}>
          <p className="eyebrow">Test · Vision</p>
          <h2 className={css.sectionTitle}>Vision Fit Analysis</h2>
          <p className={css.sectionSub}>Six lenses scored against the vision baseline (tick marker).</p>
        </header>
        <div className={css.barStack}>
          {brief.visionFit.map((b) => (
            <ScoreBar key={b.category} bar={b} />
          ))}
        </div>
      </section>

      <section id="prove-execution" className={css.section} aria-label="Execution reality">
        <header className={css.sectionHeader}>
          <p className="eyebrow">Test · Cost</p>
          <h2 className={css.sectionTitle}>Execution Reality</h2>
          <p className={css.sectionSub}>The cost of building this design — labor, capital, cash.</p>
        </header>
        <div className={css.execGrid}>
          {brief.execution.map((e) => (
            <MetricCard
              key={e.id}
              label={e.label}
              value={e.value}
              subtext={e.hint}
              status={e.tone && e.tone !== "neutral" ? { label: toneLabel(e.tone), tone: e.tone } : undefined}
            />
          ))}
        </div>
      </section>

      <section id="prove-rules" className={css.section} aria-label="Design rules and safety checks">
        <header className={css.sectionHeader}>
          <p className="eyebrow">Test · Safety</p>
          <h2 className={css.sectionTitle}>Design Rules & Safety Checks</h2>
          <p className={css.sectionSub}>What the design satisfies, where it's marginal, and where it's blocked.</p>
        </header>
        <DesignRulesGrid rules={brief.designRules} />
      </section>
    </div>
  );
}

function toneLabel(tone: "good" | "watch" | "warning"): string {
  switch (tone) {
    case "good": return "On track";
    case "watch": return "Watch";
    case "warning": return "Risk";
  }
}
