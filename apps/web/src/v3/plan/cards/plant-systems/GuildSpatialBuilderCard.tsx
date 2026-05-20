/**
 * GuildSpatialBuilderCard — concentric-rings guild designer
 * (2026-05-08 redesign per user request).
 *
 * Centre disc holds the anchor; concentric rings represent the canopy
 * layers below the anchor (sub_canopy → root). Click a ring to open a
 * layer-filtered species picker; click an existing member to remove it.
 * Every change persists immediately via `updateGuild` — there is no
 * "Save" gate. Anchor is editable in place.
 *
 * The parcel placement pane on the left remains as a read-only locator
 * for guild centroids; new placement happens via the rail Guild tool
 * (`GuildTool.tsx`), which is the canonical map-first entry. Members
 * are composed here.
 */

import { useEffect, useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { usePolycultureStore } from '../../../../store/polycultureStore.js';
import { useSiteData, getLayerSummary } from '../../../../store/siteDataStore.js';
import {
  newAnnotationId,
  type Guild,
  type GuildLayer,
} from '../../../../store/site-annotations.js';
import {
  PLANT_DATABASE,
  findSpecies,
} from '../../../../data/plantCatalog.js';
import {
  resolveValidPresets,
  findGuildPreset,
} from '../../../../data/guildPresets.js';
import { findCompanions } from '../../../../lib/companionPlanting.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';
import GuildRingsCanvas from './GuildRingsCanvas.js';
import {
  LAYER_LABEL,
  FUNCTION_SHORT,
  primaryFunction,
} from './guildLayerOrder.js';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const ANCHOR_LAYERS: GuildLayer[] = ['canopy', 'sub_canopy'];

function fmtUSD(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n}`;
}

export default function GuildSpatialBuilderCard({ project }: Props) {
  const allGuilds = usePolycultureStore((s) => s.guilds);
  const addGuild = usePolycultureStore((s) => s.addGuild);
  const updateGuild = usePolycultureStore((s) => s.updateGuild);
  const removeGuild = usePolycultureStore((s) => s.removeGuild);

  const guilds = useMemo(
    () => allGuilds.filter((g) => g.projectId === project.id),
    [allGuilds, project.id],
  );

  // Project-wide guild-cost totals — surfaced as an inline summary
  // section near the top so the steward sees the roll-up without
  // jumping to the Phasing & Budgeting module. Mirrors the "Project
  // total" pattern in CumulativeInvestmentCard.
  const guildTotals = useMemo(() => {
    let totalUSD = 0;
    let totalHrs = 0;
    let unestimated = 0;
    for (const g of guilds) {
      const usd = g.establishmentCostUSD;
      const hrs = g.establishmentLaborHrs;
      if (usd === undefined && hrs === undefined) unestimated += 1;
      totalUSD += usd ?? 0;
      totalHrs += hrs ?? 0;
    }
    return { totalUSD, totalHrs, unestimated };
  }, [guilds]);

  const [activeGuildId, setActiveGuildId] = useState<string | null>(null);
  const [activeRing, setActiveRing] = useState<GuildLayer | null>(null);
  const [pickAnchor, setPickAnchor] = useState(false);

  // Auto-select most recent guild as active (or null when empty).
  useEffect(() => {
    if (guilds.length === 0) {
      setActiveGuildId(null);
      return;
    }
    if (!activeGuildId || !guilds.some((g) => g.id === activeGuildId)) {
      const last = guilds[guilds.length - 1];
      if (last) setActiveGuildId(last.id);
    }
  }, [guilds, activeGuildId]);

  const active = useMemo(
    () => guilds.find((g) => g.id === activeGuildId) ?? null,
    [guilds, activeGuildId],
  );
  const anchor = active ? findSpecies(active.anchorSpeciesId) ?? null : null;

  function startNewGuild() {
    const g: Guild = {
      id: newAnnotationId('gld'),
      projectId: project.id,
      name: `Guild ${guilds.length + 1}`,
      anchorSpeciesId: '',
      members: [],
      centroidUv: [0.5, 0.5],
      createdAt: new Date().toISOString(),
    };
    addGuild(g);
    setActiveGuildId(g.id);
    setActiveRing(null);
    setPickAnchor(true);
  }

  function pickRing(layer: GuildLayer) {
    if (!active) return;
    setActiveRing((cur) => (cur === layer ? null : layer));
    setPickAnchor(false);
  }

  function addMember(speciesId: string, layer: GuildLayer) {
    if (!active) return;
    updateGuild(active.id, {
      members: [...active.members, { speciesId, layer }],
    });
    setActiveRing(null);
  }

  function removeMember(memberIndex: number) {
    if (!active) return;
    updateGuild(active.id, {
      members: active.members.filter((_, i) => i !== memberIndex),
    });
  }

  function moveMember(memberIndex: number, position: [number, number]) {
    if (!active) return;
    updateGuild(active.id, {
      members: active.members.map((m, i) =>
        i === memberIndex ? { ...m, position } : m,
      ),
    });
  }

  function snapMember(memberIndex: number) {
    if (!active) return;
    updateGuild(active.id, {
      members: active.members.map((m, i) => {
        if (i !== memberIndex) return m;
        const { position: _drop, ...rest } = m;
        return rest;
      }),
    });
  }

  function snapAllToRings() {
    if (!active) return;
    updateGuild(active.id, {
      members: active.members.map(({ position: _drop, ...rest }) => rest),
    });
  }

  const anyMemberPositioned = active
    ? active.members.some((m) => m.position !== undefined)
    : false;

  function setAnchor(speciesId: string) {
    if (!active) return;
    updateGuild(active.id, { anchorSpeciesId: speciesId });
    setPickAnchor(false);
  }

  function renameGuild(name: string) {
    if (!active) return;
    updateGuild(active.id, { name });
  }

  // Premade-guild templates — same source as the rail GuildTool. Picking
  // one wholesale-replaces anchor + members on the active guild (and seeds
  // notes if the steward hasn't typed any). Resets the select after apply
  // so re-picking the same template later still re-fires.
  const presetOptions = useMemo(
    () => resolveValidPresets().map((p) => ({ value: p.id, label: p.name })),
    [],
  );

  function applyPreset(presetId: string) {
    if (!active || !presetId) return;
    const preset = findGuildPreset(presetId);
    if (!preset) return;
    updateGuild(active.id, {
      name: preset.name,
      anchorSpeciesId: preset.anchorSpeciesId,
      members: preset.members,
      ...(preset.notes && !active.notes ? { notes: preset.notes } : {}),
    });
    setActiveRing(null);
    setPickAnchor(false);
  }

  // Picker species pool — filtered by ring layer, ordered by:
  // 1. companions of the anchor (best-effort string match against MATRIX),
  // 2. species sharing a function the guild is missing,
  // 3. alphabetical.
  const pickerSpecies = useMemo(() => {
    if (!activeRing || !active) return [];
    const candidates = PLANT_DATABASE.filter((p) => p.layer === activeRing);
    const used = new Set(active.members.map((m) => m.speciesId));
    const remaining = candidates.filter((p) => !used.has(p.id));
    const anchorSp = findSpecies(active.anchorSpeciesId);
    const anchorKey = anchorSp?.commonName.toLowerCase().split(' ')[0] ?? '';
    const companionEntry = anchorKey ? findCompanions(anchorKey) : null;
    const companionSet = new Set(companionEntry?.companions ?? []);
    const presentFns = new Set(
      active.members
        .map((m) => findSpecies(m.speciesId))
        .filter((s): s is NonNullable<typeof s> => !!s)
        .flatMap((s) => s.ecologicalFunction),
    );
    const score = (sp: (typeof remaining)[number]) => {
      let s = 0;
      const key = sp.commonName.toLowerCase().split(' ')[0] ?? '';
      if (key && companionSet.has(key)) s += 10;
      const newFns = sp.ecologicalFunction.filter((f) => !presentFns.has(f));
      s += newFns.length;
      return s;
    };
    return [...remaining].sort((a, b) => {
      const sa = score(a);
      const sb = score(b);
      if (sa !== sb) return sb - sa;
      return a.commonName.localeCompare(b.commonName);
    });
  }, [activeRing, active]);

  const anchorPickerSpecies = useMemo(
    () => PLANT_DATABASE.filter((p) => ANCHOR_LAYERS.includes(p.layer)),
    [],
  );

  // Slope vector pulled from `siteDataStore` elevation layer when available.
  const siteData = useSiteData(project.id);
  const elev = siteData
    ? getLayerSummary<{
        mean_slope_deg?: number;
        predominant_aspect?: string;
      }>(siteData, 'elevation')
    : null;
  const ASPECT_BEARING: Record<string, number> = {
    N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315,
  };
  const aspect = elev?.predominant_aspect;
  const meanSlope = elev?.mean_slope_deg;
  const bearingDeg = aspect ? ASPECT_BEARING[aspect] ?? 180 : 180;
  const theta = (bearingDeg * Math.PI) / 180;
  const cx = 200, cy = 160;
  const half = 130;
  const arrowFrom = { x: cx - Math.sin(theta) * half, y: cy + Math.cos(theta) * half };
  const arrowTo = { x: cx + Math.sin(theta) * half, y: cy - Math.cos(theta) * half };
  const arrowLabel = aspect
    ? `water flow → ${aspect}${
        typeof meanSlope === 'number' ? ` · ${meanSlope.toFixed(1)}° slope` : ''
      }`
    : 'water flow (generic — fetch elevation in Observe)';

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 4 · Plant Systems</span>
        <h1 className={styles.title}>Guild builder · spatial</h1>
        <p className={styles.lede}>
          Compose a polyculture as concentric layers around an anchor tree:
          the anchor sits at the centre, then each canopy stratum
          (sub-canopy → root) becomes a ring you can populate with companions
          filtered to that layer. The parcel pane on the right shows where
          your saved guilds live on the site.
        </p>
      </header>

      {guilds.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Project guild totals</h2>
          <div className={styles.statRow}>
            <span>Guilds</span>
            <span>{guilds.length}</span>
          </div>
          <div className={styles.statRow}>
            <span>Establishment cost</span>
            <span>{fmtUSD(guildTotals.totalUSD)}</span>
          </div>
          <div className={styles.statRow}>
            <span>Establishment labor</span>
            <span>{guildTotals.totalHrs} h</span>
          </div>
          {guildTotals.unestimated > 0 && (
            <div className={styles.statRow}>
              <span>Without estimates</span>
              <span>{guildTotals.unestimated}</span>
            </div>
          )}
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Active guild
          {active && (
            <span style={{ color: 'rgba(232,220,200,0.55)', fontWeight: 400, marginLeft: 8 }}>
              · {active.members.length} member(s)
            </span>
          )}
        </h2>
        {!active ? (
          <div>
            <p className={styles.empty} style={{ textAlign: 'left', padding: '6px 0' }}>
              No guild on this project yet. Drop one with the rail's
              {' '}<strong>Guild</strong> tool, or start a fresh one here.
            </p>
            <div className={styles.btnRow}>
              <button type="button" className={styles.btn} onClick={startNewGuild}>
                + New guild
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.grid} style={{ marginBottom: 16 }}>
              <label className={styles.field}>
                <span>Guild name</span>
                <input
                  value={active.name}
                  onChange={(e) => renameGuild(e.target.value)}
                />
              </label>
              <label className={styles.field}>
                <span>Switch guild</span>
                <select
                  value={active.id}
                  onChange={(e) => {
                    setActiveGuildId(e.target.value);
                    setActiveRing(null);
                    setPickAnchor(false);
                  }}
                >
                  {guilds.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Apply template</span>
                <select
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) applyPreset(v);
                    e.target.value = '';
                  }}
                >
                  <option value="">— pick template —</option>
                  {presetOptions.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Establishment cost (USD)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={50}
                  placeholder="e.g. 250"
                  value={active.establishmentCostUSD ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateGuild(active.id, {
                      establishmentCostUSD: v === '' ? undefined : Number(v),
                    });
                  }}
                />
              </label>
              <label className={styles.field}>
                <span>Establishment labour (hrs)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={1}
                  placeholder="e.g. 8"
                  value={active.establishmentLaborHrs ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    updateGuild(active.id, {
                      establishmentLaborHrs: v === '' ? undefined : Number(v),
                    });
                  }}
                />
              </label>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.2fr) minmax(220px, 1fr)',
                gap: 16,
                alignItems: 'start',
              }}
            >
              <GuildRingsCanvas
                anchor={anchor}
                members={active.members}
                onPickRing={pickRing}
                onClickMember={removeMember}
                onPickAnchor={() => {
                  setPickAnchor(true);
                  setActiveRing(null);
                }}
                activeRing={activeRing}
                onMemberDrag={moveMember}
                onMemberSnap={snapMember}
              />

              <div>
                {pickAnchor && (
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <h3 style={{ margin: '0 0 8px', fontSize: 13, color: 'rgba(232,220,200,0.85)' }}>
                      Pick anchor
                    </h3>
                    <p style={{ margin: '0 0 8px', fontSize: 11, color: 'rgba(232,220,200,0.6)' }}>
                      Anchors are canopy or sub-canopy species — they set the upper
                      storey of the guild.
                    </p>
                    <ul className={styles.list} style={{ maxHeight: 320, overflowY: 'auto' }}>
                      {anchorPickerSpecies.map((p) => (
                        <li
                          key={p.id}
                          className={styles.listRow}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setAnchor(p.id)}
                        >
                          <div>
                            <strong>{p.commonName}</strong>
                            <div className={styles.listMeta}>
                              {LAYER_LABEL[p.layer]} · {p.latinName}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className={styles.btnRow}>
                      <button
                        type="button"
                        className={styles.btn}
                        onClick={() => setPickAnchor(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {activeRing && !pickAnchor && (
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: 12,
                    }}
                  >
                    <h3 style={{ margin: '0 0 4px', fontSize: 13, color: 'rgba(232,220,200,0.85)' }}>
                      Add to {LAYER_LABEL[activeRing]} layer
                    </h3>
                    <p style={{ margin: '0 0 8px', fontSize: 11, color: 'rgba(232,220,200,0.6)' }}>
                      Filtered to species whose canopy layer is{' '}
                      <code>{activeRing}</code>. Companions of the anchor float
                      to the top.
                    </p>
                    {pickerSpecies.length === 0 ? (
                      <p className={styles.empty} style={{ padding: '6px 0' }}>
                        No more species available in this layer.
                      </p>
                    ) : (
                      <ul className={styles.list} style={{ maxHeight: 320, overflowY: 'auto' }}>
                        {pickerSpecies.map((p) => {
                          const fn = primaryFunction(p.ecologicalFunction);
                          return (
                            <li
                              key={p.id}
                              className={styles.listRow}
                              style={{ cursor: 'pointer' }}
                              onClick={() => addMember(p.id, activeRing)}
                            >
                              <div>
                                <strong>{p.commonName}</strong>
                                <div className={styles.listMeta}>
                                  {fn ? FUNCTION_SHORT[fn] : '—'} · {p.latinName}
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <div className={styles.btnRow}>
                      <button
                        type="button"
                        className={styles.btn}
                        onClick={() => setActiveRing(null)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}

                {!pickAnchor && !activeRing && (
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 8,
                      padding: 12,
                      fontSize: 12,
                      color: 'rgba(232,220,200,0.7)',
                      lineHeight: 1.55,
                    }}
                  >
                    <strong style={{ color: 'rgba(232,220,200,0.95)' }}>
                      How to compose
                    </strong>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                      <li>Click the centre disc to pick / change the anchor.</li>
                      <li>Click any ring to add a companion at that layer.</li>
                      <li>Click a member dot to remove it.</li>
                    </ul>
                    <hr
                      style={{
                        border: 0,
                        borderTop: '1px solid rgba(255,255,255,0.08)',
                        margin: '10px 0',
                      }}
                    />
                    <strong style={{ color: 'rgba(232,220,200,0.95)' }}>
                      Function chips
                    </strong>
                    <div style={{ marginTop: 4 }}>
                      N-fix · Poll · Acc · Ins · Wild · Edible · Med · Timber · Fodder
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.btnRow} style={{ marginTop: 12 }}>
              <button type="button" className={styles.btn} onClick={startNewGuild}>
                + New guild
              </button>
              <button
                type="button"
                className={styles.btn}
                onClick={snapAllToRings}
                disabled={!anyMemberPositioned}
                title={
                  anyMemberPositioned
                    ? 'Clear every member position; layout snaps back to layer rings.'
                    : 'No dragged members to snap.'
                }
              >
                Snap all to rings
              </button>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => active && removeGuild(active.id)}
              >
                Delete guild
              </button>
            </div>
          </>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Parcel placement</h2>
        <p className={styles.empty} style={{ textAlign: 'left', padding: '6px 0' }}>
          Read-only locator for guild centroids. Drop a new guild on the
          map via the rail's Guild tool. The blue arrow shows downslope
          water flow {aspect
            ? <>(elevation: aspect <b>{aspect}</b>{
                typeof meanSlope === 'number'
                  ? <>, mean slope <b>{meanSlope.toFixed(1)}°</b></>
                  : null
              })</>
            : <>(generic — run an elevation fetch in Observe to wire the real vector).</>}
        </p>
        <svg
          viewBox="0 0 400 320"
          style={{
            width: '100%',
            height: 'auto',
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
          }}
        >
          <rect x={20} y={20} width={360} height={280}
            fill="none"
            stroke="rgba(230,195,74,0.7)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <text x={28} y={36} fontSize={10} fill="rgba(232,220,200,0.6)">
            parcel (schematic)
          </text>
          <defs>
            <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5"
              markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(120,180,210,0.85)" />
            </marker>
          </defs>
          <line
            x1={arrowFrom.x} y1={arrowFrom.y}
            x2={arrowTo.x}   y2={arrowTo.y}
            stroke="rgba(120,180,210,0.85)"
            strokeWidth={2}
            markerEnd="url(#flow-arrow)"
          />
          <text x={arrowTo.x + 8} y={arrowTo.y - 6} fontSize={10}
            fill="rgba(120,180,210,0.85)">{arrowLabel}</text>
          {guilds.map((g) => {
            let u: number | undefined;
            let v: number | undefined;
            if (g.centroidUv) {
              u = g.centroidUv[0];
              v = g.centroidUv[1];
            } else {
              const m = g.notes?.match(/centroidUv:([\d.]+),([\d.]+)/);
              if (m) { u = Number(m[1]); v = Number(m[2]); }
            }
            if (u === undefined || v === undefined) return null;
            const cxg = 20 + u * 360;
            const cyg = 20 + v * 280;
            const isActive = g.id === activeGuildId;
            return (
              <g
                key={g.id}
                opacity={isActive ? 1 : 0.55}
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setActiveGuildId(g.id);
                  setActiveRing(null);
                  setPickAnchor(false);
                }}
              >
                <circle
                  cx={cxg}
                  cy={cyg}
                  r={isActive ? 9 : 6}
                  fill={isActive ? 'rgba(230,195,74,0.6)' : 'rgba(140,180,120,0.45)'}
                  stroke={isActive ? 'rgba(230,195,74,1)' : 'rgba(180,210,150,0.8)'}
                  strokeWidth={1.5}
                />
                <text x={cxg + 10} y={cyg + 3} fontSize={9}
                  fill="rgba(232,220,200,0.7)">{g.name}</text>
              </g>
            );
          })}
        </svg>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Saved guilds ({guilds.length})</h2>
        {guilds.length === 0 ? (
          <p className={styles.empty}>No guilds composed yet.</p>
        ) : (
          <ul className={styles.list}>
            {guilds.map((g) => {
              const a = findSpecies(g.anchorSpeciesId);
              const isActive = g.id === activeGuildId;
              return (
                <li
                  key={g.id}
                  className={styles.listRow}
                  style={{
                    cursor: 'pointer',
                    outline: isActive ? '1px solid rgba(230,195,74,0.6)' : 'none',
                  }}
                  onClick={() => {
                    setActiveGuildId(g.id);
                    setActiveRing(null);
                    setPickAnchor(false);
                  }}
                >
                  <div>
                    <strong>{g.name}</strong>
                    <div className={styles.listMeta}>
                      Anchor: {a?.commonName ?? (g.anchorSpeciesId || '—')} · {g.members.length} member(s)
                    </div>
                  </div>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeGuild(g.id);
                    }}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
