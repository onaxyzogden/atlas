/**
 * ObjectiveMapMarkers — plots each FieldObjective at its target centre on the
 * Command Centre site map as an HTML marker (one DOM node per objective, same
 * lightweight approach as FieldFlagOverlay; objective counts are small). The
 * marker is colour-coded by module and badged with its status; clicking it
 * fires `onSelect` so the matching card / launch flow can respond.
 */

import { useEffect, useRef } from 'react';
import { maplibregl } from '../../lib/maplibre.js';
import { OBSERVE_MODULE_DOT } from '../observe/moduleGuidance.js';
import { OBSERVE_MODULE_LABEL } from '../observe/types.js';
import type { ObjectiveStatus } from '../objectives/fieldObjective.js';
import type { FieldObjectiveView } from '../objectives/useFieldObjectives.js';

interface Props {
  map: maplibregl.Map;
  views: FieldObjectiveView[];
  onSelect?: (objectiveId: string) => void;
}

const STATUS_LABEL: Record<ObjectiveStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  'evidence-submitted': 'Evidence submitted',
  complete: 'Complete',
  'needs-review': 'Needs review',
};

function buildPin(view: FieldObjectiveView): HTMLDivElement {
  const { objective, run } = view;
  const color = OBSERVE_MODULE_DOT[objective.module];
  const done = run.status === 'complete';
  // Outer element: MapLibre owns its inline `transform` for positioning, so we
  // must never write `transform` here — doing so wipes the translate and snaps
  // the marker to the map origin. The hover scale lives on the inner pin.
  const el = document.createElement('div');
  el.setAttribute(
    'aria-label',
    `${OBSERVE_MODULE_LABEL[objective.module]} objective: ${objective.title} (${STATUS_LABEL[run.status]})`,
  );
  el.style.cssText = ['cursor:pointer', 'user-select:none', 'line-height:0'].join(';');

  const pin = document.createElement('div');
  pin.style.cssText = [
    'width:26px',
    'height:26px',
    'border-radius:50%',
    `background:${color}`,
    `border:2px solid ${done ? '#f6efe1' : 'rgba(255,255,255,0.7)'}`,
    'box-shadow:0 2px 6px rgba(0,0,0,0.4)',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'color:#1f1d1a',
    'font-size:13px',
    'font-weight:700',
    "font-family:'Apple Color Emoji','Segoe UI Emoji',sans-serif",
    'transition:transform 120ms ease',
  ].join(';');
  pin.textContent = done ? '✓' : '';
  el.appendChild(pin);

  el.addEventListener('mouseenter', () => {
    pin.style.transform = 'scale(1.15)';
  });
  el.addEventListener('mouseleave', () => {
    pin.style.transform = 'scale(1)';
  });
  return el;
}

function popupHtml(view: FieldObjectiveView): string {
  const { objective, run } = view;
  return `
    <div style="font-family:inherit;color:#1f1d1a;min-width:170px">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.6">${escapeHtml(OBSERVE_MODULE_LABEL[objective.module])}</div>
      <div style="font-size:13px;font-weight:600;margin-top:2px">${escapeHtml(objective.title)}</div>
      <div style="margin-top:6px;font-size:11px;opacity:0.8">${STATUS_LABEL[run.status]}</div>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default function ObjectiveMapMarkers({ map, views, onSelect }: Props) {
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    const known = markersRef.current;
    const seen = new Set<string>();

    for (const view of views) {
      const { objective } = view;
      seen.add(objective.id);
      // Rebuild the pin each pass so status colour/badge stays current; the
      // marker count is tiny so a teardown-and-replace is cheap and simpler
      // than mutating the DOM node in place.
      known.get(objective.id)?.remove();
      const el = buildPin(view);
      const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat(objective.target.center)
        .addTo(map);
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (popupRef.current) popupRef.current.remove();
        const popup = new maplibregl.Popup({
          offset: 16,
          closeButton: true,
          closeOnClick: false,
          className: 'v3-objective-popup',
        })
          .setLngLat(objective.target.center)
          .setHTML(popupHtml(view))
          .addTo(map);
        popupRef.current = popup;
        onSelectRef.current?.(objective.id);
      });
      known.set(objective.id, marker);
    }

    for (const [id, marker] of known.entries()) {
      if (!seen.has(id)) {
        marker.remove();
        known.delete(id);
      }
    }
  }, [map, views]);

  useEffect(() => {
    const known = markersRef.current;
    return () => {
      for (const marker of known.values()) marker.remove();
      known.clear();
      popupRef.current?.remove();
      popupRef.current = null;
    };
  }, []);

  return null;
}
