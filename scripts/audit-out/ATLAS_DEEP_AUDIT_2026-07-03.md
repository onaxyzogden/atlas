# ATLAS DEEP AUDIT — Pass 3 (2026-07-03)

**Branch:** `fix/operational-role-layer` · **Operator:** Yousef Abdelsalam · **Auditor:** Claude (Fable 5)
**Scope (operator-selected):** Delta since Pass 2 (2026-06-26, `686cb462`) **plus** full re-sweep of unchanged code.
**Method:** Two adversarial multi-agent sweeps (friction / content-integrity) → per-finding adversarial refutation → **firsthand source verification in the main context** for every load-bearing claim → staged proportionate remediation (one commit per phase, explicit pathspecs, zero pushes by the auditor).

Prior passes: Pass 1 (2026-06-19, F1–F17) · Pass 2 (2026-06-26, 40 candidates → 13 refuted, Phases A–E).

---

## Executive summary

- **78 candidates survived adversarial screening** (45 friction + 33 content). Firsthand verification confirmed **6 HIGH clusters** and **4 Amanah-class lint gaps** — all presented below with proposed remediation, **not auto-fixed**, per the operator-approved halt rule.
- **17 pre-enumerated LOW/MEDIUM items fixed** across three remediation commits (3.B `6335d5eb`, 3.C `910f5b98`, 3.D `977d1943`) — a11y focus trap, heading semantics, label residue, authz test coverage, stale-comment hygiene, stale generated artifact.
- **Working tree reconciled and committed** in path-scoped slices (Phase 4); ops-hub working-tree version verified as a strict superset of the merged PR #59 snapshot.
- **Demo branch prepared locally** (fast-forward to `c1f86acb`, keyless offline build green). Push remains operator-only — **with a critical trip-wire documented below** (§7).
- Deferral ledger reconciled: **F1 now fully closed** (both endpoints have authz tests), F2–F5 closed, F16 remains an accepted deferral.

---

## 1. CONFIRMED HIGH findings — awaiting operator direction (halt rule)

All six verified firsthand against source. None auto-fixed.

### H1 — Role layer silently inert on the default Act surface
**The branch's flagship feature does not render where users land.** `ActOpsHub` (the default Act shell) consumes `useViewScope` (ActOpsHub.tsx:105, `allowRoleOverride: true`), but `useViewScope` only *reads* `useMemberStore((s) => s.members)` — it never fetches. `memberStore` is **not persisted** and starts `[]`; nothing on the ops-hub route calls `fetchMembers`. Members `[]` → `useIsSoloProject` → `solo = true` → `layerActive = false` **and** `canPickRole = false`: no domain scoping, no "Viewing as" picker. Of the four Act shells only the legacy tier-shell fetches (ActTierShell.tsx:247); ActOpsHub, ActMapFirstLayout, ViewBDashboard do not.
**Proposed fix (recommended):** move the roster bootstrap *into* `useViewScope` itself (fetch-on-mount; `memberStore.fetchMembers` already no-ops safely under `DEMO_OFFLINE_ENABLED`). One seam heals all four shells and every future consumer. Alternative: mirror the ActTierShell effect per-shell.

