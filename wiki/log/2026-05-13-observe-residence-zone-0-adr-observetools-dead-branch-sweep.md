# 2026-05-13 — Observe: residence→Zone-0 ADR + ObserveTools dead-branch sweep


**ADR.** Filed [2026-05-13 atlas-residence-zone0-derivation](decisions/2026-05-13-atlas-residence-zone0-derivation.md)
recording the decision that a BE residence (kind ∈ {`building`, `cabin`,
`yurt`, `tent-glamping`, `earthship`}, state `existing`) should
*lazily* fall back as the Mollison Zone 0 anchor when
`homesteadStore.byProject[projectId]` is unset and exactly one primary
dwelling exists on the parcel — never an eager write into
`homesteadStore`. Permaculture semantics (Zone 0 is the *seat of
activity*, not "any building") mean the multi-dwelling case stays a
deliberate steward decision via the existing Place-homestead control.
Recorded alternatives A (no derivation), B (eager auto-set), and D
(prompt the steward); B/D rejected with rationale. Implementation —
`useEffectiveHomestead(projectId)` hook + migrate the five consumers —
flagged as a separate session, gated on introducing a polygon-centroid
utility and promoting the dwelling-kinds enumeration to a
`RESIDENCE_KINDS` constant in
`packages/shared/src/builtEnvironmentKinds.ts`.

**Sweep.** Removed five unreachable `!projectId` defensive sites in
`apps/web/src/v3/observe/tools/ObserveTools.tsx` left behind by commit
`134540e0`'s `?? null` → `?? 'mtc'` fallback alignment:
selector ternary (line 152) collapsed to `s.byProject[projectId]`;
`Boolean(onSelectModule && projectId)` → `Boolean(onSelectModule)`
(line 189); `renderToolButton` ctx-type `projectId: string | null` →
dropped (it was unused after the title/disabled simplifications);
`disabled = !projectId || …` → `disabled = needsHomestead &&
!homesteadPlaced`; `title = !projectId ? '…' : …` branch dropped. Also
removed `projectId` from the three `renderToolButton` call-site ctx
objects since the helper no longer reads it. `tsc --noEmit -p
apps/web` clean. No behaviour change — every removed branch was
unreachable.
