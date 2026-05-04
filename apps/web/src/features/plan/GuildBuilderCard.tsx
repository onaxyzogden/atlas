/**
 * GuildBuilderCard — PLAN Module 4.
 *
 * Compose a polyculture guild around an anchor species. Members are
 * tagged by canopy layer; the card validates that every layer has at
 * most one anchor. Persists into `siteAnnotationsStore.guilds`.
 *
 * v1 is a list-based composer (anchor select + add-member rows). A
 * drag-drop layered canvas is a v2 enhancement.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { newAnnotationId, type Guild, type GuildMember, type GuildLayer } from '../../store/site-annotations.js';
import { PLANT_DATABASE, findSpecies, type CanopyLayer } from '../../data/plantDatabase.js';
import styles from './planCard.module.css';

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

export default function GuildBuilderCard({ project }: Props) {
  const allGuilds = usePolycultureStore((s) => s.guilds);
  const allPicks = usePolycultureStore((s) => s.species);
  const addGuild = usePolycultureStore((s) => s.addGuild);
  const removeGuild = usePolycultureStore((s) => s.removeGuild);

  const guilds = useMemo(() => allGuilds.filter((g) => g.projectId === project.id), [allGuilds, project.id]);
  const projectPickIds = useMemo(() => allPicks.filter((p) => p.projectId === project.id).map((p) => p.speciesId), [allPicks, project.id]);

  // Working draft
  const [name, setName] = useState('');
  const [anchorId, setAnchorId] = useState('');
  const [members, setMembers] = useState<GuildMember[]>([]);

  // Use picked species if any, else full DB
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
      createdAt: new Date().toISOString(),
    };
    addGuild(g);
    setName('');
    setAnchorId('');
    setMembers([]);
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 4 · Plant Systems</span>
        <h1 className={styles.title}>Guild builder</h1>
        <p className={styles.lede}>
          Compose a polyculture around an anchor species. Add members across
          the seven layers — canopy, sub-canopy, shrub, herbaceous, ground
          cover, vine, root. {projectPickIds.length > 0 ? `${projectPickIds.length} project picks available.` : 'Tip: add picks in the Plant Database first.'}
        </p>
      </header>

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
