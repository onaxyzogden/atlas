/**
 * GuildSpatialBuilderCard — Plan Module 4, fresh build per Permaculture
 * Scholar verdict (2026-05-07).
 *
 * Atlas's anchor + members composer is preserved (members tagged by
 * canopy layer, persisted to `usePolycultureStore.guilds`). What the
 * Scholar required additionally: guilds become *spatial*, not list-only,
 * because tree placement "follows the patterns of water flow and access."
 *
 * v1 of the spatial pane: a unit-square parcel diagram with a generic
 * downslope water-flow arrow and a draggable guild-centroid marker. The
 * marker position is held in component state — store-schema extension to
 * persist `centroidUv: [u, v]` per guild is a follow-up ticket so this
 * card can ship without a migration.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { usePolycultureStore } from '../../../../store/polycultureStore.js';
import {
  newAnnotationId,
  type Guild,
  type GuildMember,
  type GuildLayer,
} from '../../../../store/site-annotations.js';
import {
  PLANT_DATABASE,
  findSpecies,
  type CanopyLayer,
} from '../../../../data/plantDatabase.js';
import styles from '../../../../features/plan/planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const GUILD_LAYERS: Array<{ value: GuildLayer; label: string }> = [
  { value: 'canopy',       label: 'Canopy' },
  { value: 'sub_canopy',   label: 'Sub-canopy' },
  { value: 'shrub',        label: 'Shrub' },
  { value: 'herbaceous',   label: 'Herbaceous' },
  { value: 'ground_cover', label: 'Ground cover' },
  { value: 'vine',         label: 'Vine' },
  { value: 'root',         label: 'Root' },
];

function layerLabel(l: CanopyLayer): string {
  return GUILD_LAYERS.find((g) => g.value === l)?.label ?? l;
}

export default function GuildSpatialBuilderCard({ project }: Props) {
  const allGuilds = usePolycultureStore((s) => s.guilds);
  const allPicks = usePolycultureStore((s) => s.species);
  const addGuild = usePolycultureStore((s) => s.addGuild);
  const removeGuild = usePolycultureStore((s) => s.removeGuild);

  const guilds = useMemo(
    () => allGuilds.filter((g) => g.projectId === project.id),
    [allGuilds, project.id],
  );
  const projectPickIds = useMemo(
    () =>
      allPicks
        .filter((p) => p.projectId === project.id)
        .map((p) => p.speciesId),
    [allPicks, project.id],
  );

  const [name, setName] = useState('');
  const [anchorId, setAnchorId] = useState('');
  const [members, setMembers] = useState<GuildMember[]>([]);
  // Spatial centroid in unit-square parcel coords (0..1, top-left origin).
  const [centroid, setCentroid] = useState<[number, number]>([0.5, 0.5]);

  const speciesPool = useMemo(() => {
    if (projectPickIds.length > 0) {
      return PLANT_DATABASE.filter((p) => projectPickIds.includes(p.id));
    }
    return PLANT_DATABASE;
  }, [projectPickIds]);

  function addMember() {
    setMembers((m) => [...m, { speciesId: speciesPool[0]?.id ?? '', layer: 'shrub' }]);
  }
  function updateMember(idx: number, patch: Partial<GuildMember>) {
    setMembers((m) => m.map((mem, i) => (i === idx ? { ...mem, ...patch } : mem)));
  }
  function removeMember(idx: number) {
    setMembers((m) => m.filter((_, i) => i !== idx));
  }

  function commit() {
    if (!name.trim() || !anchorId) return;
    const g: Guild = {
      id: newAnnotationId('gld'),
      projectId: project.id,
      name: name.trim(),
      anchorSpeciesId: anchorId,
      members: members.filter((m) => m.speciesId),
      centroidUv: [centroid[0], centroid[1]],
      createdAt: new Date().toISOString(),
    };
    addGuild(g);
    setName('');
    setAnchorId('');
    setMembers([]);
    setCentroid([0.5, 0.5]);
  }

  function handleParcelClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const u = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const v = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    setCentroid([u, v]);
  }

  // Generic downslope arrow — points from north (top) to south (bottom).
  // TODO: wire to the real slope vector from siteDataStore once aspect
  // raster is available per project.
  const arrowFrom = { x: 200, y: 30 };
  const arrowTo   = { x: 200, y: 290 };

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 4 · Plant Systems</span>
        <h1 className={styles.title}>Guild builder · spatial</h1>
        <p className={styles.lede}>
          Compose a polyculture around an anchor species, then place its
          centroid on the parcel diagram so the guild responds to the
          site’s water-flow and access patterns.{' '}
          {projectPickIds.length > 0
            ? `${projectPickIds.length} project picks available.`
            : 'Tip: add picks in the Plant Database first.'}
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Parcel placement</h2>
        <p className={styles.empty} style={{ textAlign: 'left', padding: '6px 0' }}>
          Click anywhere on the parcel to set the guild centroid. The blue
          arrow shows generic downslope flow (TODO: pull true slope vector
          from <code>siteDataStore</code>).
        </p>
        <svg
          viewBox="0 0 400 320"
          onClick={handleParcelClick}
          style={{
            width: '100%',
            height: 'auto',
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            cursor: 'crosshair',
          }}
        >
          {/* Parcel boundary placeholder */}
          <rect x={20} y={20} width={360} height={280}
            fill="none"
            stroke="rgba(230,195,74,0.7)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          <text x={28} y={36} fontSize={10} fill="rgba(232,220,200,0.6)">
            parcel (schematic)
          </text>

          {/* Water-flow arrow */}
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
            fill="rgba(120,180,210,0.85)">water flow</text>

          {/* Existing saved guild centroids on this project */}
          {guilds.map((g) => {
            let u: number | undefined;
            let v: number | undefined;
            if (g.centroidUv) {
              u = g.centroidUv[0];
              v = g.centroidUv[1];
            } else {
              // Legacy fallback: pre-2026-05-07 entries encoded in notes.
              const m = g.notes?.match(/centroidUv:([\d.]+),([\d.]+)/);
              if (m) { u = Number(m[1]); v = Number(m[2]); }
            }
            if (u === undefined || v === undefined) return null;
            const cx = 20 + u * 360;
            const cy = 20 + v * 280;
            return (
              <g key={g.id} opacity={0.6}>
                <circle cx={cx} cy={cy} r={6}
                  fill="rgba(140,180,120,0.45)"
                  stroke="rgba(180,210,150,0.8)"
                />
                <text x={cx + 8} y={cy + 3} fontSize={9}
                  fill="rgba(232,220,200,0.7)">{g.name}</text>
              </g>
            );
          })}

          {/* Working draft centroid */}
          <circle
            cx={20 + centroid[0] * 360}
            cy={20 + centroid[1] * 280}
            r={9}
            fill="rgba(230,195,74,0.6)"
            stroke="rgba(230,195,74,1)"
            strokeWidth={1.5}
          />
        </svg>
        <div className={styles.statRow}>
          <span>Centroid (u, v)</span>
          <span>{centroid[0].toFixed(2)}, {centroid[1].toFixed(2)}</span>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Compose new guild</h2>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Guild name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Apple guild — north slope" />
          </label>
          <label className={styles.field}>
            <span>Anchor species</span>
            <select value={anchorId} onChange={(e) => setAnchorId(e.target.value)}>
              <option value="">— select anchor —</option>
              {speciesPool.map((p) => (
                <option key={p.id} value={p.id}>{p.commonName} ({layerLabel(p.layer)})</option>
              ))}
            </select>
          </label>
        </div>

        <h3 style={{ fontSize: 13, color: 'rgba(232,220,200,0.7)', margin: '16px 0 8px' }}>
          Supporting members ({members.length})
        </h3>
        <ul className={styles.list}>
          {members.map((m, i) => (
            <li key={i} className={styles.listRow}>
              <select
                value={m.speciesId}
                onChange={(e) => updateMember(i, { speciesId: e.target.value })}
                style={{ flex: 1, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(232,220,200,0.92)', padding: 6, borderRadius: 6 }}
              >
                {speciesPool.map((p) => <option key={p.id} value={p.id}>{p.commonName}</option>)}
              </select>
              <select
                value={m.layer}
                onChange={(e) => updateMember(i, { layer: e.target.value as GuildLayer })}
                style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(232,220,200,0.92)', padding: 6, borderRadius: 6 }}
              >
                {GUILD_LAYERS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <button type="button" className={styles.removeBtn} onClick={() => removeMember(i)}>×</button>
            </li>
          ))}
        </ul>
        <div className={styles.btnRow}>
          <button type="button" className={styles.btn} onClick={addMember}>+ Add member</button>
          <button type="button" className={styles.btn} onClick={commit} disabled={!name.trim() || !anchorId}>Save guild</button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Saved guilds ({guilds.length})</h2>
        {guilds.length === 0 ? (
          <p className={styles.empty}>No guilds composed yet.</p>
        ) : (
          <ul className={styles.list}>
            {guilds.map((g) => {
              const anchor = findSpecies(g.anchorSpeciesId);
              return (
                <li key={g.id} className={styles.listRow}>
                  <div>
                    <strong>{g.name}</strong>
                    <div className={styles.listMeta}>
                      Anchor: {anchor?.commonName ?? g.anchorSpeciesId} · {g.members.length} member(s)
                    </div>
                  </div>
                  <button type="button" className={styles.removeBtn} onClick={() => removeGuild(g.id)}>Remove</button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
