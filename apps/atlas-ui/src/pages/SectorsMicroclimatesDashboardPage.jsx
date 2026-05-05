import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Home,
  Leaf,
  MapPin,
  Sprout,
  Sun,
  Wind,
} from "lucide-react";
import { useState } from "react";
import {
  AppShell,
  ModuleHeroCard,
  ProgressRing,
  QaOverlay,
  SlideUpPane,
  SurfaceCard,
  TopStageBar,
  ProjectDataStatus,
} from "../components/index.js";
import { observeNav } from "../data/navConfig.js";
import { screenCatalog } from "../screenCatalog.js";
import { sectorsMicroclimatesDashboard as vm } from "../data/builtin-sample.js";
import { useBuiltinProject } from "../context/BuiltinProjectContext.jsx";
import { SectorCompassContent } from "./SectorCompassPage.jsx";
import { CartographicDetailContent } from "./CartographicDetailPage.jsx";

const metadata = screenCatalog.find(
  (s) => s.route === "/observe/sectors-zones"
);

const TONE_COLOR = {
  gold:  "var(--olos-gold-bright)",
  green: "var(--olos-green)",
  blue:  "#6ab4d4",
  sage:  "#8dba7c",
  moss:  "#5a7a3a",
  dim:   "var(--olos-dim)",
};

export function SectorsMicroclimatesDashboardPage() {
  const { project } = useBuiltinProject();
  const meta = project?.metadata ?? {};
  const [pane, setPane] = useState(null);
  const close = () => setPane(null);
  return (
    <AppShell navConfig={observeNav}>
      <div className="detail-page sectors-page module-frame">
        <TopStageBar stage="Stage 1 of 3" module="Roots & Diagnosis — Module 5" />
        <ProjectDataStatus />
        <section className="sectors-layout">
          <div className="sectors-main">
            <ModuleHeroCard
              moduleNumber="Module 5"
              title="Sectors, Microclimates & Zones"
              icon={Compass}
              copy={vm.hero.copy}
              progressPct={vm.hero.progressPct}
              metrics={vm.hero.metrics}
            />
            <SectorsKpis />
            <SynthesisCard />
            <div className="sectors-tool-grid">
              <SectorCompassCard onAction={() => setPane("sectorCompass")} />
              <CartographicCard onAction={() => setPane("cartographic")} />
            </div>
          </div>
          <SectorsSidebar />
        </section>
      </div>
      <SlideUpPane open={pane === "sectorCompass"} title="Sector compass" onClose={close}>
        <SectorCompassContent />
      </SlideUpPane>
      <SlideUpPane open={pane === "cartographic"} title="Cartographic detail" onClose={close}>
        <CartographicDetailContent />
      </SlideUpPane>
      {import.meta.env.DEV && metadata ? (
        <QaOverlay
          reference={metadata.reference}
          nativeWidth={metadata.viewport.width}
          nativeHeight={metadata.viewport.height}
        />
      ) : null}
    </AppShell>
  );
}

function SectorsKpis() {
  const { kpis } = vm;
  return (
    <section className="sectors-kpi-strip">
      <SurfaceCard className="sectors-kpi-card green">
        <Leaf aria-hidden="true" />
        <span>Sector analysis plans</span>
        <strong>{kpis.sectorAnalysisPlans}</strong>
        <small>Documented</small>
      </SurfaceCard>
      <SurfaceCard className="sectors-kpi-card gold">
        <Sun aria-hidden="true" />
        <span>Microclimate services</span>
        <strong>{kpis.microclimates}</strong>
        <small>Identified</small>
      </SurfaceCard>
      <SurfaceCard className="sectors-kpi-card green">
        <Home aria-hidden="true" />
        <span>Zones outlined</span>
        <strong>{kpis.zonesOutlined}</strong>
        <small>Across site</small>
      </SurfaceCard>
      <SurfaceCard className="sectors-kpi-card">
        <ProgressRing value={kpis.observationDepth} label={`${kpis.observationDepth}%`} />
        <span>Observation depth</span>
        <strong>{kpis.observationDepth}%</strong>
        <small>Module complete</small>
      </SurfaceCard>
    </section>
  );
}

