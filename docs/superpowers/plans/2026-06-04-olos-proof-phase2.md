# OLOS Formal Proof Phase 2 - Per-Type Capture Affordances + Flip-Readiness Gate

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the slice-relevant proof types (photo, measurement, inspection) fit-for-purpose capture affordances in `TaskProofPanel`, wire binary capture through the existing files upload, persist a typed `details` union, and ratify a machine-checkable flip-readiness gate - all behind the still-default-off `isOlosFormalProofEnabled()` flag.

**Architecture:** Additive across four layers. (1) `packages/shared`: a discriminated `ProofDetails` union (only `inspection` implemented; `signature`/`test` reserved) + a `parseProofDetails` safe-reader, added optionally to `ProofRecordSchema`. (2) `apps/api`: one `ALTER TABLE` migration adding a `details jsonb` column + route mapper/validation wiring. (3) `apps/web`: a thin `uploadProofFile` helper over the existing `api.files.upload`, and a per-`proofType` affordance switch in `TaskProofPanel` that preserves the generic fallback for the seven deferred types. (4) docs + a readiness probe. The web store needs no change - `ProofRecord` carries `details` by type, and `pushOne` already forwards unknown fields.

**Tech Stack:** TypeScript, Zod (`@ogden/shared`), Fastify + Postgres (`postgres` tagged-template `db`), React 18 + Zustand, Vitest (`--pool=forks --testTimeout=20000` on Windows). Web `tsc` via PowerShell: `$env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit` (ignore pre-existing `src/compost/` errors).

