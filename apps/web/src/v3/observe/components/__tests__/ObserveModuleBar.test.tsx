/**
 * @vitest-environment happy-dom
 *
 * ObserveModuleBar de-nesting regression lock:
 *   - No <button> is nested inside another <button> (validateDOMNesting).
 *   - Each tile's hit target is a button carrying aria-pressed + an
 *     aria-label of the module name.
 *   - Task pips still render as their own buttons (siblings of the hit
 *     button, not descendants).
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import {
  LevelNavigatorProvider,
  type PillarTask,
} from '../../../../components/LevelNavigator/index.js';
import { OBSERVE_MODULE_LABEL } from '../../types.js';

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

// Import AFTER the router mock so the SUT captures it.
import ObserveModuleBar from '../ObserveModuleBar';

afterEach(cleanup);

const TASK: PillarTask = {
  id: 't1',
  title: 'Survey the steward',
  columnId: 'observe_to_do',
} as PillarTask;

function renderBar() {
  return render(
    <LevelNavigatorProvider
      levels={[{ key: 'observe', label: 'Observe', title: 'Observe' }]}
      controlledLevel="observe"
      onLevelChange={() => {}}
      pillarTasks={{ 'human-context': [TASK] }}
    >
      <ObserveModuleBar
        activeModule="human-context"
        onSelectModule={() => {}}
        slideUpOpen={false}
        onOpenSlideUp={() => {}}
        onCloseSlideUp={() => {}}
      />
    </LevelNavigatorProvider>,
  );
}

describe('ObserveModuleBar — no nested buttons', () => {
  it('renders no <button> inside another <button>', () => {
    const { container } = renderBar();
    expect(container.querySelectorAll('button button').length).toBe(0);
  });

  it('exposes each tile hit target as an aria-pressed labelled button', () => {
    renderBar();
    const hit = screen.getByRole('button', {
      name: OBSERVE_MODULE_LABEL['human-context'],
    });
    expect(hit.getAttribute('aria-pressed')).toBe('true');
  });

  it('still renders the task pip as its own button', () => {
    renderBar();
    expect(
      screen.getByRole('button', { name: 'Task: Survey the steward' }),
    ).toBeTruthy();
  });
});
