/**
 * @vitest-environment happy-dom
 *
 * HostCanopyUnionTooltip — render + edge-clamp + stack tests.
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
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HostCanopyUnionTooltip } from '../HostCanopyUnionTooltip.js';

describe('HostCanopyUnionTooltip', () => {
  it('renders host name, counts, and three rounded m² values', () => {
    render(
      <HostCanopyUnionTooltip
        point={{ x: 100, y: 100 }}
        entries={[
          {
            hostName: 'South Pasture',
            unionAreaM2: 142.7,
            rawSumM2: 187.4,
            guildCount: 3,
            memberCount: 7,
          },
        ]}
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
          {
            hostName: 'Loner Host',
            unionAreaM2: 50.2,
            rawSumM2: 50.2,
            guildCount: 1,
            memberCount: 1,
          },
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

  it('forwards `pinned` as data-pinned on the root element', () => {
    const baseEntries = [
      {
        hostName: 'Pin Host',
        unionAreaM2: 100,
        rawSumM2: 120,
        guildCount: 2,
        memberCount: 3,
      },
    ];
    const { rerender } = render(
      <HostCanopyUnionTooltip
        point={{ x: 100, y: 100 }}
        entries={baseEntries}
        pinned={true}
      />,
    );
    expect(
      screen.getByTestId('host-canopy-union-tooltip').getAttribute('data-pinned'),
    ).toBe('true');

    // Default (pinned unset) and explicit false both omit the attribute
    // so unpinned tooltips remain visually identical to the 2026-05-25
    // hover ship.
    rerender(
      <HostCanopyUnionTooltip
        point={{ x: 100, y: 100 }}
        entries={baseEntries}
        pinned={false}
      />,
    );
    expect(
      screen.getByTestId('host-canopy-union-tooltip').hasAttribute('data-pinned'),
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
          {
            hostName: 'Edge Host',
            unionAreaM2: 100,
            rawSumM2: 120,
            guildCount: 2,
            memberCount: 3,
          },
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
          {
            hostName: 'Upper Host',
            unionAreaM2: 100,
            rawSumM2: 130,
            guildCount: 2,
            memberCount: 4,
          },
          {
            hostName: 'Lower Host',
            unionAreaM2: 80,
            rawSumM2: 95,
            guildCount: 1,
            memberCount: 3,
          },
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

  it('forwards data-exiting and fires onExited on tooltipFadeOut animationend', () => {
    // PlanDataLayers holds the portal mounted past activeUnion → null so
    // the CSS exit-fade can play. The tooltip's contract: while
    // `exiting`, expose `data-exiting='true'` (so the CSS keyframe
    // engages) and call `onExited` when the fade-out animation reports
    // its end. happy-dom doesn't run CSS animations, so we drive the
    // event directly via fireEvent.animationEnd.
    const onExited = vi.fn();
    render(
      <HostCanopyUnionTooltip
        point={{ x: 100, y: 100 }}
        entries={[
          {
            hostName: 'Exit Host',
            unionAreaM2: 100,
            rawSumM2: 110,
            guildCount: 1,
            memberCount: 2,
          },
        ]}
        exiting={true}
        onExited={onExited}
      />,
    );

    const tip = screen.getByTestId('host-canopy-union-tooltip');
    expect(tip.getAttribute('data-exiting')).toBe('true');

    // An unrelated animationend (e.g. the enter keyframe finishing in a
    // re-enter scenario) must NOT fire onExited.
    fireEvent.animationEnd(tip, { animationName: 'tooltipFadeIn' });
    expect(onExited).not.toHaveBeenCalled();

    // The exit keyframe finishing does. CSS Modules scopes the keyframe
    // name; the production handler uses .includes() so a scoped name
    // like `_tooltipFadeOut_abc` still matches.
    fireEvent.animationEnd(tip, { animationName: 'tooltipFadeOut' });
    expect(onExited).toHaveBeenCalledTimes(1);
  });
});
