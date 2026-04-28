/**
 * RelationshipsOverlay — Phase 2 of the Needs & Yields rollout.
 *
 * Behind `FLAGS.RELATIONSHIPS`. Renders:
 * - `<RelationshipsToggle compact />`: spine button that flips
 *   `useRelationshipsStore.viewActive`.
 * - `<RelationshipsOverlay />`: DOM-overlay socket + edge layer over the
 *   MapLibre canvas. Subscribes to `move` + `zoom` and re-projects
 *   entity centroids on each frame.
 *
 * Edge draw interaction (Phase 2.4): drag from an output socket → drop
 * on a compatible input socket. Validation runs through `EdgeSchema`
 * and the catalog's `OUTPUTS_BY_TYPE` / `INPUTS_BY_TYPE` so a chicken's
 * `manure` cannot land on an orchard's `pollination` socket.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type maplibregl from 'maplibre-gl';
import { FLAGS } from '@ogden/shared';
import {
  OUTPUTS_BY_TYPE,
  INPUTS_BY_TYPE,
  closedLoops,
  type EntityType,
  type Edge,
  type ResourceType,
  type PlacedEntity,
} from '@ogden/shared/relationships';
import { mapZIndex } from '../../lib/tokens.js';
import { DelayedTooltip } from '../../components/ui/DelayedTooltip.js';
import { useRelationshipsStore } from '../../store/relationshipsStore.js';
import { useRelationshipsSync } from './useRelationshipsSync.js';
import { useProjectStore } from '../../store/projectStore.js';
import {
  useAllPlacedEntities,
  type PlacedEntityView,
} from '../../lib/relationships/useAllPlacedEntities.js';

const SOCKET_R = 5;
const SOCKET_RING = 26;
const OUTPUT_COLOR = 'var(--color-confidence-high, #8ac8ac)';
const INPUT_COLOR = 'var(--color-confidence-medium, #d8b96b)';
const EDGE_COLOR = 'rgba(196, 162, 101, 0.85)';
// Edges that participate in a closed loop render brighter / thicker — visual
// confirmation of Holmgren P6 (Produce No Waste) on the canvas.
const EDGE_CYCLE_COLOR = 'rgba(138, 200, 172, 1)';
const EDGE_CYCLE_GLOW = 'rgba(138, 200, 172, 0.45)';
const INVALID_FLASH_MS = 600;

type SocketKind = 'output' | 'input';
interface SocketView {
  entityId: string;
  entityName: string;
  entityType: string;
  resource: ResourceType;
  kind: SocketKind;
  /** angle in radians around the entity centroid */
  angle: number;
}

interface ProjectedEntity extends PlacedEntityView {
  x: number;
  y: number;
  outputs: ResourceType[];
  inputs: ResourceType[];
}

function entityOutputs(type: string): ResourceType[] {
  return (OUTPUTS_BY_TYPE as Record<string, ResourceType[]>)[type] ?? [];
}
function entityInputs(type: string): ResourceType[] {
  return (INPUTS_BY_TYPE as Record<string, ResourceType[]>)[type] ?? [];
}

function socketPosition(
  cx: number,
  cy: number,
  index: number,
  count: number,
  kind: SocketKind,
): { x: number; y: number; angle: number } {
  // Outputs fan along the right hemisphere, inputs along the left.
  const span = Math.PI * 0.9;
  const base = kind === 'output' ? -Math.PI / 2 + Math.PI / 2 : Math.PI / 2 + Math.PI / 2;
  const start = base - span / 2;
  const t = count === 1 ? 0.5 : index / (count - 1);
  const angle = start + span * t;
  return {
    x: cx + Math.cos(angle) * SOCKET_RING,
    y: cy + Math.sin(angle) * SOCKET_RING,
    angle,
  };
}

