# 2026-05-25 — Blob-sync ramp Stage 1: real-Postgres validation surfaces two flip-blocking bugs

**Branch.** `feat/atlas-permaculture`, commit `e6b48857` (2 files, +20/−4).

Executes **Stage 1** of the approved phased-ramp plan for `FLAGS.SYNC_STATE_BLOBS`
(`~/.claude/plans/resolve-the-non-uuid-demo-project-tidy-leaf.md`): run
`blobSync.integration.test.ts` against a **live Postgres** — cases **A** (PUT
`baseRev:0` → 200 rev 1 + physical `SELECT`), **B** (cross-project read isolation),
**C** (stale `baseRev` → 409 no-clobber + recovery). This is the first time the
`/project-state` route was exercised against real postgres.js rather than the
FIFO row-queue mock, and that difference is exactly what caught the bugs below.

**Infra (Stage 0, ad hoc).** The project's compose container (`ogden-postgres`,
5432) was **shadowed by a host-native PostgreSQL 17 service** also on
`0.0.0.0:5432` (IPv4), while Docker's forward was IPv6-only (`[::]:5432`) — so
`127.0.0.1:5432` hit the wrong DB and rejected creds (28P01). Sidestepped without
touching the host service by spinning a throwaway `postgis/postgis:16-3.4`
container on **5433** with a fresh volume (initdb auto-creates `ogden_app` with the
right password and auto-applies all migrations incl. **027**). Ran A/B/C, then
`docker rm -f ogden-pg-it`. `INTEGRATION_DATABASE_URL` pointed at `…@127.0.0.1:5433/ogden_atlas`.

**Two latent route bugs found — both would hit every user the instant the flag
flips on; neither is catchable by the mock suites** (the mock returns JS objects
and numbers, hiding postgres.js's wire types):

1. **`rev` (BIGINT) marshalling.** postgres.js returns `int8` as a **JS string**
   (precision safety). `ProjectStateBlob.rev` is `z.number()`, so `parseRow`'s
   `ProjectStateBlob.parse` threw a `ZodError` on *every successful row* → the
   global handler maps it to **422**. Symptom: PUT (success path) and the 409
   conflict path (which `parseRow`s the authoritative row) both 422'd. Fix: coerce
   `rev` to a number at the single server-row → wire-shape boundary in `parseRow`.
2. **Payload double-encoding.** The PUT did
   `const payloadStr = JSON.stringify(body.payload); … ${payloadStr}::jsonb`.
   postgres.js JSON-serializes the already-stringified value **again**, storing a
   jsonb **string scalar** (`jsonb_typeof = 'string'`) instead of an object; on
   read it parses that scalar back to the JSON *text*. The client (`blobSync.ts`)
   does **no `JSON.parse`** — it persists `payload` straight into the store — so
   hydration would load every versioned-blob store with a string instead of its
   object. Fix: `${db.json(body.payload ?? null)}::jsonb` so the payload is
   serialized exactly once. Verified empirically (`str::jsonb` → `jsonb_typeof
   string`; `db.json` → `object`). Cast to `Parameters<typeof db.json>[0]` because
   the payload is opaque `z.unknown()`.

**Test fix (same commit).** The spec's project INSERTs supplied only
`(owner_id, name)`, but **migration 036** made `projects.org_id` NOT NULL. Register
wraps user + personal-org + owner-membership in one tx, so the setup now resolves
that org (`SELECT org_id FROM organization_members WHERE user_id = …`) and inserts
`(owner_id, org_id, name)` — mirroring the create-project route's org resolution.

**Why a log entry, not an ADR.** These are correctness fixes (wire-type
marshalling), not architectural choices with live alternatives — consistent with
the wiki's bug-fix convention. The flip-decision ADR remains a Stage-4 deliverable.

**Verification.** `blobSync.integration` **A/B/C 3/3** against real Postgres;
mock `projectState.test.ts` **6/6** + `vegetationSuccession.test.ts` **8/8** (no
regression — `mockDb.json` already existed); `@ogden/api` `tsc --noEmit` **exit 0**.

**Process.** Plan-mode ramp, Stage 1 only. Staged **only** the two `apps/api`
files by explicit path; the large foreign WIP in the tree left untouched per
[[feedback-no-deletion]]. Committed immediately on green per
[[feedback-commit-immediately-on-rebased-branches]].

**Ramp impact.** The flag was demonstrably **not flip-ready** before `e6b48857` —
Stage 1's gate is now green, but the Stage 2 operator two-device A–E matrix must
run on a build that **includes this commit**. Stages 2 (operator matrix), 3
(tester soak), and 4 (the code flip) remain gated and unexecuted.

Updates entity [[entities/web-app]]. Continues the syncManifest / blob-sync
coverage thread; follows [[log/2026-05-25-versioned-blob-skip-dev-observability]].
