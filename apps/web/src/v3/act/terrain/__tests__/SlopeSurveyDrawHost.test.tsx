// @vitest-environment happy-dom
/**
 * SlopeSurveyDrawHost — magnet toggle + snap wiring. Before this fix the host
 * called useMapboxDrawTool with no `snap`/`getSnapTargets` and `return null`, so
 * the slope survey draw never snapped and showed no magnet chip. This pins that
 * the host now (a) passes `snap: true` + a `getSnapTargets` function into the
 * draw hook and (b) renders the <SnapToggle/> chip while a slope tool is armed,
 * and renders nothing otherwise.
 *
 * useMapboxDrawTool is mocked (it would instantiate a real MapboxDraw control
 * against a live WebGL map) to capture the args it was called with. lucide-react
 * ships CJS here, so the Magnet icon is stubbed (same pattern as PlanToolDock).
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

import SlopeSurveyDrawHost from '../SlopeSurveyDrawHost.js';
import { useMapToolStore } from '../../../observe/components/measure/useMapToolStore.js';

const fakeMap = {} as unknown as MaplibreMap;

beforeEach(() => {
  drawArgs.length = 0;
  useMapToolStore.getState().setActiveTool(null);
});
afterEach(cleanup);

describe('SlopeSurveyDrawHost', () => {
  it('passes snap:true + a getSnapTargets fn and renders the Snap chip when a slope tool is armed', () => {
    useMapToolStore.getState().setActiveTool('act.terrain.slope-gentle');
    render(<SlopeSurveyDrawHost map={fakeMap} projectId="proj-1" />);

    const last = drawArgs[drawArgs.length - 1];
    expect(last?.snap).toBe(true);
    expect(typeof last?.getSnapTargets).toBe('function');
    expect(last?.enabled).toBe(true);
    expect(screen.getByRole('button', { name: /snap/i })).toBeTruthy();
  });

  it('renders nothing when no slope tool is armed', () => {
    const { container } = render(<SlopeSurveyDrawHost map={fakeMap} projectId="proj-1" />);

    expect(container.firstChild).toBeNull();
    expect(screen.queryByRole('button', { name: /snap/i })).toBeNull();
  });
});
