/**
 * @vitest-environment happy-dom
 *
 * HostCanopyUnionTooltip — render + edge-clamp + stack + fade tests.
 *
 * Pure presentational component with no map dependency. Asserts:
 *   - single-host entries render all six fields with Math.round-based
 *     m² formatting (matching SilvopastureIntegrationCard's rounding
 *     so the steward sees the same numbers on map-hover as on the
 *     integration card)
 *   - zero-overlap edge case renders "0 m²" for saved overlap (not
 *     negative or NaN) so a single non-overlapping disk doesn't
 *     surprise the steward
 *   - right-edge cursor flips the anchor side via data-anchor-x so
 *     the tooltip stays on-screen near the map's right gutter
 *   - `pinned` is forwarded as data-pinned on the root element
 *   - multi-host stacks render every block with one hairline
 *     separator between consecutive blocks (the 2026-05-27
 *     multi-feature fan-out)
 *   - container exit: data-exiting + transitionend on opacity →
 *     onExited (2026-05-30 transition-based refactor of the
 *     2026-05-29 keyframe ship)
 *   - reverse-in-flight: `exiting` flipping true → false during a
 *     re-render does NOT fire onExited
 *   - per-block exit: an entry with phase='exiting' carries
 *     data-exiting and fires onEntryExited with its hostId on
 *     transitionend; sibling entries with phase='entering' do not
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, createEvent } from '@testing-library/react';
import {
  HostCanopyUnionTooltip,
  type HostBlockEntry,
} from '../HostCanopyUnionTooltip.js';

// happy-dom's TransitionEvent constructor silently drops the
// `propertyName` init key, and @testing-library/dom's createEvent
// hands the init straight to the constructor without a fallback —
// so a naive `fireTransitionEnd(el, 'opacity')`
// dispatches an event whose propertyName is undefined, defeating the
// `ev.propertyName === 'opacity'` filter in the component. Defining
// the property after construction (it's read-only on real
// TransitionEvent but unset/undefined on happy-dom's) restores it.
function fireTransitionEnd(el: Element, propertyName: string): void {
  const ev = createEvent.transitionEnd(el, {});
  Object.defineProperty(ev, 'propertyName', { value: propertyName });
  fireEvent(el, ev);
}

function entry(overrides: Partial<HostBlockEntry> = {}): HostBlockEntry {
  return {
    hostId: 'h1',
    hostName: 'South Pasture',
    unionAreaM2: 142.7,
    rawSumM2: 187.4,
    guildCount: 3,
    memberCount: 7,
    phase: 'entering',
    pinned: false,
    ...overrides,
  };
}

describe('HostCanopyUnionTooltip', () => {
  it('renders host name, counts, and three rounded m² values', () => {
    render(
      <HostCanopyUnionTooltip
        point={{ x: 100, y: 100 }}
        entries={[entry()]}
      />,
    );

    expect(screen.getByText('South Pasture')).toBeTruthy();
    expect(
      screen.getByText('3 guilds · 7 canopy-bearing members'),
    ).toBeTruthy();
    // Math.round(142.7) = 143, Math.round(187.4) = 187,
    // Math.round(187.4 - 142.7) = Math.round(44.7) = 45.
    expect(screen.getByText('143 m²')).toBeTruthy();
    expect(screen.getByText('187 m²')).toBeTruthy();
    expect(screen.getByText('45 m²')).toBeTruthy();
  });

  it('renders "0 m²" for saved overlap when rawSumM2 equals unionAreaM2', () => {
    render(
      <HostCanopyUnionTooltip
        point={{ x: 50, y: 50 }}
        entries={[
          entry({
            hostName: 'Loner Host',
            unionAreaM2: 50.2,
            rawSumM2: 50.2,
            guildCount: 1,
            memberCount: 1,
          }),
        ]}
      />,
    );

    expect(
      screen.getByText('1 guild · 1 canopy-bearing member'),
    ).toBeTruthy();
    // Two rows show 50 m² (union + raw sum); saved overlap is 0 m².
    expect(screen.getAllByText('50 m²').length).toBe(2);
    expect(screen.getByText('0 m²')).toBeTruthy();
  });

  it('forwards per-entry `pinned` as data-pinned on each host block (Slice L)', () => {
    // 2026-05-30 Slice L: pinned is per-entry, not container-level.
    // The root tooltip element no longer carries data-pinned;
    // individual blocks do, so mixed pinned + hover stacks can
    // distinguish the sticky blocks from the hover-along ones.
    const { rerender } = render(
      <HostCanopyUnionTooltip
        point={{ x: 100, y: 100 }}
        entries={[
          entry({ hostId: 'pin', hostName: 'Pin Host', pinned: true }),
        ]}
      />,
    );
    const root = screen.getByTestId('host-canopy-union-tooltip');
    const pinBlock = screen.getByTestId('host-block-pin');
    expect(root.hasAttribute('data-pinned')).toBe(false);
    expect(pinBlock.getAttribute('data-pinned')).toBe('true');

    rerender(
      <HostCanopyUnionTooltip
        point={{ x: 100, y: 100 }}
        entries={[
          entry({ hostId: 'pin', hostName: 'Pin Host', pinned: false }),
        ]}
      />,
    );
    expect(
      screen.getByTestId('host-block-pin').hasAttribute('data-pinned'),
    ).toBe(false);
  });

  it('flips anchor to left-of-cursor when point is near the right edge', () => {
    // happy-dom defaults innerWidth to 1024; 1020 puts the cursor at the
    // right edge, so the default `point.x + width + gap` placement would
    // overflow and the clamp branch must flip anchor.
    render(
      <HostCanopyUnionTooltip
        point={{ x: 1020, y: 100 }}
        entries={[
          entry({ hostName: 'Edge Host', unionAreaM2: 100, rawSumM2: 120, guildCount: 2, memberCount: 3 }),
        ]}
      />,
    );

    const tip = screen.getByTestId('host-canopy-union-tooltip');
    expect(tip.getAttribute('data-anchor-x')).toBe('left');
  });

  it('renders two stacked host blocks with one separator between (multi-feature fan-out)', () => {
    render(
      <HostCanopyUnionTooltip
        point={{ x: 100, y: 100 }}
        entries={[
          entry({ hostId: 'up', hostName: 'Upper Host', unionAreaM2: 100, rawSumM2: 130, guildCount: 2, memberCount: 4 }),
          entry({ hostId: 'lo', hostName: 'Lower Host', unionAreaM2: 80, rawSumM2: 95, guildCount: 1, memberCount: 3 }),
        ]}
      />,
    );

    // Both host names visible (topmost first per MapLibre order).
    expect(screen.getByText('Upper Host')).toBeTruthy();
    expect(screen.getByText('Lower Host')).toBeTruthy();
    // Both sets of rounded m² values render.
    expect(screen.getByText('100 m²')).toBeTruthy();
    expect(screen.getByText('130 m²')).toBeTruthy();
    expect(screen.getByText('80 m²')).toBeTruthy();
    expect(screen.getByText('95 m²')).toBeTruthy();
    // Exactly one hairline separator between two blocks (length-1
    // stacks omit the separator entirely).
    expect(screen.getAllByRole('separator').length).toBe(1);
  });

  it('forwards data-exiting and fires onExited on container opacity transitionend', () => {
    // 2026-05-30: PlanDataLayers holds the portal mounted past
    // activeUnion → null so the CSS exit transition can interpolate
    // opacity to 0. The tooltip's contract: while `exiting`, expose
    // `data-exiting='true'` (so the CSS rule engages) and call
    // `onExited` when the opacity transition reports its end.
    // happy-dom doesn't run CSS transitions, so we drive the event
    // directly via fireEvent.transitionEnd.
    const onExited = vi.fn();
    render(
      <HostCanopyUnionTooltip
        point={{ x: 100, y: 100 }}
        entries={[
          entry({ hostId: 'ex', hostName: 'Exit Host', unionAreaM2: 100, rawSumM2: 110, guildCount: 1, memberCount: 2 }),
        ]}
        exiting={true}
        onExited={onExited}
      />,
    );

    const tip = screen.getByTestId('host-canopy-union-tooltip');
    expect(tip.getAttribute('data-exiting')).toBe('true');

    // A transform-property transitionend (the other tracked property
    // — translateY interpolates alongside opacity) must NOT fire
    // onExited, otherwise onExited would fire twice per dismiss.
    fireTransitionEnd(tip, 'transform');
    expect(onExited).not.toHaveBeenCalled();

    // The opacity transition completing does.
    fireTransitionEnd(tip, 'opacity');
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it('does NOT fire onExited when exiting flips true → false mid-render (reverse-in-flight)', () => {
    // The reverse-in-flight contract: when activeUnion returns
    // non-null during the container's exit fade, PlanDataLayers
    // flips `exiting` back to false. CSS transitions interpolate
    // opacity from current value back to 1 with no snap — and
    // critically, no spurious onExited fire (which would race-clear
    // the mirror PlanDataLayers just restored).
    const onExited = vi.fn();
    const baseEntries = [entry({ hostId: 'rev', hostName: 'Reverse Host' })];
    const { rerender } = render(
      <HostCanopyUnionTooltip
        point={{ x: 100, y: 100 }}
        entries={baseEntries}
        exiting={true}
        onExited={onExited}
      />,
    );

    rerender(
      <HostCanopyUnionTooltip
        point={{ x: 100, y: 100 }}
        entries={baseEntries}
        exiting={false}
        onExited={onExited}
      />,
    );

    const tip = screen.getByTestId('host-canopy-union-tooltip');
    expect(tip.hasAttribute('data-exiting')).toBe(false);

    // A transitionend that fires *after* exiting flipped to false
    // (the reverse-back-to-visible transition completing) must not
    // trigger onExited.
    fireTransitionEnd(tip, 'opacity');
    expect(onExited).not.toHaveBeenCalled();
  });

  it('fires onEntryExited with the hostId of a phase="exiting" block on opacity transitionend', () => {
    // Per-block fade contract: when one host drops out of the active
    // set while others remain, PlanDataLayers keeps it in the entries
    // array with phase='exiting'. The tooltip carries data-exiting on
    // that block, and the block's own opacity transitionend fires
    // onEntryExited(hostId) so PlanDataLayers can drop it from the
    // array. Sibling entries with phase='entering' must NOT fire.
    const onEntryExited = vi.fn();
    render(
      <HostCanopyUnionTooltip
        point={{ x: 100, y: 100 }}
        entries={[
          entry({ hostId: 'stay', hostName: 'Staying Host', phase: 'entering' }),
          entry({ hostId: 'gone', hostName: 'Dropping Host', phase: 'exiting' }),
        ]}
        onEntryExited={onEntryExited}
      />,
    );

    const stayBlock = screen.getByTestId('host-block-stay');
    const goneBlock = screen.getByTestId('host-block-gone');
    expect(stayBlock.hasAttribute('data-exiting')).toBe(false);
    expect(goneBlock.getAttribute('data-exiting')).toBe('true');

    // Firing transitionend on the entering block must not fire
    // onEntryExited (no phase='exiting' on this block).
    fireTransitionEnd(stayBlock, 'opacity');
    expect(onEntryExited).not.toHaveBeenCalled();

    // Transform transitionend on the dropping block doesn't fire
    // either — the handler filters propertyName to 'opacity'.
    fireTransitionEnd(goneBlock, 'transform');
    expect(onEntryExited).not.toHaveBeenCalled();

    // Opacity transitionend on the dropping block fires once with
    // the dropping hostId.
    fireTransitionEnd(goneBlock, 'opacity');
    expect(onEntryExited).toHaveBeenCalledTimes(1);
    expect(onEntryExited).toHaveBeenCalledWith('gone');
  });

  // Slice K — scroll-cap carve-out for large pinned multi-host stacks.
  // The pointer-events: auto carve-out only engages when BOTH the
  // tooltip is pinned AND entries.length >= 4. Below that threshold
  // the 2026-05-25 invariant ("must never steal mouseleave") holds.
  describe('scroll-cap carve-out (Slice K, migrated for Slice L)', () => {
    // Slice L: scroll-cap derivation moved from container-level
    // `pinned` prop to `entries.some(e => e.pinned)`. The threshold
    // rule (>= 4) is unchanged. These tests build pinned stacks by
    // setting `pinned: true` on each entry.
    function pinnedStack(n: number): HostBlockEntry[] {
      return Array.from({ length: n }, (_, i) =>
        entry({ hostId: `h${i}`, hostName: `Host ${i}`, pinned: true }),
      );
    }
    function hoverStack(n: number): HostBlockEntry[] {
      return Array.from({ length: n }, (_, i) =>
        entry({ hostId: `h${i}`, hostName: `Host ${i}`, pinned: false }),
      );
    }

    it('does not set data-scrollable below the threshold even when entries are pinned', () => {
      render(
        <HostCanopyUnionTooltip
          point={{ x: 100, y: 100 }}
          entries={pinnedStack(3)}
        />,
      );
      const root = screen.getByTestId('host-canopy-union-tooltip');
      expect(root.hasAttribute('data-scrollable')).toBe(false);
      // Per-block accent still applies on each pinned block.
      expect(
        screen.getByTestId('host-block-h0').getAttribute('data-pinned'),
      ).toBe('true');
    });

    it('does not set data-scrollable for a pure-hover stack even with 4+ entries', () => {
      // Hover mode with 4+ hosts keeps pointer-events: none so the
      // underlying union layer still receives mouseleave — the
      // 2026-05-25 invariant survives in hover mode.
      render(
        <HostCanopyUnionTooltip
          point={{ x: 100, y: 100 }}
          entries={hoverStack(5)}
        />,
      );
      const root = screen.getByTestId('host-canopy-union-tooltip');
      expect(root.hasAttribute('data-scrollable')).toBe(false);
    });

    it('sets data-scrollable when at least one entry is pinned AND entries.length >= 4', () => {
      render(
        <HostCanopyUnionTooltip
          point={{ x: 100, y: 100 }}
          entries={pinnedStack(4)}
        />,
      );
      const root = screen.getByTestId('host-canopy-union-tooltip');
      expect(root.getAttribute('data-scrollable')).toBe('true');
    });

    it('handles a very tall pinned stack without throwing on edge-clamp', () => {
      // 20-host stack at a near-top cursor position used to over-reserve
      // vertical space via `entries.length * PER_BLOCK_H`; with the
      // scroll-cap active the estimatedH is bounded by viewport - 80.
      render(
        <HostCanopyUnionTooltip
          point={{ x: 100, y: 40 }}
          entries={pinnedStack(20)}
        />,
      );
      const root = screen.getByTestId('host-canopy-union-tooltip');
      expect(root.getAttribute('data-scrollable')).toBe('true');
      const top = Number.parseFloat(
        (root as HTMLDivElement).style.top.replace('px', ''),
      );
      expect(Number.isFinite(top)).toBe(true);
      expect(top).toBeGreaterThanOrEqual(0);
    });
  });

  // Slice L — multi-pin: pinned is per-entry, container can hold a
  // mix of pinned + hover entries simultaneously, and scrollable
  // activates when ANY entry is pinned (not all). Steward-facing
  // affordance documented in
  // wiki/decisions/2026-05-30-atlas-b4-tooltip-multi-pin.md.
  describe('multi-pin (Slice L)', () => {
    it('renders mixed pinned + hover entries — only pinned blocks carry data-pinned', () => {
      render(
        <HostCanopyUnionTooltip
          point={{ x: 100, y: 100 }}
          entries={[
            entry({ hostId: 'sticky', hostName: 'Sticky Host', pinned: true }),
            entry({ hostId: 'transient', hostName: 'Transient Host', pinned: false }),
          ]}
        />,
      );
      // Both blocks rendered.
      expect(screen.getByText('Sticky Host')).toBeTruthy();
      expect(screen.getByText('Transient Host')).toBeTruthy();
      // Only the pinned block carries data-pinned.
      expect(
        screen.getByTestId('host-block-sticky').getAttribute('data-pinned'),
      ).toBe('true');
      expect(
        screen.getByTestId('host-block-transient').hasAttribute('data-pinned'),
      ).toBe(false);
      // The container root never carries data-pinned (post-Slice L).
      expect(
        screen.getByTestId('host-canopy-union-tooltip').hasAttribute('data-pinned'),
      ).toBe(false);
      // Separator still renders between the two blocks.
      expect(screen.getAllByRole('separator').length).toBe(1);
    });

    it('all-pinned stack: every block carries data-pinned and separators between them', () => {
      render(
        <HostCanopyUnionTooltip
          point={{ x: 100, y: 100 }}
          entries={[
            entry({ hostId: 'a', hostName: 'Host A', pinned: true }),
            entry({ hostId: 'b', hostName: 'Host B', pinned: true }),
            entry({ hostId: 'c', hostName: 'Host C', pinned: true }),
          ]}
        />,
      );
      expect(
        screen.getByTestId('host-block-a').getAttribute('data-pinned'),
      ).toBe('true');
      expect(
        screen.getByTestId('host-block-b').getAttribute('data-pinned'),
      ).toBe('true');
      expect(
        screen.getByTestId('host-block-c').getAttribute('data-pinned'),
      ).toBe('true');
      // Two separators (between A-B and B-C).
      expect(screen.getAllByRole('separator').length).toBe(2);
    });

    it('all-hover stack: no block carries data-pinned', () => {
      render(
        <HostCanopyUnionTooltip
          point={{ x: 100, y: 100 }}
          entries={[
            entry({ hostId: 'x', hostName: 'Host X' }),
            entry({ hostId: 'y', hostName: 'Host Y' }),
          ]}
        />,
      );
      expect(
        screen.getByTestId('host-block-x').hasAttribute('data-pinned'),
      ).toBe(false);
      expect(
        screen.getByTestId('host-block-y').hasAttribute('data-pinned'),
      ).toBe(false);
    });

    it('scrollable activates when ANY entry is pinned and entries.length >= 4 (regression guard)', () => {
      // 1 pinned + 3 hover = 4 total, ≥ threshold, so scrollable
      // engages. This guards against the scrollable predicate being
      // tightened to "all pinned" — the steward-facing rule is "if
      // the stack is sticky at all, allow scroll," because the only
      // way the stack stays in view long enough to need scrolling is
      // if at least one host is pinned holding it open.
      render(
        <HostCanopyUnionTooltip
          point={{ x: 100, y: 100 }}
          entries={[
            entry({ hostId: 'a', hostName: 'Host A', pinned: true }),
            entry({ hostId: 'b', hostName: 'Host B' }),
            entry({ hostId: 'c', hostName: 'Host C' }),
            entry({ hostId: 'd', hostName: 'Host D' }),
          ]}
        />,
      );
      const root = screen.getByTestId('host-canopy-union-tooltip');
      expect(root.getAttribute('data-scrollable')).toBe('true');
    });
  });
});
