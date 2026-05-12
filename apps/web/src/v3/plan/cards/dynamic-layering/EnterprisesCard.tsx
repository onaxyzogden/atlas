/**
 * EnterprisesCard — Plan Module 1 (Dynamic Layering & Permanence), card 3/3.
 *
 * Lets the steward declare the enterprises they intend to run on this site
 * (e.g. "Olive grove", "Retreat lodging", "Apiary", "Educational tours")
 * and pick a colour for each. Once an enterprise exists, every persisted
 * Plan-stage feature can be tagged with it via the inline popover, and the
 * "Enterprise lens" in the left rail recolours every feature by enterprise
 * tag — surfacing the multi-enterprise project type's #1 prompt:
 * "which enterprise does each feature belong to?"
 *
 * Lives under Dynamic Layering because it's a *cross-cutting view* (a lens
 * over already-placed features), not a draw tool. The Yeomans lens and
 * the Enterprise lens are siblings — both reskin the map, both live in
 * Module 1.
 */

import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import { useEnterpriseStore } from '../../../../store/enterpriseStore.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { usePathStore } from '../../../../store/pathStore.js';
import { useStructureStore } from '../../../../store/structureStore.js';
import { useCropStore } from '../../../../store/cropStore.js';
import { usePolycultureStore } from '../../../../store/polycultureStore.js';
import { useClosedLoopStore } from '../../../../store/closedLoopStore.js';
import { useLivestockStore } from '../../../../store/livestockStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

// 8 starter colours (warm earth → cool steel → vegetation green → amber)
// chosen so adjacent enterprises in the picker don't clash visually.
const ENTERPRISE_COLORS = [
  '#a06b48', // clay
  '#3a8fb7', // water blue
  '#3d8a3d', // forest green
  '#d4a25a', // amber
  '#9b6dc6', // violet
  '#c0a85c', // wheat
  '#5d8a8d', // teal
  '#d68bd0', // pollinator pink
] as const;

function nextColor(used: string[]): string {
  for (const c of ENTERPRISE_COLORS) {
    if (!used.includes(c)) return c;
  }
  return ENTERPRISE_COLORS[0];
}

export default function EnterprisesCard({ project }: Props) {
  const projectId = project.id;
  const allEnterprises = useEnterpriseStore((s) => s.enterprises);
  const addEnterprise = useEnterpriseStore((s) => s.addEnterprise);
  const updateEnterprise = useEnterpriseStore((s) => s.updateEnterprise);
  const removeEnterprise = useEnterpriseStore((s) => s.removeEnterprise);

  const enterprises = useMemo(
    () => allEnterprises.filter((e) => e.projectId === projectId),
    [allEnterprises, projectId],
  );

  // Tag-count per enterprise across every placeable store. Surfaces the
  // "which enterprises actually have features?" question without needing
  // the lens to be on.
  const zones = useZoneStore((s) => s.zones);
  const paths = usePathStore((s) => s.paths);
  const structures = useStructureStore((s) => s.structures);
  const crops = useCropStore((s) => s.cropAreas);
  const guilds = usePolycultureStore((s) => s.guilds);
  const fertility = useClosedLoopStore((s) => s.fertilityInfra);
  const paddocks = useLivestockStore((s) => s.paddocks);
  const waterNodes = useWaterSystemsStore((s) => s.waterNodes);

  const featureCount = useMemo(() => {
    const m = new Map<string, number>();
    const bump = (id: string | undefined) => {
      if (!id) return;
      m.set(id, (m.get(id) ?? 0) + 1);
    };
    for (const z of zones) if (z.projectId === projectId) bump(z.enterprise);
    for (const p of paths) if (p.projectId === projectId) bump(p.enterprise);
    for (const s of structures) if (s.projectId === projectId) bump(s.enterprise);
    for (const c of crops) if (c.projectId === projectId) bump(c.enterprise);
    for (const g of guilds) if (g.projectId === projectId) bump(g.enterprise);
    for (const f of fertility) if (f.projectId === projectId) bump(f.enterprise);
    for (const pd of paddocks) if (pd.projectId === projectId) bump(pd.enterprise);
    for (const n of waterNodes) if (n.projectId === projectId) bump(n.enterprise);
    return m;
  }, [zones, paths, structures, crops, guilds, fertility, paddocks, waterNodes, projectId]);

  const [draftName, setDraftName] = useState('');

  const onAdd = () => {
    const name = draftName.trim();
    if (!name) return;
    addEnterprise({
      id: newAnnotationId('ent'),
      projectId,
      name,
      color: nextColor(enterprises.map((e) => e.color)),
      createdAt: new Date().toISOString(),
    });
    setDraftName('');
  };

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 1 · Layering</span>
        <h1 className={styles.title}>Enterprises</h1>
        <p className={styles.lede}>
          Declare the enterprises this site will run. Once added, every
          feature you draw on the map (paths, paddocks, crops, structures…)
          can be tagged with an enterprise from its popover. Toggle the
          <strong> Enterprise lens</strong> in the left rail to recolour
          every feature by its enterprise tag.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Add enterprise</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={draftName}
            placeholder="e.g. Olive grove, Retreat lodging, Apiary"
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onAdd();
              }
            }}
            style={{
              flex: 1,
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.04)',
              color: 'inherit',
              font: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={onAdd}
            disabled={!draftName.trim()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 12px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.18)',
              background: 'rgba(255,255,255,0.06)',
              color: 'inherit',
              font: 'inherit',
              cursor: draftName.trim() ? 'pointer' : 'not-allowed',
              opacity: draftName.trim() ? 1 : 0.5,
            }}
          >
            <Plus size={14} strokeWidth={1.6} />
            Add
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {enterprises.length === 0
            ? 'No enterprises yet'
            : `${enterprises.length} enterprise${enterprises.length === 1 ? '' : 's'}`}
        </h2>
        {enterprises.length === 0 ? (
          <p className={styles.lede} style={{ opacity: 0.6 }}>
            Add at least one enterprise above to start tagging features.
          </p>
        ) : (
          <ul className={styles.list}>
            {enterprises.map((e) => {
              const count = featureCount.get(e.id) ?? 0;
              return (
                <li key={e.id} className={styles.listRow} style={{ display: 'block' }}>
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      alignItems: 'center',
                    }}
                  >
                    <input
                      type="color"
                      value={e.color}
                      onChange={(ev) =>
                        updateEnterprise(e.id, { color: ev.target.value })
                      }
                      title="Pick enterprise colour"
                      style={{
                        width: 28,
                        height: 28,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    />
                    <input
                      type="text"
                      value={e.name}
                      onChange={(ev) =>
                        updateEnterprise(e.id, { name: ev.target.value })
                      }
                      style={{
                        flex: 1,
                        padding: '4px 8px',
                        borderRadius: 4,
                        border: '1px solid transparent',
                        background: 'transparent',
                        color: 'inherit',
                        font: 'inherit',
                        fontWeight: 600,
                      }}
                    />
                    <span
                      className={styles.listMeta}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {count} feature{count === 1 ? '' : 's'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          count === 0 ||
                          window.confirm(
                            `Remove enterprise "${e.name}"? ${count} feature${
                              count === 1 ? '' : 's'
                            } will become untagged.`,
                          )
                        ) {
                          removeEnterprise(e.id);
                        }
                      }}
                      title="Remove enterprise"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: 4,
                        borderRadius: 4,
                        border: '1px solid transparent',
                        background: 'transparent',
                        color: 'inherit',
                        cursor: 'pointer',
                        opacity: 0.6,
                      }}
                    >
                      <Trash2 size={14} strokeWidth={1.6} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
