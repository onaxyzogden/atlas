/**
 * @vitest-environment happy-dom
 *
 * LevelNavigator cyclical wrap (3-stage loop):
 *   - active=act    → next wraps to observe
 *   - active=observe → prev wraps to act
 *   - active=plan   → prev=observe, next=act (interior, unchanged)
 * Both side controls are always non-null so LevelNavigatorBar never
 * dead-ends.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  LevelNavigatorProvider,
  useLevelNavigator,
} from '../LevelNavigatorContext.js';
import type { Level } from '../LevelNavigator.js';

const LEVELS: Level[] = [
  { key: 'observe', label: 'Observe', title: 'Observe' },
  { key: 'plan', label: 'Plan', title: 'Plan' },
  { key: 'act', label: 'Act', title: 'Act' },
];

function Probe() {
  const nav = useLevelNavigator();
  if (!nav) return <div data-testid="probe">none</div>;
  return (
    <div data-testid="probe">
      {`active=${nav.active.key} prev=${nav.prev?.key ?? 'null'} next=${
        nav.next?.key ?? 'null'
      }`}
    </div>
  );
}

function probeText(controlledLevel: string): string {
  const { unmount } = render(
    <LevelNavigatorProvider
      levels={LEVELS}
      controlledLevel={controlledLevel}
      onLevelChange={() => {}}
    >
      <Probe />
    </LevelNavigatorProvider>,
  );
  const text = screen.getByTestId('probe').textContent ?? '';
  unmount();
  return text;
}

describe('LevelNavigator — cyclical wrap', () => {
  it('wraps next from act → observe', () => {
    expect(probeText('act')).toBe('active=act prev=plan next=observe');
  });

  it('wraps prev from observe → act', () => {
    expect(probeText('observe')).toBe('active=observe prev=act next=plan');
  });

  it('interior plan has both neighbours', () => {
    expect(probeText('plan')).toBe('active=plan prev=observe next=act');
  });
});
