/**
 * /v3/project/:projectId/diagnose — Land Brief (Phase 5).
 *
 * Layout:
 *   [StageHero]            verdict ring (72/100) + parcel caption + actions
 *   [Category grid]        7 cards: Regulatory / Soil / Water / Terrain /
 *                          Ecology / Climate / Infrastructure
 *   [R/O/L row]            Risks / Opportunities / Limitations panels
 *
 * RULE 3: every card answers "what's happening / what's wrong / what next".
 * Every category card carries the mandated "What this means" sentence.
 */

import { useParams } from "@tanstack/react-router";
import StageHero from "../components/StageHero.js";
import CategoryCard from "../components/CategoryCard.js";
import InsightPanel from "../components/InsightPanel.js";
import DiagnoseMap from "../components/DiagnoseMap.js";
import TopographyOverlay from "../components/overlays/TopographyOverlay.js";
import SectorsOverlay from "../components/overlays/SectorsOverlay.js";
import ZonesOverlay from "../components/overlays/ZonesOverlay.js";
import { useV3Project } from "../data/useV3Project.js";
import css from "./DiagnosePage.module.css";

// MTC centroid — mockProject lacks lat/lng for v3.1. Real parcel geometry
// will swap in when the project store gains a boundary feature.
const MTC_CENTROID: [number, number] = [-78.20, 44.50];

export default function DiagnosePage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const project = useV3Project(params.projectId);

  if (!project) {
    return <p className={css.empty}>No project loaded.</p>;
  }

  const brief = project.diagnose;
  if (!brief) {
    return <div className={css.page}>Land brief is not yet available for this project.</div>;
  }

  const risks = brief.insights.filter((i) => i.kind === "risk");
  const opportunities = brief.insights.filter((i) => i.kind === "opportunity");
  const limitations = brief.insights.filter((i) => i.kind === "limitation");

  return (
    <div className={css.page}>
      <StageHero
        eyebrow="Diagnose"
        title="Land Brief"
        verdict={brief.verdict}
        meta={brief.parcelCaption}
        actions={[
          { label: "Open Design Studio", variant: "primary", onClick: () => {} },
          { label: "Download Brief", variant: "secondary", onClick: () => {} },
        ]}
        aside={<ParcelPlaceholder caption={brief.parcelCaption} />}
      />

      <section className={css.section} aria-label="Site analysis map">
        <header className={css.sectionHeader}>
          <h2 className={css.sectionTitle}>Site analysis</h2>
          <p className={css.sectionSub}>
            Topography, sectors, and zones are the permaculture designer&rsquo;s reading of the parcel. Toggle overlays from the sidebar&rsquo;s Matrix Toggles.
          </p>
        </header>
        <DiagnoseMap centroid={MTC_CENTROID}>
          {({ map, centroid }) => (
            <>
              <TopographyOverlay map={map} />
              <SectorsOverlay map={map} centroid={centroid} />
              <ZonesOverlay map={map} centroid={centroid} />
            </>
          )}
        </DiagnoseMap>
      </section>

      <section className={css.section} aria-label="Land categories">
        <header className={css.sectionHeader}>
          <h2 className={css.sectionTitle}>What the land is telling us</h2>
          <p className={css.sectionSub}>
            Seven plain-language categories. Each card translates raw data into a recommendation you can act on.
          </p>
        </header>
        <div className={css.grid}>
          {brief.categories.map((c) => (
            <CategoryCard key={c.id} category={c} onView={() => {}} />
          ))}
        </div>
      </section>

      <section className={css.section} aria-label="Risks, opportunities, and limitations">
        <header className={css.sectionHeader}>
          <h2 className={css.sectionTitle}>Risks · Opportunities · Limitations</h2>
          <p className={css.sectionSub}>
            The headline read of the parcel — what could go wrong, what to lean into, what to plan around.
          </p>
        </header>
        <div className={css.rolGrid}>
          <InsightPanel kind="risk" items={risks} />
          <InsightPanel kind="opportunity" items={opportunities} />
          <InsightPanel kind="limitation" items={limitations} />
        </div>
      </section>
    </div>
  );
}

function ParcelPlaceholder({ caption }: { caption?: string }) {
  return (
    <div className={css.parcel} aria-hidden="true">
      <div className={css.parcelArt}>
        <span className={css.parcelGlyph}>◊</span>
      </div>
      {caption && <span className={css.parcelCaption}>{caption}</span>}
    </div>
  );
}