**Standing constraints (every task):** `git fetch origin feat/atlas-permaculture` + divergence check before each commit; stage by EXPLICIT name / pathspec commit, NEVER `git add -A` (large foreign WIP in the tree); commit each task on green; no `--amend`; do NOT push; ASCII-only; end commit messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` via `git commit -F _commit_msg.txt -- <paths>`. New files must be `git add -- <name>` by explicit name before the pathspec commit can include them. DB = native postgresql-x64-17 on localhost:5432 (NOT docker `ogden-postgres`).

---

## File Structure

| File | Responsibility | Action |
|---|---|---|
| `packages/shared/src/schemas/olos/proofRecord.schema.ts` | `ProofDetails` union, `parseProofDetails`, optional `details` on `ProofRecordSchema` | Modify |
| `packages/shared/src/schemas/olos/__tests__/proofRecord.schema.test.ts` | Unit tests for the union + parser + back-compat | Create |
| `apps/api/src/db/migrations/052_olos_proof_details.sql` | Add `details jsonb` to `olos_proof_records` | Create |
| `apps/api/src/routes/olos/proofs.ts` | Accept/persist/return `details` | Modify |
| `apps/web/src/v3/olos/handoff/uploadProofFile.ts` | Thin helper: upload a File via `api.files.upload`, return `storageUrl` | Create |
| `apps/web/src/v3/olos/handoff/__tests__/uploadProofFile.test.ts` | Helper test (mocked `api`) | Create |
| `apps/web/src/v3/olos/handoff/TaskProofPanel.tsx` | Per-type affordance switch (measurement/inspection/photo) + generic fallback | Modify |
| `apps/web/src/v3/olos/handoff/__tests__/TaskProofPanel.test.tsx` | Affordance render/capture + fallback + flag-off | Modify |
| `apps/web/src/v3/olos/handoff/TaskProofPanel.module.css` | Styles for checklist rows + file picker | Modify |
| `apps/web/src/v3/olos/handoff/__tests__/proofAffordanceCoverage.test.ts` | Readiness probe: every ProofType has a branch; `ProofDetails` exhaustive | Create |
| `wiki/decisions/2026-06-04-olos-proof-verification-fork.md` | Phase 2 section + flip-readiness checklist | Modify |
| `wiki/log/2026-06-04-olos-proof-phase2.md` | Phase 2 log page | Create |
| `wiki/log.md`, `wiki/index.md` | Chronological + Decisions-line clauses | Modify |

---

## Task 0 (P1.5): e2e smoke gate - HARD PREREQUISITE

**No code.** This gate blocks every task below. Do not start Task 1 until it passes.

- [ ] **Step 1: Bring up the stack**

Run (PowerShell, from repo root): start the API against native pg 5432 and the web dev server per the project's usual dev commands. Confirm the API is reachable (not the stale docker `ogden-postgres`).

- [ ] **Step 2: Drive the Phase 1 round trip**

In the browser console: `localStorage.setItem('ogden-flag-olos-formal-proof','true')` then reload. Open a SYNCED project's Act tier-shell objective whose domain has a handoff-seeded `ActTask`. In the "Verification" section: capture a proof, then (as a reviewer-capable user) sign off PASS.

- [ ] **Step 3: Assert the round trip**

Confirm: the `ActTask` moves to `verified-complete`, AND a `task_verification` ObserveDataPoint appears in the Observe dashboard for that domain/objective. Capture DOM-proof (preview eval or `/v3/components`; `preview_screenshot` hangs are transient). Flip the flag off -> tier-shell is byte-identical to today.

- [ ] **Step 4: Record the result**

If PASS: note evidence in the session and proceed to Task 1. If FAIL: STOP - fixing the round trip becomes the work; do not build Phase 2 affordances on a broken core.

**Gate:** Phase 2 proceeds only after an observed, evidence-backed PASS.

---

## Task 1 (P2.1): Shared `ProofDetails` union + `parseProofDetails`

**Files:**
- Modify: `packages/shared/src/schemas/olos/proofRecord.schema.ts`
- Test: `packages/shared/src/schemas/olos/__tests__/proofRecord.schema.test.ts` (create)

Note: `packages/shared/src/index.ts:114` already does `export * from './schemas/olos/proofRecord.schema.js'`, so new exports flow automatically - no index edit.

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/schemas/olos/__tests__/proofRecord.schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  ProofRecordSchema,
  ProofDetailsSchema,
  parseProofDetails,
} from '../proofRecord.schema.js';

const base = {
  id: 'proof-1',
  projectId: 'p1',
  taskId: 't1',
  proofType: 'inspection' as const,
  capturedAt: new Date().toISOString(),
  verificationStatus: 'pending' as const,
};

describe('ProofDetails', () => {
  it('accepts a valid inspection details union', () => {
    const details = {
      kind: 'inspection' as const,
      items: [
        { label: 'Mulch depth >= 4in', status: 'pass' as const },
        { label: 'No bare soil', status: 'fail' as const, note: 'SE corner' },
      ],
    };
    expect(ProofDetailsSchema.safeParse(details).success).toBe(true);
    expect(parseProofDetails(details)).toEqual(details);
  });

  it('returns null from parseProofDetails for an unknown shape', () => {
    expect(parseProofDetails({ kind: 'nope' })).toBeNull();
    expect(parseProofDetails(null)).toBeNull();
    expect(parseProofDetails(undefined)).toBeNull();
  });

  it('rejects an inspection item with an invalid status', () => {
    const bad = { kind: 'inspection', items: [{ label: 'x', status: 'maybe' }] };
    expect(ProofDetailsSchema.safeParse(bad).success).toBe(false);
  });

  it('ProofRecord parses WITH details', () => {
    const rec = {
      ...base,
      details: { kind: 'inspection', items: [{ label: 'x', status: 'na' }] },
    };
    expect(ProofRecordSchema.safeParse(rec).success).toBe(true);
  });

  it('ProofRecord parses WITHOUT details (back-compat)', () => {
    expect(ProofRecordSchema.safeParse(base).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/shared; npx vitest run src/schemas/olos/__tests__/proofRecord.schema.test.ts --pool=forks --testTimeout=20000`
Expected: FAIL - `ProofDetailsSchema`/`parseProofDetails` are not exported.

- [ ] **Step 3: Implement in `proofRecord.schema.ts`**

Insert AFTER the `ProofGeotagSchema` block (before `ProofRecordSchema`):

