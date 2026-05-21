# 2026-05-21 — Phase G smoke test: live Evidence panels post-alias-fix

**Branch.** `feat/atlas-permaculture`. Closes the Phase G ratchet by
exercising the promoted `@ogden/shared/evidence` selector layer through
the live browser, after the [Vite alias hotfix](2026-05-21-phase-g-vite-alias-hotfix.md)
restored module resolution. Pairs with the [Phase G promotion log](2026-05-21-phase-g-evidence-audit-replay.md).

**Scope (user-confirmed).** All three Evidence panels recorded in the
plan — `SiteSummaryNarrativeSection`, `DecisionTriad`, `LandVerdictCard`
— against the local-store project, with a desktop + mobile sweep and
fresh-account auth. Plan file:
`C:\Users\MY OWN AXIS\.claude\plans\ui-verification-on-v3-project-id-observe-giggly-starlight.md`.

**Result table.**

| Panel | Live mount route | Rendered | Evidence toggles | Audit POST |
|---|---|---|---|---|
| `SiteSummaryNarrativeSection` | `/v3/project/$id/observe` (DecisionRail → lazy `SiteIntelligencePanel`) | ✅ | 1 toggle, count = 3 fragments + 3 source pills | 404 (pre-existing — API route absent in local env) |
| `DecisionTriad` | **none** — orphaned in [`MobileProjectShell`](../../apps/web/src/pages/MobileProjectShell.tsx) which is no longer imported into the live route tree | n/a | n/a | n/a |
| `LandVerdictCard` | **none** — same orphan as above | n/a | n/a | n/a |

**Headline finding — IA gap, not a Phase G regression.**
[`apps/web/src/routes/index.tsx:139-149`](../../apps/web/src/routes/index.tsx:146)
redirects `/project/$projectId` unconditionally to
`/v3/project/$projectId/observe`; neither `ProjectPage` nor
`MobileProjectShell` are imported anywhere in `routes/index.tsx`.
`DecisionTriad` and `LandVerdictCard` are therefore unreachable through
the live IA on this branch — consistent with the `7-stage lifecycle
retiring` memory rule. Their selectors (`selectEvidenceFor` panelKeys
`decision-triad` and `land-verdict`) are unit-tested green in
`packages/shared/src/evidence/__tests__/selectors.test.ts` and resolve
through the same `@ogden/shared/evidence` alias just smoke-tested green
in the live mount. Source-level the import line is identical; runtime
correctness for the two unreachable panels is inferred, not measured.

**Live mount evidence (`SiteSummaryNarrativeSection`).** Viewport
1440×900, project `2662072f-0c7d-4bad-9203-ccdd9c35440c` (`351 House —
Atlas Sample`, local-store fixture; Three Streams Farm
`00000000-0000-0000-0000-000000357320` was not accessible to the fresh
account due to a pre-existing sync 422). DecisionRail expanded from its
default collapsed state via `[aria-label="Rail — drag to resize, click
to expand"]`; SiteIntelligencePanel rendered with "49 Overall
Suitability · Site Intelligence 49/100 · Data layers: 2/7". One
`data-testid="evidence-toggle"` labelled `"▸Show evidence (3)"`. After
click: `data-testid="evidence-body"` visible, three
`data-testid="evidence-fragment"` rows, three
`data-testid="evidence-source-pill"`. Body text matched the expected
narrative shape ("Property size 12 acres · fixture · Layer count 2 ·
computed · Narrative state fallback · computed · Pattern-based prose;
AI enrichment not yet run.").

**Console.** Red-error-free for evidence code; the only repeated red
line is the pre-existing `[SYNC] Initial sync failed: ApiError: Request
validation failed` (422 on `GET /api/v1/projects` — local server
schema-validation drift, recorded in
[`feedback_preflight_protocol`](../../C--Users-MY-OWN-AXIS-Documents-MAQASID-OS---V2-1-atlas/memory/feedback_preflight_protocol.md)
territory; not Phase G).

**Network.** `POST
/api/v1/projects/2662072f-0c7d-4bad-9203-ccdd9c35440c/evidence-audit/log`
returns `404` — the route is not registered in this local `apps/api`
build. `emitEvidenceAudit` swallows the rejection per its fire-and-forget
contract at [`apps/web/src/lib/evidence/auditEmit.ts:45`](../../apps/web/src/lib/evidence/auditEmit.ts:45);
no UI degradation. Pre-existing infra gap, recorded here for follow-up,
unrelated to the selector promotion.

**Phase G ratchet — closed.** The selector promotion
(`apps/web/src/lib/evidence/` → `packages/shared/src/evidence/` in
commit `f32c7c58`) preserves runtime behavior at the only live consumer
reachable from the IA. Module resolution holds (post-hotfix), selector
dispatch returns a populated `EvidenceItem`, `EvidenceSection` renders
every expected `data-testid`, and `emitEvidenceAudit` fires as designed.
The desktop screenshot in
`C:\Users\MY OWN AXIS\AppData\Local\Temp\preview\` (transient) captured
the rail expanded state with the evidence body visible.

**Deferred (not Phase G).**

- Sync 422 on `GET /api/v1/projects` (pre-existing — local API drift
  blocks server→client project hydration; fresh accounts can't see
  fixture projects).
- Missing `POST /api/v1/projects/:id/evidence-audit/log` API route in
  the local `apps/api` build (Phase F.4 wired the client side; server
  side still owed in this env).
- Templates migration `034_template_slug_and_public.sql` not applied to
  local DB (`/templates/public/ecosystem-farm/instantiate` returns 500
  "column slug does not exist"; recorded in [Phase 4 log](2026-05-21-atlas-phase-4-ecosystem-farm-template.md)).
- `MobileProjectShell` mount route never re-introduced after the v3 IA
  cutover; `DecisionTriad` + `LandVerdictCard` are dead code paths from
  the live IA's perspective. Either restore a route, surface them
  inside the `/v3` tree, or delete the two panels + their selectors.

**Lesson — "panel rendered in tests" ≠ "panel reachable in IA".** Phase
G's 1851-test vitest pass tells you the selectors and the React
components both work; it does not tell you whether the live IA still
mounts them. Two of the three panels in this smoke test fall in that
gap. Future selector-promotion or component-relocation work should
include a `grep` of `apps/web/src/routes/` for live mount paths before
declaring runtime parity.
