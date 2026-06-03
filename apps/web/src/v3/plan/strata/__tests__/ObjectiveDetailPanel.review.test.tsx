/**
 * @vitest-environment happy-dom
 *
 * ObjectiveDetailPanel -- downstream review flags section (T1.7).
 *
 * Verified behaviours:
 *   1. When an open review flag exists for the objective, the "Review flags"
 *      section renders with the flag's reason text.
 *   2. Clicking "Resolve" removes the flag from the OPEN set; the section
 *      disappears (only flag in the project).
 *   3. When there are no open flags, the section is absent.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { useReviewFlagStore } from '../../../../store/reviewFlagStore.js';
import { findObjectiveGlobally } from '../../objectiveCatalog.js';
import ObjectiveDetailPanel from '../ObjectiveDetailPanel.js';
import type { PlanStratum } from '@ogden/shared';

// ---- module stubs -----------------------------------------------------------

// persistRehydrate uses store.persist.getOptions() which is undefined in the
// node environment (no localStorage). Stub it out so store modules load.
vi.mock('../../../../store/persistRehydrate.js', () => ({
  rehydrateWithLogging: () => {},
}));

// lucide-react -- stub icons using the importOriginal pattern from
// ActTierExecutionPanel.protocols.test.tsx (the forwardRef-SVG stub form).
// Replaces every component with a clean SVG element to avoid the "Objects are
// not valid as a React child" crash from the CJS React-instance mismatch.
vi.mock('lucide-react', async (importOriginal) => {
  const React = await import('react');
  let actual: Record<string, unknown>;
  try {
    actual = await importOriginal<Record<string, unknown>>();
  } catch {
    actual = {};
  }
  const stubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(actual)) {
    const isComponent =
      (typeof value === 'object' && value !== null && '$$typeof' in (value as object)) ||
      typeof value === 'function';
    if (isComponent) {
      const Stub = React.forwardRef<SVGSVGElement, Record<string, unknown>>(
        function LucideStub(_props, ref) {
          return React.createElement('svg', { ref, 'data-lucide-icon': key, 'aria-hidden': 'true' });
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

// ObjectiveMap brings in a MapLibre canvas -- not runnable in happy-dom.
// Path is relative to this test file (one level deeper than ObjectiveDetailPanel).
vi.mock('../../../olos/map/ObjectiveMap.js', () => ({
  default: () => null,
}));

// OverlayLayerSlot and its overlay components import lib/maplibre directly;
// mock the entire slot to close off the chain.
vi.mock('../../../olos/map/OverlayLayerSlot.js', () => ({ default: () => null }));

// Stub the entire lib/maplibre wrapper at the source level so maplibre-gl's
// worker-url IIFE (window.URL.createObjectURL) never runs in the test worker.
// The mock path is relative to this test file.
vi.mock('../../../../lib/maplibre.js', () => ({
  maplibregl: {
    Map: class {
      on() { return this; }
      off() { return this; }
      remove() {}
      getCanvas() { return null; }
      addControl() {}
      removeControl() {}
      loaded() { return false; }
    },
    supported: () => false,
    addProtocol: () => {},
    setWorkerUrl: () => {},
  },
  MAPTILER_KEY_STORAGE: 'ogden-maptiler-key',
  setMaptilerKey: () => {},
  MAP_STYLES: {},
  ESRI_WORLD_IMAGERY_STYLE: { version: 8, sources: {}, layers: [] },
  TERRAIN_DEM_URL: '',
  CONTOUR_TILES_URL: '',
  OPENMAPTILES_TILES_URL: '',
  hasMapToken: false,
  maptilerKey: undefined,
  maptilerTransformRequest: (url: string) => ({ url }),
}));
// Also stub maplibre-gl directly (belt-and-suspenders: pre-bundled dep may
// bypass the above stub if Vite serves it as an optimized chunk).
vi.mock('maplibre-gl', () => ({
  default: {
    Map: class { on() { return this; } off() { return this; } remove() {} },
    supported: () => false,
    addProtocol: () => {},
    setWorkerUrl: () => {},
  },
}));

// Stub the three concrete map components so the mock boundary is tight.
vi.mock('../../../components/DesignMap.js', () => ({ default: () => null }));
vi.mock('../../../components/DiagnoseMap.js', () => ({ default: () => null }));
vi.mock('../../../components/OperateMap.js', () => ({ default: () => null }));

// LaunchActButton and DecisionChecklist call useNavigate.
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// ---- test constants ---------------------------------------------------------

const PROJECT_ID = 'test-odp-reviewflags';
const REASON = 'Rotation activated 3x above expected rate -- consider tightening threshold';

const objective = findObjectiveGlobally('s6-yield-flows')!;

const STRATUM: PlanStratum = {
  id: 's6-integration-design',
  ordinal: 6,
  title: 'Integration Design',
  summary: 'How the systems integrate -- yield flows, ecology, stewardship intensity.',
};

const BASE_PROPS = {
  projectId: PROJECT_ID,
  stratum: STRATUM,
  objective,
  status: 'active' as const,
  project: null,
  onBackToStratum: vi.fn(),
  completedItemIds: [] as string[],
};

// ---- setup ------------------------------------------------------------------

beforeEach(() => {
  useReviewFlagStore.setState({ byProject: {} });
  window.localStorage.clear();
});

// ---- tests ------------------------------------------------------------------

describe('ObjectiveDetailPanel -- review flags section', () => {
  it('renders the Review flags section with reason text when an open flag exists', () => {
    useReviewFlagStore.getState().raiseFlag({
      projectId: PROJECT_ID,
      objectiveId: objective.id,
      sourceTemplateId: 'paddock_rotation_cover_trigger',
      observedCount: 3,
      deviationSign: 'over',
      depth: 'threshold',
      direction: 'tighten',
      reason: REASON,
    });

    render(<ObjectiveDetailPanel {...BASE_PROPS} />);

    const section = screen.queryByTestId('objective-review-flags');
    expect(section).not.toBeNull();
    expect(screen.getByText(REASON)).toBeDefined();
  });

  it('does NOT render the Review flags section when there are no open flags', () => {
    render(<ObjectiveDetailPanel {...BASE_PROPS} />);

    expect(screen.queryByTestId('objective-review-flags')).toBeNull();
  });

  it('removes the section after clicking Resolve on the only open flag', () => {
    const flagId = crypto.randomUUID();
    useReviewFlagStore.getState().raiseFlag({
      id: flagId,
      projectId: PROJECT_ID,
      objectiveId: objective.id,
      sourceTemplateId: 'paddock_rotation_cover_trigger',
      observedCount: 2,
      deviationSign: 'over',
      depth: 'threshold',
      direction: 'tighten',
      reason: REASON,
    });

    render(<ObjectiveDetailPanel {...BASE_PROPS} />);

    // Section should be present before resolve.
    expect(screen.queryByTestId('objective-review-flags')).not.toBeNull();

    // The flag item has its own testid.
    const flagItem = screen.getByTestId(`review-flag-${flagId}`);
    // Find the Resolve button by text within the flag item.
    const buttons = Array.from(flagItem.querySelectorAll('button[type="button"]'));
    const resolveButton = buttons.find((b) => b.textContent === 'Resolve');
    expect(resolveButton).toBeDefined();
    fireEvent.click(resolveButton!);

    // After resolve the section should be gone (no open flags remain).
    expect(screen.queryByTestId('objective-review-flags')).toBeNull();
  });

  it('renders Acknowledge, Resolve, and Dismiss buttons for each flag', () => {
    const flagId = crypto.randomUUID();
    useReviewFlagStore.getState().raiseFlag({
      id: flagId,
      projectId: PROJECT_ID,
      objectiveId: objective.id,
      sourceTemplateId: 'paddock_rotation_cover_trigger',
      observedCount: 1,
      deviationSign: 'existential',
      depth: 'structural',
      direction: 'tighten',
      reason: REASON,
    });

    render(<ObjectiveDetailPanel {...BASE_PROPS} />);

    const flagItem = screen.getByTestId(`review-flag-${flagId}`);
    const buttons = Array.from(flagItem.querySelectorAll('button[type="button"]'));
    const labels = buttons.map((b) => b.textContent);
    expect(labels).toContain('Acknowledge');
    expect(labels).toContain('Resolve');
    expect(labels).toContain('Dismiss');
  });

  it('removes the section after clicking Dismiss on the only open flag', () => {
    const flagId = crypto.randomUUID();
    useReviewFlagStore.getState().raiseFlag({
      id: flagId,
      projectId: PROJECT_ID,
      objectiveId: objective.id,
      sourceTemplateId: 'paddock_rotation_cover_trigger',
      observedCount: 1,
      deviationSign: 'under',
      depth: 'water',
      direction: 'loosen',
      reason: REASON,
    });

    render(<ObjectiveDetailPanel {...BASE_PROPS} />);

    const flagItem = screen.getByTestId(`review-flag-${flagId}`);
    const buttons = Array.from(flagItem.querySelectorAll('button[type="button"]'));
    const dismissButton = buttons.find((b) => b.textContent === 'Dismiss');
    expect(dismissButton).toBeDefined();
    fireEvent.click(dismissButton!);

    expect(screen.queryByTestId('objective-review-flags')).toBeNull();
  });
});