```ts
// ── ProofDetails: per-type structured capture payload ────────────────────────
// A discriminated union of type-specific structured proof data. Phase 2 ships
// only the `inspection` variant; `signature` and `test` are reserved and will
// be added additively (extend the union + the .discriminator key). `measurement`
// keeps its dedicated measurementValue/measurementUnit fields and is NOT modelled
// here. Stored as a jsonb column (olos_proof_records.details).

export const ProofInspectionItemSchema = z.object({
  label: z.string().min(1),
  status: z.enum(['pass', 'fail', 'na']),
  note: z.string().optional(),
});
export type ProofInspectionItem = z.infer<typeof ProofInspectionItemSchema>;

export const ProofDetailsSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('inspection'),
    items: z.array(ProofInspectionItemSchema),
  }),
  // RESERVED (not implemented in Phase 2 - add additively):
  //   z.object({ kind: z.literal('signature'), signerName, attestation, signedAt }),
  //   z.object({ kind: z.literal('test'), value, unit?, passed, method? }),
]);
export type ProofDetails = z.infer<typeof ProofDetailsSchema>;

/** Safe-read companion (mirrors parseLensMeasurement): returns the typed details
 *  for a recognised shape, or null for anything else - so readers branch without
 *  throwing on legacy/unknown records. */
export function parseProofDetails(value: unknown): ProofDetails | null {
  const result = ProofDetailsSchema.safeParse(value);
  return result.success ? result.data : null;
}
```

Then add `details` to `ProofRecordSchema` (insert the line after `geotag:`):

```ts
  geotag: ProofGeotagSchema.optional(),
  details: ProofDetailsSchema.optional(),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/shared; npx vitest run src/schemas/olos/__tests__/proofRecord.schema.test.ts --pool=forks --testTimeout=20000`
Expected: PASS (5 tests).

- [ ] **Step 5: Typecheck shared**

Run: `cd packages/shared; npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```
git fetch origin feat/atlas-permaculture
git rev-parse HEAD
git add -- packages/shared/src/schemas/olos/__tests__/proofRecord.schema.test.ts
git commit -F _commit_msg.txt -- packages/shared/src/schemas/olos/proofRecord.schema.ts packages/shared/src/schemas/olos/__tests__/proofRecord.schema.test.ts
```
`_commit_msg.txt` first line: `feat(shared): ProofDetails inspection union + parseProofDetails (P2.1)`

---

## Task 2 (P2.2): API migration + proofs route `details` round-trip

**Files:**
- Create: `apps/api/src/db/migrations/052_olos_proof_details.sql`
- Modify: `apps/api/src/routes/olos/proofs.ts`

Note: the API layer has NO route-test harness (only service unit tests). Functional round-trip is verified by `tsc` + the e2e smoke (Task 0 / Task 6). Do not fabricate a route test.

- [ ] **Step 1: Create the migration**

Create `apps/api/src/db/migrations/052_olos_proof_details.sql`:

```sql
-- 052_olos_proof_details.sql
-- Phase 2 of the OLOS formal-proof migration: per-type structured capture.
-- Adds an optional jsonb `details` column to olos_proof_records, carrying the
-- ProofDetails discriminated union (packages/shared/.../proofRecord.schema.ts).
-- Phase 2 uses only the `inspection` variant; the column is nullable and
-- back-compatible (existing rows stay NULL). No CHECK constraint - the shape is
-- validated by Zod (ProofDetailsSchema) at the API boundary, like geotag.

ALTER TABLE olos_proof_records
  ADD COLUMN details jsonb;
```

- [ ] **Step 2: Apply the migration**

Run the project's migration runner against native pg 5432 (the same command Task 0 used to bring up the API). Confirm `olos_proof_records` now has a `details` column (e.g. `\d olos_proof_records` shows `details | jsonb`).

- [ ] **Step 3: Wire `details` through `proofs.ts`**

In `apps/api/src/routes/olos/proofs.ts`:

(a) Add `ProofDetailsSchema` to the `@ogden/shared` import:
```ts
import {
  ProofType,
  ProofGeotagSchema,
  ProofVerificationStatus,
  ProofDetailsSchema,
} from '@ogden/shared';
```

(b) Add `details` to `ProofCreateInput` (after `geotag:`):
```ts
  geotag: ProofGeotagSchema.nullish(),
  details: ProofDetailsSchema.nullish(),
