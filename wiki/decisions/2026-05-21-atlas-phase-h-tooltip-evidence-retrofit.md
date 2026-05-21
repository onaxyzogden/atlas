# 2026-05-21 — Atlas Phase H: tooltip Evidence retrofit (host-canopy-union)

**Branch:** `feat/atlas-permaculture`
**Continues:** [[2026-05-21-atlas-phase-g-evidence-audit-replay]]
**Closes:** LAUNCH-CHECKLIST "Tooltip Evidence retrofit" deferral.

---

## Context

Phase G shipped the server-side replay tool for `evidence_audit_log` and
promoted all 8 selectors + the dispatcher to `@ogden/shared/evidence`. Two
LAUNCH-CHECKLIST / Phase-G follow-ups remained:

1. **Tooltip Evidence retrofit** — `HostCanopyUnionTooltip` /
   `HostUnionDrilldownCard` (the silvopasture host-canopy union surfaces)
   rendered bespoke roster UI with no Evidence-section confidence pills and
   no `evidence_audit_log` persistence. They were the only live Plan
   decision surfaces still off the reproducibility ledger.
2. **Nightly CI cron** for `evidence:replay` — operator-run only; folded
   into the sibling Phase I ADR.

User direction: **"Both, tooltip first."** Phase H lands the tooltip
retrofit; Phase I lands the nightly CI sweep.

## Decisions

### H.1 — `host-canopy-union` selector + dispatcher (commit `a5b760a7`)

- New pure selector `packages/shared/src/evidence/selectors/hostCanopyUnion.ts`
  with `HostCanopyUnionEntry { hostId, hostName, unionAreaM2, rawSumM2,
  guildCount, memberCount }`, `HostCanopyUnionEvidenceInputs { entries }`,
  and `selectHostCanopyUnionEvidence(inputs): EvidenceItem`.
- Top-line summary emits hosts count + aggregate de-overlapped union area
  + naive raw-sum + overlap-correction percentage. Per-host fragments
  capped at 6 with an overflow fragment ("+ N more hosts…") for stable
  payload size when projects scale.
- Confidence rule (ratio `unionAreaM2 / rawSumM2`):
  - `≥ 0.9` → `high` (negligible overlap; geometry agrees)
  - `≥ 0.5` → `medium` (meaningful overlap correction; sensitive to ring
    accuracy)
  - `< 0.5` → `low` (heavy overlap; flag for the steward)
  Thresholds documented here; tunable via follow-up commit if user feedback
  dissents.
- `PanelKey` union in `packages/shared/src/evidence/types.ts` extended with
  `'host-canopy-union'` — 9 keys now: `land-verdict`, `decision-triad`,
  `intelligence-summary` (orphan), `site-narrative`, `water-storage`,
  `three-ethics`, `water-router`, `capital-partner`,
  **`host-canopy-union`**.
- `EvidenceDispatchInputs` discriminated union + dispatch case added in
  `selectEvidence.ts`; barrel `index.ts` re-exports
  `HostCanopyUnionEntry` + `HostCanopyUnionEvidenceInputs`.
- New test file
  `packages/shared/src/evidence/__tests__/hostCanopyUnion.test.ts` —
  7 cases: empty entries, high-confidence no-overlap, medium-confidence
  ≈0.7 ratio, low-confidence < 0.5, cap+overflow with 9 entries,
  determinism via `stableStringify`, dispatcher round-trip through
  `selectEvidenceFor`.

**Gate:** `pnpm --filter @ogden/shared test` → **325 passed** (318
baseline + 7 new). `pnpm --filter @ogden/shared typecheck` clean.

### H.2 — `<EvidenceSection>` inside `HostUnionDrilldownCard` (commit `35e9e7e0`)

Locked composition decision: Evidence section composes inside
`HostUnionDrilldownCard` (the right-click sticky detail card), **not**
inside `HostCanopyUnionTooltip` (the ephemeral `pointer-events: none`
hover surface). Drilldown is the explicit detail affordance; tooltip is
peek-only.

- `HostUnionDrilldownCard.tsx` gains optional props
  `evidenceItem?: EvidenceItem | null` and `projectId?: string`.
- Renders `<EvidenceSection item={evidenceItem} projectId={projectId} />`
  wrapped in a `<div className={styles.evidenceSlot}
  data-testid="host-union-drilldown-evidence">` between the member-roster
  block and the "Open full audit →" footer link.
- Guarded `evidenceItem ? ... : null` — no empty shell when there's
  nothing to render.
- `compactMode` prop **deliberately omitted**: in `EvidenceSection`,
  `compactMode={true}` returns `null` (mobile-suppression per
  [[feedback-mobile-overview-stack]]), not a compact render. The
  drilldown card is a desktop right-click surface; we want the full
  Evidence section.
- New `.evidenceSlot` CSS in `HostUnionDrilldownCard.module.css` (8 px
  vertical spacing + a 1 px top border in the parchment palette to
  separate from the roster).

