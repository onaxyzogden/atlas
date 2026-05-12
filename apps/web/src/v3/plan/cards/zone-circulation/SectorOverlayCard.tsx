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
 * Wind / downslope are read-only (derived live from climate /
 * elevation layers); fire / view / noise are editable via 8-point
 * compass toggles plus per-sector arc-width sliders (5–90° half-width,
 * default 30/30/25), and persist per-project through `sectorStore`. A
 * wildfire often arrives across a 60–80° arc; a borrowed view through
 * a saddle may be a 10° aperture — getting the arc right matters for
 * windbreak length and firebreak placement, not just the bearing. The
 * intent is steward-awareness: the same site-data the rest of the
 * Plan stage already pulls is laid out radially so it can be reasoned
 * against zone polygons.
 *
 * Sources: Mollison B. *Permaculture Designer's Manual* ch.3 (sectors);
 * OSU PDC Week 2 (Sectors & Zones).
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useSiteData, getLayerSummary } from '../../../../store/siteDataStore.js';
import { useSectorStore } from '../../../../store/sectorStore.js';
import {
  useExternalForcesStore,
  type SectorType,
} from '../../../../store/externalForcesStore.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

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
  /** Bearing in degrees from N (0 = N, 90 = E). */
  bearingDeg: number;
  /** Half-width of the wedge in degrees. */
  halfWidth: number;
  /** Visual fill colour. */
  fill: string;
  /** Visual stroke colour. */
  stroke: string;
  /** Label drawn on the wedge. */
  label: string;
  /** Observe-sourced wedges render with a dashed stroke — read-only ref. */
  dashed?: boolean;
}

/** Type-specific palette for Observe-authored sector arrows. Mirrors the
 *  hand-tuned hues already used for the Plan compass entries (fire = red,
 *  view = gold, noise = violet) and extends with new ones for sun / wildlife. */
