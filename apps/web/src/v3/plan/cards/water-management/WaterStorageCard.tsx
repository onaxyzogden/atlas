/**
 * WaterStorageCard — Plan Module 2 (Water), card 2/3.
 *
 * Storage and swale nodes with MANDATORY overflow routing. Per Permaculture
 * Scholar verdict 2026-05-07 (verbatim):
 *   "Make sure OVERFLOW is noted for every RAIN BARREL, RAINGARDEN, SWALE,
 *    POND, or other WATER HARVESTING/STORAGE element."
 *
 * Each storage / swale node must declare an overflow target — another node
 * within the project, or the literal `offsite` (acknowledged loss). Nodes
 * with no overflow are flagged in the Network view (card 3).
 *
 * Sinks are also added here: they're the bottom of the chain — pond,
 * raingarden, drywell, or off-site terminus — where surplus is finally
 * absorbed.
 */

import { useEffect, useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import {
  useWaterSystemsStore,
  type WaterNode,
  type StorageNodeKind,
} from '../../../../store/waterSystemsStore.js';
import { newAnnotationId } from '../../../../store/site-annotations.js';
import {
  STORAGE_LABEL,
  effectiveCapacityL,
  formatLitres,
} from './waterMath.js';
import { usePhaseStoreCappedEntities } from '../../usePhaseStoreCappedEntities.js';
import EvidenceSection from '../../../../components/evidence/EvidenceSection.js';
import { selectEvidenceFor } from '@ogden/shared/evidence';
import { emitEvidenceAudit } from '../../../../lib/evidence/auditEmit.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
  /** Phase E.5 mobile guard for Evidence disclosures. */
  compactMode?: boolean;
}

type AddKind = 'storage' | 'swale' | 'sink';

