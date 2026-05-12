/**
 * SectionAnnotationsCard — Plan Module 6 (Cross-section & Solar Geometry),
 * additive sub-tab landed 2026-05-07 per Permaculture Scholar verdict
 * `wiki/decisions/2026-05-07-atlas-plan-cross-section-scholar-keep-atlas.md`.
 *
 * The verdict (KEEP_ATLAS) flagged four orthodox cross-section overlays
 * Atlas's existing TransectVerticalEditorCard does not surface — all four
 * are bracket-style annotations sitting BELOW the elevation profile,
 * complementary to the vertical-element pins ABOVE it:
 *
 *   1. Microclimate brackets   ("Shady, dry, warm")
 *   2. Succession-stage bands  ("Mid succession (pioneer species)")
 *   3. Slope / elevation deltas ("Slope 22 %", "Δ +6 m")
 *   4. Sector-response callouts ("Wind deflection by evergreens")
 *
 * Per the Scholar: "Sector origins themselves stay on the top-down
 * Sector Compass; this is the section-level *response*."
 *
 * Implementation pivots on the same `Transect` the vertical-editor card
 * uses, persisting brackets in a new optional `sectionAnnotations?` field
 * (no schema-version bump — legacy transects load with it undefined).
 * The card auto-derives the per-bracket slope % from the cached elevation
 * profile so a steward only has to label the bracket, not eyeball the
 * gradient.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useTopographyStore } from '../../../../store/topographyStore.js';
import {
  newAnnotationId,
  type SectionAnnotation,
  type SectionAnnotationKind,
  type Transect,
} from '../../../../store/site-annotations.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const KINDS: Array<{ value: SectionAnnotationKind; label: string; hint: string; color: string }> = [
  {
    value: 'microclimate',
    label: 'Microclimate',
    hint: 'e.g. "Shady, dry, warm" / "Full sun, wet in rainy season"',
    color: 'rgba(220,180,80,0.7)', // amber
  },
  {
    value: 'succession',
    label: 'Succession stage',
    hint: 'e.g. "Early (compacted)" / "Mid (pioneer)" / "Late (climax)"',
    color: 'rgba(140,200,120,0.7)', // green
  },
  {
    value: 'slope',
    label: 'Slope / elevation',
    hint: 'e.g. "Slope 20–25 %" / "Δ +6 m"',
    color: 'rgba(180,140,90,0.7)', // brown
  },
  {
    value: 'sector-response',
    label: 'Sector response',
    hint: 'e.g. "Evergreen wind deflection" / "Swale catches overland flow"',
    color: 'rgba(120,160,220,0.7)', // blue
  },
];

const KIND_INDEX: Record<SectionAnnotationKind, number> = {
  microclimate: 0,
  succession: 1,
  slope: 2,
  'sector-response': 3,
};

/** Sample the cached elevation profile at a given distance (linear interp). */
function sampleProfile(profile: number[] | undefined, totalDist: number, distM: number): number | null {
  if (!profile || profile.length === 0) return null;
  if (totalDist <= 0) return profile[0] ?? null;
  const t = Math.max(0, Math.min(1, distM / totalDist));
  const f = t * (profile.length - 1);
  const i = Math.floor(f);
  const frac = f - i;
  const a = profile[i];
  const b = profile[Math.min(profile.length - 1, i + 1)];
  if (a === undefined || b === undefined) return null;
  return a + (b - a) * frac;
}

/** Derive slope % between two distances along the transect. */
function slopePct(t: Transect, startM: number, endM: number): number | null {
  const total = t.totalDistanceM ?? 0;
  const profile = t.elevationProfileM;
  if (!profile || profile.length < 2 || total <= 0 || endM <= startM) return null;
  const eA = sampleProfile(profile, total, startM);
  const eB = sampleProfile(profile, total, endM);
  if (eA === null || eB === null) return null;
  const run = endM - startM;
  if (run <= 0) return null;
  return ((eB - eA) / run) * 100;
}

