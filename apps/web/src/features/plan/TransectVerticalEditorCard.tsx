/**
 * TransectVerticalEditorCard — PLAN Module 6.
 *
 * Pick a saved transect and pin vertical elements at metric distances along
 * its profile. Two ref kinds are supported:
 *
 *   1. `kind: 'standalone'` — synthetic pin authored in this card. Carries
 *      its own `{ type, heightM, label? }` payload.
 *   2. `kind: 'water-system' | 'polyculture' | 'closed-loop' | 'structure'`
 *      — discriminated reference into the appropriate domain store. Height
 *      and label are resolved at render time from the linked element.
 *
 * Solar overlay (winter / summer solstice noon altitude) is integrated
 * inline rather than split into its own card. Latitude is derived from
 * `Transect.pointA[1]`.
 *
 * Linked-ref resolution is the deferred follow-up from
 * [2026-04-30 Scholar-Aligned Namespaces ADR] — landed here.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useTopographyStore } from '../../store/topographyStore.js';
import { useWaterSystemsStore, type Earthwork, type StorageInfra } from '../../store/waterSystemsStore.js';
import { usePolycultureStore, type Guild, type SpeciesPick } from '../../store/polycultureStore.js';
import { useClosedLoopStore, type FertilityInfra } from '../../store/closedLoopStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import type { Structure } from '../../store/structureStore.js';
import { PLANT_DATABASE } from '../../data/plantDatabase.js';
import {
  newAnnotationId,
  type Transect,
  type TransectVerticalRef,
  type TransectVerticalRefKind,
  type VerticalElementType,
} from '../../store/site-annotations.js';
import styles from './planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const TYPES: Array<{ value: VerticalElementType; label: string }> = [
  { value: 'structure', label: 'Structure' },
  { value: 'tree',      label: 'Tree' },
  { value: 'shrub',     label: 'Shrub' },
  { value: 'swale',     label: 'Swale' },
  { value: 'pond',      label: 'Pond' },
];

/** Default heights (m) for ref types that don't carry their own height. */
const EARTHWORK_DEFAULT_HEIGHT_M: Record<Earthwork['type'], number> = {
  swale: 0.5,
  diversion: 0.5,
  french_drain: 0.3,
};
const STORAGE_DEFAULT_HEIGHT_M: Record<StorageInfra['type'], number> = {
  cistern: 2.5,
  pond: 1.0,
  rain_garden: 0.5,
};
const FERTILITY_DEFAULT_HEIGHT_M: Record<FertilityInfra['type'], number> = {
  composter: 1.5,
  hugelkultur: 1.2,
  biochar: 0.8,
  worm_bin: 0.5,
};

/** Approximate noon solar altitude (degrees) at solstice for a given lat. */
function solarNoonAltitude(latDeg: number, season: 'summer' | 'winter'): number {
  const declination = season === 'summer' ? 23.44 : -23.44;
  return 90 - latDeg + declination;
}

const REF_KIND_LABELS: Record<Exclude<TransectVerticalRefKind, 'standalone'>, string> = {
  'water-system': 'Water system',
  'polyculture':  'Polyculture',
  'closed-loop':  'Closed loop',
  'structure':    'Structure',
};

interface ResolvedRef {
  heightM: number;
  label: string;
  /** Short type label shown in the elements list. */
  typeLabel: string;
  /** True when the refId could not be located in its domain store. */
  missing: boolean;
}

