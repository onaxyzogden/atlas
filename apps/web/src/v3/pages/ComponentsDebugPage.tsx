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
import type { FormValue } from "../act/tier-shell/actToolCatalog.js";
import { encodeForage } from "../act/tier-shell/ForageCapture.js";

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

// Seeded c1..c5 siblings for the carrying-capacity synthesis (c6) and gate (c7)
// demos. These mirror the capture's DEF mockup fallbacks, so the synthesis
// recomputes a real binding constraint: intended population (8 hh x 2.5 =
// 20 people) EXCEEDS the food-production ceiling (~17), which surfaces the
// over-capacity warning + the Stratum-1 escalation rule and disables the
// gate's "confirm" pathway. Keyed by sibling item id (prefix-c1..c5); field
// keys match decodeCarryingCapacity for each mode.
const CARRYING_DEMO_SIBLINGS: Record<string, FormValue> = {
  "ev-s2-carrying-capacity-c1": { hh: "8", pph: "2.5", wDom: "80", wIrr: "1200", wLive: "400", wSupply: "5000" },
  "ev-s2-carrying-capacity-c2": { hh: "8", pph: "2.5", fArea: "20000", fExtern: "30", ccFoodIntensity: "450" },
  "ev-s2-carrying-capacity-c3": { hh: "8", pph: "2.5", nComp: "25" },
  "ev-s2-carrying-capacity-c4": { hh: "8", pph: "2.5", eDemand: "8", eSolar: "20" },
  "ev-s2-carrying-capacity-c5": { hh: "8", pph: "2.5", spaceTotalHa: "45", sWild: "27", sFood: "4", sComm: "0.5", sHh: "0.5" },
};

