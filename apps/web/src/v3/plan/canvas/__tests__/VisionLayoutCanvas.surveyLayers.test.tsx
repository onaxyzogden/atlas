// @vitest-environment happy-dom
/**
 * VisionLayoutCanvas.surveyLayers — guards the fix for "drawn slope/vegetation
 * survey polygons are visible on the Act map but not on the Plan map, and the
 * BaseMapCard overlay toggle does nothing on Plan".
 *
 * Root cause: the Plan canvas mounted SlopeSurveyLayer / VegetationSurveyLayer
 * only while their takeover flag (slopeActive / surveyActive) was true, so the
 * polygons vanished outside the takeover and the overlay toggle had no layer to
 * show/hide. Act mounts the same passive renderers unconditionally. The fix
 * decouples the LAYER (always mounted, parity with Act) from the DRAW HOST
 * (still gated on the takeover — drawing is a takeover activity).
 *
 * These tests mock the heavy map children (the live v3 WebGL mount hangs the
 * preview tool deterministically) and assert the mount/gate contract:
 *   - survey layers mount even when both takeover flags are false
 *   - draw hosts mount only when their takeover flag is true
 *
 * NOTE: vi.mock paths are resolved relative to THIS test file (one level deeper
 * than VisionLayoutCanvas), so each specifier carries one more `../` than the
 * component's own import.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import VisionLayoutCanvas from '../VisionLayoutCanvas.js';

// DiagnoseMap is a render-prop owning the MapLibre instance; stub it to invoke
// the child with a throwaway map (every real map consumer below is mocked away).
vi.mock('../../../components/DiagnoseMap.js', () => ({
  default: ({ children }: { children: (a: { map: unknown }) => unknown }) =>
    children({ map: {} }),
}));

// The four survey components under test — render identifiable markers so the
// presence/absence assertions are unambiguous.
vi.mock('../../../act/terrain/SlopeSurveyLayer.js', () => ({
  default: () => <div data-testid="slope-layer" />,
}));
vi.mock('../../../act/terrain/SlopeSurveyDrawHost.js', () => ({
  default: () => <div data-testid="slope-host" />,
}));
vi.mock('../../../act/ecology/VegetationSurveyLayer.js', () => ({
  default: () => <div data-testid="veg-layer" />,
}));
vi.mock('../../../act/ecology/VegetationSurveyDrawHost.js', () => ({
  default: () => <div data-testid="veg-host" />,
}));

// Neutralise every other map child so the canvas mounts in happy-dom. Each is a
// pure side-effect component irrelevant to this contract. (vi.mock factories are
// hoisted to the very top of the file, above any module-scope const, so the
// shared null-module factory is created via vi.hoisted.)
const { nullMod } = vi.hoisted(() => ({
  nullMod: () => ({ default: () => null }),
}));
vi.mock('../layers/DesignElementLayers.js', nullMod);
vi.mock('../../../../features/agroforestry/SilvopasturePopover.js', nullMod);
vi.mock('../../../../features/agroforestry/SilvopastureMemberOutline.js', nullMod);
vi.mock('../../../builtEnvironment/layers/index.js', () => ({
  AdoptedBuildingsSync: () => null,
  DesignElementExtrusionLayer: () => null,
  DesignElementScenegraphLayer: () => null,
  Terrain3DController: () => null,
}));
vi.mock('../../../_shared/deck/DeckOverlay.js', nullMod);
vi.mock('../DesignToolRail.js', nullMod);
vi.mock('../useMapCursor.js', () => ({ MapCursorHost: () => null }));
vi.mock('../BaseMapCard.js', nullMod);
vi.mock('../../../observe/components/MapToolbar.js', nullMod);
vi.mock('../../../observe/components/draw/BeV2ExistingTool.js', nullMod);
vi.mock('../../../observe/components/draw/ObserveDrawHost.js', nullMod);
vi.mock('../../../observe/components/layers/ObserveAnnotationLayers.js', nullMod);
vi.mock('../../../observe/components/overlays/SectorCompassOverlay.js', nullMod);
vi.mock('../../draw/PlanObserveSelectionHandler.js', nullMod);
vi.mock('../../draw/InlineFeaturePopover.js', nullMod);
vi.mock('../../draw/UtilityConflictDialog.js', nullMod);
vi.mock('../../draw/PlacementConflictDialog.js', nullMod);
vi.mock('../../draw/ObserveLinkPopover.js', nullMod);
vi.mock('../../layers/PlanDataLayers.js', nullMod);
vi.mock('../../layers/PlanScheduledMovesOverlay.js', nullMod);
vi.mock('../../layers/PlanWaterRouterOverlay.js', nullMod);
vi.mock('../../draw/PlanDrawHost.js', nullMod);
vi.mock('../../layers/PlanVertexEditHandler.js', nullMod);
vi.mock('../../draw/Plan3DSelectionHandler.js', nullMod);
vi.mock('../../PlanSelectionFloater.js', nullMod);
vi.mock('../draw/useDesignElementDrawTool.js', () => ({
  useDesignElementDrawTool: () => {},
}));

const baseProps = {
  projectId: 'p1',
  centroid: [-78.2, 44.5] as [number, number],
  boundary: undefined,
  view: 'vision' as const,
};

afterEach(cleanup);

describe('VisionLayoutCanvas survey layers', () => {
  it('mounts both survey LAYERS even when no takeover is active (parity with Act)', () => {
    render(
      <VisionLayoutCanvas {...baseProps} surveyActive={false} slopeActive={false} />,
    );
    expect(screen.getByTestId('slope-layer')).toBeTruthy();
    expect(screen.getByTestId('veg-layer')).toBeTruthy();
    // Draw hosts stay gated — drawing is a takeover-only activity.
    expect(screen.queryByTestId('slope-host')).toBeNull();
    expect(screen.queryByTestId('veg-host')).toBeNull();
  });

  it('mounts the slope draw host only when the slope takeover is active', () => {
    render(
      <VisionLayoutCanvas {...baseProps} surveyActive={false} slopeActive={true} />,
    );
    expect(screen.getByTestId('slope-layer')).toBeTruthy();
    expect(screen.getByTestId('slope-host')).toBeTruthy();
    expect(screen.queryByTestId('veg-host')).toBeNull();
  });

  it('mounts the vegetation draw host only when the vegetation takeover is active', () => {
    render(
      <VisionLayoutCanvas {...baseProps} surveyActive={true} slopeActive={false} />,
    );
    expect(screen.getByTestId('veg-layer')).toBeTruthy();
    expect(screen.getByTestId('veg-host')).toBeTruthy();
    expect(screen.queryByTestId('slope-host')).toBeNull();
  });
});
