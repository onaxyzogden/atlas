# 2026-05-21 — Phase H: tooltip Evidence retrofit (host-canopy-union)

**Branch:** `feat/atlas-permaculture`
**ADR:** [[decisions/2026-05-21-atlas-phase-h-tooltip-evidence-retrofit]]

Closes the LAUNCH-CHECKLIST "Tooltip Evidence retrofit" deferral. The
silvopasture host-canopy union surfaces
(`HostUnionDrilldownCard` right-click detail card; `HostCanopyUnionTooltip`
hover peek intentionally left alone) now compose the Evidence section
and persist to `evidence_audit_log` like every other live Evidence
panel.

## Commits

- **H.1** `a5b760a7` — `feat(evidence): H.1 — host-canopy-union selector + dispatcher`
  - New `packages/shared/src/evidence/selectors/hostCanopyUnion.ts`
    (`HostCanopyUnionEntry`, `HostCanopyUnionEvidenceInputs`,
    `selectHostCanopyUnionEvidence`); confidence ratio rule
    `union/raw ≥ 0.9 high`, `≥ 0.5 medium`, `< 0.5 low`; per-host
    fragments capped at 6 with overflow row.
  - `PanelKey` union extended with `'host-canopy-union'` (9 panel keys
    total).
  - `selectEvidence.ts` discriminated-union arm + dispatch case +
    barrel re-export.
  - New `__tests__/hostCanopyUnion.test.ts` — 7 cases (empty,
    high/medium/low confidence, cap+overflow with 9 entries,
    determinism via `stableStringify`, dispatcher round-trip).
  - `pnpm --filter @ogden/shared test` → **325 passed** (318 baseline + 7).

- **H.2** `35e9e7e0` — `feat(plan): H.2 — render EvidenceSection inside HostUnionDrilldownCard`
  - Optional `evidenceItem?: EvidenceItem | null` + `projectId?: string`
    props on `HostUnionDrilldownCard`.
  - `<EvidenceSection>` rendered in a new `.evidenceSlot` div between
    member roster and audit-link footer, guarded on
    `evidenceItem != null`. `data-testid="host-union-drilldown-evidence"`.
  - `compactMode` deliberately omitted — `EvidenceSection`'s
    `compactMode={true}` returns `null` (mobile-suppression), not a
    compact render.
  - New `.evidenceSlot` CSS in
    `HostUnionDrilldownCard.module.css`.

- **H.3** `767a4995` — `feat(plan): H.3 — emit host-canopy-union evidence audit in PlanDataLayers`
  - `drilldownEvidenceDepKey` string-signature memo (rounded m² +
    counts joined `:` / `|`).
  - `drilldownEvidenceInputs` + `drilldownEvidenceItem` memos +
    `emitEvidenceAudit` `useEffect` keyed on
    `[projectId, drilldownEvidenceDepKey]`.
  - `evidenceItem` + `projectId` passed into `<HostUnionDrilldownCard>`.
  - F.7.4 pattern reused — emit fires once per distinct rounded input
    set, not per render.
  - **External-rebase eat:** first attempt ran tests-before-commit and
    a foreign rebase wiped the working-tree edits. Re-applied + committed
    immediately per `[[feedback-commit-immediately-on-rebased-branches]]`.

- **H.4** (this commit) — `docs(wiki): H.4 — Phase H tooltip Evidence retrofit ADR + log + index`
  - ADR + log entry + index pointers + LAUNCH-CHECKLIST strike.

## Verification

- `pnpm --filter @ogden/shared test` — **325 passed** (318 baseline + 7
  new cases).
- `pnpm --filter @ogden/shared typecheck` clean.
- `pnpm --filter @ogden/web test` — **191 files / 1876 passed / 4
  skipped** (exceeds 1851 baseline).
- `pnpm --filter @ogden/web typecheck` — only pre-existing foreign-WIP
  errors unchanged (`StepBoundary.tsx`, `HostUnionContextMenu.test.tsx`,
  `HostUnionDrilldownCard.test.tsx`).

## Branch hygiene

External rebase wiped uncommitted H.3 work mid-test-window once;
recovered by re-applying and committing immediately. All four sub-phase
commits land on `feat/atlas-permaculture` with `--force-with-lease`
push protocol per [[project-branch-rebase]]. Foreign-WIP files
(`apps/web/src/lib/apiClient.ts`, `RegisterPage.tsx`, `routes/index.tsx`,
`v3/observe/components/**`, two `packages/shared` builtEnvironment
files, two untracked migrations + organizations feature) left
unstaged.

## Covenant

No new public-facing strings beyond Evidence fragment copy. "Capital
partners & allies" framing per [[fiqh-csra-erased-2026-05-04]]
untouched. Mobile Overview stack flat (compactMode prop deliberately
omitted on the desktop-only drilldown). Audit ledger remains private
reproducibility.

## Continues

[[2026-05-21-phase-g-evidence-audit-replay]]
