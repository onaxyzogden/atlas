// @vitest-environment happy-dom
/**
 * StewardSurveyDetail -- the `needs` capture (steward data audit, Option 3).
 *
 * `needs` is the one explicit steward variable that previously had no home.
 * The steward survey is its capture surface: a ChipEditor mirroring `skills`,
 * writing through setStewardProfileList(..., 'needs', ...) onto the canonical
 * StewardProfile overlay (so it rides the roster read model for free).
 *
 * Pins:
 *   - typing a need + Enter records it on the profile via the store, and
 *   - the chip renders back into the survey.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ProjectMemberRecord } from '@ogden/shared';

// lucide-react CJS icon exports re-render as childless objects React + happy-dom
// reject; replace each component export with a clean <svg> stub (established
// convention -- mirrors the capture + WorkItemRow.steward suites).
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' &&
        value !== null &&
        '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', {
            ref,
            'data-lucide-icon': key,
            'aria-hidden': 'true',
          });
        },
      );
      Stub.displayName = `LucideStub(${key})`;
      stubbed[key] = Stub;
    } else {
      stubbed[key] = value;
    }
  }
  return stubbed;
});

// The survey reads the active project from the router; pin it to 'p1'. Spread
// the original module so nothing else (Link, etc.) is disturbed.
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useParams: () => ({ projectId: 'p1' }) };
});

import StewardSurveyDetail from '../StewardSurveyDetail.js';
import { useVisionStore } from '../../../../../store/visionStore.js';
import { useMemberStore } from '../../../../../store/memberStore.js';

const member: ProjectMemberRecord = {
  userId: '11111111-1111-1111-1111-111111111111',
  email: 'ali@example.nz',
  displayName: 'Ali Rahman',
  role: 'primary_steward',
  operationalRoles: [],
  joinedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  useVisionStore.setState({ visions: [] });
  useVisionStore.getState().ensureDefaults('p1');
  useMemberStore.setState({ members: [member], myRole: null, myRoles: {}, isLoading: false });
});

describe('StewardSurveyDetail -- needs capture (Option 3)', () => {
  it('records a typed need on the steward profile and renders the chip', () => {
    render(<StewardSurveyDetail />);

    const input = screen.getByPlaceholderText('New need') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'wheelchair-accessible paths' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    const profile = useVisionStore.getState().getVisionData('p1')!
      .stewardProfiles[member.userId]!;
    expect(profile.needs).toEqual(['wheelchair-accessible paths']);

    // and the chip rendered back into the survey
    expect(screen.getByText('wheelchair-accessible paths')).toBeTruthy();
  });
});
