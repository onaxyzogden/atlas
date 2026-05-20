# 2026-05-09 — CSRA / investor-language erasure (Phase 1 of pre-test friction-audit)


Closed Phase 1 of the [pre-test friction audit](../../../.claude/plans/before-we-proceed-with-mutable-beaver.md). Renamed every operator-visible "investor" / "CSRA" / "advance-purchase" / "member-share" surface in `apps/web`, `apps/api`, `packages/shared`, and project docs to **"capital partner"** under the permitted-channel framing established 2026-05-04 in the global covenant ([`~/.claude/CLAUDE.md`]). No deletion — every existing surface was renamed and reframed in place. Decision recorded in [decisions/2026-05-09-atlas-csra-erasure.md](decisions/2026-05-09-atlas-csra-erasure.md).

### Why now

The CSRA model was struck on **2026-05-04** on Islamic fiqh grounds — *bayʿ mā laysa ʿindak* (Islam does not permit the sale of what one does not yet possess). The pre-test audit found ~56 file occurrences still carrying the legacy framing across UI copy, type enums, manifest entries, schema docs, comments, and PDF templates. These were live and reachable from the dashboard, the presentation deck, the public portal, and the export sidebar — i.e. they would have shipped to the operator's first capital-partner walkthrough under the wrong framing.

### Surface-level changes

- **Export pipeline** — `InvestorSummaryExport.tsx` → `CapitalPartnerSummaryExport.tsx`; sidebar + router imports updated; new SQL migration `023_rename_investor_summary_to_capital_partner_summary.sql` (migration `010_ai_outputs.sql` left untouched per append-only convention).
- **Path-mode preset** — `Mode` enum `'investor'` → `'capital_partner'`; label "Investor presentation" → "Capital partner presentation"; `INVESTOR_*` constants renamed to `CAPITAL_PARTNER_*`.
- **Partnership card** — `LandownerPartnershipCard.tsx` `Side` type, bar/pill/legend/aria copy reframed; CSS class `.barInvestor` → `.barCapitalPartner`, selector `[data-side='investor']` → `[data-side='capital_partner']`.
- **Stakeholder portal** — `AUDIENCES.csra` → `AUDIENCES.capital_partner` with the framing "Charitable donor, qarḍ-ḥasan lender, sponsor, or in-kind contributor with financial or material standing in the project."
- **Presentation deck Slide 7 ("The Ask")** — rewritten to permitted-channel framing.
- **`csraSuitability` → `communitySuitability`** in `HydrologyRightPanel` + `computeScores` (the metric measures community demographics, not capital-partner readiness — aligns with the existing scoring section name in `computeCommunitySuitability`).
- **Manifest, taxonomy, landing copy, JSDoc, comments, CONTEXT.md** for `economic-modeling`, `timeline-phasing`, `reporting-export`, plus `docs/ui-ux-upgrade-brief.md` — all reframed.

### Deliberately not touched

- Audit / historical artifacts (`ATLAS_DEEP_AUDIT*.md`, `design-system/.../accessibility-audit.md`, `graphify-out/*`) — frozen records of past state; rewriting them would falsify the audit trail.
- `migrations/010_ai_outputs.sql` — append-only history; migration 023 documents the rename forward.
- `services/pdf/templates/capitalPartnerSummary.ts:237` — phrase "not as a return on advance purchase" is the *covenant statement itself*, not a CSRA usage.

### Memory

Updated `~/.claude/projects/.../memory/user_profile.md` — replaced the stale "Preferred term … CSRA" line with the post-2026-05-04 vocabulary block (capital partners & allies; permitted channels: charitable donation, restricted donation, qarḍ ḥasan, in-kind, sponsorship; future post-acquisition yield-share contemplated only as a membership benefit subject to Scholar Council review).

### Verification

- `grep -rEi "investor|CSRA|advance purchase|member share"` across `apps/web/src`, `apps/api/src`, `packages/shared/src` — only legitimate residuals remain (migration 023, append-only migration 010, and the fiqh disclaimer line).
- `pnpm tsc --noEmit -p apps/web/tsconfig.json` — clean (exit 0).
- `pnpm tsc --noEmit -p apps/api/tsconfig.json` — clean.
- `pnpm tsc --noEmit -p packages/shared/tsconfig.json` — clean.

### Follow-ups (Phase 2–4 of the audit, separate sessions)

- **Phase 2 (P1 coherence)** — manifest truth-up §10/§15/§22/§23; finish inline-edit + drag generalization to water + guild; archive `apps/atlas-ui` out of `pnpm-workspace.yaml`.
- **Phase 3 (P2 a11y)** — replace 10 native `title=` sites with `<DelayedTooltip>`; add focus-trap to `SlideUpPanel` + `RailPanelShell`.
- **Phase 4 (P2 content)** — source-backfill the 128 null-citation rows in `regionalCosts/US_MIDWEST.ts` and `CA_ONTARIO.ts`.