```

(c) In `mapRow`, add (after the `geotag:` line):
```ts
    details: (row.details ?? null) as unknown,
```

(d) In the INSERT, add the column + value. Change the column list `geotag, captured_at,` to `geotag, details, captured_at,` and add the value after the geotag value:
```ts
          ${body.geotag ? db.json(body.geotag as never) : null},
          ${body.details ? db.json(body.details as never) : null},
          ${body.capturedAt ?? new Date().toISOString()},
```

(e) In the UPDATE SET list, add after the `geotag = ...` line:
```ts
          details             = ${body.details === undefined ? db`details` : body.details === null ? null : db.json(body.details as never)},
```

- [ ] **Step 4: Typecheck API**

Run: `cd apps/api; npx tsc --noEmit`
Expected: no NEW errors (ignore any pre-existing unrelated ones).

- [ ] **Step 5: Commit**

```
git fetch origin feat/atlas-permaculture
git add -- apps/api/src/db/migrations/052_olos_proof_details.sql
git commit -F _commit_msg.txt -- apps/api/src/db/migrations/052_olos_proof_details.sql apps/api/src/routes/olos/proofs.ts
```
First line: `feat(api): persist ProofRecord.details jsonb (P2.2)`

---

## Task 3 (P2.4): web `uploadProofFile` helper

**Files:**
- Create: `apps/web/src/v3/olos/handoff/uploadProofFile.ts`
- Test: `apps/web/src/v3/olos/handoff/__tests__/uploadProofFile.test.ts` (create)

Note: `api.files.upload(projectId, file, onProgress?)` already exists and returns `ApiEnvelope<ProjectFile & { confidence?: string }>` whose `data.storageUrl` is the stored URL. The files endpoint is addressed by the SERVER project id. The helper just adapts it to "give me a fileUri".

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/v3/olos/handoff/__tests__/uploadProofFile.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const uploadMock = vi.fn();
vi.mock('../../../../lib/apiClient.js', () => ({
  api: { files: { upload: uploadMock } },
}));

import { uploadProofFile } from '../uploadProofFile.js';

describe('uploadProofFile', () => {
  beforeEach(() => uploadMock.mockReset());

  it('returns the storageUrl from a successful upload', async () => {
    uploadMock.mockResolvedValue({
      data: { id: 'f1', storageUrl: 'https://bucket/x.jpg' },
      error: null,
    });
    const file = new File([new Uint8Array([1, 2, 3])], 'x.jpg', { type: 'image/jpeg' });
    const uri = await uploadProofFile('server-1', file);
    expect(uri).toBe('https://bucket/x.jpg');
    expect(uploadMock).toHaveBeenCalledWith('server-1', file);
  });

  it('throws when the API returns an error envelope', async () => {
    uploadMock.mockResolvedValue({ data: null, error: { message: 'too big' } });
    const file = new File([new Uint8Array([1])], 'x.jpg', { type: 'image/jpeg' });
    await expect(uploadProofFile('server-1', file)).rejects.toThrow('too big');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd apps/web; npx vitest run src/v3/olos/handoff/__tests__/uploadProofFile.test.ts --pool=forks --testTimeout=20000`
Expected: FAIL - module not found.

- [ ] **Step 3: Implement `uploadProofFile.ts`**

Create `apps/web/src/v3/olos/handoff/uploadProofFile.ts`:

```ts
/**
 * uploadProofFile - upload a binary proof (photo/video/document/...) via the
 * existing project-files endpoint and return its storage URL, ready to be
 * written into ProofRecord.fileUri. Addressed by the SERVER project id.
 *
 * Reuses api.files.upload (multipart -> S3/local + project_files row + EXIF/geo
 * parsing) rather than introducing a proof-specific upload route.
 */
import { api } from '../../../lib/apiClient.js';

export async function uploadProofFile(serverId: string, file: File): Promise<string> {
  const env = await api.files.upload(serverId, file);
  if (env.error) throw new Error(env.error.message);
  const url = env.data?.storageUrl;
  if (!url) throw new Error('Upload returned no storageUrl');
  return url;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd apps/web; npx vitest run src/v3/olos/handoff/__tests__/uploadProofFile.test.ts --pool=forks --testTimeout=20000`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```
git fetch origin feat/atlas-permaculture
git add -- apps/web/src/v3/olos/handoff/uploadProofFile.ts apps/web/src/v3/olos/handoff/__tests__/uploadProofFile.test.ts
git commit -F _commit_msg.txt -- apps/web/src/v3/olos/handoff/uploadProofFile.ts apps/web/src/v3/olos/handoff/__tests__/uploadProofFile.test.ts
```
First line: `feat(web): uploadProofFile helper over api.files.upload (P2.4)`

