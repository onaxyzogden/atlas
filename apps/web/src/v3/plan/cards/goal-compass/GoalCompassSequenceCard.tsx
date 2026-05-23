/**
 * Goal Compass — Build sequence (OLOS gap #7).
 *
 * Visualizes the deterministic sequencing engine's output as a Yeomans
 * permanence swimlane: bands climate → soil top-to-bottom, one node per
 * selected intervention in build order, dependency arcs between an
 * intervention and any prerequisite that is also selected, plus a
 * "considered but not scheduled" readout surfacing the engine's
 * `skipped[]` reasons (otherwise discarded by the Proposal tab).
 *
 * Read-only. Re-runs the *pure* engine in a useMemo (mirroring
 * `GeneratedPlanTab`) rather than reading `phaseStore`, because the
 * dependency arcs need intervention-level `prerequisites`, which are
 * flattened away when the engine lowers to BuildPhase/PhaseTask rows.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../../../store/projectStore.js';
import { useGoalTreeStore } from '../../../../store/goalTreeStore.js';
import { useSiteProfileStore } from '../../../../store/siteProfileStore.js';
import { runSequencingEngine } from '../../engine/goalCompass/sequencingEngine.js';
import { buildSequenceLayout, LAYOUT } from '../../engine/goalCompass/goalCompassSequenceLayout.js';
import { INTERVENTION_CATALOG } from '../../data/interventionCatalog.js';
import styles from '../../../_shared/stageCard/stageCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

function fmtUSD(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

export default function GoalCompassSequenceCard({ project }: Props) {
  const goalTree = useGoalTreeStore((s) => s.goalTreesByProject[project.id] ?? null);
  const excludedIds = useGoalTreeStore(
    (s) => s.excludedInterventionsByProject[project.id],
  );
  const siteProfile = useSiteProfileStore(
    (s) => s.profilesByProject[project.id] ?? null,
  );

  const filteredCatalog = useMemo(() => {
    const excluded = new Set(excludedIds ?? []);
    if (excluded.size === 0) return INTERVENTION_CATALOG;
    return INTERVENTION_CATALOG.filter((i) => !excluded.has(i.id));
  }, [excludedIds]);

  const result = useMemo(() => {
    if (!goalTree || !siteProfile) return null;
    return runSequencingEngine(goalTree, siteProfile, project.id, filteredCatalog);
  }, [goalTree, siteProfile, project.id, filteredCatalog]);

  const layout = useMemo(
    () => (result ? buildSequenceLayout(result.selected, result.generatedPhases) : null),
    [result],
  );

  const [hovered, setHovered] = useState<string | null>(null);

  const nodeById = useMemo(
    () => new Map((layout?.nodes ?? []).map((n) => [n.id, n])),
    [layout],
  );

  return (
    <div className={styles.page}>
      <div className={styles.hero} data-stage="plan">
        <span className={styles.heroTag}>Goal Compass · Build sequence</span>
        <h2 className={styles.title}>Build sequence</h2>
        <p className={styles.lede}>
          The same deterministic sequencing engine that fills the Proposal,
          read as a dependency graph on the Yeomans Scale of Permanence — most
          permanent at the top (climate), most malleable at the bottom (soil).
          Each node sits in build order; arrows point from a prerequisite to the
          work it unblocks.
        </p>
      </div>

      {!goalTree || !siteProfile ? (
        <div className={styles.empty}>
          Fill the <strong>Goal tree</strong> + <strong>Site profile</strong> tabs
          first — the sequence is generated from them.
        </div>
      ) : !layout || layout.nodes.length === 0 ? (
        <div className={styles.empty}>
          No interventions selected yet. Generate a proposal on the{' '}
          <strong>Proposal</strong> tab, or relax site constraints.
        </div>
      ) : (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Permanence ladder &amp; dependencies</h3>
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            style={{
              width: '100%',
              height: 'auto',
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
            }}
          >
            <defs>
              <marker
                id="gc-seq-arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(212,182,99,0.85)" />
              </marker>
            </defs>

            {/* Bands — one swimlane per used phase. */}
            {layout.bands.map((band) => (
              <g key={band.phaseKey}>
                <rect
                  x={0}
                  y={band.y}
                  width={layout.width}
                  height={band.height}
                  fill={band.color}
                  fillOpacity={0.1}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth={1}
                />
                <text
                  x={12}
                  y={band.centerY - 4}
                  fontSize={11}
                  fontWeight={700}
                  fill="rgba(232,220,200,0.92)"
                >
                  {band.index + 1}. {band.label}
                </text>
                <text
                  x={12}
                  y={band.centerY + 12}
                  fontSize={9}
                  fill="rgba(232,220,200,0.5)"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  {band.phaseKey}
                </text>
              </g>
            ))}

            {/* Edges — prerequisite → dependent (only when both selected). */}
            {layout.edges.map((edge) => {
              const from = nodeById.get(edge.fromId);
              const to = nodeById.get(edge.toId);
              if (!from || !to) return null;
              const midX = (from.x + to.x) / 2;
              const active = hovered === edge.fromId || hovered === edge.toId;
              return (
                <path
                  key={`${edge.fromId}->${edge.toId}`}
                  d={`M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`}
                  stroke={
                    active ? 'rgba(212,182,99,0.95)' : 'rgba(212,182,99,0.4)'
                  }
                  strokeWidth={active ? 2 : 1.3}
                  fill="none"
                  markerEnd="url(#gc-seq-arrow)"
                >
                  <title>
                    {from.name} → {to.name} (prerequisite)
                  </title>
                </path>
              );
            })}

            {/* Nodes — one per selected intervention. */}
            {layout.nodes.map((node) => {
              const band = layout.bands.find((b) => b.phaseKey === node.phaseKey);
              const active = hovered === node.id;
              return (
                <g
                  key={node.id}
                  onMouseEnter={() => setHovered(node.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{ cursor: 'default' }}
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={active ? LAYOUT.nodeRadius + 2 : LAYOUT.nodeRadius}
                    fill={band?.color ?? 'rgba(212,182,99,0.8)'}
                    stroke="rgba(0,0,0,0.45)"
                    strokeWidth={1}
                  />
                  {/* Start-year badge. */}
                  <text
                    x={node.x}
                    y={node.y + 3}
                    fontSize={8}
                    textAnchor="middle"
                    fill="rgba(20,16,12,0.95)"
                    style={{ fontVariantNumeric: 'tabular-nums', pointerEvents: 'none' }}
                  >
                    Y{node.startYearOffset}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + LAYOUT.nodeRadius + 13}
                    fontSize={10}
                    textAnchor="middle"
                    fill="rgba(232,220,200,0.9)"
                  >
                    {node.name.length > 22 ? `${node.name.slice(0, 21)}…` : node.name}
                  </text>
                  <title>
                    {node.name}
                    {'\n'}Phase: {node.phaseKey} · starts Year {node.startYearOffset}
                    {'\n'}Labor: {node.laborHrsTotal} hrs · Cost: {fmtUSD(node.costMidUSD)}
                    {node.prerequisites.length > 0
                      ? `\nPrerequisites: ${node.prerequisites.join(', ')}`
                      : '\nNo prerequisites'}
                  </title>
                </g>
              );
            })}
          </svg>
          <p className={styles.hint} style={{ marginTop: 8 }}>
            {layout.nodes.length} interventions · {layout.edges.length} dependencies ·
            hover a node for labor, cost &amp; prerequisites.
          </p>
        </section>
      )}

      {result && result.skipped.length > 0 ? (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Considered but not scheduled</h3>
          <p className={styles.lede} style={{ marginBottom: 8 }}>
            The engine evaluated these interventions and left them out — the
            reasoning, surfaced for transparency.
          </p>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Intervention</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {result.skipped.map((s) => (
                <tr key={s.intervention.id}>
                  <td>
                    <strong>{s.intervention.name}</strong>
                  </td>
                  <td style={{ color: 'rgba(232,220,200,0.7)' }}>{s.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
