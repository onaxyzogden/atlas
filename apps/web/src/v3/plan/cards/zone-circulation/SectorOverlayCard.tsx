/**
 * SectorOverlayCard — Plan Module 3 (Zones), card 4/4.
 *
 * Per Permaculture Scholar follow-up
 * (`wiki/decisions/2026-05-07-atlas-plan-zones-scholar-build-fresh.md`):
 * Mollison and the OSU PDC pair zones with *sectors* — radial influences
 * acting on the site (sun, wind, fire, view, noise). Module 6 covers sun
 * via the cross-section; this card covers the remaining sectors that
 * shape zone placement: prevailing wind (from the climate layer
 * `prevailing_wind`) and an editable fire / view / noise compass.
 *
 * v1 is read-only for the wind sector and editable for fire/view/noise
 * via simple compass-direction toggles. The intent is steward-awareness:
 * the same site-data the rest of the Plan stage already pulls is now
 * laid out radially so it can be reasoned against zone polygons.
 *
 * Sources: Mollison B. *Permaculture Designer's Manual* ch.3 (sectors);
 * OSU PDC Week 2 (Sectors & Zones).
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../../store/siteDataStore.js';
import styles from '../../../../features/plan/planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

type Compass =
  | 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

const COMPASS_ORDER: Compass[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const BEARING: Record<Compass, number> = {
  N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
};

/**
 * Reduce a free-form prevailing-wind label like "W-SW" or "WSW" or "SW"
 * to the closest 8-point compass key. Falls back to SW (typical NA
 * agricultural prevailing) when nothing parses.
 */
function parseCompass(s: string | null | undefined): Compass | null {
  if (!s) return null;
  const u = s.toUpperCase().replace(/[^NESW-]/g, '');
  if (!u) return null;
  // Direct match
  if (COMPASS_ORDER.includes(u as Compass)) return u as Compass;
  // "W-SW" / "WSW" → take the first 1–2 letter token after the dash, or
  // try the whole thing minus dashes.
  const tokens = u.split('-').filter(Boolean);
  for (const t of tokens) {
    if (COMPASS_ORDER.includes(t as Compass)) return t as Compass;
  }
  const flat = u.replace(/-/g, '');
  if (COMPASS_ORDER.includes(flat as Compass)) return flat as Compass;
  // 3-letter intermediates like "WSW" → average of W (270) and SW (225) ≈ 247.5° ≈ WSW.
  // Quantise to nearest 45°.
  const map3: Record<string, Compass> = {
    NNE: 'NE', ENE: 'NE', ESE: 'SE', SSE: 'SE',
    SSW: 'SW', WSW: 'SW', WNW: 'NW', NNW: 'NW',
  };
  if (map3[flat]) return map3[flat]!;
  return null;
}

interface SectorPoly {
  /** Compass center direction. */
  dir: Compass;
  /** Half-width of the wedge in degrees. */
  halfWidth: number;
  /** Visual fill colour. */
  fill: string;
  /** Visual stroke colour. */
  stroke: string;
  /** Label drawn on the wedge. */
  label: string;
}

/** Render a wedge as an SVG `<path>` `d` string. cx/cy = compass centre,
 *  r = outer radius. Bearing 0 = N (up); SVG y-down. */