**Gate:** `pnpm --filter @ogden/web typecheck` — no new errors on touched
files. `pnpm --filter @ogden/web test` — 1851 baseline holds.

### H.3 — emit hook in `PlanDataLayers.tsx` (commit `767a4995`)

Emit lives in `PlanDataLayers.tsx` because it already holds `projectId` +
`displayedUnion` (the source of truth for the host-canopy-union geometry
roll-up). Reused the **F.7.4 string-signature memo-dep pattern** to
prevent emit flooding: a stable `drilldownEvidenceDepKey` string is built
from rounded numeric primitives (`hostId:roundedUnion:roundedRaw:
guildCount:memberCount`, joined `|`); both the inputs memo and the emit
effect key on that string, so reference-identity churn during hover does
**not** reseed `evidence_audit_log` rows.

```ts
const drilldownEvidenceDepKey = useMemo(/* signature string */, [displayedUnion]);
const drilldownEvidenceInputs = useMemo<HostCanopyUnionEvidenceInputs | null>(
  /* rebuild entries array inside */, [drilldownEvidenceDepKey],
);
const drilldownEvidenceItem = useMemo(
  () => drilldownEvidenceInputs
    ? selectEvidenceFor({ panelKey: 'host-canopy-union', inputs: drilldownEvidenceInputs })
    : null,
  [drilldownEvidenceInputs],
);
useEffect(() => {
  if (!projectId || !drilldownEvidenceInputs || !drilldownEvidenceItem) return;
  emitEvidenceAudit({ projectId, panelKey: 'host-canopy-union', ... });
}, [projectId, drilldownEvidenceDepKey]);
```

`drilldownEvidenceItem` + `projectId` passed into
`<HostUnionDrilldownCard>`.

**External-rebase lesson re-enforced:** the first H.3 attempt ran
typecheck + 1876-test vitest pass before commit; an external rebase
landed mid-window and wiped the working-tree edits. Re-applied + committed
immediately per `[[feedback-commit-immediately-on-rebased-branches]]`.

**Gate:** `pnpm --filter @ogden/web typecheck` clean on touched file.
Web tests **191 files / 1876 passed / 4 skipped** (exceeds the 1851
baseline).

### H.4 — wiki + LAUNCH-CHECKLIST + push (this commit)

- This ADR.
- New log entry `wiki/log/2026-05-21-phase-h-tooltip-evidence-retrofit.md`.
- Pointer added to `wiki/log.md` newest-first above the Phase G entry.
- Pointer added to `wiki/index.md` Decisions section above the Phase G
  ADR entry.
- `wiki/LAUNCH-CHECKLIST.md` "Tooltip Evidence retrofit" deferred item
  flipped `[ ]` → `[x]` with backlink to this ADR.

## Verification

- `pnpm --filter @ogden/shared test` — **325 passed** (318 baseline + 7
  new).
- `pnpm --filter @ogden/shared typecheck` clean.
- `pnpm --filter @ogden/web test` — **191 files / 1876 passed / 4
  skipped** (exceeds 1851 baseline).
- `pnpm --filter @ogden/web typecheck` — only the pre-existing foreign-WIP
  errors unchanged (`StepBoundary.tsx`, two `HostUnion*` test files); no
  new diagnostics on H.1–H.3 surface.

## Commits

- **H.1** `a5b760a7` — `feat(evidence): H.1 — host-canopy-union selector + dispatcher`
- **H.2** `35e9e7e0` — `feat(plan): H.2 — render EvidenceSection inside HostUnionDrilldownCard`
- **H.3** `767a4995` — `feat(plan): H.3 — emit host-canopy-union evidence audit in PlanDataLayers`
- **H.4** (this) — `docs(wiki): H.4 — Phase H tooltip Evidence retrofit ADR + log + index`

## Out of scope

- `HostCanopyUnionTooltip` itself stays Evidence-free — `pointer-events:
  none` hover surface is not the right affordance for the persistent
  detail section.
- Orphan `'intelligence-summary'` selector cleanup — separate slice.
- i18n on the new Evidence strings — English-only per the existing
  Evidence convention.
- Per-fragment confidence bands (low/mid/high range, vs. single pill) —
  still deferred from Phase G.
- Nightly CI cron for `evidence:replay` — sibling Phase I ADR.

## Covenant restatement

No new public-facing strings beyond the Evidence fragment copy. "Capital
partners & allies" / "appreciation of stewarded land value" framing per
[[fiqh-csra-erased-2026-05-04]] untouched. 3-item Observe/Plan/Act IA
unchanged. Mobile Overview stack flat per
[[feedback-mobile-overview-stack]] (the omitted `compactMode` choice
preserves this — the drilldown is a desktop-only affordance). Audit
ledger remains private reproducibility infrastructure — surveillance
posture unchanged.
