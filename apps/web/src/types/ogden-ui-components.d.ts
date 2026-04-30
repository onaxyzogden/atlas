/**
 * Ambient declaration for @ogden/ui-components.
 *
 * The package (github:onaxyzogden/ogden-ui-components) ships ESM + CSS
 * but no .d.ts. Until the upstream repo emits its own declarations
 * (vite-plugin-dts is in its devDependencies but not yet enabled in the
 * shipped build), we type the named exports we actually consume in Atlas
 * to keep `tsc --noEmit` clean.
 *
 * Keep this list minimal — extend only when a new symbol is imported.
 */

declare module '@ogden/ui-components' {
  import type { ComponentType, FC } from 'react';

  // ── MaqasidComparisonWheel ────────────────────────────────────────────
  // The wheel renders 1–7 segments arranged radially with per-segment
  // progress (`current` 0–100), an optional "next action" callout block,
  // hover-driven highlighting, and click-to-navigate behaviour. Atlas
  // uses three segments labelled Observe / Plan / Act.

  export interface MaqasidWheelSegment {
    id: string;
    label: string;
    current: number;
    // The wheel passes `size` and `className` to `Icon`. Lucide icons are
    // ForwardRef components whose `size` accepts string | number — we accept
    // any compatible component to avoid forcing call-sites to cast.
    Icon?: ComponentType<Record<string, unknown>>;
    color?: string;
    tooltipLabel?: string;
    tooltipText?: string;
    tooltipWidth?: number;
    tooltipHeight?: number;
    route?: string;
  }

  export interface MaqasidComparisonWheelProps {
    centerLabel?: string;
    levelColor?: string;
    segments: MaqasidWheelSegment[];
    nextActions?: Record<string, Record<string, string>>;
    onSegmentSelect?: (segmentId: string) => void;
    onHoverChange?: (segmentId: string | null) => void;
    showNextCard?: boolean;
    showDiacritics?: boolean;
    forceHover?: string | null;
    forceConverged?: boolean;
    centerLabelOverride?: string;
    mithaqDomain?: string | null;
    pillarWisdom?: Record<string, { arabic: string; english: string; citation?: string }>;
    levelPattern?: 'dots' | 'stripes' | 'crosshatch';
    level?: string;
    onReach100?: (segment: MaqasidWheelSegment) => void;
  }

  export const MaqasidComparisonWheel: FC<MaqasidComparisonWheelProps>;

  // ── useWheelHoverStore ────────────────────────────────────────────────
  // Singleton zustand store the wheel writes to on hover; consumers can
  // subscribe to mirror the highlight (e.g. lifecycle sidebar). The
  // upstream API is loose; we type just what we use.

  export interface WheelHoverState {
    hoveredPillar: string | null;
    setHoveredPillar: (id: string | null) => void;
  }

  export function useWheelHoverStore<T = WheelHoverState>(
    selector?: (state: WheelHoverState) => T,
  ): T;
}