// Seeded c1 forage zones for the seasonal (c2), capacity (c3), and constraints
// (c4) demos, which read sibling c1 zones via siblingValues. Three demo zones
// from the forage-survey mockup (South 8.5ha improved/good, North 12.0ha
// native/fair, Creek 2.0ha riparian/good) plus a candidate species (cattle).
// Keyed by the c1 item id; encoded via encodeForage so the field shape matches
// decodeForage("zones", ...). The toxic mode (c5) is standalone -- no siblings.
const FORAGE_DEMO_SIBLINGS: Record<string, FormValue> = {
  "silv-sec-s3-forage-survey-c1": encodeForage("zones", {
    kind: "zones",
    zones: [
      { id: "zone-south", forageType: "improved", name: "South paddock", areaHa: "8.5", condition: "good", composition: "Ryegrass / sub-clover dominant." },
      { id: "zone-north", forageType: "native", name: "North flat", areaHa: "12.0", condition: "fair", composition: "Native grassland; bare patches on west slope." },
      { id: "zone-creek", forageType: "riparian", name: "Creek line", areaHa: "2.0", condition: "good", composition: "Riparian browse and shade." },
    ],
    candidateSpecies: ["cattle"],
  }),
};

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

      <Section title="Decision Working Panel - Constraints (suggest + register)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "s1-vision-constraints",
              label: "Identify non-negotiables and hard constraints",
              prompt: "What cannot be crossed, and what limits what's possible?",
              isConstraints: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{
              constraints: [
                JSON.stringify({ id: "seed-1", text: "No synthetic herbicides, pesticides, or fertilisers -- certified organic methods only", severity: "nn", note: "" }),
                JSON.stringify({ id: "seed-2", text: "Annual operating expenditure cannot exceed $40,000 in the first planning cycle", severity: "hc", note: "Agreed at founding meeting" }),
                JSON.stringify({ id: "seed-3", text: "Existing bore is not to be disturbed or decommissioned under any circumstances", severity: "nn", note: "" }),
              ],
            }}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel - Assumptions (two-section register)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "s1-vision-assumptions",
              label: "Record assumptions and known unknowns",
              prompt: "Assumptions are things you're treating as true without verifying. Known unknowns are things you know you need to find out.",
              isAssumptions: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{
              assumptions: [
                JSON.stringify({ id: "seed-a1", category: "Infrastructure", text: "Bore water supply is adequate year-round for both livestock and supplemental irrigation.", flag: true }),
                JSON.stringify({ id: "seed-a2", category: "Legal", text: "Planning permission for the proposed shed and dam expansion will be granted without material conditions.", flag: false }),
              ],
              unknowns: [
                JSON.stringify({ id: "seed-u1", category: "Soil", text: "Soil depth and clay layer depth across the north paddock -- affects water retention and swale viability.", flag: true }),
                JSON.stringify({ id: "seed-u2", category: "Water", text: "Whether the seasonal creek holds water into February in drought years -- affects livestock water system design.", flag: false }),
              ],
            }}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel - Provision balance: matrix (c1)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "ev-s1-provision-balance-c1",
              label: "Define communal infrastructure commitments",
              prompt: "For each infrastructure domain, decide whether it's fully communal, a hybrid arrangement, or each household's own responsibility.",
              isProvisionBalance: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{
              provisionMatrix: [
                "water::C",
                "energy::H",
                "sanit::C",
                "bldg::C",
                "roads::C",
                "comms::H",
                "health::H",
              ],
            }}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel - Provision balance: food system (c2)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "ev-s1-provision-balance-c2",
              label: "Define food system approach",
              prompt: "How food is produced and distributed shapes daily community life. Be honest about the labour capacity behind each model.",
              isProvisionBalance: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{ foodSystem: "hybrid" }}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel - Provision balance: financial model (c3)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "ev-s1-provision-balance-c3",
              label: "Define the financial sharing model",
              prompt: "These are the five models that have actually worked - each with real tradeoffs.",
              isProvisionBalance: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{ financialModel: "contrib" }}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel - Provision balance: entitlement register (c4)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "ev-s1-provision-balance-c4",
              label: "Define private household entitlements",
              prompt: "These are the minimum private provisions each household can count on. Define them clearly, not aspirationally.",
              isProvisionBalance: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{
              entFloorArea: "65",
              entOutdoor: "40",
              entGarden: "25",
              entVehicle: "1",
              entPrivacy: ["visual", "acoustic"],
              entAutonomy: "",
            }}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel - Provision balance: tension map (c5)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "ev-s1-provision-balance-c5",
              label: "Resolve conflicts between communal efficiency and household autonomy",
              prompt: "OLOS has identified three tensions that must be documented before the provision balance can be ratified.",
              isProvisionBalance: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{
              tensionResolutions: [
                "t1::Aggregated metering only; no per-household consumption data is shared without consent.",
              ],
            }}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel - Provision balance: ratification (c6)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "ev-s1-provision-balance-c6",
              label: "Confirm provision balance is agreed by all founding members",
              prompt: "Every founding household must confirm agreement. This is the gate. One person cannot record this decision for everyone.",
              isProvisionBalance: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{
              ratifyMembers: [
                JSON.stringify({ id: "seed-m1", name: "Sarah Mitchell", status: "confirmed", note: "" }),
                JSON.stringify({ id: "seed-m2", name: "Marcus Delacroix", status: "pending", note: "" }),
              ],
            }}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      {/* Phase 3a -- Land reading (S2): four multi-mode captures.
          Each registers its c1 mode as the representative view. Empty
          initialValue renders the capture's controls + shared chrome
          faithfully (decode is TOTAL/defensive and never fabricates seeds;
          per-mode populated logic is covered by the 127 unit tests). */}
      <Section title="Decision Working Panel - Terrain survey: map source (s2-terrain c1)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "s2-terrain-c1",
              label: "Establish the terrain map source and its accuracy",
              prompt: "Record where the base elevation/contour data comes from before reading slope, landform, and erosion off it.",
              isTerrain: true,
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

      <Section title="Decision Working Panel - Climate sectors: rainfall (s2-climate c1)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "s2-climate-c1",
              label: "Document the site rainfall regime",
              prompt: "Capture annual total and seasonal distribution; the interpretation block classifies the humidity band.",
              isClimate: true,
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

      <Section title="Decision Working Panel - Ecology & habitat: vegetation (s2-ecology c1)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "s2-ecology-c1",
              label: "Map existing vegetation communities",
              prompt: "Record the vegetation communities present on site as the basis for species, corridor, and connectivity reads.",
              isEcology: true,
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

      <Section title="Decision Working Panel - Landscape context: surrounding land use (ev-s2-landscape-vectors c1)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "ev-s2-landscape-vectors-c1",
              label: "Survey surrounding land use",
              prompt: "Record the land uses adjacent to the site that shape spray risk, planning, community, and catchment vectors.",
              isLandscape: true,
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

      {/* Phase 3b -- Carrying capacity (ev-s2-carrying-capacity): a 7-mode
          capture. c1 (water) shows the population anchor + a domain input mode;
          c6 (synthesis) and c7 (gate) read seeded c1..c5 siblings so the
          binding-constraint ceiling, over-capacity warning, escalation rule,
          and gate pathway gating all render without a live store. */}
      <Section title="Decision Working Panel - Carrying capacity: water (ev-s2-carrying-capacity c1)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "ev-s2-carrying-capacity-c1",
              label: "Establish the population anchor and water ceiling",
              prompt: "Set the intended households and people-per-household, then the water budget. The anchor (hh x pph) flows to every other domain.",
              isCarryingCapacity: true,
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

      <Section title="Decision Working Panel - Carrying capacity: synthesis (ev-s2-carrying-capacity c6, seeded over-capacity)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "ev-s2-carrying-capacity-c6",
              label: "Synthesise the binding constraint across all five domains",
              prompt: "OLOS recomputes each domain ceiling from c1..c5 and reports the lowest as the binding constraint.",
              isCarryingCapacity: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{}}
            siblingValues={CARRYING_DEMO_SIBLINGS}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel - Carrying capacity: gate (ev-s2-carrying-capacity c7, confirm disabled)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "ev-s2-carrying-capacity-c7",
              label: "Choose a pathway given the carrying-capacity verdict",
              prompt: "When intended population exceeds capacity, the confirm pathway is gated -- defer or redesign only.",
              isCarryingCapacity: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{}}
            siblingValues={CARRYING_DEMO_SIBLINGS}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      {/* Phase 3b -- Forage / pasture survey (silv-sec-s3-forage-survey): a
          5-mode silvopasture capture. c1 (zones) builds the forage zone register
          + candidate species; c2 (seasonal), c3 (capacity), and c4 (constraints)
          read the seeded c1 zones via siblingValues; c5 (toxic) is standalone.
          All panels need a projectId -- the dummy "gallery" id matches the
          carrying-capacity sections above. */}
      <Section title="Decision Working Panel - Forage: zones (silv-sec-s3-forage-survey c1)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s3-forage-survey-c1",
              label: "Register the forage zones and candidate stock species",
              prompt: "Add each grazeable zone with its forage type, area, and condition, then pick the candidate stock species.",
              isForage: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={FORAGE_DEMO_SIBLINGS["silv-sec-s3-forage-survey-c1"] ?? {}}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel - Forage: seasonal (silv-sec-s3-forage-survey c2, seeded zones)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s3-forage-survey-c2",
              label: "Map per-zone seasonal feed availability",
              prompt: "Mark each month adequate, moderate, or a feed gap for every zone. The worst zone per month drives the gap summary.",
              isForage: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{}}
            siblingValues={FORAGE_DEMO_SIBLINGS}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel - Forage: capacity (silv-sec-s3-forage-survey c3, seeded zones)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s3-forage-survey-c3",
              label: "Assign a DSE condition class to each zone",
              prompt: "Pick the condition class per zone; OLOS multiplies area x DSE/ha into a conservative carrying capacity.",
              isForage: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{}}
            siblingValues={FORAGE_DEMO_SIBLINGS}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel - Forage: constraints (silv-sec-s3-forage-survey c4, seeded zones)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s3-forage-survey-c4",
              label: "Record shade, shelter, and tree-protection constraints",
              prompt: "Add shade/shelter resources and tree-protection exclusion zones; exclusions reduce the net effective grazeable area.",
              isForage: true,
            } satisfies DecisionPanelTarget}
            resolveOptions={() => []}
            successCriteriaOptions={[]}
            initialValue={{}}
            siblingValues={FORAGE_DEMO_SIBLINGS}
            initialRationale=""
            deferred={false}
            recorded={false}
            onRecord={() => {}}
            onSaveRationale={() => {}}
            onToggleDefer={() => {}}
          />
        </PanelFrame>
      </Section>

      <Section title="Decision Working Panel - Forage: toxic (silv-sec-s3-forage-survey c5)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s3-forage-survey-c5",
              label: "Survey toxic and weed plants for candidate stock",
              prompt: "Mark each toxic / weed plant present, absent, or not surveyed. A present high-risk plant generates a priority Act control task.",
              isForage: true,
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

      {/* Phase 3c-i -- Grazing system design (silv-sec-s4-grazing-design): a
          6-mode silvopasture capture (grazingMethod / paddockLayout / grazeRest
          / treeProtection / contingency / stockingDensity). Advisory only -- it
          writes no store and reads no siblings, so each panel stands alone. The
          dummy "gallery" projectId matches the sections above (the arm ignores
          it). */}
      <Section title="Decision Working Panel - Grazing: method (silv-sec-s4-grazing-design c1)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s4-grazing-design-c1",
              label: "Define the grazing method - rotational, cell, or set-stocking - and the rationale",
              prompt: "Pick the grazing method and record why it fits the site, stock, and labour.",
              isGrazing: true,
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

      <Section title="Decision Working Panel - Grazing: paddock layout (silv-sec-s4-grazing-design c2)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s4-grazing-design-c2",
              label: "Define paddock or cell layout and target mob size per move",
              prompt: "Add each paddock or cell and set the target mob size per move.",
              isGrazing: true,
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

      <Section title="Decision Working Panel - Grazing: graze/rest (silv-sec-s4-grazing-design c3)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s4-grazing-design-c3",
              label: "Define graze-period and rest-period targets per season tied to recovery indicators",
              prompt: "Set graze and rest periods for each season, tied to pasture recovery indicators.",
              isGrazing: true,
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

      <Section title="Decision Working Panel - Grazing: tree protection (silv-sec-s4-grazing-design c4)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s4-grazing-design-c4",
              label: "Define tree-protection rules - exclusion windows for young plantings, browse limits",
              prompt: "Set per-stage exclusion windows and browse limits that protect young plantings.",
              isGrazing: true,
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

      <Section title="Decision Working Panel - Grazing: contingency (silv-sec-s4-grazing-design c5)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s4-grazing-design-c5",
              label: "Define the feed-gap contingency - supplementary feed, destocking, or agistment triggers",
              prompt: "Configure the contingency tiers and the trigger that escalates each one.",
              isGrazing: true,
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

      <Section title="Decision Working Panel - Grazing: stocking density (silv-sec-s4-grazing-design c6)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s4-grazing-design-c6",
              label: "Run the paddock stocking density check to confirm the grazing design is within surveyed carrying capacity",
              prompt: "Enter the designed flock breakdown; OLOS checks stocking density against surveyed carrying capacity.",
              isGrazing: true,
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

      {/* Phase 3c-ii -- Livestock enterprise intent (silv-sec-s1-livestock-intent):
          a 5-mode silvopasture capture (rationale / species / relationship /
          capacity / compat). Advisory only -- it writes no store and takes no
          projectId. c5 (compat) reads the c1/c2/c4 siblings via siblingValues;
          with the empty gallery values its context rows show "Not set" / "None
          selected", which is a valid empty-state render. The dummy "gallery"
          projectId matches the sections above (the arm ignores it). */}
      <Section title="Decision Working Panel - Livestock intent: rationale (silv-sec-s1-livestock-intent c1)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s1-livestock-intent-c1",
              label: "Define the integration rationale - grazing as a land-management tool, a production enterprise, or both",
              prompt: "Pick the rationale that sets how livestock are tiered in the design.",
              isLivestockIntent: true,
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

      <Section title="Decision Working Panel - Livestock intent: species (silv-sec-s1-livestock-intent c2)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s1-livestock-intent-c2",
              label: "Identify candidate species and classes of stock under consideration - ruminants, poultry, mixed",
              prompt: "Select the candidate species; each carries its own stocking density and paddock minimum.",
              isLivestockIntent: true,
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

      <Section title="Decision Working Panel - Livestock intent: relationship (silv-sec-s1-livestock-intent c3)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s1-livestock-intent-c3",
              label: "Define how livestock relate to the primary enterprise - complementary, supplementary, or competing for land",
              prompt: "Pick the enterprise relationship that drives the integration matrix.",
              isLivestockIntent: true,
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

      <Section title="Decision Working Panel - Livestock intent: capacity (silv-sec-s1-livestock-intent c4)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s1-livestock-intent-c4",
              label: "Identify operator livestock experience and labour availability for daily stock care",
              prompt: "Record experience, prior species, daily care hours, skills, and support needs.",
              isLivestockIntent: true,
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

      <Section title="Decision Working Panel - Livestock intent: compat (silv-sec-s1-livestock-intent c5)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s1-livestock-intent-c5",
              label: "Confirm livestock intent is compatible with the primary enterprise vision and site scale",
              prompt: "Review the compatibility checks and confirm the intent fits the vision and site scale.",
              isLivestockIntent: true,
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

      {/* Phase 3c-iii -- Husbandry & welfare framework
          (silv-sec-s4-husbandry-framework): a 6-mode silvopasture capture
          (health / breeding / welfare / halal / records / labour). Advisory only
          -- it writes no store and takes no projectId. c4 (halal) foregrounds the
          niyyah of halal stewardship and the dhakah conditions (incl. Tasmiyah),
          carries an explicit pig-output exclusion, and is the only gated mode (a
          pathway acknowledgement). The dummy "gallery" projectId is ignored by
          the arm. */}
      <Section title="Decision Working Panel - Husbandry: health (silv-sec-s4-husbandry-framework c1)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s4-husbandry-framework-c1",
              label: "Define animal health program - vaccination, parasite management, and veterinary relationship",
              prompt: "Review the health program and record the veterinary relationship.",
              isHusbandry: true,
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

      <Section title="Decision Working Panel - Husbandry: breeding (silv-sec-s4-husbandry-framework c2)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s4-husbandry-framework-c2",
              label: "Define breeding or replacement strategy and seasonal husbandry calendar",
              prompt: "Pick the breeding strategy that sets the joining and replacement rhythm.",
              isHusbandry: true,
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

      <Section title="Decision Working Panel - Husbandry: welfare (silv-sec-s4-husbandry-framework c3)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s4-husbandry-framework-c3",
              label: "Define daily welfare standard - feed, water, shade, and handling stress minimisation",
              prompt: "Review the welfare domains and record site-specific commitments.",
              isHusbandry: true,
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

      <Section title="Decision Working Panel - Husbandry: halal (silv-sec-s4-husbandry-framework c4)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s4-husbandry-framework-c4",
              label: "Define humane and halal handling and slaughter-pathway intent where stock is raised for meat",
              prompt: "Review the halal handling pathway and acknowledge the slaughter-pathway intent.",
              isHusbandry: true,
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

      <Section title="Decision Working Panel - Husbandry: records (silv-sec-s4-husbandry-framework c5)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s4-husbandry-framework-c5",
              label: "Define record-keeping for stock numbers, health events, and movements",
              prompt: "Review the record-keeping framework and note the tools and cadence.",
              isHusbandry: true,
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

      <Section title="Decision Working Panel - Husbandry: labour (silv-sec-s4-husbandry-framework c6)">
        <PanelFrame>
          <DecisionWorkingPanel
            projectId="gallery"
            decision={{
              itemId: "silv-sec-s4-husbandry-framework-c6",
              label: "Confirm the husbandry framework is consistent with available labour and the welfare standard",
              prompt: "Review the seasonal labour profile and confirm the framework fits available labour.",
              isHusbandry: true,
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