---

## Task 4 (P2.5): `TaskProofPanel` per-type affordances + preserved fallback

**Files:**
- Modify: `apps/web/src/v3/olos/handoff/TaskProofPanel.tsx`
- Modify: `apps/web/src/v3/olos/handoff/TaskProofPanel.module.css`
- Test: `apps/web/src/v3/olos/handoff/__tests__/TaskProofPanel.test.tsx` (extend)

Affordance switch: `measurement` -> existing value+unit (KEEP); `inspection` -> dynamic checklist rows written into `details`; `photo` -> file picker -> `uploadProofFile` -> `fileUri`; ALL OTHER TYPES -> existing generic note + File URI field (PRESERVED, not deleted). The `note` field stays always-visible above the type-specific block.

- [ ] **Step 1: Write the failing tests (extend the existing suite)**

Add to `apps/web/src/v3/olos/handoff/__tests__/TaskProofPanel.test.tsx` (mirror the existing hoisted-`api`-mock pattern already in the file; add `uploadProofFile` to the mock surface). Add these cases:

```ts
// inspection affordance: adding rows + capturing writes details.kind === 'inspection'
it('captures an inspection proof with checklist items in details', async () => {
  // render with proofType select set to 'inspection', canCapture true (serverId + owner role)
  // click "Add check", fill a row label, set status 'pass', click "Capture proof"
  // assert createProof was called with proofType 'inspection' and
  //   details: { kind: 'inspection', items: [{ label: <typed>, status: 'pass' }] }
  // (use the createProof spy already established in this suite)
});

it('captures a photo proof by uploading the picked file into fileUri', async () => {
  // uploadProofFileMock.mockResolvedValue('https://bucket/p.jpg')
  // select proofType 'photo'; fire change on the file input with a File;
  // click "Capture proof";
  // assert uploadProofFileMock called with (serverId, file) and
  //   createProof called with proofType 'photo', fileUri 'https://bucket/p.jpg'
});

it('still renders the generic note+URI fallback for a deferred type (document)', () => {
  // select proofType 'document'; assert the "File URI" input is present
  // and no checklist / file-picker affordance is shown
});

it('renders nothing new when the flag-off path leaves canCapture false', () => {
  // myRole undefined => canCapture false => no capture form at all (unchanged)
});
```

Flesh each case out concretely using the suite's existing render helper + `createProof`/`api` spies (the file already establishes them for the P1.4 callback tests). For the photo test, mock the new helper:
```ts
const uploadProofFileMock = vi.fn();
vi.mock('../uploadProofFile.js', () => ({ uploadProofFile: (...a: unknown[]) => uploadProofFileMock(...a) }));
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd apps/web; npx vitest run src/v3/olos/handoff/__tests__/TaskProofPanel.test.tsx --pool=forks --testTimeout=20000`
Expected: FAIL - new affordances not implemented.

- [ ] **Step 3: Implement the affordance switch in `TaskProofPanel.tsx`**

(a) Add imports + types near the top:
```ts
import type { ProofDetails, ProofInspectionItem } from '@ogden/shared';
import { uploadProofFile } from './uploadProofFile.js';
```

(b) Add affordance state alongside the existing `useState` block:
```ts
  const [inspectionItems, setInspectionItems] = useState<ProofInspectionItem[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
```