const OBSERVE_SECTOR_STYLE: Record<SectorType, { fill: string; stroke: string; label: string }> = {
  sun_summer:      { fill: 'rgba(240,170,80,0.22)',  stroke: 'rgba(240,170,80,0.85)',  label: 'sun (summer)' },
  sun_winter:      { fill: 'rgba(220,140,60,0.20)',  stroke: 'rgba(220,140,60,0.80)',  label: 'sun (winter)' },
  wind_prevailing: { fill: 'rgba(120,180,210,0.22)', stroke: 'rgba(120,180,210,0.85)', label: 'wind' },
  wind_storm:      { fill: 'rgba(90,130,200,0.22)',  stroke: 'rgba(90,130,200,0.85)',  label: 'storm wind' },
  fire:            { fill: 'rgba(220,90,60,0.22)',   stroke: 'rgba(220,90,60,0.85)',   label: 'fire' },
  noise:           { fill: 'rgba(160,140,200,0.20)', stroke: 'rgba(180,160,220,0.80)', label: 'noise' },
  wildlife:        { fill: 'rgba(120,180,120,0.22)', stroke: 'rgba(140,200,140,0.85)', label: 'wildlife' },
  view:            { fill: 'rgba(200,180,90,0.20)',  stroke: 'rgba(220,200,110,0.85)', label: 'view' },
};

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

  // Editable fire / view / noise sectors persist via sectorStore — the
  // steward's read of fire approach / view aperture / noise source is a
  // site-specific Holmgren-P1 *Observe* note that should survive reload.
  const byProject = useSectorStore((s) => s.byProject);
  const setSector = useSectorStore((s) => s.setSector);
  const setSectorHalfWidth = useSectorStore((s) => s.setSectorHalfWidth);
  const projectSectors = useMemo(
    () => byProject[project.id] ?? {},
    [byProject, project.id],
  );
  const fireDir = projectSectors.fire ?? null;
  const viewDir = projectSectors.view ?? null;
  const noiseDir = projectSectors.noise ?? null;
  // Defaults preserve prior visual behaviour (30° / 30° / 25°) for any
  // existing project that hasn't tuned its arc widths.
  const FIRE_DEFAULT = 30;
  const VIEW_DEFAULT = 30;
  const NOISE_DEFAULT = 25;
  const fireHalf = projectSectors.fireHalfWidth ?? FIRE_DEFAULT;
  const viewHalf = projectSectors.viewHalfWidth ?? VIEW_DEFAULT;
  const noiseHalf = projectSectors.noiseHalfWidth ?? NOISE_DEFAULT;
  const setFireDir = (c: Compass | null) => setSector(project.id, 'fire', c);
  const setViewDir = (c: Compass | null) => setSector(project.id, 'view', c);
  const setNoiseDir = (c: Compass | null) => setSector(project.id, 'noise', c);

  const W = 360;
  const H = 360;
  const cx = W / 2;
  const cy = H / 2;
  const R = 150;

  // Observe-authored sector arrows for this project — read-only reference.
  // Drawing remains in Observe; here we only render so the steward can reason
  // about zone polygons against the sectors they already mapped.
  const observeSectors = useExternalForcesStore((s) => s.sectors);
  const projectObserveSectors = useMemo(
    () => observeSectors.filter((s) => s.projectId === project.id),
    [observeSectors, project.id],
  );

  const sectors: SectorPoly[] = [];
  if (windDir) {
    sectors.push({
      bearingDeg: BEARING[windDir],
      halfWidth: 22.5,
      fill: 'rgba(120,180,210,0.28)',
      stroke: 'rgba(120,180,210,0.85)',
      label: `wind ← ${windDir}`,
    });
  }
  if (downslope) {
    sectors.push({
      bearingDeg: BEARING[downslope],
      halfWidth: 18,
      fill: 'rgba(80,140,180,0.22)',
      stroke: 'rgba(80,140,180,0.7)',
      label: `water → ${downslope}`,
    });
  }
  if (fireDir) {
    sectors.push({
      bearingDeg: BEARING[fireDir],
      halfWidth: fireHalf,
      fill: 'rgba(220,90,60,0.28)',
      stroke: 'rgba(220,90,60,0.85)',
      label: `fire ← ${fireDir}`,
    });
  }
  if (viewDir) {
    sectors.push({
      bearingDeg: BEARING[viewDir],
      halfWidth: viewHalf,
      fill: 'rgba(200,180,90,0.22)',
      stroke: 'rgba(220,200,110,0.85)',
      label: `view → ${viewDir}`,
    });
  }
  if (noiseDir) {
    sectors.push({
      bearingDeg: BEARING[noiseDir],
      halfWidth: noiseHalf,
      fill: 'rgba(160,140,200,0.22)',
      stroke: 'rgba(180,160,220,0.8)',
      label: `noise ← ${noiseDir}`,
    });
  }
  // Observe-authored arrows render last so their dashed stroke sits on top
  // of any Plan compass wedges sharing the same bearing.
  for (const s of projectObserveSectors) {
    const style = OBSERVE_SECTOR_STYLE[s.type];
    sectors.push({
      bearingDeg: s.bearingDeg,
      halfWidth: Math.max(2.5, s.arcDeg / 2),
      fill: style.fill,
      stroke: style.stroke,
      label: `${style.label} ·obs`,
      dashed: true,
    });
  }

  function CompassPicker({
    label, value, setValue, halfWidth, defaultHalfWidth, sectorKey,
  }: {
    label: string;
    value: Compass | null;
    setValue: (c: Compass | null) => void;
    halfWidth: number;
    defaultHalfWidth: number;
    sectorKey: 'fire' | 'view' | 'noise';
  }) {
    const isCustom = halfWidth !== defaultHalfWidth;
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
        <div
          style={{
            marginTop: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            opacity: value ? 1 : 0.45,
          }}
        >
          <span style={{ fontSize: 11, opacity: 0.7, minWidth: 70 }}>
            arc {halfWidth * 2}°
          </span>
          <input
            type="range"
            min={5}
            max={90}
            step={5}
            value={halfWidth}
            disabled={!value}
            onChange={(e) =>
              setSectorHalfWidth(project.id, sectorKey, Number(e.target.value))
            }
            style={{ flex: 1 }}
          />
          {isCustom && value && (
            <button
              type="button"
              onClick={() => setSectorHalfWidth(project.id, sectorKey, null)}
              style={{
                padding: '1px 8px',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent',
                color: 'inherit',
                font: 'inherit',
                fontSize: '0.75em',
                cursor: 'pointer',
                opacity: 0.7,
              }}
              title="Revert to default arc width"
            >
              reset
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 3 · Zones</span>
        <h1 className={styles.title}>Sector overlay</h1>
        <p className={styles.lede}>
          Sectors are <em>radial influences</em> acting on the site — wind,
          fire, view, noise — that complement zones (which radiate from the
          home centre by visit-frequency). Wind comes from the climate layer
          when fetched; the downslope arrow tracks the elevation aspect.
          Fire / view / noise are editable below: tap a compass direction to
          toggle. Sector arrows authored in Observe (`sectors-zones` module)
          render here as dashed wedges — read-only reference, edit them on
          the Observe stage. Mollison ch.3 + OSU PDC Week 2.
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
          {sectors.map((s, i) => (
            <path
              key={`${s.label}-${i}`}
              d={wedgePath(cx, cy, R, s.bearingDeg, s.halfWidth)}
              fill={s.fill}
              stroke={s.stroke}
              strokeWidth={1}
              strokeDasharray={s.dashed ? '4 3' : undefined}
            />
          ))}
          {/* sector labels — placed at radius * 0.7 in their bearing */}
          {sectors.map((s, i) => {
            const t = (s.bearingDeg * Math.PI) / 180;
            const lx = cx + Math.sin(t) * R * 0.7;
            const ly = cy - Math.cos(t) * R * 0.7;
            return (
              <text key={`${s.label}-${i}-lbl`}
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
        <div className={styles.statRow}>
          <span>Observe sectors (read-only)</span>
          <span>
            {projectObserveSectors.length > 0
              ? `${projectObserveSectors.length} authored — edit in Observe › sectors-zones`
              : 'none authored — draw arrows in Observe › sectors-zones'}
          </span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Editable sectors</h2>
        <p className={styles.empty} style={{ textAlign: 'left', padding: '4px 0 8px' }}>
          Tap a direction to mark where the sector enters the site. Tap
          again to clear. Drag the arc slider to widen or narrow the
          wedge (5–90° half-width). Selections persist per project.
        </p>
        <div className={styles.grid}>
          <CompassPicker
            label="Fire (← incoming)"
            value={fireDir}
            setValue={setFireDir}
            halfWidth={fireHalf}
            defaultHalfWidth={FIRE_DEFAULT}
            sectorKey="fire"
          />
          <CompassPicker
            label="View (→ outgoing)"
            value={viewDir}
            setValue={setViewDir}
            halfWidth={viewHalf}
            defaultHalfWidth={VIEW_DEFAULT}
            sectorKey="view"
          />
          <CompassPicker
            label="Noise (← incoming)"
            value={noiseDir}
            setValue={setNoiseDir}
            halfWidth={noiseHalf}
            defaultHalfWidth={NOISE_DEFAULT}
            sectorKey="noise"
          />
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
