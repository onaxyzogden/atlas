/**
 * RelationshipsRail — small floating readout shown only when the
 * relationships view is active. Displays:
 * - Integration score (0–100, derived from `integrationScoreFromEdges`).
 *   Phase 3 lifts the weight to 0.10 in the overall scoring pipeline.
 * - List of orphan outputs (resources produced but not routed to any
 *   sink) so the designer can see what's still leaking.
 *
 * Phase 2 of the Needs & Yields rollout. Gated by FEATURE_RELATIONSHIPS.
 */

import { useMemo } from 'react';
import { FLAGS } from '@ogden/shared';
import {
  orphanOutputs,
  integrationScoreFromEdges,
  type PlacedEntity,
} from '@ogden/shared/relationships';
import { useRelationshipsStore } from '../../store/relationshipsStore.js';
import { useProjectStore } from '../../store/projectStore.js';
import { useAllPlacedEntities } from '../../lib/relationships/useAllPlacedEntities.js';
import { mapZIndex } from '../../lib/tokens.js';

export default function RelationshipsRail() {
  const viewActive = useRelationshipsStore((s) => s.viewActive);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const edges = useRelationshipsStore((s) =>
    activeProjectId ? s.edgesByProject[activeProjectId] ?? [] : [],
  );
  const placed = useAllPlacedEntities();

  const entities = useMemo<PlacedEntity[]>(
    () => placed.map((p) => ({ id: p.id, type: p.type })),
    [placed],
  );

  const orphans = useMemo(() => orphanOutputs(entities, edges), [entities, edges]);
  const score = useMemo(() => integrationScoreFromEdges(entities, edges), [entities, edges]);

  if (!FLAGS.RELATIONSHIPS || !viewActive) return null;

  const namesById = new Map(placed.map((p) => [p.id, p.name]));
  const scorePct = Math.round(score * 100);

  return (
    <div
      style={{
        position: 'absolute',
        right: 12,
        bottom: 24,
        zIndex: mapZIndex.panel,
        width: 280,
        padding: 12,
        borderRadius: 10,
        background: 'var(--color-chrome-bg-translucent)',
        border: '1px solid var(--color-elevation-highlight)',
        backdropFilter: 'blur(8px)',
        color: 'var(--color-panel-text, #e0e0e0)',
        fontSize: 12,
        pointerEvents: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 600 }}>Ecological Integration</span>
        <span
          style={{
            fontSize: 10,
            padding: '2px 6px',
            borderRadius: 4,
            background: 'rgba(138,200,172,0.18)',
            color: '#8ac8ac',
          }}
          title="Phase 3: edges contribute weight 0.10 to the overall score."
        >
          weight 0.10 · live
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 28, fontWeight: 600, color: '#8ac8ac' }}>{scorePct}</span>
        <span style={{ color: '#888' }}>/ 100</span>
      </div>

      <div>
        <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>
          Orphan outputs ({orphans.length})
        </div>
        {orphans.length === 0 ? (
          <div style={{ fontStyle: 'italic', color: '#888' }}>None — every output is routed.</div>
        ) : (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              maxHeight: 140,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
            }}
          >
            {orphans.slice(0, 12).map((o) => (
              <li
                key={`${o.fromId}::${o.fromOutput}`}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 8,
                  padding: '3px 6px',
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.04)',
                }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {namesById.get(o.fromId) ?? o.fromId}
                </span>
                <span style={{ color: '#8ac8ac', flexShrink: 0 }}>{o.fromOutput}</span>
              </li>
            ))}
            {orphans.length > 12 && (
              <li style={{ fontStyle: 'italic', color: '#888', padding: '3px 6px' }}>
                +{orphans.length - 12} more
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
