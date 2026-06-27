/**
 * OnboardingTourController -- the cross-route orchestrator for the offline-demo
 * onboarding tour. Mounted ABOVE the route outlet in AppShell so it survives the
 * navigations the tour itself triggers (portfolio -> Observe -> Plan -> Act).
 *
 * Per step it: (1) navigates to the step's route if we are not already there,
 * (2) for spotlight steps, polls the DOM for the target anchor (waitForTarget),
 * then (3) renders the SpotlightOverlay + TourCallout, or the centred
 * OnboardingModal for the welcome / finish bookends. A target that never
 * resolves degrades to a centred callout rather than wedging the walk.
 *
 * Gating mirrors DemoBanner exactly: the build-time DEMO_OFFLINE_ENABLED gate is
 * the first statement (so the authed bundle strips the body to `return null`),
 * and at runtime the tour only runs for the synthetic offline guest.
 *
 * The walk targets the visitor's editable Homestead CLONE (the project carrying
 * the worked Plan/Act completion seeded by seedHomesteadSample), whose id is
 * minted per visitor -- resolved live from the project store, with the canonical
 * builtin id as a defensive fallback.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { HOMESTEAD_SAMPLE_PROJECT_ID } from '@ogden/shared';
import { DEMO_OFFLINE_ENABLED, isDemoUser } from '../../app/demoSession.js';
import { useAuthStore } from '../../store/authStore.js';
import { useProjectStore } from '../../store/projectStore.js';
import { useOnboardingStore } from './onboardingStore.js';
import { TOUR_STEPS, SPOTLIGHT_STEPS } from './onboardingSteps.js';
import type { TourRoute } from './onboardingSteps.js';
import { waitForTarget } from './useWaitForTarget.js';
import type { Rect, Size } from './calloutPosition.js';
import SpotlightOverlay from './SpotlightOverlay.js';
import TourCallout from './TourCallout.js';
import OnboardingModal from './OnboardingModal.js';

export default function OnboardingTourController() {
  // Build-time gate: process.env.FEATURE_DEMO_OFFLINE is define-replaced to
  // 'false' in the authed product, so this collapses to `return null` and the
  // whole subtree (overlay, callout, modal) is inert. No hooks above this line.
  if (!DEMO_OFFLINE_ENABLED) return null;
  return <OnboardingTourControllerInner />;
}

function readViewport(): Size {
  if (typeof window === 'undefined') return { width: 1280, height: 800 };
  return { width: window.innerWidth, height: window.innerHeight };
}

/**
 * Find the visitor's worked Homestead clone. Both the builtin and the clone
 * carry `instantiatedFromTemplate: 'homestead-sample'` (duplicateProject deep-
 * copies metadata), so the builtin id must be excluded -- mirrors
 * findHomesteadClone in seedHomesteadSample, replicated here to avoid pulling
 * that module's heavy store graph into this always-bundled file.
 */
function resolveSampleProjectId(): string {
  const { projects } = useProjectStore.getState();
  const clone = projects.find(
    (p) =>
      p.id !== HOMESTEAD_SAMPLE_PROJECT_ID &&
      (p.metadata as Record<string, unknown> | undefined)?.instantiatedFromTemplate ===
        'homestead-sample',
  );
  return clone?.id ?? HOMESTEAD_SAMPLE_PROJECT_ID;
}

function OnboardingTourControllerInner() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useAuthStore((s) => s.user);

  const status = useOnboardingStore((s) => s.status);
  const currentStepIndex = useOnboardingStore((s) => s.currentStepIndex);
  const hasSeenWelcome = useOnboardingStore((s) => s.hasSeenWelcome);
  const beginAuto = useOnboardingStore((s) => s.beginAuto);
  const next = useOnboardingStore((s) => s.next);
  const back = useOnboardingStore((s) => s.back);
  const close = useOnboardingStore((s) => s.close);
  const finish = useOnboardingStore((s) => s.finish);

  const isGuest = isDemoUser(user);

  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState<Size>(readViewport);
  // Guards against a stale waitForTarget resolving after the step advanced.
  const resolveSeq = useRef(0);

  // First-run auto-open: once per browser, only for the offline guest.
  useEffect(() => {
    if (!isGuest) return;
    if (!hasSeenWelcome && status === 'idle') beginAuto();
  }, [isGuest, hasSeenWelcome, status, beginAuto]);

  // Keep viewport in sync for the spotlight + callout geometry.
  useEffect(() => {
    const onResize = () => setViewport(readViewport());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Escape dismisses spotlight steps (modal steps handle Escape via Modal).
  useEffect(() => {
    if (status !== 'running') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [status, close]);

  const step = status === 'running' ? TOUR_STEPS[currentStepIndex] : undefined;

  // Resolve the active step: navigate if needed, then poll for its target.
  useEffect(() => {
    if (!step) {
      setTargetRect(null);
      return;
    }
    const seq = ++resolveSeq.current;
    setTargetRect(null);

    // 1) Land on the step's route (no-op when already there).
    if (step.route) navigateToRoute(step.route);

    // 2) Modal / target-less steps need no anchor.
    if (step.isModalStep || !step.target) return;

    // 3) Poll for the anchor; drop the result if the step changed meanwhile.
    //    step.timeoutMs (when set) shortens the wait for steps whose anchor is
    //    expected to be absent; undefined inherits waitForTarget's 4s default.
    let cancelled = false;
    void waitForTarget(step.target, step.timeoutMs).then((rect) => {
      if (cancelled || seq !== resolveSeq.current) return;
      setTargetRect(rect);
    });
    return () => {
      cancelled = true;
    };
    // Resolve once per step; navigate/pathname are read fresh inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id]);

  function navigateToRoute(route: TourRoute) {
    if (route === 'portfolio') {
      if (!pathname.startsWith('/v3/portfolio')) navigate({ to: '/v3/portfolio' });
      return;
    }
    const projectId = resolveSampleProjectId();
    const want = `/v3/project/${projectId}/${route}`;
    if (pathname.startsWith(want)) return; // already on this stage
    if (route === 'observe') {
      navigate({ to: '/v3/project/$projectId/observe', params: { projectId } });
    } else if (route === 'plan') {
      navigate({ to: '/v3/project/$projectId/plan', params: { projectId } });
    } else if (route === 'act') {
      navigate({ to: '/v3/project/$projectId/act', params: { projectId } });
    }
  }

  if (!step) return null;

  if (step.isModalStep) {
    const isLast = currentStepIndex === TOUR_STEPS.length - 1;
    return <OnboardingModal step={step} onPrimary={isLast ? finish : next} onClose={close} />;
  }

  const spotlightOrdinal = SPOTLIGHT_STEPS.findIndex((s) => s.id === step.id) + 1;

  return (
    <>
      <SpotlightOverlay targetRect={targetRect} viewport={viewport} />
      <TourCallout
        step={step}
        current={spotlightOrdinal}
        total={SPOTLIGHT_STEPS.length}
        targetRect={targetRect}
        viewport={viewport}
        canBack={currentStepIndex > 0}
        onBack={back}
        onNext={next}
        onSkip={close}
      />
    </>
  );
}