export function RelationshipsToggle({ compact = false }: { compact?: boolean } = {}) {
  const viewActive = useRelationshipsStore((s) => s.viewActive);
  const setViewActive = useRelationshipsStore((s) => s.setViewActive);
  if (!FLAGS.RELATIONSHIPS) return null;

  const button = (
    <button
      onClick={() => setViewActive(!viewActive)}
      aria-pressed={viewActive}
      className={compact ? 'spine-btn' : undefined}
      data-active={viewActive}
      aria-label="Toggle relationships overlay"
      style={
        compact
          ? undefined
          : {
              padding: '6px 10px',
              borderRadius: 6,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 500,
              background: viewActive ? '#8ac8ac' : 'var(--color-chrome-bg-translucent)',
              color: viewActive ? '#12251c' : '#c4b49a',
              backdropFilter: 'blur(8px)',
              pointerEvents: 'auto',
            }
      }
    >
      {/* Lucide Network — inlined */}
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="16" y="16" width="6" height="6" rx="1" />
        <rect x="2" y="16" width="6" height="6" rx="1" />
        <rect x="9" y="2" width="6" height="6" rx="1" />
        <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
        <path d="M12 12V8" />
      </svg>
      {!compact && <span style={{ marginLeft: 6 }}>Relationships</span>}
    </button>
  );

  return <DelayedTooltip label="Toggle relationships overlay">{button}</DelayedTooltip>;
}

interface OverlayProps {
  map: maplibregl.Map | null;
}

interface DragState {
  fromEntityId: string;
  fromEntityType: string;
  fromOutput: ResourceType;
  cursorX: number;
  cursorY: number;
}

