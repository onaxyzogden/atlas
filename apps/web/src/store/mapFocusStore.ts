/**
 * Map Focus store — Phase 6.2.
 *
 * Cross-page coordination for "fly to this on the map" CTAs. ProvePage
 * fires a focus request, navigates to the design canvas, and DesignMap
 * consumes the request once the map is mounted.
 *
 * Not persisted — focus is a transient UI signal, not durable state.
 * `requestedAt` lets consumers detect a *new* request even when the
 * coordinates haven't changed (re-clicking "Fix on Map" should fly
 * even if the user is already centred on the parcel).
 */

import { create } from "zustand";

export interface MapFocusRequest {
  projectId: string;
  center: [number, number];
  zoom?: number;
  /** Monotonic timestamp; bumped on every request so consumers can fire flyTo. */
  requestedAt: number;
}

interface MapFocusState {
  request: MapFocusRequest | null;
  /** Set the focus to a given center; consumers fly when projectId matches. */
  focus: (req: Omit<MapFocusRequest, "requestedAt">) => void;
  /** Clear after consumption to prevent re-flying on remount. */
  clear: () => void;
}

export const useMapFocusStore = create<MapFocusState>((set) => ({
  request: null,
  focus: (req) =>
    set({
      request: { ...req, requestedAt: Date.now() },
    }),
  clear: () => set({ request: null }),
}));