export default function TransectVerticalEditorCard({ project }: Props) {
  const allTransects = useTopographyStore((s) => s.transects);
  const updateTransect = useTopographyStore((s) => s.updateTransect);

  const allEarthworks    = useWaterSystemsStore((s) => s.earthworks);
  const allStorageInfra  = useWaterSystemsStore((s) => s.storageInfra);
  const allGuilds        = usePolycultureStore((s) => s.guilds);
  const allSpecies       = usePolycultureStore((s) => s.species);
  const allFertility     = useClosedLoopStore((s) => s.fertilityInfra);
  const allStructures    = useStructureStore((s) => s.structures);

  const transects   = useMemo(() => allTransects.filter((t) => t.projectId === project.id), [allTransects, project.id]);
  const earthworks  = useMemo(() => allEarthworks.filter((e) => e.projectId === project.id), [allEarthworks, project.id]);
  const storage     = useMemo(() => allStorageInfra.filter((s) => s.projectId === project.id), [allStorageInfra, project.id]);
  const guilds      = useMemo(() => allGuilds.filter((g) => g.projectId === project.id), [allGuilds, project.id]);
  const species     = useMemo(() => allSpecies.filter((s) => s.projectId === project.id), [allSpecies, project.id]);
  const fertility   = useMemo(() => allFertility.filter((f) => f.projectId === project.id), [allFertility, project.id]);
  const structures  = useMemo(() => allStructures.filter((s) => s.projectId === project.id), [allStructures, project.id]);

  // ── Linked-ref resolver ─────────────────────────────────────────────────
  const resolveRef = useMemo(() => {
    function speciesHeight(speciesId: string): { h: number; name: string } | null {
      const p = PLANT_DATABASE.find((x) => x.id === speciesId);
      return p ? { h: p.matureHeightM, name: p.commonName } : null;
    }
    return (ref: TransectVerticalRef): ResolvedRef | null => {
      if (ref.kind === 'standalone' || !ref.refId) return null;

      switch (ref.kind) {
        case 'water-system': {
          const ew = earthworks.find((e) => e.id === ref.refId);
          if (ew) return {
            heightM: EARTHWORK_DEFAULT_HEIGHT_M[ew.type],
            label: ew.notes || `${ew.type} · ${Math.round(ew.lengthM)} m`,
            typeLabel: ew.type,
            missing: false,
          };
          const si = storage.find((s) => s.id === ref.refId);
          if (si) return {
            heightM: STORAGE_DEFAULT_HEIGHT_M[si.type],
            label: si.notes || si.type,
            typeLabel: si.type,
            missing: false,
          };
          return { heightM: 0.5, label: '(missing water-system)', typeLabel: 'water-system', missing: true };
        }
        case 'polyculture': {
          const guild = guilds.find((g) => g.id === ref.refId);
          if (guild) {
            const anchor = speciesHeight(guild.anchorSpeciesId);
            return {
              heightM: anchor?.h ?? 4,
              label: guild.name,
              typeLabel: 'guild',
              missing: false,
            };
          }
          const pick = species.find((s) => s.id === ref.refId);
          if (pick) {
            const sp = speciesHeight(pick.speciesId);
            return {
              heightM: sp?.h ?? 2,
              label: sp?.name ?? '(unknown species)',
              typeLabel: 'species',
              missing: !sp,
            };
          }
          return { heightM: 2, label: '(missing polyculture)', typeLabel: 'polyculture', missing: true };
        }
        case 'closed-loop': {
          const fi = fertility.find((f) => f.id === ref.refId);
          if (fi) return {
            heightM: FERTILITY_DEFAULT_HEIGHT_M[fi.type],
            label: fi.notes || fi.type,
            typeLabel: fi.type,
            missing: false,
          };
          return { heightM: 1, label: '(missing closed-loop)', typeLabel: 'closed-loop', missing: true };
        }
        case 'structure': {
          const st = structures.find((s) => s.id === ref.refId);
          if (st) return {
            heightM: st.heightM ?? 3,
            label: st.name || st.type,
            typeLabel: st.type,
            missing: false,
          };
          return { heightM: 3, label: '(missing structure)', typeLabel: 'structure', missing: true };
        }
      }
    };
  }, [earthworks, storage, guilds, species, fertility, structures]);

  const [selectedId, setSelectedId] = useState<string>('');
  const selected = useMemo<Transect | undefined>(
    () => transects.find((t) => t.id === selectedId),
    [transects, selectedId],
  );

  const [showSolar, setShowSolar] = useState(true);

  // Add-form state (two modes: standalone | link)
  const [mode, setMode] = useState<'standalone' | 'link'>('standalone');
  const [type, setType] = useState<VerticalElementType>('tree');
  const [distance, setDistance] = useState<number>(0);
  const [height, setHeight] = useState<number>(5);
  const [label, setLabel] = useState('');

  // Link-mode state
  const [linkKind, setLinkKind] = useState<Exclude<TransectVerticalRefKind, 'standalone'>>('water-system');
  const [linkRefId, setLinkRefId] = useState<string>('');

  /** Options for the ref-id dropdown, keyed by kind. */
  const linkOptions: Array<{ id: string; label: string }> = useMemo(() => {
    switch (linkKind) {
      case 'water-system': return [
        ...earthworks.map((e) => ({ id: e.id, label: `Earthwork · ${e.type} · ${Math.round(e.lengthM)} m${e.notes ? ` — ${e.notes}` : ''}` })),
        ...storage.map((s) => ({ id: s.id, label: `Storage · ${s.type}${s.notes ? ` — ${s.notes}` : ''}` })),
      ];
      case 'polyculture': return [
        ...guilds.map((g) => ({ id: g.id, label: `Guild · ${g.name}` })),
        ...species.map((s) => {
          const p = PLANT_DATABASE.find((x) => x.id === s.speciesId);
          return { id: s.id, label: `Species · ${p?.commonName ?? s.speciesId}${s.intendedUse ? ` — ${s.intendedUse}` : ''}` };
        }),
      ];
      case 'closed-loop': return fertility.map((f) => ({
        id: f.id, label: `Fertility · ${f.type}${f.notes ? ` — ${f.notes}` : ''}`,
      }));
      case 'structure': return structures.map((s) => ({
        id: s.id, label: `${s.type} · ${s.name}`,
      }));
    }
  }, [linkKind, earthworks, storage, guilds, species, fertility, structures]);

  function addElement() {
    if (!selected) return;
    let next: TransectVerticalRef;
    if (mode === 'standalone') {
      const trimmedLabel = label.trim();
      next = {
        id: newAnnotationId('ve'),
        distanceAlongTransectM: distance,
        kind: 'standalone',
        standalone: {
          type,
          heightM: height,
          ...(trimmedLabel ? { label: trimmedLabel } : {}),
        },
      };
    } else {
      if (!linkRefId) return;
      next = {
        id: newAnnotationId('ve'),
        distanceAlongTransectM: distance,
        kind: linkKind,
        refId: linkRefId,
      };
    }
    const list = selected.verticalRefs ?? [];
    updateTransect(selected.id, { verticalRefs: [...list, next] });
    setLabel('');
    setLinkRefId('');
  }

  function removeElement(elementId: string) {
    if (!selected) return;
    const list = selected.verticalRefs ?? [];
    updateTransect(selected.id, { verticalRefs: list.filter((e) => e.id !== elementId) });
  }

  // SVG layout constants
  const SVG_W = 600;
  const SVG_H = 240;
  const ground = SVG_H - 30;
  const totalDist = selected?.totalDistanceM ?? Math.max(1, (selected?.elevationProfileM?.length ?? 1) - 1, 100);

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
        const y = ground - ((e - minE) / eRange) * (ground - 40);
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }, [elevSeries, minE, eRange, ground]);

  const lat = selected?.pointA?.[1] ?? 45;
  const summerAlt = solarNoonAltitude(lat, 'summer');
  const winterAlt = solarNoonAltitude(lat, 'winter');

  /** Color for a ref's triangle by kind. */
  function refColor(ref: TransectVerticalRef): { fill: string; stroke: string } {
    switch (ref.kind) {
      case 'standalone':   return { fill: 'rgba(220,180,80,0.5)',  stroke: 'rgba(220,180,80,0.9)'  }; // amber
      case 'water-system': return { fill: 'rgba(120,160,220,0.5)', stroke: 'rgba(120,160,220,0.9)' }; // blue
      case 'polyculture':  return { fill: 'rgba(140,200,120,0.5)', stroke: 'rgba(140,200,120,0.9)' }; // green
      case 'closed-loop':  return { fill: 'rgba(180,140,90,0.5)',  stroke: 'rgba(180,140,90,0.9)'  }; // brown
      case 'structure':    return { fill: 'rgba(200,200,200,0.5)', stroke: 'rgba(200,200,200,0.9)' }; // grey
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 6 · Cross-section &amp; Solar</span>
        <h1 className={styles.title}>Transect vertical editor</h1>
        <p className={styles.lede}>
          Pick a saved transect from Observe and pin vertical elements
          along its profile — either as standalone sketches or as live
          links into water systems, polyculture, closed-loop, or
          structure stores. Toggle the solstice overlay to check whether
          a tree or structure casts shadow into a productive zone.
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
            <h2 className={styles.sectionTitle}>Profile</h2>
            <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'rgba(232,220,200,0.7)', marginBottom: 8 }}>
              <input type="checkbox" checked={showSolar} onChange={(e) => setShowSolar(e.target.checked)} />
              Show solstice solar overlay (lat ≈ {lat.toFixed(2)}°)
            </label>
            <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ width: '100%', height: 'auto', background: 'rgba(0,0,0,0.25)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* ground baseline */}
              <line x1={0} y1={ground} x2={SVG_W} y2={ground} stroke="rgba(232,220,200,0.3)" strokeWidth={1} />
              {/* elevation profile */}
              {profilePath && (
                <path d={profilePath} fill="none" stroke="rgba(140,180,120,0.85)" strokeWidth={1.5} />
              )}
              {/* solar arcs */}
              {showSolar && (
                <>
                  <line
                    x1={0} y1={ground}
                    x2={SVG_W} y2={ground - SVG_W * Math.tan((summerAlt * Math.PI) / 180)}
                    stroke="rgba(220,180,80,0.6)" strokeWidth={1} strokeDasharray="4 3"
                  />
                  <text x={4} y={14} fontSize={10} fill="rgba(220,180,80,0.85)">summer noon — {summerAlt.toFixed(1)}°</text>
                  <line
                    x1={0} y1={ground}
                    x2={SVG_W} y2={ground - SVG_W * Math.tan((Math.max(0, winterAlt) * Math.PI) / 180)}
                    stroke="rgba(120,160,220,0.6)" strokeWidth={1} strokeDasharray="2 4"
                  />
                  <text x={4} y={28} fontSize={10} fill="rgba(120,160,220,0.85)">winter noon — {winterAlt.toFixed(1)}°</text>
                </>
              )}
              {/* vertical elements (standalone + resolved linked refs) */}
              {(selected.verticalRefs ?? []).map((el) => {
                let h: number;
                let pinLabel: string | undefined;
                if (el.kind === 'standalone' && el.standalone) {
                  h = el.standalone.heightM;
                  pinLabel = el.standalone.label;
                } else {
                  const r = resolveRef(el);
                  if (!r) return null;
                  h = r.heightM;
                  pinLabel = r.label;
                }
                const x = (el.distanceAlongTransectM / Math.max(1, totalDist)) * SVG_W;
                const drawH = Math.min(120, h * 4);
                const c = refColor(el);
                return (
                  <g key={el.id}>
                    <polygon
                      points={`${x - 4},${ground} ${x + 4},${ground} ${x},${ground - drawH}`}
                      fill={c.fill}
                      stroke={c.stroke}
                    />
                    {pinLabel && (
                      <text x={x} y={ground - drawH - 4} fontSize={9} textAnchor="middle" fill="rgba(232,220,200,0.7)">
                        {pinLabel}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Add vertical element</h2>

            {/* Mode toggle */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 12 }}>
              <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'rgba(232,220,200,0.85)' }}>
                <input type="radio" name="mode" checked={mode === 'standalone'} onChange={() => setMode('standalone')} />
                Standalone sketch
              </label>
              <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: 'rgba(232,220,200,0.85)' }}>
                <input type="radio" name="mode" checked={mode === 'link'} onChange={() => setMode('link')} />
                Link to existing element
              </label>
            </div>

            {mode === 'standalone' ? (
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Type</span>
                  <select value={type} onChange={(e) => setType(e.target.value as VerticalElementType)}>
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Distance along transect (m)</span>
                  <input type="number" min={0} max={totalDist} step={1} value={distance}
                    onChange={(e) => setDistance(Number(e.target.value) || 0)} />
                </label>
                <label className={styles.field}>
                  <span>Height (m)</span>
                  <input type="number" min={0} step={0.5} value={height}
                    onChange={(e) => setHeight(Number(e.target.value) || 0)} />
                </label>
                <label className={styles.field}>
                  <span>Label (optional)</span>
                  <input value={label} onChange={(e) => setLabel(e.target.value)} />
                </label>
              </div>
            ) : (
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span>Namespace</span>
                  <select
                    value={linkKind}
                    onChange={(e) => { setLinkKind(e.target.value as Exclude<TransectVerticalRefKind, 'standalone'>); setLinkRefId(''); }}
                  >
                    <option value="water-system">Water system (earthworks / storage)</option>
                    <option value="polyculture">Polyculture (guilds / species)</option>
                    <option value="closed-loop">Closed loop (fertility infra)</option>
                    <option value="structure">Structure</option>
                  </select>
                </label>
                <label className={styles.field}>
                  <span>Element</span>
                  {linkOptions.length === 0 ? (
                    <span style={{ fontSize: 12, color: 'rgba(232,220,200,0.5)', padding: '6px 0' }}>
                      No {REF_KIND_LABELS[linkKind].toLowerCase()} elements in this project yet.
                    </span>
                  ) : (
                    <select value={linkRefId} onChange={(e) => setLinkRefId(e.target.value)}>
                      <option value="">— select —</option>
                      {linkOptions.map((o) => (
                        <option key={o.id} value={o.id}>{o.label}</option>
                      ))}
                    </select>
                  )}
                </label>
                <label className={styles.field}>
                  <span>Distance along transect (m)</span>
                  <input type="number" min={0} max={totalDist} step={1} value={distance}
                    onChange={(e) => setDistance(Number(e.target.value) || 0)} />
                </label>
              </div>
            )}

            <div className={styles.btnRow}>
              <button
                type="button"
                className={styles.btn}
                onClick={addElement}
                disabled={mode === 'link' && !linkRefId}
              >
                Add element
              </button>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Elements ({(selected.verticalRefs ?? []).length})</h2>
            {(selected.verticalRefs ?? []).length === 0 ? (
              <p className={styles.empty}>None placed yet.</p>
            ) : (
              <ul className={styles.list}>
                {(selected.verticalRefs ?? []).map((el) => {
                  let titleLabel: string;
                  let typeLabel: string;
                  let heightLabel: string;
                  let missing = false;

                  if (el.kind === 'standalone' && el.standalone) {
                    titleLabel = el.standalone.label || el.standalone.type;
                    typeLabel = `standalone · ${el.standalone.type}`;
                    heightLabel = `${el.standalone.heightM} m tall`;
                  } else {
                    const r = resolveRef(el);
                    if (r) {
                      titleLabel = r.label;
                      typeLabel = `${REF_KIND_LABELS[el.kind as Exclude<TransectVerticalRefKind, 'standalone'>]} · ${r.typeLabel}`;
                      heightLabel = `${r.heightM} m (resolved)`;
                      missing = r.missing;
                    } else {
                      titleLabel = '(unresolved ref)';
                      typeLabel = el.kind;
                      heightLabel = '—';
                      missing = true;
                    }
                  }

                  return (
                    <li key={el.id} className={styles.listRow}>
                      <div>
                        <strong style={missing ? { color: 'rgba(220,140,100,0.95)' } : undefined}>
                          {titleLabel}{missing ? ' ⚠' : ''}
                        </strong>
                        <div className={styles.listMeta}>
                          {typeLabel} · {el.distanceAlongTransectM} m along · {heightLabel}
                        </div>
                      </div>
                      <button type="button" className={styles.removeBtn} onClick={() => removeElement(el.id)}>Remove</button>
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
