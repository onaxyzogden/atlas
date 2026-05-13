/**
 * ObserveLinkPopover — anchored "Edit in Observe →" affordance shown
 * when a steward clicks an Observe-stage feature on the Plan
 * Current-Land map. Mirrors the anchor-tracking + auto-flip behaviour of
 * `InlineFeaturePopover` but renders no form: Observe is the source of
 * truth for these features, so editing routes back to the Observe
 * stage.
 *
 * Phase 1 scope: deep-link to the Observe module (no per-feature focus
 * yet; that's Phase 2).
 */

import { useEffect, useRef, useState } from 'react';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useNavigate, useParams } from '@tanstack/react-router';
import { ArrowUpRight } from 'lucide-react';
import { useObserveLinkPopoverStore } from './observeLinkPopoverStore.js';
import { getAnnotationRow } from '../../observe/components/AnnotationRegistry.js';
import css from './InlineFeaturePopover.module.css';

interface Props {
  map: MaplibreMap;
}

export default function ObserveLinkPopover({ map }: Props) {
  const active = useObserveLinkPopoverStore((s) => s.active);
  const close = useObserveLinkPopoverStore((s) => s.close);
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { projectId?: string };

  const [screen, setScreen] = useState<{ x: number; y: number; flipped: boolean } | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Track anchor → screen coords; re-project on map move/zoom/resize.
  useEffect(() => {
    if (!active) {
      setScreen(null);
      return;
    }
    const POPOVER_WIDTH = 240;
    const recalc = () => {
      const p = map.project(active.anchor);
      const canvasW = map.getCanvas().clientWidth;
      const flipped = p.x + POPOVER_WIDTH + 24 > canvasW;
      setScreen({ x: p.x, y: p.y, flipped });
    };
    recalc();
    map.on('move', recalc);
    map.on('zoom', recalc);
    map.on('resize', recalc);
    return () => {
      map.off('move', recalc);
      map.off('zoom', recalc);
      map.off('resize', recalc);
    };
  }, [active, map]);

  // ESC closes
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, close]);

  // Click-outside closes — same shape as InlineFeaturePopover, with the
  // PlanSelectionFloater allow-listed.
  useEffect(() => {
    if (!active) return;
    const onDown = (e: MouseEvent) => {
      const node = popoverRef.current;
      if (!node) return;
      if (e.target instanceof Node && node.contains(e.target)) return;
      if (
        e.target instanceof Element &&
        e.target.closest('[role="toolbar"][aria-label="Plan selection actions"]')
      ) {
        return;
      }
      close();
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [active, close]);

  if (!active || !screen) return null;

  const onEditInObserve = () => {
    if (!params.projectId) return;
    // Phase 2: when the clicked feature is an annotation we know how to
    // open in Observe's detail panel (`annoKind` + `annoId` were stamped
    // by ObserveAnnotationLayers), forward them as search params so
    // ObserveLayout can re-open the read-only `<AnnotationDetailPanel>`
    // for the same record. Edit/Delete buttons live there.
    const search =
      active.annoKind && active.annoId
        ? { focusKind: active.annoKind, focusId: active.annoId }
        : {};
    navigate({
      to: '/v3/project/$projectId/observe/$module',
      params: { projectId: params.projectId, module: active.kind },
      search,
    });
    close();
  };

  // Re-read the underlying record on every render so edits made in the
  // Observe stage surface here without needing the popover to remount.
  // Subscribe via Zustand's store APIs at the call sites in
  // `getAnnotationRow`: each `useXStore.getState()` snapshot is read-only,
  // and the popover already rerenders on map move/zoom + parent layout.
  const row =
    active.annoKind && active.annoId
      ? getAnnotationRow(active.annoKind, active.annoId)
      : null;
  const createdLabel = row?.createdAt
    ? (() => {
        const d = new Date(row.createdAt);
        return Number.isNaN(d.getTime())
          ? null
          : d.toLocaleString();
      })()
    : null;

  return (
    <div
      ref={popoverRef}
      className={css.popover}
      data-flipped={screen.flipped ? 'true' : 'false'}
      style={{ left: screen.x, top: screen.y }}
      role="dialog"
      aria-label={`${active.label} — observed feature`}
    >
      <span className={css.title}>{active.label}</span>
      {row ? (
        <>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.35,
              color: '#f2ede3',
            }}
          >
            {row.title}
          </p>
          {row.subtitle ? (
            <p
              style={{
                margin: 0,
                fontSize: 11,
                opacity: 0.85,
                lineHeight: 1.45,
                whiteSpace: 'pre-wrap',
              }}
            >
              {row.subtitle}
            </p>
          ) : null}
          {createdLabel ? (
            <p
              style={{
                margin: 0,
                fontSize: 10,
                opacity: 0.6,
                letterSpacing: '0.04em',
              }}
            >
              Created · {createdLabel}
            </p>
          ) : null}
          <p
            style={{
              margin: 0,
              fontSize: 10,
              opacity: 0.6,
              lineHeight: 1.4,
            }}
          >
            Read-only. Edits live in the Observe stage.
          </p>
        </>
      ) : (
        <p
          style={{
            margin: 0,
            fontSize: 11,
            opacity: 0.75,
            lineHeight: 1.4,
          }}
        >
          Observed feature. Edits live in the Observe stage.
        </p>
      )}
      <button
        type="button"
        onClick={onEditInObserve}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          padding: '6px 10px',
          background: 'rgba(196, 162, 101, 0.18)',
          border: '1px solid rgba(196, 162, 101, 0.55)',
          borderRadius: 6,
          color: '#f2ede3',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.04em',
          cursor: 'pointer',
        }}
      >
        Edit in Observe
        <ArrowUpRight size={12} aria-hidden="true" />
      </button>
    </div>
  );
}
