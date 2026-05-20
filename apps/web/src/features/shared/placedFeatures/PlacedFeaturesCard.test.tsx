// @vitest-environment happy-dom
/**
 * PlacedFeaturesCard — search + hide-hidden filter tests.
 *
 * Validates the body-filtered / rollup-unfiltered split: typing in the
 * search input narrows the rendered rows, the "Hide hidden" pill removes
 * already-toggled-off rows, and the header rollup stays anchored to the
 * unfiltered store totals so the steward sees what is placed vs what is
 * currently shown.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' && value !== null && '$$typeof' in (value as object)) ||
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

import PlacedFeaturesCard from './PlacedFeaturesCard.js';
import { useZoneStore, type LandZone } from '../../../store/zoneStore.js';
import { useBuiltEnvironmentStoreV2 } from '../../../store/builtEnvironmentStoreV2.js';
import { useLandDesignStore } from '../../../store/landDesignStore.js';

const PROJECT = 'test-card-project';

function makeZone(id: string, name: string, hidden = false): LandZone {
  return {
    id,
    projectId: PROJECT,
    name,
    category: 'habitation',
    color: '#abcdef',
    primaryUse: '',
    secondaryUse: '',
    notes: '',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]],
    },
    areaM2: 16,
    hidden,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };
}

function resetStores() {
  useBuiltEnvironmentStoreV2.setState({ entities: [] });
  useLandDesignStore.setState({ byProject: {} });
  useZoneStore.setState({ zones: [] });
}

function openCard() {
  fireEvent.click(screen.getByRole('button', { name: /placed features/i }));
}

describe('PlacedFeaturesCard — search + hide-hidden filter', () => {
  beforeEach(() => {
    resetStores();
  });

  it('narrows the visible rows when a label substring is typed', () => {
    useZoneStore.setState({
      zones: [
        makeZone('z1', 'Home Paddock'),
        makeZone('z2', 'North Field'),
        makeZone('z3', 'South Paddock'),
      ],
    });
    render(<PlacedFeaturesCard stage="plan" projectId={PROJECT} />);
    openCard();

    expect(screen.getByText('Home Paddock')).toBeTruthy();
    expect(screen.getByText('North Field')).toBeTruthy();
    expect(screen.getByText('South Paddock')).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/search placed features/i), {
      target: { value: 'padd' },
    });

    expect(screen.getByText('Home Paddock')).toBeTruthy();
    expect(screen.getByText('South Paddock')).toBeTruthy();
    expect(screen.queryByText('North Field')).toBeNull();
  });

  it('removes hidden rows when the Hide-hidden pill is engaged', () => {
    useZoneStore.setState({
      zones: [
        makeZone('z1', 'Visible Zone', false),
        makeZone('z2', 'Hidden Zone', true),
      ],
    });
    render(<PlacedFeaturesCard stage="plan" projectId={PROJECT} />);
    openCard();

    expect(screen.getByText('Visible Zone')).toBeTruthy();
    expect(screen.getByText('Hidden Zone')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /hide hidden/i }));

    expect(screen.getByText('Visible Zone')).toBeTruthy();
    expect(screen.queryByText('Hidden Zone')).toBeNull();
  });

  it('keeps the header rollup on the unfiltered total when a search is active', () => {
    useZoneStore.setState({
      zones: [
        makeZone('z1', 'Home Paddock'),
        makeZone('z2', 'North Field'),
        makeZone('z3', 'South Paddock'),
      ],
    });
    render(<PlacedFeaturesCard stage="plan" projectId={PROJECT} />);
    const header = screen.getByRole('button', { name: /placed features/i });
    expect(within(header).getByText(/3 placed/)).toBeTruthy();

    openCard();
    fireEvent.change(screen.getByLabelText(/search placed features/i), {
      target: { value: 'north' },
    });

    // Body narrowed to 1 row but rollup unchanged.
    expect(within(header).getByText(/3 placed/)).toBeTruthy();
    expect(screen.queryByText('Home Paddock')).toBeNull();
    expect(screen.queryByText('South Paddock')).toBeNull();
    expect(screen.getByText('North Field')).toBeTruthy();
  });
});