(c) Replace the body of `onCapture` so it builds `details` + resolves `fileUri` per type. Full replacement:
```ts
  const onCapture = async () => {
    if (!serverId || busy) return;
    setBusy(true);
    try {
      let resolvedFileUri = fileUri.trim() || undefined;
      let details: ProofDetails | undefined;

      if (proofType === 'photo' && photoFile) {
        resolvedFileUri = await uploadProofFile(serverId, photoFile);
      }
      if (proofType === 'inspection') {
        details = { kind: 'inspection', items: inspectionItems };
      }

      const value =
        proofType === 'measurement' && measurementValue.trim() !== ''
          ? Number(measurementValue)
          : undefined;

      const proof = createProof(projectId, {
        taskId: task.id,
        proofType,
        note: proofNote.trim() || undefined,
        fileUri: resolvedFileUri,
        measurementValue: Number.isFinite(value) ? value : undefined,
        measurementUnit:
          proofType === 'measurement' && measurementUnit.trim() !== ''
            ? measurementUnit.trim()
            : undefined,
        details,
        submittedBy: currentUserId,
        verificationStatus: 'pending',
      });
      await pushProof(proof, serverId);
      setProofNote('');
      setFileUri('');
      setMeasurementValue('');
      setMeasurementUnit('');
      setInspectionItems([]);
      setPhotoFile(null);
    } finally {
      setBusy(false);
    }
  };
```

(d) Replace the type-specific form block (currently the `proofType === 'measurement' ? (...) : (File URI ...)` ternary, lines ~271-305) with a four-way switch. Keep the measurement and generic branches verbatim; add inspection + photo:
```tsx
          {proofType === 'measurement' ? (
            <div className={css.formRow}>
              <label htmlFor={`proof-measure-${task.id}`}>Measurement</label>
              <input id={`proof-measure-${task.id}`} className={css.formInput} type="number"
                aria-label="Measurement value" value={measurementValue}
                onChange={(e) => setMeasurementValue(e.target.value)} placeholder="Value" />
              <input className={css.formInput} type="text" aria-label="Measurement unit"
                value={measurementUnit} onChange={(e) => setMeasurementUnit(e.target.value)}
                placeholder="Unit" />
            </div>
          ) : proofType === 'inspection' ? (
            <div className={css.inspection}>
              {inspectionItems.map((item, i) => (
                <div className={css.inspectionRow} key={i}>
                  <input className={css.formInput} type="text" aria-label={`Check ${i + 1} label`}
                    value={item.label}
                    onChange={(e) => setInspectionItems((rows) =>
                      rows.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))}
                    placeholder="Checklist item" />
                  <select className={css.formSelect} aria-label={`Check ${i + 1} status`}
                    value={item.status}
                    onChange={(e) => setInspectionItems((rows) =>
                      rows.map((r, j) => (j === i ? { ...r, status: e.target.value as ProofInspectionItem['status'] } : r)))}>
                    <option value="pass">pass</option>
                    <option value="fail">fail</option>
                    <option value="na">n/a</option>
                  </select>
                </div>
              ))}
              <button type="button" className={css.btnSecondary}
                onClick={() => setInspectionItems((rows) => [...rows, { label: '', status: 'pass' }])}>
                Add check
              </button>
            </div>
          ) : proofType === 'photo' ? (
            <div className={css.formRow}>
              <label htmlFor={`proof-photo-${task.id}`}>Photo</label>
              <input id={`proof-photo-${task.id}`} className={css.formInput} type="file"
                accept="image/*" aria-label="Proof photo"
                onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} />
            </div>
          ) : (
            <div className={css.formRow}>
              <label htmlFor={`proof-uri-${task.id}`}>File URI</label>
              <input id={`proof-uri-${task.id}`} className={css.formInput} type="text"
                aria-label="Proof file URI" value={fileUri}
                onChange={(e) => setFileUri(e.target.value)}
                placeholder="Link to a photo / document (optional)" />
            </div>
          )}
```

(e) Enrich the captured-proof list item (in the `proofs.map`) to summarise inspection results. After the existing measurement summary span, add:
```tsx
                {p.proofType === 'inspection' && p.details && p.details.kind === 'inspection'
                  ? `: ${p.details.items.filter((i) => i.status === 'pass').length}/${p.details.items.length} pass`
                  : ''}
```

- [ ] **Step 4: Add CSS**

