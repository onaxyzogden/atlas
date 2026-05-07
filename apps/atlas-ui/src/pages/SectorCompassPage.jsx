import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  Compass,
  Droplet,
  Download,
  Home,
  Leaf,
  MapPin,
  Plus,
  Sprout,
  Sun,
  Wind,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  AppShell,
  QaOverlay,
  SurfaceCard,
  TopStageBar,
  ProjectDataStatus,
} from "../components/index.js";
import { observeNav } from "../data/navConfig.js";
import { screenCatalog } from "../screenCatalog.js";
import { sectorCompassPage as vm } from "../data/builtin-sample.js";

const metadata = screenCatalog.find(
  (s) => s.route === "/observe/sectors-zones/sector-compass"
);

const ICON_MAP = {
  sun: Sun, wind: Wind, alert: AlertTriangle, leaf: Leaf,
  compass: Compass, droplet: Droplet, home: Home, sprout: Sprout,
};

const TONE_COLOR = {
  gold:  "var(--olos-gold-bright)",
  green: "var(--olos-green)",
  blue:  "#6ab4d4",
  dim:   "var(--olos-dim)",
  cream: "var(--olos-cream)",
};

const FORCE_COLOR = {
  solar:   "var(--olos-gold-bright)",
  warm:    "#e8a84a",
  wind:    "#6ab4d4",
  cold:    "#8ab2c8",
  frost:   "#7da0b8",
  shelter: "var(--olos-green)",
  access:  "#8dba7c",
};

export function SectorCompassContent() {
  return (
    <div className="detail-page sc-page">
      <div className="sc-breadcrumb">
        <Link to="/observe/sectors-zones" className="sc-back-link">
          <ArrowLeft size={13} /> Back to Sectors, Microclimates &amp; Zones
        </Link>
      </div>
      <header className="sc-header">
        <h1>Sector compass</h1>
        <p>{vm.hero.copy}</p>
      </header>
      <KpiStrip />
      <section className="sc-main-grid">
        <CompassPanel />
        <div className="sc-right-col">
          <SiteMapPanel />
          <ObservationsPanel />
        </div>
      </section>
      <section className="sc-bottom-grid">
        <PlacementsPanel />
        <div className="sc-analysis-col">
          <DesignAlignmentCard />
          <PriorityActionsCard />
        </div>
      </section>
    </div>
  );
}

