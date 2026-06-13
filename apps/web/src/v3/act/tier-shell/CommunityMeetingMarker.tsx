/**
 * CommunityMeetingMarker — a single pulsing ring at the steward-designated
 * communal meeting place, shown while one or more upcoming community
 * meetings/decisions exist on this (ecovillage) project.
 *
 * Mirrors `ProtocolMapMarkers` (CSS `@keyframes` pulse on a `maplibregl.Marker`
 * HTML div, teardown on unmount) + `CaptureMapMarkers` (click → a
 * `maplibregl.Popup`). Renders `null`; all DOM output is the imperative
 * MapLibre marker/popup.
 *
 * Data:
 *  - the meeting place comes from `communityMeetingPlaceStore` (the steward's
 *    EXPLICIT designation — a gathering structure or a dropped pin);
 *  - the upcoming meetings come from CONFIRMED `communityWorkPlanStore`
 *    proposals — the only place `kind` lives (the spine row has none) —
 *    cross-checked against the WorkItem spine to drop rows already marked
 *    done/cancelled.
 *
 * All derivation runs through the pure helpers in
 * `features/community/communityMeetingPlace`. Per the Zustand
 * selector-stability rule we subscribe to RAW store arrays and derive inside
 * `useMemo` (never call array-allocating selectors inside a Zustand selector).
 *
 * Naturally inert on non-ecovillage projects: no confirmed community proposals
 * ⇒ no entries ⇒ no marker. No designation ⇒ no coords ⇒ no marker.
 */

import { useEffect, useMemo, useRef } from 'react';
import { maplibregl } from '../../../lib/maplibre.js';
import { DEFAULT_COMMUNITY_HORIZON_DAYS } from '@ogden/shared';
import { useCommunityWorkPlanStore } from '../../../store/communityWorkPlanStore.js';
import {
  useCommunityMeetingPlaceStore,
  selectMeetingPlace,
} from '../../../store/communityMeetingPlaceStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';
import { useWorkItemStore } from '../../../store/workItemStore.js';
import {
  resolveMeetingPlaceCoords,
  selectUpcomingCommunityMeetings,
  type CommunityMeetingEntry,
} from '../../../features/community/communityMeetingPlace.js';

interface Props {
  map: maplibregl.Map;
  projectId: string;
  /** Open the Act work panel (community meetings live there). */
  onOpenWork: () => void;
}

const STYLE_ID = 'ogden-community-meeting-pulse';

/** Community accent — deliberately distinct from the amber protocol dot. */
const COMMUNITY_ACCENT = '#2f9e8f';

function ensurePulseStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes ogden-community-meeting-pulse {
      0%, 100% { transform: scale(1);    opacity: 0.9; }
      50%       { transform: scale(1.5); opacity: 0.4; }
    }
    .ogden-community-meeting-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: ${COMMUNITY_ACCENT};
      color: #ffffff;
      font: 700 12px/1 system-ui, sans-serif;
      border: 2px solid rgba(255, 255, 255, 0.9);
      box-shadow: 0 1px 5px rgba(0, 0, 0, 0.5);
      animation: ogden-community-meeting-pulse 1.8s ease-in-out infinite;
      cursor: pointer;
    }
    .ogden-community-meeting-popup h4 {
      margin: 0 0 6px;
      font: 600 13px/1.2 system-ui, sans-serif;
      color: #1f2937;
    }
    .ogden-community-meeting-popup ul {
      margin: 0 0 8px;
      padding: 0;
      list-style: none;
      max-height: 180px;
      overflow-y: auto;
    }
    .ogden-community-meeting-popup li {
      font: 400 12px/1.4 system-ui, sans-serif;
      color: #374151;
      padding: 2px 0;
    }
    .ogden-community-meeting-popup li .date {
      font-variant-numeric: tabular-nums;
      color: ${COMMUNITY_ACCENT};
      font-weight: 600;
      margin-right: 6px;
    }
    .ogden-community-meeting-popup button {
      appearance: none;
      border: 1px solid ${COMMUNITY_ACCENT};
      background: ${COMMUNITY_ACCENT};
      color: #ffffff;
      font: 600 12px/1 system-ui, sans-serif;
      padding: 6px 10px;
      border-radius: 5px;
      cursor: pointer;
      width: 100%;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Build the popup DOM. Uses `textContent`/`createTextNode` throughout (never
 * `innerHTML`) so meeting titles need no escaping and present no injection
 * surface.
 */
function buildPopupContent(
  entries: CommunityMeetingEntry[],
  onView: () => void,
): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ogden-community-meeting-popup';

  const heading = document.createElement('h4');
  heading.textContent =
    entries.length === 1
      ? '1 upcoming gathering'
      : `${entries.length} upcoming gatherings`;
  root.appendChild(heading);

  const list = document.createElement('ul');
  for (const entry of entries) {
    const li = document.createElement('li');
    const date = document.createElement('span');
    date.className = 'date';
    date.textContent = entry.dueDate;
    li.appendChild(date);
    li.appendChild(document.createTextNode(entry.title));
    list.appendChild(li);
  }
  root.appendChild(list);

  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'View in work panel';
  button.addEventListener('click', () => onView());
  root.appendChild(button);

  return root;
}

export default function CommunityMeetingMarker({
  map,
  projectId,
  onOpenWork,
}: Props) {
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const onOpenWorkRef = useRef(onOpenWork);
  onOpenWorkRef.current = onOpenWork;

  // Raw store subscriptions — derive below (selector-stability rule).
  const proposals = useCommunityWorkPlanStore((s) => s.proposals);
  const entities = useBuiltEnvironmentStoreV2((s) => s.entities);
  const items = useWorkItemStore((s) => s.items);
  const place = useCommunityMeetingPlaceStore((s) =>
    selectMeetingPlace(s, projectId),
  );

  // Today is read once per mount — the marker is an at-a-glance cue, not a
  // second-accurate clock; recomputing every render would churn the memos.
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const coords = useMemo(
    () => resolveMeetingPlaceCoords(place, entities),
    [place, entities],
  );

  const spineStatusById = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of items) m.set(it.id, it.status);
    return m;
  }, [items]);

  const entries = useMemo(
    () =>
      selectUpcomingCommunityMeetings(
        proposals,
        projectId,
        todayISO,
        DEFAULT_COMMUNITY_HORIZON_DAYS,
        spineStatusById,
      ),
    [proposals, projectId, todayISO, spineStatusById],
  );

  useEffect(() => {
    // Marker shows only when the place resolves AND something is upcoming.
    if (!coords || entries.length === 0) {
      popupRef.current?.remove();
      popupRef.current = null;
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    ensurePulseStyle();
    markerRef.current?.remove();

    const el = document.createElement('div');
    el.className = 'ogden-community-meeting-marker';
    el.textContent = String(entries.length);
    el.title = `${entries.length} upcoming community ${
      entries.length === 1 ? 'gathering' : 'gatherings'
    }`;

    el.addEventListener('click', (ev) => {
      ev.stopPropagation();
      popupRef.current?.remove();
      const popup = new maplibregl.Popup({
        offset: 16,
        closeButton: true,
        closeOnClick: false,
        className: 'ogden-community-meeting-popup-shell',
      })
        .setLngLat(coords)
        .setDOMContent(
          buildPopupContent(entries, () => {
            onOpenWorkRef.current();
            popupRef.current?.remove();
            popupRef.current = null;
          }),
        )
        .addTo(map);
      popupRef.current = popup;
    });

    markerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat(coords)
      .addTo(map);
  }, [map, coords, entries]);

  useEffect(() => {
    return () => {
      popupRef.current?.remove();
      popupRef.current = null;
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, []);

  return null;
}
