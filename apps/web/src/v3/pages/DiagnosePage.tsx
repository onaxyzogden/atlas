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
import DiagnoseCategoryDrawer from "../components/DiagnoseCategoryDrawer.js";
import { useMemo, useState } from "react";
import DiagnoseMap from "../components/DiagnoseMap.js";
import TopographyOverlay from "../components/overlays/TopographyOverlay.js";
import SectorsOverlay from "../components/overlays/SectorsOverlay.js";
import ZonesOverlay from "../components/overlays/ZonesOverlay.js";
import { computeSolarSectors } from "../../lib/sectors/solar.js";
import { computeConcentricZones } from "../../lib/zones/concentric.js";
import { useV3Project } from "../data/useV3Project.js";
import type { DiagnoseCategoryId } from "../types.js";
import css from "./DiagnosePage.module.css";

// Fallback center used only when the project carries no boundary polygon.
// MTC has one (mockProject.location.boundary), so DiagnoseMap fits to it
// and this constant is unused on /v3/project/mtc/diagnose.
const FALLBACK_CENTROID: [number, number] = [-78.20, 44.50];

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

  const [openCategoryId, setOpenCategoryId] = useState<DiagnoseCategoryId | null>(null);
  const categoryDetails = brief.categoryDetails ?? {};
  const openCategory = openCategoryId ? brief.categories.find((c) => c.id === openCategoryId) : null;
  const openDetail = openCategoryId ? categoryDetails[openCategoryId] : undefined;
  const openInsights = openCategoryId
    ? brief.insights.filter((i) => i.categoryIds?.includes(openCategoryId))
    : [];

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
        <DiagnoseMap
          centroid={FALLBACK_CENTROID}
          boundary={project.location.boundary}
        >
          {({ map, centroid }) => (
            <DiagnoseOverlays
              map={map}
              centroid={centroid}
              boundary={project.location.boundary}
            />
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
            <CategoryCard
              key={c.id}
              category={c}
              hasDetail={!!categoryDetails[c.id]}
              onView={(id) => setOpenCategoryId(id)}
            />
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

      {openCategory && openDetail && (
        <DiagnoseCategoryDrawer
          category={openCategory}
          detail={openDetail}
          insights={openInsights}
          onClose={() => setOpenCategoryId(null)}
        />
      )}
    </div>
  );
}

function DiagnoseOverlays({
  map,
  centroid,
  boundary,
}: {
  map: import("maplibre-gl").Map;
  centroid: [number, number];
  boundary?: GeoJSON.Polygon;
}) {
  const sectors = useMemo(() => computeSolarSectors(centroid), [centroid]);
  const zones = useMemo(() => computeConcentricZones(centroid), [centroid]);
  return (
    <>
      <TopographyOverlay map={map} />
      <SectorsOverlay map={map} sectors={sectors} />
      <ZonesOverlay map={map} zones={zones} boundary={boundary} />
    </>
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
