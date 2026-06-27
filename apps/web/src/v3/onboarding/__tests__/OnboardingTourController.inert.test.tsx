/**
 * @vitest-environment happy-dom
 *
 * Authed-build inertness. The whole onboarding feature is gated behind
 * FEATURE_DEMO_OFFLINE: in any non-demo build (and in the test env, where the
 * env var is unset) `DEMO_OFFLINE_ENABLED` is false and the controller's first
 * statement returns null -- so it mounts NO hooks, needs NO router, and renders
 * nothing. This is the dead-code-elimination contract DemoBanner established.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import OnboardingTourController from '../OnboardingTourController.js';
import { DEMO_OFFLINE_ENABLED } from '../../../app/demoSession.js';

afterEach(cleanup);

describe('OnboardingTourController demo gate', () => {
  it('DEMO_OFFLINE_ENABLED is false in a normal (authed/test) build', () => {
    expect(DEMO_OFFLINE_ENABLED).toBe(false);
  });

  it('renders nothing when the offline-demo flag is off', () => {
    // No router provider is supplied on purpose: the gate must short-circuit
    // before any useNavigate/useRouterState hook runs. If the gate regressed,
    // this render would throw "useNavigate must be used inside a RouterProvider".
    const { container } = render(<OnboardingTourController />);
    expect(container.firstChild).toBeNull();
  });
});
