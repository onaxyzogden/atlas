/**
 * PrincipleCoverageMatrixCard — Plan Module 8 (Principle Verification), card 3/3.
 *
 * Per Permaculture Scholar verdict 2026-05-07
 * (`wiki/decisions/2026-05-07-atlas-plan-principles-scholar-keep-atlas.md`):
 * "A visualization that highlights ignored principles ... If a user has
 * linked 50 features to 'Obtain a Yield' but zero to 'Catch and Store
 * Energy', a missing-principle warning acts as a crucial feedback loop
 * prompting the designer to 'Apply Self-Regulation and Accept Feedback.'"
 *
 * This additive card pivots the same `principleCheckStore.byProject[
 * projectId]` data used by the Holmgren checklist, building a 12 × 6
 * coverage matrix: rows are Holmgren's 12 principles, columns are the
 * feature-type buckets the checklist already supports (Zone / Path /
 * Structure / Transect / Guild / Earthwork). Each cell counts how many
 * features of that type are linked to that principle's check.
 *
 * Surfaces three derived signals:
 *   - "Uncovered principles" — principles with zero linked features
 *   - "Underweight principles" — principles linked to only one feature type
 *   - "Dominant principles" — principles linked to ≥4 feature types
 *
 * Source: NotebookLM Permaculture Scholar (5aa3dcf3-…), 2026-05-07.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { HOLMGREN_PRINCIPLES } from '../../../../data/holmgrenPrinciples.js';
import { usePrincipleCheckStore } from '../../../../store/principleCheckStore.js';
import { useZoneStore } from '../../../../store/zoneStore.js';
import { usePathStore } from '../../../../store/pathStore.js';
import { useStructureStore } from '../../../../store/structureStore.js';
import { useTopographyStore } from '../../../../store/topographyStore.js';
import { usePolycultureStore } from '../../../../store/polycultureStore.js';
import { useWaterSystemsStore } from '../../../../store/waterSystemsStore.js';
import styles from '../../../../features/plan/planCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

type FeatureKind = 'zone' | 'path' | 'structure' | 'transect' | 'guild' | 'earthwork';

const FEATURE_COLS: Array<{ key: FeatureKind; label: string }> = [
  { key: 'zone',       label: 'Zones' },
  { key: 'path',       label: 'Paths' },
  { key: 'structure',  label: 'Structures' },
  { key: 'transect',   label: 'Transects' },
  { key: 'guild',      label: 'Guilds' },
  { key: 'earthwork',  label: 'Earthworks' },
];

export default function PrincipleCoverageMatrixCard({ project }: Props) {
  const byProject = usePrincipleCheckStore((s) => s.byProject);
  const checks = useMemo(() => byProject[project.id] ?? {}, [byProject, project.id]);

  const allZones = useZoneStore((s) => s.zones);
  const allPaths = usePathStore((s) => s.paths);
  const allStructures = useStructureStore((s) => s.structures);
  const allTransects = useTopographyStore((s) => s.transects);
  const allGuilds = usePolycultureStore((s) => s.guilds);
  const allEarthworks = useWaterSystemsStore((s) => s.earthworks);

  // Build a fast id → kind map scoped to this project, so we can
  // classify each linkedFeatureId without N×M scans.
  const idToKind = useMemo(() => {
    const m = new Map<string, FeatureKind>();
    const pId = project.id;
    for (const z of allZones)      if (z.projectId === pId) m.set(z.id, 'zone');
    for (const p of allPaths)      if (p.projectId === pId) m.set(p.id, 'path');
    for (const s of allStructures) if (s.projectId === pId) m.set(s.id, 'structure');
    for (const t of allTransects)  if (t.projectId === pId) m.set(t.id, 'transect');
    for (const g of allGuilds)     if (g.projectId === pId) m.set(g.id, 'guild');
    for (const e of allEarthworks) if (e.projectId === pId) m.set(e.id, 'earthwork');
    return m;
  }, [project.id, allZones, allPaths, allStructures, allTransects, allGuilds, allEarthworks]);

  // 12 × 6 matrix (principle id → feature kind → count of linked features)
  const matrix = useMemo(() => {
    const out = new Map<string, Map<FeatureKind, number>>();
    for (const principle of HOLMGREN_PRINCIPLES) {
      const row = new Map<FeatureKind, number>();
      for (const col of FEATURE_COLS) row.set(col.key, 0);
      const linked = checks[principle.id]?.linkedFeatureIds ?? [];
      for (const id of linked) {
        const kind = idToKind.get(id);
        if (!kind) continue;
        row.set(kind, (row.get(kind) ?? 0) + 1);
      }
      out.set(principle.id, row);
    }
    return out;
  }, [checks, idToKind]);

  const summary = useMemo(() => {
    const uncovered: string[] = [];
    const underweight: string[] = [];
    const dominant: string[] = [];
    for (const principle of HOLMGREN_PRINCIPLES) {
      const row = matrix.get(principle.id);
      if (!row) continue;
      let totalLinks = 0;
      let typesUsed = 0;
      for (const col of FEATURE_COLS) {
        const c = row.get(col.key) ?? 0;
        totalLinks += c;
        if (c > 0) typesUsed += 1;
      }
      const label = `${principle.number}. ${principle.title}`;
      if (totalLinks === 0) uncovered.push(label);
      else if (typesUsed === 1) underweight.push(label);
      else if (typesUsed >= 4) dominant.push(label);
    }
    return { uncovered, underweight, dominant };
  }, [matrix]);

  // For per-cell intensity colouring: max cell across the matrix.
  const maxCell = useMemo(() => {
    let max = 0;
    for (const row of matrix.values()) {
      for (const v of row.values()) if (v > max) max = v;
    }
    return max;
  }, [matrix]);

  function cellBg(count: number): string {
    if (count === 0 || maxCell === 0) return 'transparent';
    const intensity = count / maxCell;
    return `rgba(var(--color-gold-rgb), ${0.1 + intensity * 0.45})`;
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Plan · Module 8 · Principle Verification</span>
        <h1 className={styles.title}>Principle × feature coverage</h1>
        <p className={styles.lede}>
          A 12 × 6 grid of which feature types you've cited as evidence for
          each principle. Empty rows are an honest signal that the design
          isn't yet responding to that principle — exactly the feedback
          loop principle 4 asks for.
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Coverage signals</h2>

        <div className={styles.statRow}>
          <span>Uncovered principles</span>
          <span>{summary.uncovered.length} / 12</span>
        </div>
        {summary.uncovered.length > 0 && (
          <p className={styles.listMeta} style={{ marginTop: 4 }}>
            {summary.uncovered.join(' · ')}
          </p>
        )}

        <div className={styles.statRow} style={{ marginTop: 10 }}>
          <span>Underweight (one feature type only)</span>
          <span>{summary.underweight.length} / 12</span>
        </div>
        {summary.underweight.length > 0 && (
          <p className={styles.listMeta} style={{ marginTop: 4 }}>
            {summary.underweight.join(' · ')}
          </p>
        )}

        <div className={styles.statRow} style={{ marginTop: 10 }}>
          <span>Well-integrated (≥4 feature types)</span>
          <span>{summary.dominant.length} / 12</span>
        </div>
        {summary.dominant.length > 0 && (
          <p className={styles.listMeta} style={{ marginTop: 4 }}>
            {summary.dominant.join(' · ')}
          </p>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Matrix</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>Principle</th>
                {FEATURE_COLS.map((c) => (
                  <th key={c.key} style={{ textAlign: 'center', padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HOLMGREN_PRINCIPLES.map((principle) => {
                const row = matrix.get(principle.id);
                return (
                  <tr key={principle.id}>
                    <td style={{ padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'top' }}>
                      <strong>{principle.number}. {principle.title}</strong>
                    </td>
                    {FEATURE_COLS.map((c) => {
                      const v = row?.get(c.key) ?? 0;
                      return (
                        <td key={c.key} style={{
                          padding: '8px 10px',
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          textAlign: 'center',
                          fontVariantNumeric: 'tabular-nums',
                          background: cellBg(v),
                          opacity: v === 0 ? 0.45 : 1,
                        }}>
                          {v}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
