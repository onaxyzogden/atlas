/**
 * authoredSampleSeed — the user-authored replacement sample, transcribed from a
 * `captureSampleSeed()` run (window.__ogdenCaptureSampleSeed()).
 *
 * ── DORMANT PLACEHOLDER ─────────────────────────────────────────────────────
 * This is the scaffold's shipped placeholder: `null` means "no authored sample
 * yet", so `seedAuthoredSampleProject()` no-ops and nothing seeds. The clean
 * slate (FLAGS.SEED_SAMPLES off + migration 056) therefore holds — "My Projects"
 * stays empty — until this is filled in.
 *
 * ── HANDOFF (after you author the sample in-app) ────────────────────────────
 *   1. Author the sample end-to-end through the normal Vision → Observe → Plan →
 *      Act → Thresholds flow, sealing the Coherence check.
 *   2. Run `await window.__ogdenCaptureSampleSeed()` — it downloads
 *      `ogden-sample-seed.json`, throwing on any covenant-banned wording (the
 *      shared `@ogden/shared` term union) or a missing Coherence seal, so the
 *      promoted seed is covenant-clean at capture time.
 *   3. Paste the downloaded JSON here as the exported object, typed as
 *      `SampleSeedSnapshot` (TS, not raw .json, so it is type-checked and
 *      diff-reviewable). The transcribed constant is then re-scanned by the
 *      standing Amanah lint in `__tests__/authoredSampleSeed.amanah.test.ts`
 *      against that same union — a hand-edit can never ship it dirty.
 *   4. Flip `FLAGS.SEED_AUTHORED_SAMPLE` on (FEATURE_SEED_AUTHORED_SAMPLE=true)
 *      and, for the hosted/authed path, add migration
 *      `057_builtin_authored_sample.sql`.
 *
 * The `import type` below is erased at compile time, so referencing the capture
 * module here pulls in NO runtime code (and none of its window side-effects).
 */

import type { SampleSeedSnapshot } from '../captureSampleSeed.js';

/**
 * The promoted sample. `null` while dormant; replace with the captured snapshot
 * object at handoff. Keeping the type annotation means a malformed transcription
 * fails the typecheck rather than seeding a broken sample at runtime.
 */
export const AUTHORED_SAMPLE_SEED: SampleSeedSnapshot | null = null;
