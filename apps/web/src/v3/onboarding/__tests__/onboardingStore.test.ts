/**
 * @vitest-environment happy-dom
 *
 * onboardingStore -- the dedicated offline-demo tour persist store. Mirrors the
 * uiStore.test.ts shape: first-run defaults, the persist round-trip into the
 * `ogden-onboarding` localStorage payload (only the two cross-reload booleans),
 * and the runtime-vs-persisted split. Replay must restart the walk WITHOUT
 * clearing the "seen" / "completed" flags.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useOnboardingStore } from '../onboardingStore.js';
import { TOUR_STEPS } from '../onboardingSteps.js';

beforeEach(() => {
  localStorage.removeItem('ogden-onboarding');
  useOnboardingStore.setState({
    hasSeenWelcome: false,
    tourCompleted: false,
    status: 'idle',
    currentStepIndex: 0,
  });
});

describe('onboardingStore defaults', () => {
  it('first-run defaults: unseen, uncompleted, idle, step 0', () => {
    const s = useOnboardingStore.getState();
    expect(s.hasSeenWelcome).toBe(false);
    expect(s.tourCompleted).toBe(false);
    expect(s.status).toBe('idle');
    expect(s.currentStepIndex).toBe(0);
  });
});

describe('onboardingStore.beginAuto', () => {
  it('starts the tour at step 0 and marks the welcome seen', () => {
    useOnboardingStore.getState().beginAuto();
    const s = useOnboardingStore.getState();
    expect(s.status).toBe('running');
    expect(s.currentStepIndex).toBe(0);
    expect(s.hasSeenWelcome).toBe(true);
  });

  it('persists hasSeenWelcome but NOT status/currentStepIndex', () => {
    useOnboardingStore.getState().beginAuto();
    const parsed = JSON.parse(localStorage.getItem('ogden-onboarding') as string);
    expect(parsed.state.hasSeenWelcome).toBe(true);
    expect(parsed.state.tourCompleted).toBe(false);
    // Runtime-only fields must never reach the persisted payload.
    expect(parsed.state.status).toBeUndefined();
    expect(parsed.state.currentStepIndex).toBeUndefined();
  });
});

describe('onboardingStore step navigation', () => {
  it('next advances and clamps at the last step', () => {
    const { next } = useOnboardingStore.getState();
    for (let i = 0; i < TOUR_STEPS.length + 3; i += 1) next();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(TOUR_STEPS.length - 1);
  });

  it('back retreats and clamps at the first step', () => {
    useOnboardingStore.setState({ currentStepIndex: 2 });
    const { back } = useOnboardingStore.getState();
    back();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(1);
    back();
    back();
    expect(useOnboardingStore.getState().currentStepIndex).toBe(0);
  });
});

describe('onboardingStore close / finish', () => {
  it('close goes idle and leaves the persisted flags untouched', () => {
    useOnboardingStore.getState().beginAuto();
    useOnboardingStore.getState().next();
    useOnboardingStore.getState().close();
    const s = useOnboardingStore.getState();
    expect(s.status).toBe('idle');
    expect(s.hasSeenWelcome).toBe(true); // not cleared by closing
    expect(s.tourCompleted).toBe(false);
  });

  it('finish marks completed and goes idle', () => {
    useOnboardingStore.getState().beginAuto();
    useOnboardingStore.getState().finish();
    const s = useOnboardingStore.getState();
    expect(s.status).toBe('idle');
    expect(s.tourCompleted).toBe(true);
    const parsed = JSON.parse(localStorage.getItem('ogden-onboarding') as string);
    expect(parsed.state.tourCompleted).toBe(true);
  });
});

describe('onboardingStore.replay', () => {
  it('restarts at step 0 without clearing the seen/completed flags', () => {
    // Simulate a visitor who has already finished the tour once.
    useOnboardingStore.setState({
      hasSeenWelcome: true,
      tourCompleted: true,
      status: 'idle',
      currentStepIndex: 5,
    });
    useOnboardingStore.getState().replay();
    const s = useOnboardingStore.getState();
    expect(s.status).toBe('running');
    expect(s.currentStepIndex).toBe(0);
    // Replay is a re-watch, not a reset: the flags survive.
    expect(s.hasSeenWelcome).toBe(true);
    expect(s.tourCompleted).toBe(true);
  });
});