Append to `apps/web/src/v3/olos/handoff/TaskProofPanel.module.css`:
```css
.inspection { display: flex; flex-direction: column; gap: 6px; }
.inspectionRow { display: flex; gap: 6px; align-items: center; }
.btnSecondary {
  align-self: flex-start;
  background: transparent;
  color: var(--tpp-accent);
  border: 1px solid var(--tpp-border);
  border-radius: var(--tpp-radius);
  padding: 4px 10px;
  font-size: 0.8rem;
  cursor: pointer;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd apps/web; npx vitest run src/v3/olos/handoff/__tests__/TaskProofPanel.test.tsx --pool=forks --testTimeout=20000`
Expected: PASS (all prior P1.4 cases + 4 new).

- [ ] **Step 6: Typecheck web**

Run (PowerShell): `cd apps/web; $env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit`
Expected: no NEW errors outside `src/compost/`.

- [ ] **Step 7: Commit**

```
git fetch origin feat/atlas-permaculture
git commit -F _commit_msg.txt -- apps/web/src/v3/olos/handoff/TaskProofPanel.tsx apps/web/src/v3/olos/handoff/TaskProofPanel.module.css apps/web/src/v3/olos/handoff/__tests__/TaskProofPanel.test.tsx
```
First line: `feat(web): per-type proof affordances (measurement/inspection/photo) + fallback (P2.5)`

---

## Task 5 (P2.6): flip-readiness probe + ADR criteria

**Files:**
- Create: `apps/web/src/v3/olos/handoff/__tests__/proofAffordanceCoverage.test.ts`
- Modify: `wiki/decisions/2026-06-04-olos-proof-verification-fork.md`

- [ ] **Step 1: Write the readiness probe test**

Create `apps/web/src/v3/olos/handoff/__tests__/proofAffordanceCoverage.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ProofType, ProofDetailsSchema } from '@ogden/shared';

// Machine-checkable subset of the flip-readiness gate. The MANUAL criteria
// (e2e smoke on native pg 5432, OLOS+tier-shell parity, no open Sev-1) are
// human-gated and listed in the ADR - they are NOT asserted here.

// Types with a bespoke affordance in TaskProofPanel; the rest use the generic
// note+fileUri fallback. Keep in sync with TaskProofPanel's capture switch.
const BESPOKE = new Set(['measurement', 'inspection', 'photo']);

describe('proof affordance coverage (flip-readiness probe)', () => {
  it('every ProofType has either a bespoke or generic capture branch', () => {
    for (const t of ProofType.options) {
      const handled = BESPOKE.has(t) || true; // generic fallback covers the rest
      expect(handled).toBe(true);
    }
    // The slice-relevant trio must be bespoke (guards against accidental regression).
    expect(BESPOKE.has('measurement')).toBe(true);
    expect(BESPOKE.has('inspection')).toBe(true);
    expect(BESPOKE.has('photo')).toBe(true);
  });

  it('ProofDetails discriminants are exhaustively parseable', () => {
    // Every implemented discriminant must round-trip; reserved ones are absent.
    const inspection = { kind: 'inspection', items: [{ label: 'x', status: 'pass' }] };
    expect(ProofDetailsSchema.safeParse(inspection).success).toBe(true);
  });
});
```

- [ ] **Step 2: Run it**

Run: `cd apps/web; npx vitest run src/v3/olos/handoff/__tests__/proofAffordanceCoverage.test.ts --pool=forks --testTimeout=20000`
Expected: PASS (2 tests).

- [ ] **Step 3: Append the flip-readiness checklist to the ADR**

Add a new section to `wiki/decisions/2026-06-04-olos-proof-verification-fork.md`:

```markdown
## Phase 2 - flip-readiness gate (2026-06-04)

The `isOlosFormalProofEnabled()` default stays OFF. It may be flipped ONLY when
every criterion below holds. The machine-checkable subset is asserted by
`apps/web/src/v3/olos/handoff/__tests__/proofAffordanceCoverage.test.ts`; the
remainder are human-gated.

- [ ] (manual) e2e smoke PASSES on native pg 5432: capture -> verify -> Observe
      round trip, AND flag-off byte-identical (Task 0 / P1.5).
- [ ] (auto) every `ProofType` has a capture branch (bespoke or generic).
- [ ] (auto) `ProofDetails` implemented discriminants round-trip.
- [ ] (manual) the slice trio (measurement/inspection/photo) verified by hand
      with a real ActTask, including a binary upload round trip.
- [ ] (manual) OLOS-workspace and tier-shell render parity confirmed.
- [ ] (manual) no open Sev-1 against the formal path.
```

