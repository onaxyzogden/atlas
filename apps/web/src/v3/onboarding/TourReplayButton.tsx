/**
 * TourReplayButton -- the always-available "Take the tour" affordance in the
 * AppShell header. Re-opens the onboarding tour from step 0 without touching the
 * persisted "seen" / "completed" flags. Demo-only and self-gating, exactly like
 * DemoBanner: in the authed product the build-flag gate collapses to a
 * `return null` and nothing renders.
 */

import { Compass } from 'lucide-react';
import { DEMO_OFFLINE_ENABLED, isDemoUser } from '../../app/demoSession.js';
import { useAuthStore } from '../../store/authStore.js';
import { useOnboardingStore } from './onboardingStore.js';
import css from './TourReplayButton.module.css';

export default function TourReplayButton() {
  // Build-time gate (define-replaced to 'false' in the authed product).
  if (!DEMO_OFFLINE_ENABLED) return null;
  return <TourReplayButtonInner />;
}

function TourReplayButtonInner() {
  const user = useAuthStore((s) => s.user);
  const replay = useOnboardingStore((s) => s.replay);

  // Only the offline guest gets the tour (mirrors DemoBanner's runtime gate).
  if (!isDemoUser(user)) return null;

  return (
    <button
      type="button"
      className={css.button}
      onClick={replay}
      title="Replay the guided tour"
    >
      <Compass size={15} strokeWidth={1.75} aria-hidden="true" />
      <span className={css.label}>Take the tour</span>
    </button>
  );
}
