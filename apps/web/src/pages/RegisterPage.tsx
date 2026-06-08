/**
 * RegisterPage — Phase 4 (2026-05-21) dedicated /register sibling
 * route. Lets the Three Streams showcase ContactCTA terminate in a
 * single-purpose register surface and hand off to template
 * instantiation via search params:
 *
 *   /register
 *     ?next=instantiate
 *     &template=ecosystem-farm
 *     [&drawFirst=true]    → after register, route to /new with
 *                            boundary-drawing as first step
 *     [&fullSetup=true]    → after register, route through org-creation
 *                            flow then /new
 *
 * Locked Phase 4 decision #1: new sibling route, not a /login tab
 * overload. Locked decision #3: tier-specific UX paths routed via
 * search params (Dreaming → no flag = instant-instantiate empty
 * boundary; Transitioning → drawFirst=true; Stewarding →
 * fullSetup=true).
 *
 * Existing /login tab toggle is unchanged — this is purely additive.
 *
 * No CSRA / advance-purchase / member / investor language anywhere
 * in this surface, per the 2026-05-04 erasure ADR.
 */

import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useAuthStore } from '../store/authStore.js';
import { api } from '../lib/apiClient.js';
import { recordShowcaseEvent } from '../showcase/lib/showcaseEventLog.js';
import type { ShowcaseTier } from '@ogden/shared';
import styles from './LoginPage.module.css';

interface RegisterSearch {
  next?: string;
  template?: string;
  drawFirst?: boolean;
  fullSetup?: boolean;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as RegisterSearch;
  const { register, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [stageNote, setStageNote] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      clearError();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wantsTemplate =
    search.next === 'instantiate' && typeof search.template === 'string';
  const slug = search.template ?? '';

  // Project-name default for the instant-instantiate path.
  const defaultProjectName = wantsTemplate ? 'My Ecosystem Farm' : '';

  // Infer the audience tier the visitor arrived as, from the locked
  // Phase 4 flag mapping (fullSetup → stewarding, drawFirst →
  // transitioning, else dreaming). Used to stamp showcase telemetry.
  const arrivalTier: ShowcaseTier | null = !wantsTemplate
    ? null
    : search.fullSetup
      ? 'stewarding'
      : search.drawFirst
        ? 'transitioning'
        : 'dreaming';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStageNote(null);
    try {
      // 1. Register (authStore stores the token).
      await register(email, password, displayName || undefined);

      // Showcase conversion signal — a cold visitor who arrived via a
      // tier CTA just completed registration. Best-effort; never blocks.
      recordShowcaseEvent({ eventType: 'visitor_registered', tier: arrivalTier });

      // 2. Route based on the locked tier-aware flags.
      if (!wantsTemplate) {
        // New accounts start unverified (soft gate). Surface the
        // "check your email" note briefly before landing on /home so the
        // verification email isn't a surprise.
        setStageNote(`We've sent a verification link to ${email}. You can verify anytime — taking you to your projects…`);
        setTimeout(() => navigate({ to: '/home' }), 1600);
        return;
      }

      if (search.fullSetup) {
        // Stewarding tier — full org-creation precedes instantiate.
        // Phase 4.5 introduced the /organizations/new prelude; route
        // through it carrying the template handoff so the visitor lands
        // on /new with both orgId and prefillTemplate set.
        navigate({
          to: '/organizations/new',
          search: { next: 'instantiate', template: slug } as never,
        });
        return;
      }

      if (search.drawFirst) {
        // Transitioning tier — visitor draws their parcel first, then
        // the wizard instantiates against the drawn boundary.
        navigate({
          to: '/new',
          search: { prefillTemplate: slug, drawFirst: 'true' } as never,
        });
        return;
      }

      // Dreaming tier — instant-instantiate with no boundary; visitor
      // edits in-app.
      setStageNote('Creating your project from the Ecosystem Farm template…');
      const { data: project } = await api.templates.instantiatePublic(slug, {
        name: defaultProjectName,
        parcelBoundaryGeojson: null,
      });
      // Conversion terminus — the visitor instantiated a project from the
      // public template. Stamp the new project id + arrival tier.
      recordShowcaseEvent({
        eventType: 'template_instantiated',
        tier: arrivalTier,
        projectId: project.id,
        payload: { template: slug },
      });
      navigate({
        to: '/v3/project/$projectId',
        params: { projectId: project.id },
      });
    } catch {
      // Error is surfaced via authStore (.error) or the network catch
      // — leave the form re-enabled so the user can retry.
    } finally {
      setLoading(false);
    }
  }

  const tierHint = (() => {
    if (!wantsTemplate) return null;
    if (search.fullSetup) {
      return 'Stewarding path — after registration we’ll guide you through organization setup before your project lands.';
    }
    if (search.drawFirst) {
      return 'Transitioning path — after registration you’ll draw your own parcel boundary, then the Ecosystem Farm pattern lands on it.';
    }
    return 'Dreaming path — after registration we’ll create your project from the Ecosystem Farm pattern. You can draw a boundary anytime.';
  })();

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>OGDEN</span>
          <span className={styles.brandSub}>Land Design Atlas</span>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={styles.tab}
            onClick={() =>
              navigate({
                to: '/login',
                search: { redirect: '/home' } as never,
              })
            }
          >
            Sign In
          </button>
          <button type="button" className={styles.tabActive}>
            Create Account
          </button>
        </div>

        {tierHint && (
          <p
            className={styles.localNote}
            style={{ marginTop: 0, marginBottom: 12 }}
          >
            {tierHint}
          </p>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="displayName">
              Name <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id="displayName"
              type="text"
              className={styles.input}
              placeholder="Your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              maxLength={100}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className={styles.input}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}
          {stageNote && !error && (
            <div className={styles.error} role="status" style={{ color: 'var(--color-text-muted)' }}>
              {stageNote}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className={styles.hint}>
          Already have an account?{' '}
          <button
            type="button"
            className={styles.hintLink}
            onClick={() =>
              navigate({
                to: '/login',
                search: { redirect: '/home' } as never,
              })
            }
          >
            Sign in
          </button>
        </p>

        <p className={styles.localNote}>
          The app also works fully offline — your projects are always saved locally.
        </p>
      </div>
    </div>
  );
}
