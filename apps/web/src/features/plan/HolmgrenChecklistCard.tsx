/**
 * HolmgrenChecklistCard — PLAN Module 8.
 *
 * Twelve-principle self-assessment rubric. Each principle gets a free-text
 * justification, a multi-pick of linked features (zones / paths / structures
 * / transects / guilds / earthworks), and a status pill (unmet / partial /
 * met). Persisted via `principleCheckStore` keyed by project.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { HOLMGREN_PRINCIPLES } from '../../data/holmgrenPrinciples.js';
import {
  usePrincipleCheckStore,
  type PrincipleCheck,
  type PrincipleStatus,
} from '../../store/principleCheckStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import { usePathStore } from '../../store/pathStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useTopographyStore } from '../../store/topographyStore.js';
import { usePolycultureStore } from '../../store/polycultureStore.js';
import { useWaterSystemsStore } from '../../store/waterSystemsStore.js';
import styles from './planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

const STATUSES: Array<{ value: PrincipleStatus; label: string; cls: string }> = [
  { value: 'unmet',   label: 'Unmet',   cls: styles.pillUnmet ?? '' },
  { value: 'partial', label: 'Partial', cls: styles.pillPartial ?? '' },
  { value: 'met',     label: 'Met',     cls: styles.pillMet ?? '' },
];

export default function HolmgrenChecklistCard({ project }: Props) {
  const byProject = usePrincipleCheckStore((s) => s.byProject);
  const upsertCheck = usePrincipleCheckStore((s) => s.upsertCheck);

  const allZones = useZoneStore((s) => s.zones);
  const allPaths = usePathStore((s) => s.paths);
  const allStructures = useStructureStore((s) => s.structures);
  const allTransects = useTopographyStore((s) => s.transects);
  const allGuilds = usePolycultureStore((s) => s.guilds);
  const allEarthworks = useWaterSystemsStore((s) => s.earthworks);

  const checks = useMemo(() => byProject[project.id] ?? {}, [byProject, project.id]);

  const featureOptions = useMemo(() => {
    const pId = project.id;
    const out: Array<{ id: string; label: string }> = [];
    for (const z of allZones) if (z.projectId === pId) out.push({ id: z.id, label: `Zone · ${z.name || z.category}` });
    for (const p of allPaths) if (p.projectId === pId) out.push({ id: p.id, label: `Path · ${p.name || p.type}` });
    for (const s of allStructures) if (s.projectId === pId) out.push({ id: s.id, label: `Structure · ${s.name || s.type}` });
    for (const t of allTransects) if (t.projectId === pId) out.push({ id: t.id, label: `Transect · ${t.name}` });
    for (const g of allGuilds) if (g.projectId === pId) out.push({ id: g.id, label: `Guild · ${g.name}` });
    for (const e of allEarthworks) if (e.projectId === pId) out.push({ id: e.id, label: `Earthwork · ${e.type}` });
    return out;
  }, [project.id, allZones, allPaths, allStructures, allTransects, allGuilds, allEarthworks]);

  const metCount = useMemo(
    () => Object.values(checks).filter((c) => c.status === 'met').length,
    [checks],
  );
  const partialCount = useMemo(
    () => Object.values(checks).filter((c) => c.status === 'partial').length,
    [checks],
  );

  function patch(principleId: string, patchFields: Partial<PrincipleCheck>) {
    const existing = checks[principleId];
    const next: PrincipleCheck = {
      principleId,
      justification: existing?.justification ?? '',
      linkedFeatureIds: existing?.linkedFeatureIds ?? [],
      status: existing?.status ?? 'unmet',
      ...patchFields,
      updatedAt: new Date().toISOString(),
    };
    upsertCheck(project.id, next);
  }

  function toggleFeature(principleId: string, featureId: string) {
    const existing = checks[principleId];
    const linked = existing?.linkedFeatureIds ?? [];
    const nextLinked = linked.includes(featureId)
      ? linked.filter((id) => id !== featureId)
      : [...linked, featureId];
    patch(principleId, { linkedFeatureIds: nextLinked });
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 8 · Principle Verification</span>
        <h1 className={styles.title}>Holmgren 12-principle checklist</h1>
        <p className={styles.lede}>
          A running self-assessment of how this design responds to each of
          David Holmgren&apos;s twelve permaculture principles. Cite the design
          choices, link the features that prove it, and call the status.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Summary</h2>
        <div className={styles.statRow}><span>Met</span><span>{metCount} / 12</span></div>
        <div className={styles.statRow}><span>Partial</span><span>{partialCount} / 12</span></div>
        <div className={styles.statRow}><span>Unmet or unanswered</span><span>{12 - metCount - partialCount} / 12</span></div>
      </section>

      {HOLMGREN_PRINCIPLES.map((principle) => {
        const check = checks[principle.id];
        const status: PrincipleStatus = check?.status ?? 'unmet';
        const justification = check?.justification ?? '';
        const linked = check?.linkedFeatureIds ?? [];
        const statusMeta = STATUSES.find((s) => s.value === status)!;
        return (
          <section key={principle.id} className={styles.section}>
            <h2 className={styles.sectionTitle}>
              {principle.number}. {principle.title}
              <span className={`${styles.pill} ${statusMeta.cls}`} style={{ marginLeft: 8 }}>
                {statusMeta.label}
              </span>
            </h2>
            <p className={styles.lede} style={{ marginTop: 0 }}>{principle.prompt}</p>
            <p className={styles.listMeta} style={{ marginTop: 0 }}><em>e.g. {principle.example}</em></p>

            <label className={`${styles.field} ${styles.full}`}>
              <span>Justification</span>
              <textarea
                value={justification}
                onChange={(e) => patch(principle.id, { justification: e.target.value })}
                placeholder="How does this design respond to the principle?"
                rows={3}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </label>

            <div className={styles.btnRow}>
              {STATUSES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  className={styles.btn}
                  onClick={() => patch(principle.id, { status: s.value })}
                  style={status === s.value ? { borderColor: 'rgba(var(--color-gold-rgb), 0.6)' } : undefined}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {featureOptions.length > 0 && (
              <div className={styles.sectionBody} style={{ marginTop: 12 }}>
                <div className={styles.listMeta} style={{ marginBottom: 6 }}>
                  Linked features ({linked.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {featureOptions.map((f) => {
                    const on = linked.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleFeature(principle.id, f.id)}
                        className={styles.pill}
                        style={{
                          cursor: 'pointer',
                          background: on ? 'rgba(var(--color-gold-rgb), 0.18)' : 'rgba(0,0,0,0.2)',
                          borderColor: on ? 'rgba(var(--color-gold-rgb), 0.5)' : 'rgba(255,255,255,0.08)',
                          color: on ? 'rgba(var(--color-gold-rgb), 0.95)' : 'rgba(232,220,200,0.7)',
                        }}
                      >
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
