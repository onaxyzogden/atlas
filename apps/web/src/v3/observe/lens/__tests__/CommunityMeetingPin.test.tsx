/**
 * @vitest-environment happy-dom
 *
 * CommunityMeetingPin — the Observe-lens read-only pulsing pin (SVG <animate>
 * ring reusing the ObservationPin idiom). Pure presentational component.
 *
 * Pins:
 *   - Renders the count badge.
 *   - Carries the two synchronized <animate> elements that make the ring pulse.
 *   - Click delegates to onClick (the lens opens its read-only popover).
 */

import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { CommunityMeetingPin } from '../components.js';

describe('CommunityMeetingPin', () => {
  it('renders the upcoming-gathering count', () => {
    const { container } = render(
      <svg>
        <CommunityMeetingPin px={10} py={20} count={3} onClick={() => {}} />
      </svg>,
    );
    expect(container.querySelector('text')?.textContent).toBe('3');
  });

  it('carries a pulsing ring (two synchronized <animate> elements)', () => {
    const { container } = render(
      <svg>
        <CommunityMeetingPin px={0} py={0} count={1} onClick={() => {}} />
      </svg>,
    );
    expect(container.querySelectorAll('animate').length).toBeGreaterThanOrEqual(2);
  });

  it('delegates click to onClick', () => {
    const onClick = vi.fn();
    const { container } = render(
      <svg>
        <CommunityMeetingPin px={5} py={5} count={2} onClick={onClick} />
      </svg>,
    );
    fireEvent.click(container.querySelector('g')!);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