function SynthesisCard() {
  return (
    <SurfaceCard className="sectors-synthesis-card">
      <h2><Sprout aria-hidden="true" /> Synthesis</h2>
      <p>{vm.synthesis}</p>
      <div className="sectors-synthesis-actions">
        <button className="outlined-button" type="button">View all sectors <ArrowRight size={14} aria-hidden="true" /></button>
        <button className="outlined-button" type="button">View zone map <ArrowRight size={14} aria-hidden="true" /></button>
      </div>
    </SurfaceCard>
  );
}

function SectorCompassCard({ onAction }) {
  return (
    <SurfaceCard className="sectors-tool-card compass-card">
      <header className="sectors-tool-card__header">
        <h2><Compass aria-hidden="true" /> Sector compass</h2>
        <p>Forces and influences mapped by direction around your site.</p>
      </header>
      <div className="compass-art-wrap">
        <CompassArt sectors={vm.sectorCompassSectors} />
      </div>
      <button className="outlined-button sectors-open-btn" type="button" onClick={onAction}>
        Open Sector compass <ArrowRight size={14} aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function CompassArt({ sectors }) {
  const cx = 110;
  const cy = 110;
  const r = 85;
  const labelR = 100;
  const sliceAngle = (2 * Math.PI) / 8;

  return (
    <svg
      viewBox="0 0 220 220"
      className="compass-svg"
      aria-label="Sector compass diagram"
      role="img"
    >
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="rgba(168,125,43,0.18)" strokeWidth="1" />
      {/* Sector wedges */}
      {sectors.map((s, i) => {
        const startAngle = (i * sliceAngle) - Math.PI / 2 - sliceAngle / 2;
        const endAngle   = startAngle + sliceAngle;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const color = TONE_COLOR[s.tone] ?? TONE_COLOR.dim;
        return (
          <path
            key={s.dir}
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
            fill={color}
            fillOpacity="0.18"
            stroke={color}
            strokeOpacity="0.45"
            strokeWidth="0.8"
          />
        );
      })}
      {/* Spoke lines */}
      {sectors.map((s, i) => {
        const angle = (i * sliceAngle) - Math.PI / 2;
        const x2 = cx + r * Math.cos(angle);
        const y2 = cy + r * Math.sin(angle);
        return (
          <line key={`spoke-${s.dir}`} x1={cx} y1={cy} x2={x2} y2={y2}
            stroke="rgba(168,125,43,0.22)" strokeWidth="0.8" />
        );
      })}
      {/* Direction labels */}
      {sectors.map((s, i) => {
        const angle = (i * sliceAngle) - Math.PI / 2;
        const lx = cx + labelR * Math.cos(angle);
        const ly = cy + labelR * Math.sin(angle);
        const color = TONE_COLOR[s.tone] ?? TONE_COLOR.dim;
        return (
          <text key={`label-${s.dir}`} x={lx} y={ly + 4}
            textAnchor="middle" fontSize="9" fontWeight="700"
            fill={color} fontFamily="Inter, sans-serif" letterSpacing="0.04em">
            {s.dir}
          </text>
        );
      })}
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="5" fill="var(--olos-green)" fillOpacity="0.8" />
      <circle cx={cx} cy={cy} r="2" fill="var(--olos-gold-bright)" />
    </svg>
  );
}

function CartographicCard({ onAction }) {
  return (
    <SurfaceCard className="sectors-tool-card cartographic-card">
      <header className="sectors-tool-card__header">
        <h2><MapPin aria-hidden="true" /> Cartographic detail</h2>
        <p>Visualise boundaries, zones, microclimates, and sectors work together.</p>
      </header>
      <div className="cartographic-art-wrap">
        <CartographicArt zones={vm.cartographicZones} />
      </div>
      <button className="outlined-button sectors-open-btn" type="button" onClick={onAction}>
        Open Cartographic detail <ArrowRight size={14} aria-hidden="true" />
      </button>
    </SurfaceCard>
  );
}

function CartographicArt({ zones }) {
  /* Five concentric elliptical zones from centre outward, styled like the reference. */
  const w = 280;
  const h = 200;
  const cx = w / 2;
  const cy = h / 2;
  const zoneRx = [30, 55, 80, 105, 125];
  const zoneRy = [22, 40, 60,  78,  93];
  const colors = ["var(--olos-gold-bright)", "var(--olos-green)", "#8dba7c", "#5a7a3a", "#2e4a22"];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="cartographic-svg" aria-label="Zone map" role="img">
      {/* Terrain fill gradient behind zones */}
      <defs>
        <radialGradient id="terrainGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2a3d1e" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0d1a0b" stopOpacity="0.95" />
        </radialGradient>
        <clipPath id="outerZone">
          <ellipse cx={cx} cy={cy} rx={zoneRx[4] + 5} ry={zoneRy[4] + 5} />
        </clipPath>
      </defs>

      {/* Background */}
      <rect width={w} height={h} fill="#081208" rx="4" />

      {/* Hatching texture */}
      <g clipPath="url(#outerZone)" opacity="0.15">
        {Array.from({ length: 30 }).map((_, i) => (
          <line key={i} x1={i * 14 - 20} y1="0" x2={i * 14 + 40} y2={h}
            stroke="rgba(165,199,54,0.4)" strokeWidth="0.5" />
        ))}
      </g>

      {/* Zone ellipses — outermost to innermost */}
      {[...zones].reverse().map((z, i) => {
        const idx = zones.length - 1 - i;
        return (
          <ellipse
            key={z.id}
            cx={cx} cy={cy}
            rx={zoneRx[idx]} ry={zoneRy[idx]}
            fill={colors[idx]}
            fillOpacity="0.22"
            stroke={colors[idx]}
            strokeOpacity="0.55"
            strokeWidth="1"
          />
        );
      })}

      {/* Zone number labels */}
      {zones.map((z, i) => {
        const angle = (i / zones.length) * 2 * Math.PI - Math.PI / 3;
        const r = zoneRx[i] * 0.6;
        const ry = zoneRy[i] * 0.6;
        const lx = cx + r * Math.cos(angle);
        const ly = cy + ry * Math.sin(angle);
        return (
          <text key={z.id} x={lx} y={ly + 3.5}
            textAnchor="middle" fontSize="8" fontWeight="700"
            fill={colors[i]} fillOpacity="0.9"
            fontFamily="Inter, sans-serif">
            {z.id}
          </text>
        );
      })}

      {/* Compass N indicator */}
      <text x={cx} y="12" textAnchor="middle" fontSize="8" fontWeight="800"
        fill="var(--olos-gold)" fillOpacity="0.7" fontFamily="Inter, sans-serif"
        letterSpacing="0.06em">N</text>
      <line x1={cx} y1="15" x2={cx} y2="22" stroke="var(--olos-gold)" strokeOpacity="0.5" strokeWidth="0.8" />
    </svg>
  );
}

function SectorsSidebar() {
  return (
    <aside className="sectors-sidebar">
      <SurfaceCard className="sectors-sidebar-card">
        <h2>Design implications</h2>
        {vm.designImplications.map((item) => (
          <p key={item} className="sectors-implication">
            <CheckCircle2 size={14} aria-hidden="true" />
            <span>{item}</span>
          </p>
        ))}
      </SurfaceCard>

      <SurfaceCard className="sectors-sidebar-card">
        <h2>Detected opportunities</h2>
        {vm.detectedOpportunities.map((item) => (
          <p key={item} className="sectors-opportunity">
            <Leaf size={14} aria-hidden="true" />
            <span>{item}</span>
          </p>
        ))}
      </SurfaceCard>

      <SurfaceCard className="sectors-sidebar-card">
        <h2>Recommended next actions</h2>
        {vm.nextActions.map((item, i) => (
          <p key={item} className="sectors-next-action">
            <b>{i + 1}</b>
            <span>{item}</span>
          </p>
        ))}
        <button className="green-button sectors-cta" type="button">
          <Wind size={14} aria-hidden="true" /> Do Sector Site Analysis
        </button>
      </SurfaceCard>
    </aside>
  );
}