export function SectorCompassPage() {
  return (
    <AppShell navConfig={observeNav}>
      <TopStageBar stage="Stage 1 of 3" module="Roots & Diagnosis — Module 5" />
      <ProjectDataStatus />
      <SectorCompassContent />
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

/* ── KPI strip ───────────────────────────────────────────────────────────── */

function KpiStrip() {
  return (
    <div className="sc-kpi-strip">
      {vm.kpis.map((k) => {
        const Icon = ICON_MAP[k.iconKey] ?? Compass;
        const col = TONE_COLOR[k.tone] ?? "var(--olos-cream)";
        return (
          <SurfaceCard key={k.label} className="sc-kpi-card">
            <Icon size={16} aria-hidden="true" style={{ color: col }} />
            <span>{k.label}</span>
            <strong style={{ color: col }}>{k.value}</strong>
            <small>{k.note}</small>
          </SurfaceCard>
        );
      })}
    </div>
  );
}

/* ── Large compass SVG ───────────────────────────────────────────────────── */

function CompassPanel() {
  return (
    <SurfaceCard className="sc-compass-panel">
      <h2><Compass size={15} aria-hidden="true" /> Sector compass</h2>
      <div className="sc-compass-wrap">
        <LargeCompassSvg sectors={vm.sectors} />
      </div>
      <div className="sc-compass-legend">
        {[
          { color: FORCE_COLOR.solar,   label: "Solar / insolation" },
          { color: FORCE_COLOR.wind,    label: "Wind / cold air" },
          { color: FORCE_COLOR.shelter, label: "Shelter / ecology" },
          { color: FORCE_COLOR.access,  label: "Access / circulation" },
        ].map(({ color, label }) => (
          <span key={label} className="sc-legend-item">
            <i style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>
    </SurfaceCard>
  );
}

function LargeCompassSvg({ sectors }) {
  const cx = 200;
  const cy = 200;
  const outerR = 155;
  const sliceAngle = (2 * Math.PI) / 8;

  return (
    <svg viewBox="0 0 400 400" className="sc-compass-svg" role="img" aria-label="Full sector compass">
      <defs>
        <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(13,28,22,0.9)" />
          <stop offset="100%" stopColor="rgba(4,12,10,0.95)" />
        </radialGradient>
      </defs>

      {/* Background circle */}
      <circle cx={cx} cy={cy} r={outerR + 6} fill="url(#bgGrad)" />

      {/* Concentric reference rings */}
      {[0.33, 0.55, 0.77, 1].map((f) => (
        <circle key={f} cx={cx} cy={cy} r={outerR * f}
          fill="none" stroke="rgba(168,125,43,0.12)" strokeWidth="0.8" strokeDasharray="3 4" />
      ))}

      {/* Sector wedge fills */}
      {sectors.map((s, i) => {
        const start = i * sliceAngle - Math.PI / 2 - sliceAngle / 2;
        const end   = start + sliceAngle;
        const x1 = cx + outerR * Math.cos(start);
        const y1 = cy + outerR * Math.sin(start);
        const x2 = cx + outerR * Math.cos(end);
        const y2 = cy + outerR * Math.sin(end);
        const color = TONE_COLOR[s.tone] ?? TONE_COLOR.dim;
        return (
          <path key={`wedge-${s.dir}`}
            d={`M ${cx} ${cy} L ${x1} ${y1} A ${outerR} ${outerR} 0 0 1 ${x2} ${y2} Z`}
            fill={color} fillOpacity="0.08"
            stroke={color} strokeOpacity="0.22" strokeWidth="0.6" />
        );
      })}

      {/* Force arrows from centre */}
      {sectors.map((s, i) => {
        const angle = i * sliceAngle - Math.PI / 2;
        const arrowR = outerR * s.arrowLen;
        const ax = cx + arrowR * Math.cos(angle);
        const ay = cy + arrowR * Math.sin(angle);
        const primaryForce = s.forces[0];
        const color = FORCE_COLOR[primaryForce] ?? TONE_COLOR.dim;
        // Arrowhead
        const headAngle = 0.22;
        const headLen = 9;
        const hx1 = ax - headLen * Math.cos(angle - headAngle);
        const hy1 = ay - headLen * Math.sin(angle - headAngle);
        const hx2 = ax - headLen * Math.cos(angle + headAngle);
        const hy2 = ay - headLen * Math.sin(angle + headAngle);
        return (
          <g key={`arrow-${s.dir}`}>
            <line x1={cx} y1={cy} x2={ax} y2={ay}
              stroke={color} strokeWidth="2.2" strokeOpacity="0.85"
              strokeLinecap="round" />
            <polyline points={`${hx1},${hy1} ${ax},${ay} ${hx2},${hy2}`}
              fill="none" stroke={color} strokeWidth="2" strokeOpacity="0.85"
              strokeLinejoin="round" strokeLinecap="round" />
            {/* Secondary force (if any) — thinner offset line */}
            {s.forces[1] && (() => {
              const off = 0.09;
              const f2color = FORCE_COLOR[s.forces[1]] ?? TONE_COLOR.dim;
              const r2 = outerR * (s.arrowLen * 0.7);
              const bx = cx + r2 * Math.cos(angle + off);
              const by = cy + r2 * Math.sin(angle + off);
              return (
                <line x1={cx} y1={cy} x2={bx} y2={by}
                  stroke={f2color} strokeWidth="1.2" strokeOpacity="0.55"
                  strokeLinecap="round" strokeDasharray="4 3" />
              );
            })()}
          </g>
        );
      })}

      {/* Spoke dividers */}
      {sectors.map((_, i) => {
        const angle = i * sliceAngle - Math.PI / 2 - sliceAngle / 2;
        return (
          <line key={`spoke-${i}`}
            x1={cx} y1={cy}
            x2={cx + outerR * Math.cos(angle)}
            y2={cy + outerR * Math.sin(angle)}
            stroke="rgba(168,125,43,0.14)" strokeWidth="0.7" />
        );
      })}

      {/* Direction labels + sector name labels */}
      {sectors.map((s, i) => {
        const angle = i * sliceAngle - Math.PI / 2;
        const labelR = outerR + 18;
        const nameR  = outerR + 32;
        const lx = cx + labelR * Math.cos(angle);
        const ly = cy + labelR * Math.sin(angle);
        const nx = cx + nameR  * Math.cos(angle);
        const ny = cy + nameR  * Math.sin(angle);
        const color = TONE_COLOR[s.tone] ?? TONE_COLOR.dim;
        return (
          <g key={`label-${s.dir}`}>
            <text x={lx} y={ly + 4} textAnchor="middle"
              fontSize="11" fontWeight="800" fill={color}
              fontFamily="Inter,sans-serif" letterSpacing="0.05em">
              {s.dir}
            </text>
            <text x={nx} y={ny + 3} textAnchor="middle"
              fontSize="7.5" fontWeight="500" fill={color} fillOpacity="0.65"
              fontFamily="Inter,sans-serif">
              {s.label}
            </text>
          </g>
        );
      })}

      {/* N indicator triangle */}
      <polygon points={`${cx},${cy - outerR - 4} ${cx - 5},${cy - outerR + 8} ${cx + 5},${cy - outerR + 8}`}
        fill="var(--olos-gold)" fillOpacity="0.7" />

      {/* Centre dot */}
      <circle cx={cx} cy={cy} r="7" fill="rgba(13,25,20,0.9)" stroke="rgba(168,125,43,0.5)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="3" fill="var(--olos-gold-bright)" />
    </svg>
  );
}

/* ── Site map panel ──────────────────────────────────────────────────────── */

function SiteMapPanel() {
  const sectors = vm.sectors;
  const w = 320;
  const h = 180;
  const cx = w / 2 + 10;
  const cy = h / 2 + 5;
  const siteRx = 100;
  const siteRy = 68;
  const sliceAngle = (2 * Math.PI) / 8;

  return (
    <SurfaceCard className="sc-map-panel">
      <h3><MapPin size={13} aria-hidden="true" /> Site map — sector overlay</h3>
      <div className="sc-map-wrap">
        <svg viewBox={`0 0 ${w} ${h}`} className="sc-map-svg" role="img" aria-label="Site map with sector overlay">
          <defs>
            <clipPath id="siteClip">
              <ellipse cx={cx} cy={cy} rx={siteRx} ry={siteRy} />
            </clipPath>
            <radialGradient id="siteGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#223318" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0d1a0b" stopOpacity="0.95" />
            </radialGradient>
          </defs>
          <rect width={w} height={h} fill="#081108" />
          {/* Terrain base */}
          <ellipse cx={cx} cy={cy} rx={siteRx} ry={siteRy} fill="url(#siteGrad)" />
          {/* Hatching */}
          <g clipPath="url(#siteClip)" opacity="0.12">
            {Array.from({ length: 20 }).map((_, i) => (
              <line key={i} x1={i * 16 - 20} y1="0" x2={i * 16 + 40} y2={h}
                stroke="rgba(165,199,54,0.5)" strokeWidth="0.5" />
            ))}
          </g>
          {/* Sector lines from centre */}
          {sectors.map((s, i) => {
            const angle = i * sliceAngle - Math.PI / 2;
            const ex = cx + (siteRx + 12) * Math.cos(angle);
            const ey = cy + (siteRy + 8)  * Math.sin(angle);
            const color = TONE_COLOR[s.tone] ?? TONE_COLOR.dim;
            return (
              <line key={s.dir} x1={cx} y1={cy} x2={ex} y2={ey}
                stroke={color} strokeOpacity="0.5" strokeWidth="0.9"
                strokeDasharray="3 3" />
            );
          })}
          {/* Site boundary */}
          <ellipse cx={cx} cy={cy} rx={siteRx} ry={siteRy}
            fill="none" stroke="rgba(168,125,43,0.5)" strokeWidth="1.2" />
          {/* Direction mini-labels */}
          {sectors.map((s, i) => {
            const angle = i * sliceAngle - Math.PI / 2;
            const lr = siteRx + 20;
            const lry = siteRy + 14;
            const lx = cx + lr  * Math.cos(angle);
            const ly = cy + lry * Math.sin(angle);
            const color = TONE_COLOR[s.tone] ?? TONE_COLOR.dim;
            return (
              <text key={s.dir} x={lx} y={ly + 3} textAnchor="middle"
                fontSize="7" fontWeight="700" fill={color} fillOpacity="0.8"
                fontFamily="Inter,sans-serif">{s.dir}</text>
            );
          })}
          {/* Centre mark */}
          <circle cx={cx} cy={cy} r="3" fill="var(--olos-gold-bright)" fillOpacity="0.8" />
          {/* N indicator */}
          <text x={cx} y="10" textAnchor="middle" fontSize="8" fontWeight="800"
            fill="var(--olos-gold)" fillOpacity="0.7" fontFamily="Inter,sans-serif"
            letterSpacing="0.06em">N</text>
        </svg>
      </div>
    </SurfaceCard>
  );
}

/* ── Observations panel ──────────────────────────────────────────────────── */

function ObservationsPanel() {
  return (
    <SurfaceCard className="sc-observations-panel">
      <h3>Sector observations</h3>
      {vm.observations.map((obs) => {
        const Icon = ICON_MAP[obs.icon] ?? Leaf;
        const col  = TONE_COLOR[obs.tone] ?? TONE_COLOR.dim;
        return (
          <div key={obs.label} className="sc-obs-row">
            <Icon size={13} aria-hidden="true" style={{ color: col }} />
            <span>{obs.label}</span>
            <strong style={{ color: col }}>{obs.value}</strong>
            {obs.score != null && (
              <div className="sc-obs-bar">
                <div style={{ width: `${obs.score}%`, background: col }} />
              </div>
            )}
          </div>
        );
      })}
    </SurfaceCard>
  );
}

/* ── Recommended placements ──────────────────────────────────────────────── */

function PlacementsPanel() {
  return (
    <SurfaceCard className="sc-placements-card">
      <h2>Recommended placements &amp; interventions</h2>
      <div className="sc-placements-grid">
        {vm.placements.map((p) => {
          const Icon = ICON_MAP[p.icon] ?? Sprout;
          return (
            <div key={p.title} className="sc-placement-item">
              <div className="sc-placement-icon"><Icon size={16} aria-hidden="true" /></div>
              <strong>{p.title}</strong>
              <span className="sc-placement-zone">{p.zone}</span>
              <p>{p.note}</p>
            </div>
          );
        })}
      </div>
      <div className="sc-placements-footer">
        <button className="outlined-button" type="button"><Plus size={13} /> Add placement</button>
        <button className="outlined-button" type="button"><Download size={13} /> Export report</button>
      </div>
    </SurfaceCard>
  );
}

/* ── Design alignment ────────────────────────────────────────────────────── */

const STATUS_ICON = {
  done:        { Icon: CheckCircle2, color: "var(--olos-green)" },
  "in-progress": { Icon: Clock,       color: "var(--olos-gold-bright)" },
  pending:     { Icon: Circle,       color: "var(--olos-dim)" },
};

function DesignAlignmentCard() {
  return (
    <SurfaceCard className="sc-alignment-card">
      <h3>Design alignment</h3>
      {vm.designAlignment.map((item) => {
        const { Icon, color } = STATUS_ICON[item.status] ?? STATUS_ICON.pending;
        return (
          <div key={item.label} className="sc-alignment-row">
            <Icon size={13} aria-hidden="true" style={{ color }} />
            <span>{item.label}</span>
          </div>
        );
      })}
    </SurfaceCard>
  );
}

/* ── Priority actions ────────────────────────────────────────────────────── */

function PriorityActionsCard() {
  return (
    <SurfaceCard className="sc-priority-card">
      <h3>Priority actions</h3>
      {vm.priorityActions.map((action, i) => (
        <div key={action} className="sc-priority-row">
          <b>{i + 1}</b>
          <span>{action}</span>
        </div>
      ))}
      <Link to="/observe/sectors-zones" className="outlined-button sc-back-btn">
        <ArrowLeft size={13} /> Back to M5 overview
      </Link>
    </SurfaceCard>
  );
}