export default function SectionAnnotationsCard({ project }: Props) {
  const allTransects = useTopographyStore((s) => s.transects);
  const updateTransect = useTopographyStore((s) => s.updateTransect);

  const transects = useMemo(
    () => allTransects.filter((t) => t.projectId === project.id),
    [allTransects, project.id],
  );

  const [selectedId, setSelectedId] = useState<string>('');
  const selected = useMemo<Transect | undefined>(
    () => transects.find((t) => t.id === selectedId),
    [transects, selectedId],
  );

  const [kind, setKind] = useState<SectionAnnotationKind>('microclimate');
  const [label, setLabel] = useState('');
  const [startM, setStartM] = useState<number>(0);
  const [endM, setEndM] = useState<number>(0);

  const totalDist = selected?.totalDistanceM
    ?? Math.max(1, (selected?.elevationProfileM?.length ?? 1) - 1, 100);

  function addAnnotation() {
    if (!selected) return;
    const trimmed = label.trim();
    if (!trimmed) return;
    const a = Math.max(0, Math.min(totalDist, startM));
    const b = Math.max(a, Math.min(totalDist, endM));
    const next: SectionAnnotation = {
      id: newAnnotationId('sa'),
      kind,
      label: trimmed,
      startM: a,
      endM: b,
    };
    const list = selected.sectionAnnotations ?? [];
    updateTransect(selected.id, { sectionAnnotations: [...list, next] });
    setLabel('');
  }

  function removeAnnotation(id: string) {
    if (!selected) return;
    const list = selected.sectionAnnotations ?? [];
    updateTransect(selected.id, { sectionAnnotations: list.filter((a) => a.id !== id) });
  }

  // SVG layout
  const SVG_W = 600;
  const SVG_H = 220;
  const profileTop = 30;
  const profileBottom = 110;
  const bracketRowH = 22;
  const bracketBaseY = 130;

  const elevSeries = selected?.elevationProfileM ?? [];
  const minE = elevSeries.length ? Math.min(...elevSeries) : 0;
  const maxE = elevSeries.length ? Math.max(...elevSeries) : 0;
  const eRange = maxE - minE || 1;

  const profilePath = useMemo(() => {
    if (!elevSeries.length) return '';
    const stepX = SVG_W / Math.max(1, elevSeries.length - 1);
    return elevSeries
      .map((e, i) => {
        const x = i * stepX;
        const y = profileBottom - ((e - minE) / eRange) * (profileBottom - profileTop);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [elevSeries, minE, eRange]);

  const annotations = selected?.sectionAnnotations ?? [];

  // Group counts (for the coverage hint).
  const counts = useMemo(() => {
    const c: Record<SectionAnnotationKind, number> = {
      microclimate: 0,
      succession: 0,
      slope: 0,
      'sector-response': 0,
    };
    for (const a of annotations) c[a.kind] += 1;
    return c;
  }, [annotations]);

  const totalCovered = annotations.length;

  function distToX(d: number): number {
    return (d / Math.max(1, totalDist)) * SVG_W;
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 6 · Cross-section</span>
        <h1 className={styles.title}>Section annotations</h1>
        <p className={styles.lede}>
          Bracket-style overlays beneath the transect profile — microclimate
          notes, succession-stage bands, slope-% callouts, sector-response
          commentary. Together with the vertical-element editor (above the
          profile) this completes the OSU PDC Site Cross Section rubric.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Pick a transect</h2>
        {transects.length === 0 ? (
          <p className={styles.empty}>No transects saved yet — draw one in the Cross-section tool first.</p>
        ) : (
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{ width: '100%', padding: 8, borderRadius: 6, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(232,220,200,0.92)' }}
          >
            <option value="">— select transect —</option>
            {transects.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.totalDistanceM ? `· ${Math.round(t.totalDistanceM)} m` : ''}
              </option>
            ))}
          </select>
        )}
      </section>

      {selected && (
        <>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Profile with brackets</h2>
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', height: 'auto', background: 'rgba(0,0,0,0.25)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* ground baseline */}
              <line x1={0} y1={profileBottom} x2={SVG_W} y2={profileBottom} stroke="rgba(232,220,200,0.3)" strokeWidth={1} />
              {/* elevation profile */}
              {profilePath && (
                <path d={profilePath} fill="none" stroke="rgba(140,180,120,0.85)" strokeWidth={1.5} />
              )}
              {/* brackets, stacked by kind row */}
              {annotations.map((a) => {
                const x1 = distToX(a.startM);
                const x2 = distToX(Math.max(a.endM, a.startM + 0.5));
                const row = KIND_INDEX[a.kind];
                const y = bracketBaseY + row * bracketRowH;
                const colour = KINDS[row]?.color ?? 'rgba(255,255,255,0.6)';
                return (
                  <g key={a.id}>
                    {/* bracket top line + tick legs */}
                    <line x1={x1} y1={y} x2={x2} y2={y} stroke={colour} strokeWidth={1.5} />
                    <line x1={x1} y1={y} x2={x1} y2={y + 5} stroke={colour} strokeWidth={1.5} />
                    <line x1={x2} y1={y} x2={x2} y2={y + 5} stroke={colour} strokeWidth={1.5} />
                    <text
                      x={(x1 + x2) / 2}
                      y={y + 14}
                      fontSize={9}
                      textAnchor="middle"
                      fill="rgba(232,220,200,0.85)"
                    >
                      {a.label}
                    </text>
                  </g>
                );
              })}
              {/* row legend on the left edge */}
              {KINDS.map((k, i) => (
                <text
                  key={k.value}
                  x={4}
                  y={bracketBaseY + i * bracketRowH + 3}
                  fontSize={8}
                  fill={k.color}
                >
                  {k.label}
                </text>
              ))}
            </svg>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Add bracket</h2>
            <div className={styles.grid}>
              <label className={styles.field}>
                <span>Kind</span>
                <select value={kind} onChange={(e) => setKind(e.target.value as SectionAnnotationKind)}>
                  {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
                </select>
              </label>
              <label className={styles.field}>
                <span>Start (m along transect)</span>
                <input
                  type="number"
                  min={0}
                  max={totalDist}
                  step={1}
                  value={startM}
                  onChange={(e) => setStartM(Number(e.target.value) || 0)}
                />
              </label>
              <label className={styles.field}>
                <span>End (m along transect)</span>
                <input
                  type="number"
                  min={0}
                  max={totalDist}
                  step={1}
                  value={endM}
                  onChange={(e) => setEndM(Number(e.target.value) || 0)}
                />
              </label>
              <label className={styles.field}>
                <span>Label</span>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={KINDS.find((k) => k.value === kind)?.hint ?? ''}
                />
              </label>
            </div>
            <p className={styles.listMeta} style={{ marginTop: 6 }}>
              {KINDS.find((k) => k.value === kind)?.hint}
            </p>
            <div className={styles.btnRow}>
              <button
                type="button"
                className={styles.btn}
                onClick={addAnnotation}
                disabled={!label.trim() || endM < startM}
              >
                Add bracket
              </button>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Coverage</h2>
            <div className={styles.statRow}><span>Brackets placed</span><span>{totalCovered}</span></div>
            {KINDS.map((k) => (
              <div key={k.value} className={styles.statRow}>
                <span>{k.label}</span>
                <span>{counts[k.value]}</span>
              </div>
            ))}
            {totalCovered > 0 && Object.values(counts).some((c) => c === 0) && (
              <p className={styles.listMeta} style={{ marginTop: 6 }}>
                A complete OSU PDC cross-section names microclimate zones,
                succession stages, slope, and at least one sector response —
                kinds with 0 brackets are still uncovered.
              </p>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Brackets ({annotations.length})</h2>
            {annotations.length === 0 ? (
              <p className={styles.empty}>None placed yet.</p>
            ) : (
              <ul className={styles.list}>
                {annotations.map((a) => {
                  const sp = a.kind === 'slope' ? slopePct(selected, a.startM, a.endM) : null;
                  const meta = sp !== null
                    ? `${KINDS[KIND_INDEX[a.kind]]?.label ?? a.kind} · ${a.startM}–${a.endM} m · derived ${sp.toFixed(1)} %`
                    : `${KINDS[KIND_INDEX[a.kind]]?.label ?? a.kind} · ${a.startM}–${a.endM} m`;
                  return (
                    <li key={a.id} className={styles.listRow}>
                      <div>
                        <strong>{a.label}</strong>
                        <div className={styles.listMeta}>{meta}</div>
                      </div>
                      <button type="button" className={styles.removeBtn} onClick={() => removeAnnotation(a.id)}>Remove</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
