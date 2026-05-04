/**
 * EthicsReferencePage — read-only reference surface for the 3 permaculture
 * ethics + Holmgren's 12 principles.
 *
 * Reached from the V3LifecycleSidebar footer (P0 utility nav). Content
 * sourced from wiki/concepts/permaculture-alignment.md and the Permaculture
 * Scholar synthesis at wiki/concepts/atlas-sidebar-permaculture.md.
 *
 * "Cheapest version" per the Phase B plan — static reference only. A live
 * scorer that grades the active project against each principle is deferred.
 */

import css from "./EthicsReferencePage.module.css";

interface Ethic {
  name: string;
  body: string;
}

const ETHICS: Ethic[] = [
  {
    name: "Earth Care",
    body:
      "Provision for all life systems to continue and multiply. Every design decision is a wager on whether the soil, water, air, and biological community will be more alive a generation from now.",
  },
  {
    name: "People Care",
    body:
      "Provision for people to access the resources necessary for their existence. Designs that exhaust their stewards aren't permaculture — sufficiency, dignity, and community come before throughput.",
  },
  {
    name: "Fair Share",
    body:
      "Set limits to consumption and reproduction, redistribute surplus. The third ethic is the discipline that keeps the first two honest: cap your take, share what's left over.",
  },
];

interface Principle {
  number: number;
  title: string;
  body: string;
}

const PRINCIPLES: Principle[] = [
  { number: 1, title: "Observe and Interact", body: "Sit with the land before you act. Patterns visible across seasons drive better designs than first-week assumptions." },
  { number: 2, title: "Catch and Store Energy", body: "Water, sunlight, biomass, soil fertility, social capital — capture the abundance when it arrives so the lean times are bridged." },
  { number: 3, title: "Obtain a Yield", body: "Designs that produce nothing useful in human time horizons aren't sustainable — yield is what keeps stewards engaged." },
  { number: 4, title: "Apply Self-Regulation and Accept Feedback", body: "Build the system to notice when it's drifting and to correct itself. Stewardship is a continuous loop, not a project closeout." },
  { number: 5, title: "Use and Value Renewable Resources and Services", body: "Prefer flows the sun keeps refilling — biomass, animal traction, microbial labor — over stocks that deplete." },
  { number: 6, title: "Produce No Waste", body: "Every output is an input somewhere. The Needs & Yields graph is the canonical way Atlas surfaces P6 — orphan outputs are leaks." },
  { number: 7, title: "Design from Patterns to Details", body: "Get the watershed, sectors, and zones right before fussing with bed dimensions. Big patterns constrain small choices." },
  { number: 8, title: "Integrate Rather Than Segregate", body: "Functional connections between elements are the substance of a permaculture design — proximity alone isn't integration." },
  { number: 9, title: "Use Small and Slow Solutions", body: "Test a 200 m² version before committing 20 ha. Small failures teach; large failures bankrupt." },
  { number: 10, title: "Use and Value Diversity", body: "Polycultures hedge climate, market, and pest risks the way monocultures cannot." },
  { number: 11, title: "Use Edges and Value the Marginal", body: "The edge between two systems is where most of the productive ecology happens — design more edge, not less." },
  { number: 12, title: "Creatively Use and Respond to Change", body: "Plan for succession. The design that wins is the one whose stewards adapt fastest." },
];

export default function EthicsReferencePage() {
  return (
    <div className={css.page}>
      <header className={css.header}>
        <span className={css.eyebrow}>Reference</span>
        <h1 className={css.title}>Ethics &amp; Principles</h1>
        <p className={css.lede}>
          The three ethics and twelve principles that ground every Atlas
          decision. Earth Care, People Care, and Fair Share aren't tags — they
          are the test a design has to pass before it earns a stewardship
          horizon.
        </p>
      </header>

      <section aria-labelledby="ethics-heading" className={css.section}>
        <h2 id="ethics-heading" className={css.sectionTitle}>The Three Ethics</h2>
        <ol className={css.ethicsList}>
          {ETHICS.map((ethic) => (
            <li key={ethic.name} className={css.ethicCard}>
              <h3 className={css.ethicName}>{ethic.name}</h3>
              <p className={css.ethicBody}>{ethic.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="principles-heading" className={css.section}>
        <h2 id="principles-heading" className={css.sectionTitle}>
          Holmgren&apos;s Twelve Principles
        </h2>
        <ol className={css.principlesList}>
          {PRINCIPLES.map((p) => (
            <li key={p.number} className={css.principleCard}>
              <span className={css.principleNumber}>{p.number}</span>
              <div className={css.principleBody}>
                <h3 className={css.principleTitle}>{p.title}</h3>
                <p className={css.principleText}>{p.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className={css.foot}>
        <p>
          Synthesised from the 2026-04-28 Permaculture Scholar dialogue. See
          {" "}<code>wiki/concepts/permaculture-alignment.md</code> for Atlas&apos;s
          alignment scorecard against each principle.
        </p>
      </footer>
    </div>
  );
}