function wedgePath(cx: number, cy: number, r: number, bearingDeg: number, halfWidthDeg: number): string {
  const b1 = ((bearingDeg - halfWidthDeg) * Math.PI) / 180;
  const b2 = ((bearingDeg + halfWidthDeg) * Math.PI) / 180;
  const x1 = cx + Math.sin(b1) * r;
  const y1 = cy - Math.cos(b1) * r;
  const x2 = cx + Math.sin(b2) * r;
  const y2 = cy - Math.cos(b2) * r;
  const largeArc = halfWidthDeg * 2 > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

export default function SectorOverlayCard({ project }: Props) {
  const siteData = useSiteData(project.id);
  const climate = useMemo(() => {
    if (!siteData) return null;
    return getLayerSummary<{ prevailing_wind?: string }>(siteData, 'climate');
  }, [siteData]);
  const elev = useMemo(() => {
    if (!siteData) return null;
    return getLayerSummary<{ predominant_aspect?: string }>(siteData, 'elevation');
  }, [siteData]);

  const windDir = parseCompass(climate?.prevailing_wind);
  const downslope = parseCompass(elev?.predominant_aspect);

  // Editable fire / view / noise sectors. v1 holds them in component
  // state — persistence is a follow-up (would need a `sectorStore`).
  const [fireDir, setFireDir] = useState<Compass | null>(null);
  const [viewDir, setViewDir] = useState<Compass | null>(null);
  const [noiseDir, setNoiseDir] = useState<Compass | null>(null);

  const W = 360;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;
  const R = 150;

  const sectors: SectorPoly[] = [];
  if (windDir) {
    sectors.push({
      dir: windDir,
      halfWidth: 22.5,
      fill: 'rgba(120,180,210,0.28)',
      stroke: 'rgba(120,180,210,0.85)',
      label: `wind ← ${windDir}`,
    });
  }
  if (downslope) {
    sectors.push({
      dir: downslope,
      halfWidth: 18,
      fill: 'rgba(80,140,180,0.22)',
      stroke: 'rgba(80,140,180,0.7)',
      label: `water → ${downslope}`,
    });
  }
  if (fireDir) {
    sectors.push({
      dir: fireDir,
      halfWidth: 30,
      fill: 'rgba(220,90,60,0.28)',
      stroke: 'rgba(220,90,60,0.85)',
      label: `fire ← ${fireDir}`,
    });
  }
  if (viewDir) {
    sectors.push({
      dir: viewDir,
      halfWidth: 30,
      fill: 'rgba(200,180,90,0.22)',
      stroke: 'rgba(220,200,110,0.85)',
      label: `view → ${viewDir}`,
    });
  }
  if (noiseDir) {
    sectors.push({
      dir: noiseDir,
      halfWidth: 25,
      fill: 'rgba(160,140,200,0.22)',
      stroke: 'rgba(180,160,220,0.8)',
      label: `noise ← ${noiseDir}`,
    });
  }

  function CompassPicker({
    label, value, setValue,
  }: { label: string; value: Compass | null; setValue: (c: Compass | null) => void }) {
    return (
      <div className={styles.field} style={{ flex: 1, minWidth: 220 }}>
        <span>{label}</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {COMPASS_ORDER.map((c) => {
            const active = value === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setValue(active ? null : c)}
                style={{
                  padding: '2px 10px',
                  borderRadius: 12,
                  border: active
                    ? '1px solid rgba(220,160,90,0.8)'
                    : '1px solid rgba(255,255,255,0.15)',
                  background: active
                    ? 'rgba(220,160,90,0.18)'
                    : 'transparent',
                  color: 'inherit',
                  font: 'inherit',
                  fontSize: '0.85em',
                  cursor: 'pointer',
                }}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 3 · Zones</span>
        <h1 className={styles.title}>Sector overlay</h1>
        <p className={styles.lede}>
          Sectors are <em>radial influences</em> acting on the site — wind,
          fire, view, noise — that complement zones (which radiate from the
          home centre by visit-frequency). Wind comes from the climate layer
          when fetched; the downslope arrow tracks the elevation aspect.
          Fire / view / noise are editable below: tap a compass direction to
          toggle. Mollison ch.3 + OSU PDC Week 2.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Compass diagram</h2>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{
            width: '100%',
            height: 'auto',
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
          }}
        >
          {/* compass ring */}
          <circle cx={cx} cy={cy} r={R}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />
          <circle cx={cx} cy={cy} r={R * 0.66}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
          <circle cx={cx} cy={cy} r={R * 0.33}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
          {/* cardinal lines */}
          {[0, 90, 180, 270].map((b) => {
            const t = (b * Math.PI) / 180;
            const x = cx + Math.sin(t) * R;
            const y = cy - Math.cos(t) * R;
            return (
              <line
                key={b}
                x1={cx} y1={cy} x2={x} y2={y}
                stroke="rgba(255,255,255,0.08)"
                strokeDasharray="3 3"
              />
            );
          })}
          {/* cardinal labels */}
          <text x={cx} y={cy - R - 6} fontSize={11} textAnchor="middle"
            fill="rgba(232,220,200,0.8)">N</text>
          <text x={cx + R + 12} y={cy + 4} fontSize={11} textAnchor="middle"
            fill="rgba(232,220,200,0.8)">E</text>
          <text x={cx} y={cy + R + 14} fontSize={11} textAnchor="middle"
            fill="rgba(232,220,200,0.8)">S</text>
          <text x={cx - R - 12} y={cy + 4} fontSize={11} textAnchor="middle"
            fill="rgba(232,220,200,0.8)">W</text>
          {/* sectors */}
          {sectors.map((s) => (
            <path
              key={s.label}
              d={wedgePath(cx, cy, R, BEARING[s.dir], s.halfWidth)}
              fill={s.fill}
              stroke={s.stroke}
              strokeWidth={1}
            />
          ))}
          {/* sector labels — placed at radius * 0.7 in their bearing */}
          {sectors.map((s) => {
            const t = (BEARING[s.dir] * Math.PI) / 180;
            const lx = cx + Math.sin(t) * R * 0.7;
            const ly = cy - Math.cos(t) * R * 0.7;
            return (
              <text key={`${s.label}-lbl`}
                x={lx} y={ly}
                fontSize={10}
                textAnchor="middle"
                fill={s.stroke}
              >{s.label}</text>
            );
          })}
          {/* Centre dot — the home / observation point */}
          <circle cx={cx} cy={cy} r={4} fill="rgba(232,220,200,0.85)" />
        </svg>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Site-data sources</h2>
        <div className={styles.statRow}>
          <span>Prevailing wind (climate layer)</span>
          <span>
            {climate?.prevailing_wind
              ? `${climate.prevailing_wind}${windDir ? ` → ${windDir}` : ''}`
              : 'not fetched — run an Observe site fetch'}
          </span>
        </div>
        <div className={styles.statRow}>
          <span>Downslope aspect (elevation layer)</span>
          <span>
            {elev?.predominant_aspect
              ? `${elev.predominant_aspect}${downslope ? ` → ${downslope}` : ''}`
              : 'not fetched'}
          </span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Editable sectors</h2>
        <p className={styles.empty} style={{ textAlign: 'left', padding: '4px 0 8px' }}>
          Tap a direction to mark where the sector enters the site. Tap
          again to clear. v1 holds these per session — persistence is a
          follow-up.
        </p>
        <div className={styles.grid}>
          <CompassPicker label="Fire (← incoming)" value={fireDir} setValue={setFireDir} />
          <CompassPicker label="View (→ outgoing)" value={viewDir} setValue={setViewDir} />
          <CompassPicker label="Noise (← incoming)" value={noiseDir} setValue={setNoiseDir} />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Why sectors</h2>
        <p className={styles.lede}>
          Mollison: <em>"Zones radiate from the centre — sectors radiate
          from outside. Together they tell you where to put each
          element."</em> A windbreak goes on the windward sector; the
          home faces the view sector; firebreaks intercept the fire
          sector. Without sectors, zones alone leave half the placement
          logic on the table.
        </p>
      </section>
    </div>
  );
}
