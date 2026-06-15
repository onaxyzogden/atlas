// @vitest-environment happy-dom
/**
 * VegetationSurveyDrawHost — magnet toggle + snap wiring. Mirror of the
 * SlopeSurveyDrawHost test: before this fix the host called useMapboxDrawTool
 * with no `snap`/`getSnapTargets` and `return null`. This pins that the host now
 * passes `snap: true` + a `getSnapTargets` function and renders the <SnapToggle/>
 * chip while the veg-survey tool is armed, and renders nothing otherwise.
 *
 * useMapboxDrawTool is mocked (it would instantiate a real MapboxDraw control)
 * and lucide-react's Magnet icon is stubbed (CJS-in-ESM child error otherwise).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { Map as MaplibreMap } from 'maplibre-gl';

const { drawArgs } = vi.hoisted(() => ({ drawArgs: [] as Array<Record<string, unknown>> }));

vi.mock('../../../observe/components/draw/useMapboxDrawTool.js', () => ({
  useMapboxDrawTool: (args: Record<string, unknown>) => {
    drawArgs.push(args);
    return { geometry: null, liveArea: null, liveLength: null };
  },
}));
vi.mock('lucide-react', () => ({ Magnet: () => null }));

import VegetationSurveyDrawHost from '../VegetationSurveyDrawHost.js';
import { useMapToolStore } from '../../../observe/components/measure/useMapToolStore.js';
import { useVegetationSurveyStore } from '../../../../store/vegetationSurveyStore.js';

const fakeMap = {} as unknown as MaplibreMap;

beforeEach(() => {
  drawArgs.length = 0;
  useMapToolStore.getState().setActiveTool(null);
  useVegetationSurveyStore.setState({
    byProject: {},
    active: false,
    activeProjectId: null,
    activeCommunity: null,
  });
});
afterEach(cleanup);

describe('VegetationSurveyDrawHost', () => {
  it('passes snap:true + a getSnapTargets fn and renders the Snap chip when the veg-survey tool is armed', () => {
    useMapToolStore.getState().setActiveTool('act.ecology.veg-survey');
    useVegetationSurveyStore.getState().setActiveCommunity('riparian');
    render(<VegetationSurveyDrawHost map={fakeMap} projectId="proj-1" />);

    const last = drawArgs[drawArgs.length - 1];
    expect(last?.snap).toBe(true);
    expect(typeof last?.getSnapTargets).toBe('function');
    expect(last?.enabled).toBe(true);
    expect(screen.getByRole('button', { name: /snap/i })).toBeTruthy();
  });

  it('renders nothing when the veg-survey tool is not armed', () => {
    const { container } = render(<VegetationSurveyDrawHost map={fakeMap} projectId="proj-1" />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('button', { name: /snap/i })).toBeNull();
  });
});
