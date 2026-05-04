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
import { MTC_PROJECT } from "../data/mockProject.js";
import css from "./ComponentsDebugPage.module.css";

const STAGES = ["home", "discover", "diagnose", "design", "prove", "build", "operate", "report"] as const;

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
