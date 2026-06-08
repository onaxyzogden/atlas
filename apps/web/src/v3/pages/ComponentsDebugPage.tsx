/**
 * /v3/components — visual smoke-test for v3 primitives.
 *
 * Phase 2 gate. Renders one of each primitive with sample props so a
 * regression in spacing, color, or token wiring is visible at a glance.
 */

import MetricCard from "../components/MetricCard.js";
import StageHero from "../components/StageHero.js";
import PageHeader from "../components/PageHeader.js";
import BlockerCard from "../components/BlockerCard.js";
import DecisionRail from "../components/DecisionRail.js";
import StratumSpine from "../plan/strata/StratumSpine.js";
import PlanSpinePrototype from "../plan/spine/PlanSpinePrototype.js";
import ObserveCompassWheel from "../compass/ObserveCompassWheel.js";
import type { ObjectiveView } from "../compass/compassTypes.js";
import { MTC_PROJECT } from "../data/mockProject.js";
import { PLAN_STRATA, type PlanStratumState } from "@ogden/shared";
import { Mountain, Droplets, Building2, Compass, Users } from "lucide-react";
import css from "./ComponentsDebugPage.module.css";
import DecisionWorkingPanel, {
  type DecisionPanelTarget,
} from "../act/tier-shell/DecisionWorkingPanel.js";

const STAGES = ["home", "discover", "diagnose", "design", "prove", "build", "operate", "report"] as const;

// A realistic progression that surfaces all four StratumRow states (and the
// active+selected combination) at once, so the dark-mode elevation ladder is
// visible without advancing real project data. Keyed by canonical stratum id.
const STRATUM_DEMO_STATES: Record<string, PlanStratumState> = {
  "s1-project-foundation": "complete",
  "s2-land-reading": "complete",
  "s3-systems-reading": "active",
  "s4-foundation-decisions": "available",
  "s5-system-design": "available",
  "s6-integration-design": "locked",
  "s7-phasing-resourcing": "locked",
};
const STRATUM_DEMO_ACTIVE = "s3-systems-reading";

// Mock objective views for the ObserveCompassWheel demo. The live wheel is fed
// by useCompassData; here we hand a static spread of states (fully verified →
// in-progress → untouched) so every segment fill level and the hover "Next"
// card are visible in the gallery without wiring a store. Shapes mirror
// compassTypes (ObjectiveView = { objective, states, progress }).
const COMPASS_DEMO_VIEWS: ObjectiveView[] = [
  {
    objective: {
      id: "topography",
      ordinal: 1,
      label: "Topography",
      icon: Mountain,
      accent: "#7a8b6f",
      summary: "Read the landform — elevation, contour, and drainage.",
      nodes: [
        { index: 0, label: "Walk the contour lines" },
        { index: 1, label: "Mark high and low points" },
        { index: 2, label: "Trace drainage paths" },
      ],
    },
    states: ["verified", "verified", "verified"],
    progress: { verified: 3, total: 3, pct: 100 },
  },
  {
    objective: {
      id: "hydrology",
      ordinal: 2,
      label: "Hydrology",
      icon: Droplets,
      accent: "#5b8aa6",
      summary: "Trace water and soil — streams, swales, and test pits.",
      nodes: [
        { index: 0, label: "Locate water sources" },
        { index: 1, label: "Dig soil test pits" },
        { index: 2, label: "Map seasonal flows" },
      ],
    },
    states: ["verified", "evidence-in", "open"],
    progress: { verified: 1, total: 3, pct: 33 },
  },
  {
    objective: {
      id: "built-infrastructure",
      ordinal: 3,
      label: "Built Infrastructure",
      icon: Building2,
      accent: "#a6855b",
      summary: "Map buildings, wells, utilities, and fence lines.",
      nodes: [
        { index: 0, label: "Inventory structures" },
        { index: 1, label: "Trace utility runs" },
        { index: 2, label: "Record fence lines" },
      ],
    },
    states: ["verified", "open", "locked"],
    progress: { verified: 1, total: 3, pct: 33 },
  },
  {
    objective: {
      id: "access-circulation",
      ordinal: 4,
      label: "Access & Circulation",
      icon: Compass,
      accent: "#8b7355",
      summary: "Map sectors flowing in and zones of human use radiating out.",
      nodes: [
        { index: 0, label: "Sketch the sector wheel" },
        { index: 1, label: "Define use zones" },
      ],
    },
    states: ["open", "locked"],
    progress: { verified: 0, total: 2, pct: 0 },
  },
  {
    objective: {
      id: "people-governance",
      ordinal: 5,
      label: "People & Governance",
      icon: Users,
      accent: "#9a6b8b",
      summary: "Understand the people and stewardship practices on the land.",
      nodes: [
        { index: 0, label: "Interview stakeholders" },
        { index: 1, label: "Capture historical use" },
        { index: 2, label: "Record governance norms" },
      ],
    },
    states: ["open", "locked", "locked"],
    progress: { verified: 0, total: 3, pct: 0 },
  },
];

