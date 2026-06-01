/**
 * @vitest-environment happy-dom
 *
 * AsBuiltReconciliationCard -- Plan reconciliation surface for Act as-built
 * deviations (Slice 3 gate).
 *
 * Verified behaviours:
 *   1. Card renders when a matching active divergent point with sourceFeatureRef
 *      and domain overlap exists.
 *   2. Card does NOT render when there are no matching points.
 *   3. Card does NOT render for superseded points.
 *   4. Card does NOT render for points that lack sourceFeatureRef.
 *   5. "Apply to design" calls updateCropArea with the correct partial patch,
 *      then acknowledges the point (soft-supersedes it).
 *   6. "Keep plan" acknowledges the point without mutating the crop store.
 *   7. Attribute diff asPlanned/asBuilt values are displayed.
 *   8. Both Apply and Keep are present for an attribute diff; only Keep for a
 *      geometry diff (read-only in v1).
 *
 * Uses real stores -- no mocking. Seeding via getState() mutators; cleanup via
 * clearForProject + cropStore.setState. Pattern mirrors
 * observeDataPointStore.asBuilt.test.ts (Slice 1) and
 * DecisionChecklist.test.tsx (component rendering).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// lucide-react ships CJS in this environment; its `require('react')` resolves
// to a different React instance than the test runner, causing the classic
// "Objects are not valid as a React child" crash. Stub the icons — tests care
// about button text / testids, not SVG rendering.
vi.mock('lucide-react', () => ({
  AlertTriangle: () => null,
  CheckCircle2: () => null,
  X: () => null,
}));

import { useObserveDataPointStore } from '../../../../store/observeDataPointStore.js';
import { useCropStore } from '../../../../store/cropStore.js';
import type { ObserveDataPoint } from '@ogden/shared';
import { findObjectiveGlobally } from '../../objectiveCatalog.js';
import AsBuiltReconciliationCard from '../AsBuiltReconciliationCard.js';

const PROJECT_ID = 'test-project-asbuilt';
const CROP_ID = 'crop-abc';

// The static-skeleton s6-yield-flows objective owns plants-food; all
// as-built cropArea deviations emit domainId: 'plants-food'. Using a real
// catalogue entry (same pattern as planRevisionFlag.asBuilt.test.ts) so
// the domain-overlap path exercises the real resolver.
const objective = findObjectiveGlobally('s6-yield-flows')!;

function mkPoint(overrides: Partial<ObserveDataPoint> = {}): ObserveDataPoint {
  return {
    id: crypto.randomUUID(),
    projectId: PROJECT_ID,
    domainId: 'plants-food',
    sourceType: 'divergence_evidence',
    sourceActionId: null,
    sourceFeedEntryId: null,
    sourceObjectiveId: null,
    sourceFeatureRef: { kind: 'cropArea', id: CROP_ID },
    locationGeometry: null,
    cycleId: 0,
    isSuperseded: false,
    supersededBy: null,
    statusOutput: 'needs_investigation',
    measurementValue: {
      kind: 'attribute',
      field: 'name',
      label: 'Name',
      asPlanned: 'Apple Orchard',
      asBuilt: 'Pear Orchard',
    },
    proofItems: [],
    capturedAt: new Date('2026-06-01T10:00:00Z').toISOString(),
    capturedBy: 'act-as-built',
    ...overrides,
  };
}

beforeEach(() => {
  // Reset stores between tests.
  useObserveDataPointStore.getState().clearForProject(PROJECT_ID);
  useCropStore.setState({ cropAreas: [] });
  vi.restoreAllMocks();
});

describe('AsBuiltReconciliationCard -- rendering', () => {
  it('renders the card when a matching active deviation point exists', () => {
    useObserveDataPointStore.getState().recordDataPoint(mkPoint());

    render(<AsBuiltReconciliationCard projectId={PROJECT_ID} objective={objective} />);

    expect(
      screen.getByTestId('plan-asbuilt-reconciliation-card'),
    ).toBeDefined();
    expect(screen.getByTestId('plan-asbuilt-deviation-item')).toBeDefined();
  });

  it('renders asPlanned and asBuilt values for an attribute diff', () => {
    useObserveDataPointStore.getState().recordDataPoint(mkPoint());

    render(<AsBuiltReconciliationCard projectId={PROJECT_ID} objective={objective} />);

    expect(screen.getByText('Apple Orchard')).toBeDefined();
    expect(screen.getByText('Pear Orchard')).toBeDefined();
  });

  it('renders nothing when there are no matching points', () => {
    render(<AsBuiltReconciliationCard projectId={PROJECT_ID} objective={objective} />);

    expect(screen.queryByTestId('plan-asbuilt-reconciliation-card')).toBeNull();
  });

  it('does NOT render superseded points', () => {
    useObserveDataPointStore.getState().recordDataPoint(
      mkPoint({ isSuperseded: true }),
    );

    render(<AsBuiltReconciliationCard projectId={PROJECT_ID} objective={objective} />);

    expect(screen.queryByTestId('plan-asbuilt-reconciliation-card')).toBeNull();
  });

  it('does NOT render points without sourceFeatureRef', () => {
    useObserveDataPointStore.getState().recordDataPoint(
      mkPoint({ sourceFeatureRef: null }),
    );

    render(<AsBuiltReconciliationCard projectId={PROJECT_ID} objective={objective} />);

    expect(screen.queryByTestId('plan-asbuilt-reconciliation-card')).toBeNull();
  });

  it('shows both Apply and Keep buttons for an attribute diff', () => {
    useObserveDataPointStore.getState().recordDataPoint(mkPoint());

    render(<AsBuiltReconciliationCard projectId={PROJECT_ID} objective={objective} />);

    expect(screen.getByTestId('plan-asbuilt-apply')).toBeDefined();
    expect(screen.getByTestId('plan-asbuilt-keep')).toBeDefined();
  });

  it('shows only Keep (no Apply) for a geometry diff', () => {
    useObserveDataPointStore.getState().recordDataPoint(
      mkPoint({
        measurementValue: {
          kind: 'geometry',
          field: 'geometry',
          asPlanned: { areaM2: 800, note: 'design' },
          asBuilt: { areaM2: 650, note: 'steward reduced planting bed' },
        },
      }),
    );

    render(<AsBuiltReconciliationCard projectId={PROJECT_ID} objective={objective} />);

    expect(screen.queryByTestId('plan-asbuilt-apply')).toBeNull();
    expect(screen.getByTestId('plan-asbuilt-keep')).toBeDefined();
  });
});

describe('AsBuiltReconciliationCard -- actions', () => {
  it('"Apply to design" calls updateCropArea with the correct patch', () => {
    const point = mkPoint();
    useObserveDataPointStore.getState().recordDataPoint(point);

    const updateSpy = vi.spyOn(useCropStore.getState(), 'updateCropArea');

    render(<AsBuiltReconciliationCard projectId={PROJECT_ID} objective={objective} />);
    fireEvent.click(screen.getByTestId('plan-asbuilt-apply'));

    // Should have patched { name: 'Pear Orchard' } on the crop.
    expect(updateSpy).toHaveBeenCalledOnce();
    const [calledId, calledPatch] = updateSpy.mock.calls[0]!;
    expect(calledId).toBe(CROP_ID);
    expect(calledPatch).toMatchObject({ name: 'Pear Orchard' });
  });

  it('"Apply to design" acknowledges (soft-supersedes) the point', () => {
    const point = mkPoint();
    useObserveDataPointStore.getState().recordDataPoint(point);

    render(<AsBuiltReconciliationCard projectId={PROJECT_ID} objective={objective} />);
    fireEvent.click(screen.getByTestId('plan-asbuilt-apply'));

    const active = useObserveDataPointStore.getState().getActiveByProject(PROJECT_ID);
    expect(active.some((p) => p.id === point.id)).toBe(false);
  });

  it('"Keep plan" acknowledges the point without calling updateCropArea', () => {
    const point = mkPoint();
    useObserveDataPointStore.getState().recordDataPoint(point);

    const updateSpy = vi.spyOn(useCropStore.getState(), 'updateCropArea');

    render(<AsBuiltReconciliationCard projectId={PROJECT_ID} objective={objective} />);
    fireEvent.click(screen.getByTestId('plan-asbuilt-keep'));

    expect(updateSpy).not.toHaveBeenCalled();

    const active = useObserveDataPointStore.getState().getActiveByProject(PROJECT_ID);
    expect(active.some((p) => p.id === point.id)).toBe(false);
  });
});
