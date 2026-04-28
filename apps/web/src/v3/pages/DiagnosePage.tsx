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

import { useNavigate, useParams } from "@tanstack/react-router";
import StageHero from "../components/StageHero.js";
import CategoryCard from "../components/CategoryCard.js";
import InsightPanel from "../components/InsightPanel.js";
import DiagnoseCategoryDrawer from "../components/DiagnoseCategoryDrawer.js";
import { useMemo, useRef, useState } from "react";
import type { Map as MaplibreMap } from "maplibre-gl";
import DiagnoseMap from "../components/DiagnoseMap.js";
import TopographyOverlay from "../components/overlays/TopographyOverlay.js";
import SectorsOverlay from "../components/overlays/SectorsOverlay.js";
import WindSectorsOverlay from "../components/overlays/WindSectorsOverlay.js";
import ZonesOverlay from "../components/overlays/ZonesOverlay.js";
import HomesteadMarker from "../components/overlays/HomesteadMarker.js";
import SpotlightPulse from "../components/overlays/SpotlightPulse.js";
import { computeSolarSectors } from "../../lib/sectors/solar.js";
import { computeWindSectors } from "../../lib/sectors/wind.js";
import { computeConcentricZones } from "../../lib/zones/concentric.js";
import { getEffectiveAnchor } from "../../lib/anchor/effectiveAnchor.js";
import { useHomesteadStore } from "../../store/homesteadStore.js";
import { useV3Project } from "../data/useV3Project.js";
import { useWindClimatology } from "../data/useWindClimatology.js";
import { downloadDiagnoseBrief } from "../lib/exportDiagnoseBrief.js";
import type { DiagnoseCategoryId } from "../types.js";
import css from "./DiagnosePage.module.css";

// Fallback center used only when the project carries no boundary polygon.
// MTC has one (mockProject.location.boundary), so DiagnoseMap fits to it
// and this constant is unused on /v3/project/mtc/diagnose.
const FALLBACK_CENTROID: [number, number] = [-78.20, 44.50];

export default function DiagnosePage() {
  const params = useParams({ strict: false }) as { projectId?: string };
  const navigate = useNavigate();
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

  const mapRef = useRef<MaplibreMap | null>(null);
  const [pulse, setPulse] = useState<{ point: [number, number]; key: number } | null>(null);
  const mapTarget = openDetail?.mapTarget;
  const onOpenOnMap = mapTarget
    ? () => {
        const map = mapRef.current;
        if (!map) return;
        map.flyTo({ center: mapTarget.center, zoom: mapTarget.zoom ?? 16, essential: true });
        setPulse({ point: mapTarget.center, key: Date.now() });
        setOpenCategoryId(null);
      }
    : undefined;

  return (
    <div className={css.page}>
      <StageHero
        eyebrow="Diagnose"
        title="Land Brief"
        verdict={brief.verdict}
        meta={brief.parcelCaption}
        actions={[
          {
            label: "Open Design Studio",
            variant: "primary",
            onClick: () =>
              navigate({ to: "/v3/project/$projectId/design", params: { projectId: project.id } }),
          },
          {
            label: "Download Brief",
            variant: "secondary",
            onClick: () => downloadDiagnoseBrief(project),
          },
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
        <DiagnosePageMap project={project} mapRef={mapRef} pulse={pulse} />

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
          onOpenOnMap={onOpenOnMap}
        />
      )}
    </div>
  );
}

function DiagnosePageMap({
  project,
  mapRef,
  pulse,
}: {
  project: import("../types.js").Project;
  mapRef: React.MutableRefObject<MaplibreMap | null>;
  pulse: { point: [number, number]; key: number } | null;
}) {
  const homestead = useHomesteadStore((s) => s.byProject[project.id]);
  const setHomestead = useHomesteadStore((s) => s.set);
  const clearHomestead = useHomesteadStore((s) => s.clear);
  const boundary = project.location.boundary;

  const anchor = useMemo(
    () => getEffectiveAnchor(homestead, boundary, FALLBACK_CENTROID),
    [homestead, boundary],
  );
  const {
    frequencies: liveWindFreqs,
    source: windSource,
    status: windStatus,
  } = useWindClimatology(anchor);

  return (
    <DiagnoseMap
      centroid={FALLBACK_CENTROID}
      boundary={boundary}
      windStatus={windStatus}
      homestead={{
        enabled: true,
        hasHomestead: !!homestead,
        onPlace: (p) => setHomestead(project.id, p),
        onClear: () => clearHomestead(project.id),
        legendNote: homestead
          ? "Anchored at homestead"
          : "Anchored at parcel centroid",
      }}
    >
      {({ map }) => {
        mapRef.current = map;
        return (
          <>
            <DiagnoseOverlays
              map={map}
              anchor={anchor}
              boundary={boundary}
              projectId={project.id}
              homestead={homestead}
              liveWindFreqs={liveWindFreqs}
              windSource={windSource}
            />
            {pulse && (
              <SpotlightPulse key={pulse.key} map={map} point={pulse.point} />
            )}
          </>
        );
      }}
    </DiagnoseMap>
  );
}

function DiagnoseOverlays({
  map,
  anchor,
  boundary,
  projectId,
  homestead,
  liveWindFreqs,
  windSource,
}: {
  map: import("maplibre-gl").Map;
  anchor: [number, number];
  boundary?: GeoJSON.Polygon;
  projectId: string;
  homestead: [number, number] | undefined;
  liveWindFreqs: import("../../lib/wind-climatology/cache.js").WindFrequencies | undefined;
  windSource: string | undefined;
}) {
  const sectors = useMemo(() => computeSolarSectors(anchor), [anchor]);
  const wind = useMemo(
    () =>
      computeWindSectors(
        anchor,
        liveWindFreqs ? { frequencies: liveWindFreqs, sourceLabel: windSource } : undefined,
      ),
    [anchor, liveWindFreqs, windSource],
  );
  const zones = useMemo(() => computeConcentricZones(anchor), [anchor]);
  return (
    <>
      <TopographyOverlay map={map} />
      <SectorsOverlay map={map} sectors={sectors} />
      <WindSectorsOverlay map={map} rose={wind} />
      <ZonesOverlay map={map} zones={zones} boundary={boundary} />
      {homestead && (
        <HomesteadMarker map={map} projectId={projectId} point={homestead} />
      )}
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