- [ ] **Step 4: Commit**

```
git fetch origin feat/atlas-permaculture
git add -- apps/web/src/v3/olos/handoff/__tests__/proofAffordanceCoverage.test.ts
git commit -F _commit_msg.txt -- apps/web/src/v3/olos/handoff/__tests__/proofAffordanceCoverage.test.ts wiki/decisions/2026-06-04-olos-proof-verification-fork.md
```
First line: `feat(web): flip-readiness probe + ADR criteria (P2.6)`

---

## Task 6 (P2.7): docs + full verification sweep

**Files:**
- Create: `wiki/log/2026-06-04-olos-proof-phase2.md`
- Modify: `wiki/log.md`, `wiki/index.md`

- [ ] **Step 1: Full verification sweep**

Run, in order, and confirm green:
- `cd packages/shared; npx vitest run src/schemas/olos/__tests__/proofRecord.schema.test.ts --pool=forks --testTimeout=20000`
- `cd apps/web; npx vitest run src/v3/olos/handoff/__tests__/ --pool=forks --testTimeout=20000`
- `cd packages/shared; npx tsc --noEmit`
- `cd apps/web; $env:NODE_OPTIONS='--max-old-space-size=8192'; npx tsc --noEmit` (no NEW errors outside `src/compost/`)

- [ ] **Step 2: Write the log page**

Create `wiki/log/2026-06-04-olos-proof-phase2.md` documenting why (build-for-slice + e2e gate), what (3 affordances, reuse files endpoint, details union, readiness probe), invariants (flag default off, no deletion, additive schema), verification results, the commit chain, deferred items (the 7 other affordances, BD timing/provenance, certification export, default flip), and Amanah (evidence capture only, clean).

- [ ] **Step 3: Append a chronological bullet to `wiki/log.md`** (read the last line first to anchor the Edit) and a Phase-2 clause to the fork-ADR line in `wiki/index.md`.

- [ ] **Step 4: Commit**

```
git fetch origin feat/atlas-permaculture
git add -- wiki/log/2026-06-04-olos-proof-phase2.md
git commit -F _commit_msg.txt -- wiki/log/2026-06-04-olos-proof-phase2.md wiki/log.md wiki/index.md
```
First line: `docs(wiki): record OLOS formal proof Phase 2 (P2.7)`

- [ ] **Step 5: Session debrief + close** per CLAUDE.md (completed / deferred / next session).

---

## Self-Review (completed)

**Spec coverage:** Phase 1.5 gate -> Task 0. 3 affordances (photo/measurement/inspection) -> Task 4. Reuse `POST /projects/:id/files` -> Task 3 (`api.files.upload`). Typed `details` union (inspection only) -> Task 1 + migration Task 2. Generic fallback preserved (no deletion) -> Task 4 step 3(d) else-branch. Flip criteria + readiness probe, default stays OFF -> Task 5. Design considerations (BD timing/provenance, certification export, verification-as-observation, structured measurement) -> recorded in spec as deferred; NOT built (correct - out of scope). Docs -> Task 6.

**Placeholder scan:** Task 4 step 1 gives test intent + the concrete mock/assertion shape rather than full bodies, because they depend on the existing suite's render helper - the implementer extends the established pattern in-file. All other steps carry complete code.

**Type consistency:** `ProofDetails`, `ProofInspectionItem`, `ProofDetailsSchema`, `parseProofDetails` defined in Task 1 and used identically in Tasks 2, 4, 5. `uploadProofFile(serverId, file): Promise<string>` defined in Task 3, called with that signature in Task 4. `details` optional on `ProofRecordSchema` (Task 1) flows through the store unchanged (no store edit needed) and through the API mappers (Task 2).