export default function ComponentsDebugPage() {
  return (
    <div className={css.page}>
      <PageHeader
        eyebrow="Phase 2"
        title="v3 Component Library"
        subtitle="Visual smoke-test for the Atlas 3.0 primitives. Token wiring, spacing, and color must match the brief."
        actions={<span className={css.tag}>debug</span>}
      />

      <Section title="StageHero">
        <StageHero
          eyebrow="Project Command"
          title={MTC_PROJECT.name}
          verdict={MTC_PROJECT.verdict}
          meta={`${MTC_PROJECT.location.region} · ${MTC_PROJECT.location.acreage} ${MTC_PROJECT.location.acreageUnit}`}
          actions={[
            { label: "Continue Project", onClick: () => {} },
            { label: "Generate Brief", variant: "secondary", onClick: () => {} },
          ]}
        />
      </Section>

      <Section title="MetricCard — variants">
        <div className={css.grid6}>
          <MetricCard label="Land Fit" value={MTC_PROJECT.scores.landFit.value} score={MTC_PROJECT.scores.landFit.value} subtext={MTC_PROJECT.scores.landFit.label} />
          <MetricCard label="Water" value={MTC_PROJECT.scores.water.value} score={MTC_PROJECT.scores.water.value} subtext={MTC_PROJECT.scores.water.label} />
          <MetricCard label="Regulation" value={MTC_PROJECT.scores.regulation.value} score={MTC_PROJECT.scores.regulation.value} />
          <MetricCard label="Annual Labor" value="2,400" unit="hrs" subtext="Across 4 enterprises" />
          <MetricCard label="Total Investment" value="$1.4M" status={{ label: "On track", tone: "good" }} />
          <MetricCard label="Peak Cash" value="$320K" status={{ label: "Watch", tone: "watch" }} />
        </div>
      </Section>

      <Section title="BlockerCard — severities">
        <div className={css.grid2}>
          {MTC_PROJECT.blockers.map((b) => (
            <BlockerCard key={b.id} blocker={b} onAction={() => {}} />
          ))}
        </div>
      </Section>

      <Section title="DecisionRail — all 8 stages">
        <div className={css.gridRails}>
          {STAGES.map((s) => (
            <div key={s} className={css.railFrame}>
              <DecisionRail stage={s} project={MTC_PROJECT} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="StratumSpine — state elevation ladder">
        <StratumSpine
          strata={PLAN_STRATA}
          objectives={[]}
          objectiveStatuses={{}}
          stratumStates={STRATUM_DEMO_STATES}
          activeStratumId={STRATUM_DEMO_ACTIVE}
          onSelectStratum={() => {}}
        />
      </Section>

      <Section title="ObserveCompassWheel — Maqasid comparison wheel">
        <div
          style={{
            height: 520,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #2A2A25",
            padding: 24,
            boxSizing: "border-box",
          }}
        >
          <ObserveCompassWheel
            views={COMPASS_DEMO_VIEWS}
            selected={null}
            onSelect={() => {}}
            centerLabel="OBSERVE"
          />
        </div>
      </Section>

      <Section title="Plan Spine prototype — Design ▸ Protocol modes (OLOS Protocol Layer slice 1)">
        <div
          style={{
            height: 760,
            borderRadius: 12,
            overflow: "hidden",
            border: "1px solid #2A2A25",
          }}
        >
          <PlanSpinePrototype height="100%" />
        </div>
      </Section>

      {/* ------------------------------------------------------------------ */}
      {/* DecisionWorkingPanel arms — map-free capture harness                */}
      {/* ------------------------------------------------------------------ */}

      <Section title="Decision Working Panel — empty">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={null}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{}}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel — textarea fallback">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "demo-text",
              label: "Generic decision",
              prompt: "Describe the decision in your own words.",
              feedsLabel: "Feeds Observe: example signal",
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{}}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel — success criteria">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "s1-vision-c2",
              label: "Define success criteria",
              isSuccessCriteria: true,
              prompt: "What does success look like?",
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{}}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel — vision classify">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "s1-vision-classify",
              label: "Classify the vision",
              isVisionClassify: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            visionClassifySuggestions={["Food sovereignty", "Habitat restoration", "Education"]}
            initialValue={{}}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel — labour inventory">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "s1-vision-labour",
              label: "Labour inventory",
              isLabourInventory: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            labourSkillSuggestions={["Fencing", "Grafting", "Welding"]}
            initialValue={{}}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel — steward">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "s1-vision-steward",
              label: "Primary steward",
              isSteward: true,
              deferLabel: "Add team members later in settings",
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{}}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel — boundary register">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "s1-boundaries-c1",
              label: "Boundary register",
              isBoundary: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{}}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel — legal governance">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "ev-s1-legal-governance-c1",
              label: "Legal entity & tenure",
              isLegalGovernance: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{}}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel - Purpose (read-only type grid)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "s1-vision-c1",
              label: "State the primary purpose of this land project",
              prompt: "The primary type anchors all tier objectives and design logic.",
              isPurpose: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{}}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={css.section}>
      <h2 className={css.sectionTitle}>{title}</h2>
      {children}
    </section>
  );
}

/** Fixed-width dark-theme frame that mirrors the real working panel column. */
function PanelFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        maxWidth: 460,
        border: "1px solid #2A2A25",
        borderRadius: 12,
        padding: 16,
        background: "var(--color-surface, #1a1a16)",
        boxSizing: "border-box",
      }}
    >
      {children}
    </div>
  );
}