export function RelationshipsOverlay({ map }: OverlayProps) {
  const viewActive = useRelationshipsStore((s) => s.viewActive);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const edges = useRelationshipsStore(
    (s) => (activeProjectId ? s.edgesByProject[activeProjectId] ?? [] : []),
  );
  const addEdge = useRelationshipsStore((s) => s.addEdge);
  const removeEdge = useRelationshipsStore((s) => s.removeEdge);
  const placed = useAllPlacedEntities();

  useRelationshipsSync(activeProjectId);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [version, setVersion] = useState(0);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [invalidAt, setInvalidAt] = useState<number | null>(null);

  // Re-render on map move / zoom; rAF-throttled to one frame per event burst.
  useEffect(() => {
    if (!map || !viewActive) return;
    let raf = 0;
    const bump = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setVersion((v) => v + 1));
    };
    map.on('move', bump);
    map.on('zoom', bump);
    map.on('resize', bump);
    return () => {
      cancelAnimationFrame(raf);
      map.off('move', bump);
      map.off('zoom', bump);
      map.off('resize', bump);
    };
  }, [map, viewActive]);

  const projected: ProjectedEntity[] = useMemo(() => {
    if (!map || !viewActive) return [];
    void version; // re-run on map move
    const out: ProjectedEntity[] = [];
    for (const e of placed) {
      const pt = map.project([e.lng, e.lat]);
      out.push({
        ...e,
        x: pt.x,
        y: pt.y,
        outputs: entityOutputs(e.type),
        inputs: entityInputs(e.type),
      });
    }
    return out;
  }, [map, placed, viewActive, version]);

  const entityById = useMemo(() => {
    const m = new Map<string, ProjectedEntity>();
    for (const e of projected) m.set(e.id, e);
    return m;
  }, [projected]);

  // Cursor tracking during drag
  useEffect(() => {
    if (!drag) return;
    const onMove = (ev: MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDrag((prev) =>
        prev ? { ...prev, cursorX: ev.clientX - rect.left, cursorY: ev.clientY - rect.top } : prev,
      );
    };
    const onUp = () => setDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag]);

  if (!FLAGS.RELATIONSHIPS || !viewActive || !map || !activeProjectId) return null;

  const handleOutputDown = (
    e: React.MouseEvent,
    entity: ProjectedEntity,
    resource: ResourceType,
  ) => {
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDrag({
      fromEntityId: entity.id,
      fromEntityType: entity.type,
      fromOutput: resource,
      cursorX: e.clientX - rect.left,
      cursorY: e.clientY - rect.top,
    });
  };

  const handleInputUp = (
    e: React.MouseEvent,
    entity: ProjectedEntity,
    resource: ResourceType,
  ) => {
    e.stopPropagation();
    if (!drag) return;
    if (drag.fromEntityId === entity.id) {
      setDrag(null);
      return;
    }
    if (drag.fromOutput !== resource) {
      setInvalidAt(Date.now());
      window.setTimeout(() => setInvalidAt(null), INVALID_FLASH_MS);
      setDrag(null);
      return;
    }
    const candidate: Edge = {
      fromId: drag.fromEntityId,
      fromOutput: drag.fromOutput,
      toId: entity.id,
      toInput: resource,
    };
    const result = addEdge(activeProjectId, candidate);
    if (!result.ok) {
      setInvalidAt(Date.now());
      window.setTimeout(() => setInvalidAt(null), INVALID_FLASH_MS);
    }
    setDrag(null);
  };

  const handleEdgeClick = (edge: Edge) => {
    removeEdge(
      activeProjectId,
      (e) =>
        e.fromId === edge.fromId &&
        e.fromOutput === edge.fromOutput &&
        e.toId === edge.toId &&
        e.toInput === edge.toInput,
    );
  };

  // Set of "fromId>toId" keys for every directed edge that participates in
  // at least one closed loop. The graph is small (hundreds of entities at
  // most), so recomputing on edge change is cheap.
  const cycleEdgeKeys = useMemo(() => {
    const entitiesForCycle: PlacedEntity[] = placed.map((p) => ({ id: p.id, type: p.type }));
    const loops = closedLoops(entitiesForCycle, edges);
    const keys = new Set<string>();
    for (const cycle of loops) {
      for (let i = 0; i < cycle.length; i += 1) {
        const from = cycle[i] as string;
        const to = cycle[(i + 1) % cycle.length] as string;
        keys.add(`${from}>${to}`);
      }
    }
    return keys;
  }, [placed, edges]);

  const renderedEdges = edges
    .map((edge) => {
      const from = entityById.get(edge.fromId);
      const to = entityById.get(edge.toId);
      if (!from || !to) return null;
      const fromIdx = from.outputs.indexOf(edge.fromOutput);
      const toIdx = to.inputs.indexOf(edge.toInput);
      if (fromIdx === -1 || toIdx === -1) return null;
      const fp = socketPosition(from.x, from.y, fromIdx, from.outputs.length, 'output');
      const tp = socketPosition(to.x, to.y, toIdx, to.inputs.length, 'input');
      const inCycle = cycleEdgeKeys.has(`${edge.fromId}>${edge.toId}`);
      return { edge, fp, tp, inCycle };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  return (
    <div
      ref={containerRef}
      data-testid="relationships-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: mapZIndex.panel,
        pointerEvents: 'none',
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        {renderedEdges.map(({ edge, fp, tp, inCycle }, i) => (
          <g key={i}>
            {inCycle && (
              <line
                x1={fp.x}
                y1={fp.y}
                x2={tp.x}
                y2={tp.y}
                stroke={EDGE_CYCLE_GLOW}
                strokeWidth={6}
                strokeLinecap="round"
                pointerEvents="none"
              />
            )}
            <line
              x1={fp.x}
              y1={fp.y}
              x2={tp.x}
              y2={tp.y}
              stroke={inCycle ? EDGE_CYCLE_COLOR : EDGE_COLOR}
              strokeWidth={inCycle ? 3 : 2}
              strokeLinecap="round"
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              onClick={() => handleEdgeClick(edge)}
            >
              <title>
                {inCycle
                  ? `${edge.fromOutput} → ${edge.toInput} · in closed loop (click to remove)`
                  : `${edge.fromOutput} → ${edge.toInput} (click to remove)`}
              </title>
            </line>
          </g>
        ))}
        {drag && (
          <line
            x1={(() => {
              const from = entityById.get(drag.fromEntityId);
              if (!from) return 0;
              const idx = from.outputs.indexOf(drag.fromOutput);
              const fp = socketPosition(from.x, from.y, idx, from.outputs.length, 'output');
              return fp.x;
            })()}
            y1={(() => {
              const from = entityById.get(drag.fromEntityId);
              if (!from) return 0;
              const idx = from.outputs.indexOf(drag.fromOutput);
              const fp = socketPosition(from.x, from.y, idx, from.outputs.length, 'output');
              return fp.y;
            })()}
            x2={drag.cursorX}
            y2={drag.cursorY}
            stroke={EDGE_COLOR}
            strokeWidth={2}
            strokeDasharray="4 3"
            strokeLinecap="round"
          />
        )}
      </svg>
      {projected.map((entity) => (
        <div
          key={entity.id}
          style={{
            position: 'absolute',
            left: entity.x,
            top: entity.y,
            width: 0,
            height: 0,
          }}
        >
          {entity.outputs.map((r, i) => {
            const pos = socketPosition(0, 0, i, entity.outputs.length, 'output');
            const isDragSource = drag?.fromEntityId === entity.id && drag.fromOutput === r;
            return (
              <DelayedTooltip key={`o-${r}`} label={`${entity.name}: outputs ${r}`}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Output socket: ${r}`}
                  onMouseDown={(e) => handleOutputDown(e, entity, r)}
                  style={{
                    position: 'absolute',
                    left: pos.x - SOCKET_R,
                    top: pos.y - SOCKET_R,
                    width: SOCKET_R * 2,
                    height: SOCKET_R * 2,
                    borderRadius: '50%',
                    background: OUTPUT_COLOR,
                    border: isDragSource ? '2px solid #fff' : '1px solid rgba(0,0,0,0.35)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.4)',
                    cursor: 'crosshair',
                    pointerEvents: 'auto',
                  }}
                />
              </DelayedTooltip>
            );
          })}
          {entity.inputs.map((r, i) => {
            const pos = socketPosition(0, 0, i, entity.inputs.length, 'input');
            const isCompatTarget =
              drag !== null && drag.fromEntityId !== entity.id && drag.fromOutput === r;
            return (
              <DelayedTooltip key={`i-${r}`} label={`${entity.name}: needs ${r}`}>
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Input socket: ${r}`}
                  onMouseUp={(e) => handleInputUp(e, entity, r)}
                  style={{
                    position: 'absolute',
                    left: pos.x - SOCKET_R,
                    top: pos.y - SOCKET_R,
                    width: SOCKET_R * 2,
                    height: SOCKET_R * 2,
                    borderRadius: '50%',
                    background: INPUT_COLOR,
                    border: isCompatTarget
                      ? '2px solid #fff'
                      : '1px solid rgba(0,0,0,0.35)',
                    boxShadow: isCompatTarget
                      ? '0 0 0 4px rgba(255,255,255,0.25)'
                      : '0 1px 2px rgba(0,0,0,0.4)',
                    cursor: drag ? 'pointer' : 'default',
                    pointerEvents: 'auto',
                    transition: 'box-shadow 120ms',
                  }}
                />
              </DelayedTooltip>
            );
          })}
        </div>
      ))}
      {invalidAt !== null && (
        <div
          role="status"
          style={{
            position: 'absolute',
            left: '50%',
            top: 16,
            transform: 'translateX(-50%)',
            padding: '6px 12px',
            borderRadius: 6,
            background: 'rgba(180, 60, 60, 0.92)',
            color: '#fff',
            fontSize: 12,
            pointerEvents: 'none',
            boxShadow: '0 2px 8px rgba(0,0,0,0.35)',
          }}
        >
          incompatible resource — try matching the output type
        </div>
      )}
    </div>
  );
}

// Re-export so consumers can avoid hooking up unused symbols.
export type { SocketView };
