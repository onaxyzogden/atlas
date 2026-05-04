import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  Download,
  Info,
  Layers,
  Leaf,
  Map,
  MapPin,
  Sprout,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  AppShell,
  QaOverlay,
  SurfaceCard,
  TopStageBar,
} from "../components/index.js";
import { observeNav } from "../data/navConfig.js";
import { screenCatalog } from "../screenCatalog.js";
import { cartographicDetailPage as vm } from "../data/builtin-sample.js";

const metadata = screenCatalog.find(
  (s) => s.route === "/observe/sectors-zones/cartographic-detail"
);

const ICON_MAP = {
  compass: Compass, map: Map, sprout: Sprout, mapPin: MapPin,
  check: CheckCircle2, leaf: Leaf, alert: AlertTriangle,
};

const TONE_CSS = {
  gold:  "var(--olos-gold-bright)",
  green: "var(--olos-green)",
  cream: "var(--olos-cream)",
};

export function CartographicDetailPage() {
  return (
    <AppShell navConfig={observeNav}>
      <div className="detail-page cd-page">
        <TopStageBar stage="Stage 1 of 3" module="Roots & Diagnosis — Module 5" />
        <div className="cd-breadcrumb">
          <Link to="/observe/sectors-zones" className="cd-back-link">
            <ArrowLeft size={13} /> Back to Sectors, Microclimates &amp; Zones
          </Link>
        </div>
        <header className="cd-header">
          <h1>Cartographic detail</h1>
          <p>{vm.hero.copy}</p>
        </header>
        <KpiStrip />
        <div className="cd-body">
          <div className="cd-map-col">
            <MapPanel />
            <LegendPanel />
          </div>
          <aside className="cd-sidebar">
            <DetectedPatternsCard />
            <NextActionsCard />
            <MapInfoCard />
          </aside>
        </div>
      </div>
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
    <div className="cd-kpi-strip">
      {vm.kpis.map((k) => {
        const Icon = ICON_MAP[k.iconKey] ?? Compass;
        const col = TONE_CSS[k.tone] ?? "var(--olos-cream)";
        return (
          <SurfaceCard key={k.label} className="cd-kpi-card">
            <Icon size={15} aria-hidden="true" style={{ color: col }} />
            <span>{k.label}</span>
            <strong style={{ color: col }}>{k.value}</strong>
            <small>{k.note}</small>
          </SurfaceCard>
        );
      })}
    </div>
  );
}

/* ── Map panel (layers list + large SVG) ─────────────────────────────────── */

