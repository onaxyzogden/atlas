/**
 * @vitest-environment happy-dom
 *
 * PlanCropAreaSelectionHandler — RTL render + synthetic mousedown
 * dispatch (B5.2.x.c follow-up).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import type { Map as MaplibreMap, MapMouseEvent } from 'maplibre-gl';
import PlanCropAreaSelectionHandler from '../PlanCropAreaSelectionHandler.js';
import { useCoverCropPopoverStore } from '../../../../features/coverCrops/CoverCropPopoverEditor.js';

interface FakeLayer {
  id: string;
}

interface FakeFeature {
  layer: FakeLayer;
  properties: Record<string, unknown>;
}

interface FakeMap {
  handler: ((e: MapMouseEvent) => void) | null;
  layers: FakeLayer[];
  features: FakeFeature[];
  on: (event: string, handler: (e: MapMouseEvent) => void) => void;
  off: (event: string, handler: (e: MapMouseEvent) => void) => void;
  getStyle: () => { layers: FakeLayer[] };
  queryRenderedFeatures: (point: unknown, opts: { layers: string[] }) => FakeFeature[];
}

function makeFakeMap(layers: FakeLayer[], features: FakeFeature[]): FakeMap {
  const fake: FakeMap = {
    handler: null,
    layers,
    features,
    on: (event, handler) => {
      if (event === 'mousedown') fake.handler = handler;
    },
    off: () => {
      fake.handler = null;
    },
    getStyle: () => ({ layers: fake.layers }),
    queryRenderedFeatures: (_point, opts) =>
      fake.features.filter((f) => opts.layers.includes(f.layer.id)),
  };
  return fake;
}

function makeEvent(overrides: Partial<MapMouseEvent> = {}): MapMouseEvent {
  return {
    point: { x: 42, y: 84 },
    preventDefault: () => undefined,
    originalEvent: { stopPropagation: () => undefined } as MouseEvent,
    ...overrides,
  } as unknown as MapMouseEvent;
}

beforeEach(() => {
  useCoverCropPopoverStore.setState({
    open: false,
    projectId: null,
    cropAreaId: null,
    anchor: null,
  });
});

describe('PlanCropAreaSelectionHandler', () => {
  it('opens the popover when a crop-fill-* layer is clicked (properties.id)', () => {
    const map = makeFakeMap(
      [{ id: 'crop-fill-ca1' }, { id: 'crop-line-ca1' }],
      [{ layer: { id: 'crop-fill-ca1' }, properties: { id: 'ca1' } }],
    );
    render(
      <PlanCropAreaSelectionHandler
        map={map as unknown as MaplibreMap}
        projectId="p1"
      />,
    );
    map.handler!(makeEvent());

    const state = useCoverCropPopoverStore.getState();
    expect(state.open).toBe(true);
    expect(state.projectId).toBe('p1');
    expect(state.cropAreaId).toBe('ca1');
    expect(state.anchor).toEqual({ x: 42, y: 84 });
  });

  it('falls back to stripping crop-fill- prefix when properties.id is missing', () => {
    const map = makeFakeMap(
      [{ id: 'crop-fill-ca-xyz' }],
      [{ layer: { id: 'crop-fill-ca-xyz' }, properties: { name: 'North row' } }],
    );
    render(
      <PlanCropAreaSelectionHandler
        map={map as unknown as MaplibreMap}
        projectId="p1"
      />,
    );
    map.handler!(makeEvent());

    expect(useCoverCropPopoverStore.getState().cropAreaId).toBe('ca-xyz');
  });

  it('does nothing when no crop-fill-* layers are live', () => {
    const map = makeFakeMap(
      [{ id: 'paddock-fill-x' }],
      [{ layer: { id: 'paddock-fill-x' }, properties: { id: 'x' } }],
    );
    render(
      <PlanCropAreaSelectionHandler
        map={map as unknown as MaplibreMap}
        projectId="p1"
      />,
    );
    map.handler!(makeEvent());

    expect(useCoverCropPopoverStore.getState().open).toBe(false);
  });

  it('does nothing when projectId is null', () => {
    const map = makeFakeMap(
      [{ id: 'crop-fill-ca1' }],
      [{ layer: { id: 'crop-fill-ca1' }, properties: { id: 'ca1' } }],
    );
    render(
      <PlanCropAreaSelectionHandler
        map={map as unknown as MaplibreMap}
        projectId={null}
      />,
    );
    map.handler!(makeEvent());

    expect(useCoverCropPopoverStore.getState().open).toBe(false);
  });
});
