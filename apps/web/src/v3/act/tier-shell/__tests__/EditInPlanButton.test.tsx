/**
 * @vitest-environment happy-dom
 *
 * EditInPlanButton -- deep-links from an Act read-only checklist recap to where
 * the answer is actually authored in Plan. Two routes:
 *   - wizard-step -> the wizard's vision/team step (params only).
 *   - plan-type   -> the Plan tier-shell WITH ?changeType=1, which auto-opens
 *                    PrimaryChangeModal (the type is read-only in Act).
 *
 * These cases pin the navigate() arguments for each route. useNavigate is mocked
 * (repo convention -- no real router in unit tests); lucide is stubbed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

vi.mock('lucide-react', () => ({
  Pencil: React.forwardRef<SVGSVGElement, Record<string, unknown>>(
    function PencilStub(_props, ref) {
      return React.createElement('svg', { ref, 'data-lucide-icon': 'Pencil' });
    },
  ),
}));

import EditInPlanButton from '../EditInPlanButton.js';

beforeEach(() => {
  navigate.mockClear();
  cleanup();
});

describe('EditInPlanButton', () => {
  it('plan-type route carries ?changeType=1 to open the type modal', () => {
    render(
      <EditInPlanButton projectId="proj-1" editRoute={{ kind: 'plan-type' }} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /edit in plan/i }));
    expect(navigate).toHaveBeenCalledWith({
      to: '/v3/project/$projectId/plan',
      params: { projectId: 'proj-1' },
      search: { changeType: '1' },
    });
  });

  it('wizard-step route navigates to the step without a search param', () => {
    render(
      <EditInPlanButton
        projectId="proj-1"
        editRoute={{ kind: 'wizard-step', step: 'vision' }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /edit in plan/i }));
    expect(navigate).toHaveBeenCalledWith({
      to: '/v3/project/$projectId/wizard/$step',
      params: { projectId: 'proj-1', step: 'vision' },
    });
  });
});