export default function WaterStorageCard({ project, compactMode = false }: Props) {
  const all = useWaterSystemsStore((s) => s.waterNodes);
  const add = useWaterSystemsStore((s) => s.addWaterNode);
  const update = useWaterSystemsStore((s) => s.updateWaterNode);
  const remove = useWaterSystemsStore((s) => s.removeWaterNode);

  const projectNodes = useMemo(
    () => all.filter((n) => n.projectId === project.id),
    [all, project.id],
  );
  const targets = useMemo(
    () => projectNodes.filter((n) => n.kind !== 'catchment'),
    [projectNodes],
  );
  // The ledger of visible storage/swale/sink nodes is capped by the
  // year scrubber's `yeomansCapForYear(currentYear)` via the
  // phaseStore→Yeomans adapter. `targets` for the overflow dropdown stays uncapped on
  // purpose: you can still wire overflow into a node that's hidden by
  // the current view — caps are presentational, not data-deletion.
  // See wiki/decisions/2026-05-12-plan-phasestore-yeomans-adapter.md.
  const storageAndSwaleRaw = useMemo(
    () =>
      projectNodes.filter((n) => n.kind === 'storage' || n.kind === 'swale' || n.kind === 'sink'),
    [projectNodes],
  );
  const storageAndSwale = usePhaseStoreCappedEntities(storageAndSwaleRaw);

  const [addKind, setAddKind] = useState<AddKind>('storage');
  const [name, setName] = useState('');
  const [storageKind, setStorageKind] = useState<StorageNodeKind>('cistern');
  const [capacityL, setCapacityL] = useState<number>(5000);
  const [lengthM, setLengthM] = useState<number>(20);
  const [widthM, setWidthM] = useState<number>(0.6);
  const [depthM, setDepthM] = useState<number>(0.5);
  const [overflowTo, setOverflowTo] = useState<string>('');

  // Phase E.5 — Tier-2 Evidence inputs. Phase F.7.2 — emit audit.
  const evidenceInputs = useMemo(() => {
    const totalLitres = storageAndSwale.reduce(
      (sum, n) => sum + effectiveCapacityL(n),
      0,
    );
    const totalStorageM3 = totalLitres / 1000;
    const nodesByKind = storageAndSwale.reduce<Record<string, number>>(
      (acc, n) => {
        const key = n.kind === 'storage' && n.storageKind ? n.storageKind : n.kind;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      },
      {},
    );
    const overflowWarnings: string[] = [];
    for (const n of storageAndSwale) {
      if (n.kind === 'sink') continue;
      if (n.overflowToNodeId == null) {
        overflowWarnings.push(`${n.name}: overflow target not set`);
      }
    }
    return { totalStorageM3, nodesByKind, overflowWarnings };
  }, [storageAndSwale]);
  const evidenceItem = useMemo(
    () => selectEvidenceFor({ panelKey: 'water-storage', inputs: evidenceInputs }),
    [evidenceInputs],
  );
  useEffect(() => {
    if (!evidenceItem) return;
    emitEvidenceAudit({
      projectId: project.id,
      panelKey: 'WaterStorageCard',
      selectorName: 'selectEvidenceFor(water-storage)',
      inputs: evidenceInputs,
      output: evidenceItem,
    });
  }, [evidenceInputs, evidenceItem, project.id]);

  function commit() {
    if (!name.trim()) return;
    const base: WaterNode = {
      id: newAnnotationId('wn'),
      projectId: project.id,
      name: name.trim(),
      kind: addKind,
      overflowToNodeId:
        addKind === 'sink'
          ? null
          : overflowTo
            ? overflowTo === 'offsite'
              ? 'offsite'
              : overflowTo
            : null,
      createdAt: new Date().toISOString(),
    };
    if (addKind === 'storage') {
      base.storageKind = storageKind;
      base.capacityL = capacityL;
    } else if (addKind === 'swale') {
      base.swaleLengthM = lengthM;
      base.swaleWidthM = widthM;
      base.swaleDepthM = depthM;
    }
    add(base);
    setName('');
    setOverflowTo('');
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Plan · Module 2 · Water</span>
        <h1 className={styles.title}>Storage &amp; overflow routing</h1>
        <p className={styles.lede}>
          Every storage, swale, or rain garden node must declare where its
          overflow goes. The Scholar&rsquo;s rule: <em>note overflow for every
          rain barrel, rain garden, swale, pond, or harvesting element</em>.
          Orphans show up in the Network view as warnings.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Add node</h2>
        <div className={styles.btnRow}>
          {(['storage', 'swale', 'sink'] as AddKind[]).map((k) => (
            <button
              key={k}
              type="button"
              className={styles.btn}
              onClick={() => setAddKind(k)}
              style={{
                flex: 1,
                background: k === addKind ? 'rgba(120,180,210,0.3)' : undefined,
                borderColor: k === addKind ? 'rgba(120,180,210,0.7)' : undefined,
              }}
            >
              {k === 'storage' ? 'Storage' : k === 'swale' ? 'Swale' : 'Sink'}
            </button>
          ))}
        </div>

        <div className={styles.grid} style={{ marginTop: 12 }}>
          <label className={`${styles.field} ${styles.full}`}>
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                addKind === 'storage'
                  ? 'e.g. House cistern'
                  : addKind === 'swale'
                    ? 'e.g. Upper-slope swale'
                    : 'e.g. Lower drywell'
              }
            />
          </label>

          {addKind === 'storage' && (
            <>
              <label className={styles.field}>
                <span>Kind</span>
                <select
                  value={storageKind}
                  onChange={(e) => setStorageKind(e.target.value as StorageNodeKind)}
                >
                  {(Object.keys(STORAGE_LABEL) as StorageNodeKind[]).map((k) => (
                    <option key={k} value={k}>
                      {STORAGE_LABEL[k]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Capacity (L)</span>
                <input
                  type="number"
                  min={0}
                  step={100}
                  value={capacityL}
                  onChange={(e) => setCapacityL(Number(e.target.value) || 0)}
                />
              </label>
            </>
          )}

          {addKind === 'swale' && (
            <>
              <label className={styles.field}>
                <span>Length (m)</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={lengthM}
                  onChange={(e) => setLengthM(Number(e.target.value) || 0)}
                />
              </label>
              <label className={styles.field}>
                <span>Width (m)</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={widthM}
                  onChange={(e) => setWidthM(Number(e.target.value) || 0)}
                />
              </label>
              <label className={styles.field}>
                <span>Depth (m)</span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={depthM}
                  onChange={(e) => setDepthM(Number(e.target.value) || 0)}
                />
              </label>
              <div className={styles.statRow} style={{ gridColumn: '1 / -1' }}>
                <span>Computed capacity (L × W × D)</span>
                <span>
                  {formatLitres(lengthM * widthM * depthM * 1000)}
                </span>
              </div>
            </>
          )}

          {addKind !== 'sink' && (
            <label className={`${styles.field} ${styles.full}`}>
              <span>Overflow target (required)</span>
              <select
                value={overflowTo}
                onChange={(e) => setOverflowTo(e.target.value)}
              >
                <option value="">— pick a target —</option>
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.kind})
                  </option>
                ))}
                <option value="offsite">Off-site (acknowledged loss)</option>
              </select>
            </label>
          )}
        </div>

        <div className={styles.btnRow} style={{ marginTop: 8 }}>
          <button
            type="button"
            className={styles.btn}
            onClick={commit}
            disabled={
              !name.trim() ||
              (addKind !== 'sink' && !overflowTo) ||
              (addKind === 'storage' && capacityL <= 0)
            }
          >
            Add {addKind}
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Nodes ({storageAndSwale.length})
        </h2>
        {storageAndSwale.length === 0 ? (
          <p className={styles.empty}>No storage / swale / sink nodes yet.</p>
        ) : (
          <ul className={styles.list}>
            {storageAndSwale.map((n) => {
              const cap = effectiveCapacityL(n);
              const overflowName = (() => {
                if (n.overflowToNodeId === 'offsite') return 'off-site';
                if (n.overflowToNodeId == null) return null;
                const t = projectNodes.find((p) => p.id === n.overflowToNodeId);
                return t?.name ?? '?';
              })();
              return (
                <li key={n.id} className={styles.listRow}>
                  <div style={{ flex: 1 }}>
                    <strong>{n.name}</strong>
                    <span
                      style={{
                        marginLeft: 8,
                        padding: '1px 6px',
                        borderRadius: 4,
                        fontSize: 11,
                        background:
                          n.kind === 'storage'
                            ? 'rgba(120,180,210,0.25)'
                            : n.kind === 'swale'
                              ? 'rgba(140,180,120,0.25)'
                              : 'rgba(180,140,90,0.25)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      {n.kind}
                    </span>
                    <div className={styles.listMeta}>
                      {n.kind === 'storage' && n.storageKind
                        ? `${STORAGE_LABEL[n.storageKind]} · `
                        : ''}
                      {cap > 0 ? `cap ${formatLitres(cap)}` : 'no capacity set'}
                      {n.kind !== 'sink' && (
                        <>
                          {' · overflow → '}
                          {overflowName ?? (
                            <span style={{ color: 'rgba(220,140,120,0.95)' }}>
                              not set ⚠
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {n.kind !== 'sink' && (
                    <select
                      value={n.overflowToNodeId ?? ''}
                      onChange={(e) =>
                        update(n.id, {
                          overflowToNodeId:
                            e.target.value === ''
                              ? null
                              : e.target.value === 'offsite'
                                ? 'offsite'
                                : e.target.value,
                        })
                      }
                      style={{
                        background: 'rgba(0,0,0,0.25)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(232,220,200,0.92)',
                        padding: 6,
                        borderRadius: 6,
                      }}
                    >
                      <option value="">— pick —</option>
                      {targets
                        .filter((t) => t.id !== n.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      <option value="offsite">off-site</option>
                    </select>
                  )}
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => remove(n.id)}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Tier-2 Evidence (Phase E.5) ────────────────────────────── */}
      <EvidenceSection item={evidenceItem} compactMode={compactMode} />
    </div>
  );
}
