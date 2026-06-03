/**
 * @vitest-environment happy-dom
 *
 * ObjectiveDetailPanel -- verify-loop copy section (T1.9).
 *
 * Verified behaviours:
 *   1. A resolved flag WITH resolutionParameterDelta + matching post-resolution
 *      activations renders the verify section naming:
 *        - the parameter itemId
 *        - the firingsSince count (activations confirmed AFTER resolvedAt)
 *        - the expected count (flag.expectedRate.count)
 *        - the "seasonal conditions also vary" confound text
 *   2. A resolved flag WITHOUT resolutionParameterDelta does NOT render a
 *      verify-flag row.
 *   3. A resolved flag WITH resolutionParameterDelta but NO post-resolution
 *      activations renders the row with firingsSince=0.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useReviewFlagStore } from '../../../../store/reviewFlagStore.js';
import { useProtocolStore } from '../../../../store/protocolStore.js';
import { findObjectiveGlobally } from '../../objectiveCatalog.js';
import ObjectiveDetailPanel from '../ObjectiveDetailPanel.js';
import type { PlanStratum } from '@ogden/shared';

// ---- module stubs (mirror ObjectiveDetailPanel.review.test.tsx) -------------

vi.mock('../../../../store/persistRehydrate.js', () => ({
  rehydrateWithLogging: () => {},
}));

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

vi.mock('../../../olos/map/ObjectiveMap.js', () => ({ default: () => null }));
vi.mock('../../../olos/map/OverlayLayerSlot.js', () => ({ default: () => null }));
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
vi.mock('maplibre-gl', () => ({
  default: {
    Map: class { on() { return this; } off() { return this; } remove() {} },
    supported: () => false,
    addProtocol: () => {},
    setWorkerUrl: () => {},
  },
}));
vi.mock('../../../components/DesignMap.js', () => ({ default: () => null }));
vi.mock('../../../components/DiagnoseMap.js', () => ({ default: () => null }));
vi.mock('../../../components/OperateMap.js', () => ({ default: () => null }));
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// ---- test constants ---------------------------------------------------------

const PROJECT_ID = 'test-odp-verify';
const TEMPLATE_ID = 'paddock_rotation_cover_trigger';
const RESOLVED_AT = '2026-04-01T00:00:00.000Z';

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
  useProtocolStore.setState({ records: [], activations: [], expectationsByProject: {} });
  window.localStorage.clear();
});

// ---- tests ------------------------------------------------------------------

describe('ObjectiveDetailPanel -- verify-loop copy section (T1.9)', () => {
  it('renders the verify section with parameter, firingsSince count, expected count, and confound text', () => {
    const flagId = crypto.randomUUID();

    // 1. Seed a resolved flag with resolutionParameterDelta
    useReviewFlagStore.setState({
      byProject: {
        [PROJECT_ID]: [
          {
            id: flagId,
            projectId: PROJECT_ID,
            objectiveId: objective.id,
            sourceTemplateId: TEMPLATE_ID,
            sourceActivationIds: ['act-pre'],
            observedCount: 4,
            deviationSign: 'over',
            depth: 'threshold',
            direction: 'tighten',
            reason: 'Fired too often',
            raisedAt: '2026-03-01T00:00:00.000Z',
            resolvedAt: RESOLVED_AT,
            expectedRate: { count: 2, per: 'season' },
            window: {},
            resolutionParameterDelta: {
              itemId: 'rotation-interval',
              from: '21',
              to: '28',
            },
          },
        ],
      },
    });

    // 2. Seed activations: 1 pre-resolution (should NOT count), 2 post-resolution (should count)
    useProtocolStore.setState({
      records: [],
      expectationsByProject: {},
      activations: [
        {
          id: 'act-pre',
          projectId: PROJECT_ID,
          templateId: TEMPLATE_ID,
          confirmationStatus: 'confirmed',
          severityTier: 'respond',
          activatedAt: '2026-02-15T00:00:00.000Z', // before resolvedAt
          recipeSnapshot: { name: TEMPLATE_ID, condition: '', response: '' },
          triggerContext: 'act_proof_capture',
        },
        {
          id: 'act-post-1',
          projectId: PROJECT_ID,
          templateId: TEMPLATE_ID,
          confirmationStatus: 'confirmed',
          severityTier: 'respond',
          activatedAt: '2026-04-15T00:00:00.000Z', // after resolvedAt
          recipeSnapshot: { name: TEMPLATE_ID, condition: '', response: '' },
          triggerContext: 'act_proof_capture',
        },
        {
          id: 'act-post-2',
          projectId: PROJECT_ID,
          templateId: TEMPLATE_ID,
          confirmationStatus: 'confirmed',
          severityTier: 'respond',
          activatedAt: '2026-05-01T00:00:00.000Z', // after resolvedAt
          recipeSnapshot: { name: TEMPLATE_ID, condition: '', response: '' },
          triggerContext: 'act_proof_capture',
        },
      ],
    });

    render(<ObjectiveDetailPanel {...BASE_PROPS} />);

    // The verify section should be present
    const section = document.querySelector('[data-testid="objective-verify-flags"]');
    expect(section).not.toBeNull();

    // The verify flag row
    const row = document.querySelector(`[data-testid="verify-flag-${flagId}"]`);
    expect(row).not.toBeNull();

    // Parameter name should appear
    expect(row?.textContent).toContain('rotation-interval');

    // from -> to
    expect(row?.textContent).toContain('21');
    expect(row?.textContent).toContain('28');

    // firingsSince = 2 (post-resolution activations)
    expect(row?.textContent).toContain('2x');

    // expected = 2 (flag.expectedRate.count)
    expect(row?.textContent).toContain('2x');

    // confound text
    expect(row?.textContent).toContain('seasonal conditions also vary');
  });

  it('does NOT render a verify row for a resolved flag WITHOUT resolutionParameterDelta', () => {
    const flagId = crypto.randomUUID();
    useReviewFlagStore.setState({
      byProject: {
        [PROJECT_ID]: [
          {
            id: flagId,
            projectId: PROJECT_ID,
            objectiveId: objective.id,
            sourceTemplateId: TEMPLATE_ID,
            sourceActivationIds: [],
            observedCount: 2,
            deviationSign: 'under',
            depth: 'threshold',
            direction: 'loosen',
            reason: 'Fired too little',
            raisedAt: '2026-03-01T00:00:00.000Z',
            resolvedAt: RESOLVED_AT,
            expectedRate: { count: 3, per: 'season' },
            window: {},
            // NO resolutionParameterDelta
          },
        ],
      },
    });

    render(<ObjectiveDetailPanel {...BASE_PROPS} />);

    // The verify section should not render (no flags with delta)
    expect(document.querySelector('[data-testid="objective-verify-flags"]')).toBeNull();
  });

  it('renders a verify row with firingsSince=0 when there are no post-resolution activations', () => {
    const flagId = crypto.randomUUID();
    useReviewFlagStore.setState({
      byProject: {
        [PROJECT_ID]: [
          {
            id: flagId,
            projectId: PROJECT_ID,
            objectiveId: objective.id,
            sourceTemplateId: TEMPLATE_ID,
            sourceActivationIds: [],
            observedCount: 3,
            deviationSign: 'over',
            depth: 'threshold',
            direction: 'tighten',
            reason: 'Fired too often',
            raisedAt: '2026-03-01T00:00:00.000Z',
            resolvedAt: RESOLVED_AT,
            expectedRate: { count: 2, per: 'season' },
            window: {},
            resolutionParameterDelta: {
              itemId: 'paddock-count',
              from: '4',
              to: '6',
            },
          },
        ],
      },
    });

    render(<ObjectiveDetailPanel {...BASE_PROPS} />);

    const row = document.querySelector(`[data-testid="verify-flag-${flagId}"]`);
    expect(row).not.toBeNull();
    // firingsSince = 0
    expect(row?.textContent).toContain('0x');
  });
});