function MapPanel() {
  return (
    <SurfaceCard className="cd-map-panel">
      <div className="cd-map-inner">
        <LayersPanel />
        <div className="cd-map-viewport">
          <CartographicMapSvg />
          <div className="cd-map-controls">
            <button className="cd-map-btn" type="button" title="Open map fullscreen">⤢</button>
            <button className="cd-map-btn" type="button" title="Zoom in">+</button>
            <button className="cd-map-btn" type="button" title="Zoom out">−</button>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}

function LayersPanel() {
  return (
    <div className="cd-layers-panel">
      <h3><Layers size={12} aria-hidden="true" /> Map layers</h3>
      {vm.mapLayers.map((layer) => (
        <div key={layer.key} className="cd-layer-item">
          <div className="cd-layer-row">
            <span className="cd-layer-dot" style={{ background: layer.color, opacity: layer.active ? 1 : 0.35 }} />
            <span className={`cd-layer-label ${layer.active ? "" : "cd-layer-inactive"}`}>{layer.label}</span>
            <div className={`cd-layer-toggle ${layer.active ? "active" : ""}`} aria-hidden="true">
              <div />
            </div>
          </div>
          {layer.active && layer.sub.length > 0 && (
            <ul className="cd-layer-sub">
              {layer.sub.map((s) => <li key={s}>{s}</li>)}
            </ul>
          )}
        </div>
      ))}
      <button className="cd-edit-layers" type="button">Edit layers <ArrowRight size={11} /></button>
    </div>
  );
}

/* ── Large cartographic SVG ──────────────────────────────────────────────── */

function CartographicMapSvg() {
  /* Viewport 620×380. Site is a landscape ellipse offset slightly right.   */
  const W = 620;
  const H = 380;
  const cx = 310;   // map centre x
  const cy = 192;   // map centre y

  /* Site boundary */
  const sRx = 240;
  const sRy = 148;

  /* Zone shapes — nested ellipses offset toward SE (prime solar, Zone 1) */
  const zones = [
    /* Zone 5 — wilderness, fills most of the site */
    { id: "5", rx: 220, ry: 132, ox:  -8, oy:  2,  color: "#3a5a2a", fillOp: 0.25, strokeOp: 0.5  },
    /* Zone 4 — semi-wild */
    { id: "4", rx: 175, ry: 105, ox:  -4, oy:  6,  color: "#8a7a3a", fillOp: 0.28, strokeOp: 0.55 },
    /* Zone 3 — orchard */
    { id: "3", rx: 128, ry:  78, ox:  10, oy:  5,  color: "#6ab4d4", fillOp: 0.28, strokeOp: 0.6  },
    /* Zone 2 — productive */
    { id: "2", rx:  85, ry:  55, ox:  22, oy: -2,  color: "#7aaa30", fillOp: 0.32, strokeOp: 0.65 },
    /* Zone 1 — home, smallest + most SE */
    { id: "1", rx:  44, ry:  32, ox:  40, oy: -5,  color: "#c9902a", fillOp: 0.55, strokeOp: 0.8  },
  ];

  /* 8 sector spokes from centre */
  const sliceAngle = (2 * Math.PI) / 8;
  const spokeR = 258;
  const spokeColors = ["#7b7066","#c9902a","#a5c736","#c9902a","#a5c736","#6ab4d4","#6ab4d4","#7b7066"];

  /* Cardinal direction labels */
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  const labelR = 265;

  /* Feature annotations */
  const annotations = [
    { x: cx + 38,  y: cy - 60,  text: "Spring & summer sun", dir: "up"   },
    { x: cx - 110, y: cy + 15,  text: "Shadowing area",       dir: "left" },
    { x: cx + 5,   y: cy + 110, text: "Black water / drainage",dir: "down" },
    { x: cx - 55,  y: cy - 95,  text: "Prevailing wind",      dir: "left" },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="cd-map-svg" role="img" aria-label="Cartographic zone and sector map">
      <defs>
        <radialGradient id="mapBg" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#1a2e18" />
          <stop offset="100%" stopColor="#0a1409" />
        </radialGradient>
        <clipPath id="siteClipMap">
          <ellipse cx={cx} cy={cy} rx={sRx} ry={sRy} />
        </clipPath>
        {/* Soft glow for zone 1 */}
        <radialGradient id="zone1Glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#c9902a" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#c9902a" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Page background */}
      <rect width={W} height={H} fill="#070e06" />

      {/* Site terrain fill */}
      <ellipse cx={cx} cy={cy} rx={sRx} ry={sRy} fill="url(#mapBg)" />

      {/* Terrain hatching texture */}
      <g clipPath="url(#siteClipMap)" opacity="0.1">
        {Array.from({ length: 34 }).map((_, i) => (
          <line key={`h${i}`} x1={i * 20 - 40} y1="0" x2={i * 20 + 80} y2={H}
            stroke="#a5c736" strokeWidth="0.5" />
        ))}
        {Array.from({ length: 22 }).map((_, i) => (
          <line key={`v${i}`} x1="0" y1={i * 20 - 10} x2={W} y2={i * 20 + 40}
            stroke="#c9902a" strokeWidth="0.3" />
        ))}
      </g>

      {/* Zone fills — outermost first */}
      {zones.map((z) => (
        <ellipse key={`zf-${z.id}`}
          cx={cx + z.ox} cy={cy + z.oy} rx={z.rx} ry={z.ry}
          fill={z.color} fillOpacity={z.fillOp}
          stroke={z.color} strokeOpacity={z.strokeOp} strokeWidth="1.2" />
      ))}

      {/* Zone 1 ambient glow */}
      <ellipse cx={cx + 40} cy={cy - 5} rx={60} ry={44}
        fill="url(#zone1Glow)" />

      {/* Sector spoke lines */}
      {dirs.map((_, i) => {
        const angle = i * sliceAngle - Math.PI / 2;
        const ex = cx + spokeR * Math.cos(angle);
        const ey = cy + spokeR * Math.sin(angle);
        return (
          <line key={`sp${i}`} x1={cx} y1={cy} x2={ex} y2={ey}
            stroke={spokeColors[i]} strokeOpacity="0.28" strokeWidth="0.8"
            strokeDasharray="4 4" />
        );
      })}

      {/* Site boundary outline */}
      <ellipse cx={cx} cy={cy} rx={sRx} ry={sRy}
        fill="none" stroke="rgba(168,125,43,0.65)" strokeWidth="1.5" />

      {/* Zone border highlights (inner stroke only on zones 1–3) */}
      {zones.slice(2).map((z) => (
        <ellipse key={`zb-${z.id}`}
          cx={cx + z.ox} cy={cy + z.oy} rx={z.rx} ry={z.ry}
          fill="none" stroke={z.color} strokeOpacity={z.strokeOp + 0.15}
          strokeWidth="1.5" strokeDasharray="5 3" />
      ))}

      {/* Zone number labels */}
      {zones.map((z) => {
        const lx = cx + z.ox + z.rx * 0.45;
        const ly = cy + z.oy - z.ry * 0.15;
        return (
          <g key={`zl-${z.id}`}>
            <circle cx={lx} cy={ly} r="9" fill={z.color} fillOpacity="0.75" />
            <text x={lx} y={ly + 4} textAnchor="middle"
              fontSize="9" fontWeight="800" fill="#fff" fillOpacity="0.9"
              fontFamily="Inter,sans-serif">{z.id}</text>
          </g>
        );
      })}

      {/* Direction labels around boundary */}
      {dirs.map((d, i) => {
        const angle = i * sliceAngle - Math.PI / 2;
        const lx = cx + labelR * Math.cos(angle);
        const ly = cy + labelR * Math.sin(angle);
        const isN = d === "N";
        return (
          <text key={`dl-${d}`} x={lx} y={ly + 4}
            textAnchor="middle" fontSize={isN ? "11" : "9"}
            fontWeight={isN ? "900" : "700"}
            fill={isN ? "var(--olos-gold)" : spokeColors[i]}
            fillOpacity={isN ? 1 : 0.8}
            fontFamily="Inter,sans-serif" letterSpacing="0.05em">
            {d}
          </text>
        );
      })}

      {/* Wind / directional arrows (SW wind + SE solar) */}
      {[
        { fromAngle: 225, len: 55, color: "#6ab4d4", label: "Prevailing\nwind" },
        { fromAngle: 135, len: 48, color: "#c9902a", label: "Prime solar" },
      ].map(({ fromAngle, len, color }, idx) => {
        const rad = (fromAngle * Math.PI) / 180 - Math.PI / 2;
        const startR = sRy - 10;
        const sx = cx + startR * Math.cos(rad);
        const sy = cy + startR * Math.sin(rad);
        const ex = cx + (startR - len) * Math.cos(rad);
        const ey = cy + (startR - len) * Math.sin(rad);
        const ha = 0.3;
        const hl = 8;
        return (
          <g key={idx}>
            <line x1={sx} y1={sy} x2={ex} y2={ey}
              stroke={color} strokeOpacity="0.7" strokeWidth="1.8" strokeLinecap="round" />
            <polyline
              points={`${ex - hl * Math.cos(rad - ha)},${ey - hl * Math.sin(rad - ha)} ${ex},${ey} ${ex - hl * Math.cos(rad + ha)},${ey - hl * Math.sin(rad + ha)}`}
              fill="none" stroke={color} strokeOpacity="0.7" strokeWidth="1.8"
              strokeLinejoin="round" strokeLinecap="round" />
          </g>
        );
      })}

      {/* Feature annotations */}
      {annotations.map((ann) => (
        <g key={ann.text}>
          <line
            x1={ann.x} y1={ann.y}
            x2={ann.x + (ann.dir === "left" ? -16 : ann.dir === "right" ? 16 : 0)}
            y2={ann.y + (ann.dir === "up" ? -14 : ann.dir === "down" ? 14 : 0)}
            stroke="rgba(168,125,43,0.5)" strokeWidth="0.8" />
          <text x={ann.x + (ann.dir === "left" ? -18 : ann.dir === "right" ? 18 : 0)}
            y={ann.y + (ann.dir === "up" ? -18 : ann.dir === "down" ? 18 : 4)}
            textAnchor={ann.dir === "left" ? "end" : ann.dir === "right" ? "start" : "middle"}
            fontSize="7.5" fill="rgba(243,226,200,0.55)" fontFamily="Inter,sans-serif">
            {ann.text}
          </text>
        </g>
      ))}

      {/* N compass triangle */}
      <polygon points={`${cx},${cy - sRy - 5} ${cx - 5},${cy - sRy + 8} ${cx + 5},${cy - sRy + 8}`}
        fill="var(--olos-gold)" fillOpacity="0.75" />

      {/* Scale bar */}
      <g transform={`translate(${cx - sRx + 8}, ${cy + sRy - 18})`}>
        <rect width="60" height="4" rx="1" fill="rgba(168,125,43,0.6)" />
        <rect width="30" height="4" rx="0" fill="rgba(168,125,43,0.25)" />
        <text x="0"  y="13" fontSize="7" fill="rgba(243,226,200,0.5)" fontFamily="Inter,sans-serif">0</text>
        <text x="52" y="13" fontSize="7" fill="rgba(243,226,200,0.5)" fontFamily="Inter,sans-serif">50m</text>
      </g>

      {/* Centre point */}
      <circle cx={cx} cy={cy} r="4" fill="rgba(10,18,8,0.9)"
        stroke="rgba(168,125,43,0.6)" strokeWidth="1" />
      <circle cx={cx} cy={cy} r="1.5" fill="var(--olos-gold-bright)" />
    </svg>
  );
}

/* ── Legend ──────────────────────────────────────────────────────────────── */

function LegendPanel() {
  const legendGroups = [
    { label: "Sectors",       items: [["#b7832d","S sector"],["#6ab4d4","Wind sector"],["#a5c736","Eco sector"]] },
    { label: "Microclimates", items: [["#6ab4d4","Frost pocket"],["#c9902a","Solar trap"],["#8dba7c","Wind shadow"]] },
    { label: "Zones",         items: [["#c9902a","Zone 1"],["#7aaa30","Zone 2"],["#6ab4d4","Zone 3"],["#8a7a3a","Zone 4"],["#3a5a2a","Zone 5"]] },
    { label: "Circulation",   items: [["#e8c87a","Paths & tracks"]] },
    { label: "Hydrology",     items: [["#4a9ad4","Streams"],["#2a6a9a","Ponds"]] },
  ];
  return (
    <SurfaceCard className="cd-legend-panel">
      <h3>Legend</h3>
      <div className="cd-legend-grid">
        {legendGroups.map((group) => (
          <div key={group.label} className="cd-legend-group">
            <span className="cd-legend-group-label">{group.label}</span>
            {group.items.map(([color, label]) => (
              <div key={label} className="cd-legend-item">
                <i style={{ background: color }} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </SurfaceCard>
  );
}

/* ── Sidebar panels ──────────────────────────────────────────────────────── */

function DetectedPatternsCard() {
  return (
    <SurfaceCard className="cd-sidebar-card">
      <h2><Info size={13} /> Detected patterns</h2>
      {vm.detectedPatterns.map((p) => (
        <div key={p.title} className="cd-pattern-item">
          <strong>{p.title}</strong>
          <p>{p.body}</p>
        </div>
      ))}
      <button className="outlined-button cd-view-all" type="button">
        View all detected patterns <ArrowRight size={12} />
      </button>
    </SurfaceCard>
  );
}

function NextActionsCard() {
  return (
    <SurfaceCard className="cd-sidebar-card">
      <h2>Recommended next actions</h2>
      {vm.nextActions.map((action, i) => (
        <div key={action} className="cd-action-row">
          <b>{i + 1}</b>
          <span>{action}</span>
        </div>
      ))}
      <button className="outlined-button cd-view-all" type="button">
        View assisted recommendations <ArrowRight size={12} />
      </button>
    </SurfaceCard>
  );
}

function MapInfoCard() {
  const { mapInfo } = vm;
  return (
    <SurfaceCard className="cd-sidebar-card cd-map-info-card">
      <h2>Map information</h2>
      <dl className="cd-map-info-dl">
        <dt>Area</dt>           <dd>{mapInfo.area}</dd>
        <dt>Projection</dt>     <dd>{mapInfo.projection}</dd>
        <dt>Map date</dt>       <dd>{mapInfo.mapDate}</dd>
        <dt>Data source</dt>    <dd>{mapInfo.dataSource}</dd>
      </dl>
      <button className="green-button cd-export-btn" type="button">
        <Download size={13} /> Export page
      </button>
    </SurfaceCard>
  );
}
