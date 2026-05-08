/**
 * ModulePanel contract — every Observe module bundles a Dashboard component
 * plus a registry of detail panels reachable via inline view-stack navigation
 * inside the slide-up sheet.
 *
 * The slide-up host (ModuleSlideUp) reads the active module's panel, mounts
 * the Dashboard by default, and exposes a `useDetailNav` hook that any child
 * can use to push a detail key onto the stack. When a key is set, the
 * Dashboard is hidden and `details[key]` is rendered in its place; a back
 * chip in the sheet header pops the stack.
 *
 * URL stays at `/observe/$module` — detail navigation is local-state only,
 * intentional so the slide-up acts like a self-contained pillar surface.
 * Phase C may promote details to URL segments if deep-linking is required.
 */

import type { FC } from 'react';

export interface DetailNavApi {
  /** Active detail key (or null when on Dashboard) */
  current: string | null;
  /** Push a detail key — replaces any current detail */
  push: (key: string) => void;
  /** Pop back to Dashboard */
  pop: () => void;
}

export interface ModulePanel<DetailKey extends string = string> {
  /** Default view rendered when slide-up opens */
  Dashboard: FC;
  /** Detail panels addressable by key from inside the dashboard */
  details: Record<DetailKey, FC>;
  /** Optional human label per detail key, used in the sheet header back-chip */
  detailLabels?: Partial<Record<DetailKey, string>>;
}
