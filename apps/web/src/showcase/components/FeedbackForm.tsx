/**
 * FeedbackForm — Phase 5 (2026-05-21) qualitative half of the public-showcase
 * observation loop. A lightweight "what was confusing?" capture mounted near
 * each tier's end-of-scroll CTA on the `/showcase/three-streams` portal.
 *
 * Posts to the PUBLIC POST /api/v1/telemetry/showcase-feedback (migration 041).
 * Like showcaseEventLog.ts it uses PLAIN fetch — NOT the apiClient — so the
 * lean SSG showcase bundle (Phase 3.5 bundle-split) stays free of
 * authStore / projectStore / Cesium. It reads the same sessionStorage session
 * id the telemetry buffer writes, so written feedback cross-links to the
 * behavioural trail in showcase_visitor_events.
 *
 * `message` is the one required field; the form blocks empty/whitespace
 * submissions client-side, the route trims + re-checks, and the DB CHECK is the
 * final backstop. `rating` (1-5) and `contact` are optional, opt-in only.
 *
 * Covenant-clean copy per the 2026-05-04 erasure ADR: no CSRA / advance-
 * purchase / yield-share / investor language anywhere in this surface.
 */

import { useState, type FormEvent } from 'react';
import type { Tier } from '../data/sceneManifest';

const ENDPOINT = '/api/v1/telemetry/showcase-feedback';
const SESSION_KEY = 'ogden-showcase-session';

// Read (do not create) the telemetry session id so feedback cross-links to the
// behavioural trail. Null when the visitor never triggered a telemetry event
// (e.g. telemetry disabled) — the route accepts a null session_id.
function readSessionId(): string | null {
  try {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem(SESSION_KEY);
    }
  } catch {
    // sessionStorage unavailable (private mode / SSR) — submit anonymously.
  }
  return null;
}

type SubmitState = 'idle' | 'submitting' | 'done' | 'error';

const RATINGS = [1, 2, 3, 4, 5] as const;

export function FeedbackForm({ tier }: { tier?: Tier | null }) {
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [contact, setContact] = useState('');
  const [state, setState] = useState<SubmitState>('idle');

  const trimmed = message.trim();
  const canSubmit = trimmed.length > 0 && state !== 'submitting';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (trimmed.length === 0) return;
    setState('submitting');
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: readSessionId(),
          tier: tier ?? null,
          rating,
          message: trimmed,
          contact: contact.trim() ? contact.trim() : null,
        }),
        keepalive: true,
      });
      if (!res.ok) throw new Error(`feedback HTTP ${res.status}`);
      setState('done');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <section
        style={{
          padding: '32px 24px',
          textAlign: 'center',
          background: '#eef4ea',
        }}
      >
        <p style={{ color: '#0a7d2c', fontWeight: 500, margin: 0 }}>
          Thank you — your note helps us make this clearer.
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        padding: '32px 24px',
        background: '#eef4ea',
        maxWidth: 560,
        margin: '0 auto',
        borderRadius: 12,
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 4 }}>What was confusing?</h3>
      <p style={{ color: '#555', marginTop: 0, marginBottom: 16, fontSize: 14 }}>
        Tell us what was unclear or what you wished this story showed. Optional
        rating and contact — share only what you want to.
      </p>
      <form onSubmit={handleSubmit}>
        <label
          htmlFor="feedback-message"
          style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}
        >
          Your feedback
        </label>
        <textarea
          id="feedback-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={4000}
          rows={4}
          required
          placeholder="What was confusing, missing, or unclear?"
          style={{
            width: '100%',
            padding: 10,
            border: '1px solid #c5d3bd',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ margin: '16px 0' }}>
          <span style={{ fontSize: 13, fontWeight: 500, marginRight: 12 }}>
            Rating (optional)
          </span>
          <span role="radiogroup" aria-label="Rating">
            {RATINGS.map((n) => (
              <button
                type="button"
                key={n}
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} star${n === 1 ? '' : 's'}`}
                onClick={() => setRating(rating === n ? null : n)}
                style={{
                  cursor: 'pointer',
                  fontSize: 22,
                  lineHeight: 1,
                  background: 'none',
                  border: 'none',
                  padding: '0 2px',
                  color: rating != null && n <= rating ? '#e0a200' : '#bbb',
                }}
              >
                ★
              </button>
            ))}
          </span>
        </div>

        <label
          htmlFor="feedback-contact"
          style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}
        >
          Contact (optional)
        </label>
        <input
          id="feedback-contact"
          type="text"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          maxLength={320}
          placeholder="Email or handle, if you'd like a reply"
          autoComplete="email"
          style={{
            width: '100%',
            padding: 10,
            border: '1px solid #c5d3bd',
            borderRadius: 8,
            fontSize: 14,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
            marginBottom: 16,
          }}
        />

        {state === 'error' && (
          <p role="alert" style={{ color: '#b00020', fontSize: 13, marginTop: 0 }}>
            Sorry — that didn't send. Please try again.
          </p>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            display: 'inline-block',
            padding: '10px 22px',
            background: canSubmit ? '#0a7d2c' : '#9bbfa6',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontWeight: 500,
            fontSize: 14,
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            opacity: canSubmit ? 1 : 0.6,
          }}
        >
          {state === 'submitting' ? 'Sending…' : 'Send feedback'}
        </button>
      </form>
    </section>
  );
}