### H2 — Dropped sync ops end as "All synced"
`handleExhaustedOp` (syncService.ts:~2620) permanently drops an exhausted op: one 6-second toast (whose copy points at a **nonexistent "Connectivity" surface**) + `connectivityStore.droppedStores`. The **only** UI consumer of `droppedStores` was the OfflineBanner — unmounted in `4895b07d`. The dropped op leaves the queue, so `pendingChanges = 0` and the header `ProofSyncIndicator` renders **"All synced" + CloudCheck** while a write was silently lost. `/conflicts` covers record conflicts, not dropped ops. Same hole swallows versioned-blob 409s (friction #16/#26/#27).
**Proposed fix:** teach `ProofSyncIndicator` to read `droppedStores` → persistent error pill linking to `/conflicts` (extended with a dropped-ops section), fix the toast copy, and/or remount the preserved OfflineBanner. Operator previously chose unmount via AskUserQuestion, so the indicator route is the one that respects that decision.

### H3 — Demo onboarding tour stranded post-#60 (latent; trip-wire)
The `demo` branch tip today (`c1f86acb`) has **no** `SEED_SAMPLES` gate → the prepared demo refresh is **safe to push today**. The break arms on the **first demo refresh after PR #60 merges**: the clean-slate gate (projectStore.ts:1289, default OFF) blocks all builtin seeds → `maybeCloneBuiltinsForDemo` bails forever (demoSession.ts:236) → no homestead clone → the guest tour auto-opens against a nonexistent `HOMESTEAD_SAMPLE_PROJECT_ID` → empty portfolio + hollow 9-step tour.
**Proposed fix:** set `FEATURE_SEED_SAMPLES=true` in the demo-offline build environment, **or** code-level: seed gate passes when `FEATURE_DEMO_OFFLINE` is on. Runbook carries the trip-wire (§7).

### H4 — Local project id sent to server-id APIs (export/publish 404)
Portfolio navigates with the **local** id (`PortfolioProjectList.tsx` → `onSelect(p.id)`), which is `crypto.randomUUID()` — distinct from `serverId` by construction (`applyBuiltinsToStore`, projectStore.ts:~1684). `ReportPage.tsx:63/:88` passes `params.projectId` straight into `api.exports.generate` / `api.portal.publishReport` → **404 with a misleading error toast for every synced project reached by normal navigation**. Same defect in ~10 siblings: CapitalPartnerSummaryExport.tsx:181, EducationalBookletExport.tsx:58, ReportingPanel.tsx:397, and 7 Observe dashboards.
**Proposed fix:** shared `resolveServerProjectId` helper (route param → `project.serverId ?? null`); export/publish controls disable with an honest "not yet synced" state when null. Cross-cutting, one PR.

### H5 — Fabricated demo tasks seeded into real projects
`seedActionsIfEmpty(projectId, isMtc)` (seedDemoActions.ts:60–129) is **ungated** — no `FLAGS` check, no builtin check — and fires from three unconditional mount effects (ActTierShell.tsx:306, ActOpsHubMapPanel.tsx:105, ViewBDashboard.tsx:64). Any real project with zero field actions gets 5 fabricated tasks driven through `markStarted/markSubmitted/markVerified` — **including fake `verified` statuses** — persisted and sync-transported. Fabricated "verified" work records in a real project are also an integrity problem in Amanah terms (false testimony of completed work).
**Proposed fix:** gate on builtin/demo-clone provenance (or `FLAGS.SEED_SAMPLES`); never write `verified` statuses outside authored demo content.

### H6 — Silent dead-click on locked objectives in the hub
`act/ops/$objectiveId`'s `beforeLoad` redirects locked objectives back to the bare hub (routes/index.tsx:959–971) with **zero user feedback** — clicking a locked task row or map pin appears to do nothing. Mechanism verified firsthand; the hub renders locked pins/rows as ordinary click targets (finder evidence, ActOpsHubTaskList.tsx / hub map pins).
**Proposed fix:** either de-emphasize + disable locked targets in the hub (matching the tier-shell rail idiom) or surface a toast/inline notice on the redirect.

---

## 2. Amanah-class findings — awaiting operator direction [Amanah]

Firsthand-confirmed: the covenant lint exists in **three divergent copies**, none complete, and one documented gate does not exist.

| Site | Has | Missing |
|---|---|---|
| `realityCheckModel.ts` `CSA_LIKE` (:360–395) — also inherited by `captureSampleSeed.ts:67` via `detectCsaLikeText` | subscription, presale/pre-sale, advance-sale, csa, csra, yield-share | **salam**, **advance-purchase** |
| `seededRecipes.conformance.test.ts` FORBIDDEN (:265–274) | salam, riba, investor, community-supported, advance-purchase | **bare CSA**, subscription, presale, yield-share |
| `catalogues.test.ts` banned regex (:252, :352) | salam, bare \bcsa\b, subscription, presale, yield-share | **advance-purchase**, riba, investor |

- **A4:** `authoredSampleSeed.ts:1–45` claims the transcribed sample is "visible to the Amanah lint" — **no static lint scans `AUTHORED_SAMPLE_SEED`**. The capture-time gate is real (`detectCsaLikeText` + `assertCoherenceSealed` in captureSampleSeed.ts) but inherits CSA_LIKE's salam/advance-purchase gap.

**Proposed remediation (single PR, Scholar-Council-reviewable):** one shared banned-term constant in `packages/shared` — the **union** of all three sets — with a two-tier structure: hard-ban terms vs. conditional terms. Bare "CSA" stays **conditional**, honoring the standing ruling that verbatim CSA refs with an Amanah scopeNote are to be encoded, never silently omitted (feedback_csa_in_catalogues). All four sites (CSA_LIKE, recipe FORBIDDEN, catalogue regex, plus a new static scan over `AUTHORED_SAMPLE_SEED` — or a corrected doc claim) consume the shared constant. Wording of any new banned terms to be confirmed by the operator before merge.

---

## 3. Fixed this pass

**Pre-compaction slices (Phase 4, now pushed by operator):**
`6e861842` build fix (clean-slate gate deps) · `56107fc1` render.yaml B1/B3 (rate-limit envVars + honest demo-mode comment) · `a85a20ba` launch configs · `8fc5e6f2` completion-paths regen (2029→2042, no-path 0) + stratum-1 generator · `0ccb6e56` projectStore WIP-leak drop.

**Pass-3 remediation (this session, unpushed):**
- **3.B `6335d5eb` (infra pins):** config.ts names render.yaml as its deploy-time rate-limit mirror; `SAMPLE_SEED_PROJECT_ID` marked immutable-once-captured.
- **3.C `910f5b98` (a11y/label/tests):** `ActTaskWalkthrough` aria-modal drawer wired to `useFocusTrap` (initial focus, Tab wrap, Escape, focus restore) — closes friction #5/#10; `KeyDocumentBriefPopup` stratum group labels → real `<h4>` + sr-only "objectives" on the tally — closes friction #40 / a11y candidate; `ActShellToggle` "Tier shell" → "Stratum shell" (code id kept) — closes friction #43 / content #7; **F1 residual closed**: members op-roles PATCH gains 403 (designer→other member) + 200 self-service tests; projects role-defs gains team_member 403. Gates: web tsc clean, vitest forks 29/29 + api 5/5 + 12/12.
- **3.D `977d1943` (hygiene):** stale OfflineBanner comments dropped (WorkConflictSection + test — content #12, friction #32 partial); SyncConflictsPage "how you got here" copy; conflictsRoute comment un-garbled; BoundaryCapture NOT-CURRENTLY-MOUNTED header (no-deletion rule); **stratum1-objectives.md regenerated** (content #10 — was stale: 3 universal, pre-restructure U-S1.1; now 4 incl. U-S1.4).

---

## 4. MEDIUM cluster — confirmed or finder-evidenced, not yet fixed

Firsthand-confirmed (✓) or carrying finder file:line evidence (○), deferred to follow-up work rather than swept into this audit:

- ✓ **#13** Always-surface safety valve not wired into the default shell (ActOpsHub) — the role layer's "never hide" guarantee only holds on the tier shell.
- ○ **#14** `ActWorkCategoryGrid` renders a bare "+N more" tile when the viewer's focus intersects no present domain (Pass-2 rail fix not ported).
- ○ **#15** ActMapFirstLayout mounts RoleFocusControl above a scope-ignoring `ActOpsDashboard` (docblock claims otherwise).
- ✓ **#16/#26/#27** Blob-409/dropped-op toasts point at removed surfaces (folded into H2).
- ✓ **#17** `/conflicts` unreachable from any nav — remaining entry points are toasts + WorkConflictSection only.
- ✓ **#18** Clean-slate first-run lands on legacy `/home` "Welcome to OGDEN" instead of the forward-IA Portfolio.
- ○ **#19** Act lock guard reads progress under the raw URL param while accepting serverId aliases — serverId deep-links falsely evaluate locked (compounds H4/H6).
- ○ **#20** "Open work schedule" in the walkthrough navigates to a tier-shell URL that renders the ops-hub (default shell), which never reads `?panel` — dead end. Same family: **#24** Plan "Review in Act" deep-links, **#25** Threshold-3 Begin-Act lands on a mandate-unaware ActOpsHub (the Act-side Mandate Briefing never appears on the default shell).
- ○ **#21** Unknown project URLs render the phantom "Moontrance Creek" (MTC_SEED fallback) instead of not-found; walkthrough writes orphan data under `mtc`.
- ○ **#22** Recipe stepper focus loss on Back/Next disable; steps unannounced. **#23** hub quick-find listbox misuse.
- ○ **#28** Zero route-level code splitting on the authed app (single eager chunk incl. maplibre/turf/catalogues).
- ○ Content **#1** food-preserving recipe arms the Water-storage tool; **#8** duplicate bucket names in ops-hub task list; **#9/#16/#20** raw tool ids / enum values leak as user-visible chips; **#11** excluded axe rules anchored to an F4 suite that contains no axe pass; **#13** toast copy (folded into H2); **#14/#19** stale "login currently broken" comments in bootAuthed; **#17** documented `FEATURE_SEED_AUTHORED_SAMPLE` handoff flip can't reach the Render build (no Dockerfile ARG); **#2/#3/#33** env-docs drift (MAPTILER_KEY, `.env.example` vs Vite reality, missing flags).

## 5. LOW / noted-only

Friction #11/#38 WeatherStrip noop buttons · #29 ActDataLayers markers not dimmed under scope · #30 recipe map-steps behind scrim · #31 persistence keyed raw-param vs project.id divergence · #33 offline+empty queue shows "All synced" (folds into H2) · #34/#42 HeaderProjectSelector perpetual "Loading" for zero-project users · #35 field-action route lacks the lock guard its siblings have · #36/#12 `?taskId` validated but never produced/consumed · #37 walkthrough close uses push (Back reopens) · #39 ActShellToggle radiogroup without roving tabindex · #41 unlabeled div map pins · #44 `/uploads/*` unauthenticated + prefix-match traversal guard without trailing separator · #45 retired seeders ship in the prod boot graph (~180 KB dead fixture code + window wipe handles) · content #18 six defined-but-unconsumed flags · #21 "Operations" vs "Operations Hub" naming · #22 retired label in checklist json · #31 docs relative-link breakage.

---

## 6. Deferral-ledger reconciliation

| Item | Status |
|---|---|
| F1 (migration-055 authz tests) | **CLOSED this pass** — both endpoints now covered (3.C). Migration 055 itself remains pgtest-only. |
| F2 RingRadiiFields suite | CLOSED (verified on disk) |
| F3 axe-core integration | CLOSED (a11y.ts + two suites + deferrals register) — but see content #11: excluded-rule anchor drifted |
| F4 e2e offline-demo smoke | CLOSED (playwright suite, all three chip scopes) |
| F5 bundle budget guard | CLOSED (check-bundle-budget.mjs, locked ceiling) |
| F16 boundary doc-attach stub | **Still an accepted deferral** — honestly labeled "coming soon" |
| state-4 zone-ring server sync | Deferred by design (unchanged) |
| render.yaml B1/B3 | **Committed (`56107fc1`) and pushed** |
| A11Y_DEFERRALS.md | Still accurate (single row matches live override) |
| FEATURE_DEMO_MODE guest-account accumulation | Accepted for test launch (Pass-2 decision); revisit before real launch |

Phase-F chips from Pass 2: F2–F5 closable, F1 now closable — **chip ids are not persisted across app restarts, so dismissal is manual** (operator-side).

---

## 7. Demo refresh runbook (push = operator-only)

Local `demo` is fast-forwarded to `c1f86acb` (== remote `main`); the keyless offline-demo bundle **builds green** locally. To deploy: `git push origin demo:demo`.

> **TRIP-WIRE (H3):** This refresh is safe **today**. After PR #60 merges to main, the clean-slate `SEED_SAMPLES` gate reaches the demo lineage — the **next** refresh after that will strand the guest tour (empty portfolio, hollow tour) unless one of these ships first:
> 1. `FEATURE_SEED_SAMPLES=true` in the demo-offline build env, **or**
> 2. code change: builtin seeding also allowed when `FEATURE_DEMO_OFFLINE` is on.

**PR #60 status:** heal commits through `0ccb6e56` are now on `origin/fix/operational-role-layer` (pushed operator-side 2026-07-03); the three Pass-3 commits (`6335d5eb`, `910f5b98`, `977d1943`) remain **local/unpushed** per the zero-push rule.

---

## 8. Repo hygiene — operator action items

1. **Git-dir strays (classifier-blocked; needs operator hands):** a full working-tree copy sits **inside the submodule git dir** `\.git\modules\atlas` (ATLAS_DEEP_AUDIT*.md, CNAME, LOCAL_SETUP.md, README.md, COMMIT_EDITMSG_slice54, package.json, pnpm-*, tsconfig.base.json, turbo.json, `apps/ packages/ scripts/ design-system/ infrastructure/ wiki/ graphify-out/`). Every stray is duplicated in the object DB; a lossless backup exists at the session scratchpad: `gitdir-strays-backup-2026-07-03.tar.gz` (2,386,696 bytes). The automated deletion was **denied by the safety classifier** (deleting inside a `.git` dir), so it was not retried. Ready-to-run cleanup (Git Bash), after your own review:
   ```bash
   cd "/c/Users/MY OWN AXIS/Documents/MAQASID OS - V2.1/.git/modules/atlas" && \
   rm -rf ATLAS_DEEP_AUDIT.md ATLAS_DEEP_AUDIT_2026-04-19.md ATLAS_DEEP_AUDIT_2026-04-21.md \
     CNAME LOCAL_SETUP.md README.md COMMIT_EDITMSG_slice54 package.json pnpm-lock.yaml \
     pnpm-workspace.yaml tsconfig.base.json turbo.json apps packages scripts \
     design-system infrastructure wiki graphify-out && git worktree prune
   ```
2. **51 live git worktrees** registered on this repo — review and prune stale ones (`git worktree list`).
3. **Foreign WIP left untouched:** `apps/web/src/v3/act/tier-shell/DecisionList.module.css` carries an uncommitted background swap (`--color-surface-raised` → `--color-bg` dark) from a parallel session — deliberately **not** included in any audit commit.

---

## 9. Disclosures & limitations

- **No preview verification** of the UI fixes: browser preview hangs deterministically on v3 mounts on this machine (known); fixes are pinned by web tsc (clean) + bounded vitest (29/29 web, 17/17 api across touched suites) instead.
- `prerender:showcase` was **not** run locally this pass.
- Findings marked ○ in §4/§5 carry adversarially-screened finder evidence but were not independently re-verified line-by-line; treat file:line as a strong lead, not a firsthand verdict.
- Workflow refuter agents partially failed on a session limit mid-Phase-1; the verification burden was carried firsthand in the main context for all HIGH/Amanah items.

---

## Appendix — full kept-candidate index

**Friction sweep (45 kept):** H-cluster: 1 (dead-click, →H6), 2 (roster, →H1), 3 (sync, →H2), 4+6 (tour, →H3), 5+10 (walkthrough a11y, **FIXED 3.C**), 7 (serverId, →H4), 8+9 (fabricated seeds, →H5). Mediums 11–28 and lows 29–45 as classified in §4/§5 (32 stale comments **FIXED 3.D**, 40 brief-popup headings **FIXED 3.C**, 43 shell label **FIXED 3.C**).

**Content sweep (33 kept):** Amanah: 4, 5, 6, 15 (→§2). Fixed: 7 (label, 3.C), 10 (stratum1 regen, 3.D), 12 (stale comments, 3.D), 32 (sentinel pin, 3.B), 23 (F1 tests, 3.C). Ledger confirmations: 24–30 (§6). Remaining mediums/lows: 1–3, 8–9, 11, 13–14, 16–22, 31, 33 (§4/§5).
