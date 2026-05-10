# Atlas — CSRA / investor-language erasure

**Date:** 2026-05-09
**Branch:** feat/atlas-permaculture
**Status:** Implemented (Phase 1 of pre-test friction-audit remediation)

## Decision

Erase all surviving "investor" / "CSRA" / "advance-purchase" / "member
share" framing from the Atlas (OLOS) codebase. Rename the operator-
visible export, the path-mode preset, the partnership card, and the
stakeholder-portal audience to **"capital partner"** under the
permitted-channel framing established in the global covenant
([`~/.claude/CLAUDE.md`]). No deletion — every existing surface is
renamed and reframed in place.

## Why

The CSRA model was struck on **2026-05-04** on Islamic fiqh grounds —
*bayʿ mā laysa ʿindak* (Islam does not permit the sale of what one does
not yet possess). Every framing that treated capital contributors as
"members buying advance shares of future yield" — Community-Supported
Regenerative Agriculture, investor presentations, member-share
language — is forbidden in operator-facing surfaces.

The Atlas pre-test friction audit
([before-we-proceed-with-mutable-beaver.md] plan, 2026-05-09) found
~56 file occurrences still carrying the legacy framing across UI
copy, type enums, manifest entries, schema docs, comments, and PDF
templates. These were live and reachable from the dashboard, the
presentation deck, the public portal, and the export sidebar — i.e.
they would have shipped to the operator's first capital-partner
walkthrough under the wrong framing.

## Permitted vocabulary (post-2026-05-04)

| Use | Permitted |
|---|---|
| Public-facing label for capital contributors | "capital partners & allies" |
| Capital channels | charitable donation · restricted donation · qarḍ ḥasan (interest-free loan) · in-kind contribution · sponsorship |
| Future post-acquisition yield share | "membership benefit" only — entitlement-of-belonging, not a return on advance purchase. Subject to fresh design under Scholar Council review when the corpus exists. |

| Use | Forbidden |
|---|---|
| "investor" / "investor presentation" / "investor summary" | use "capital partner" |
| "CSRA" / "Community-Supported Regenerative Agriculture" | use "community-rooted regenerative agriculture" (descriptive only, no advance-purchase implication) |
| "advance purchase" / "member share" / "salam-style" | not permitted in any form |

## Scope of the rename pass

All edits made under this decision (commit batch 2026-05-09):

### apps/web — operator-visible UI
- `features/export/InvestorSummaryExport.tsx` →
  `features/export/CapitalPartnerSummaryExport.tsx` (rename + copy
  rewrite); imports updated in
  `components/DashboardRouter.tsx` and `components/DashboardSidebar.tsx`.
- `features/dashboard/pages/PathModesCard.tsx` — `Mode` enum
  `'investor'` → `'capital_partner'`; label "Investor presentation"
  → "Capital partner presentation"; `INVESTOR_*` constants → `CAPITAL_PARTNER_*`.
- `features/economics/LandownerPartnershipCard.tsx` — `Side` type
  `'investor'` → `'capital_partner'`; bar / pill / legend / aria
  copy reframed; CSS class `.barInvestor` → `.barCapitalPartner`,
  selector `[data-side='investor']` → `[data-side='capital_partner']`.
- `features/portal/StakeholderReviewModeCard.tsx` — `AUDIENCES.csra`
  → `AUDIENCES.capital_partner` with framing "Charitable donor,
  qarḍ-ḥasan lender, sponsor, or in-kind contributor with financial
  or material standing in the project." Default audience updated.
- `features/portal/ServiceStewardshipFramingCard.tsx` — UI prompt
  reframed.
- `features/dashboard/pages/CartographicStylePresetsCard.tsx` —
  preset audience strings reframed.
- `features/collaboration/PresentationDeckCard.tsx` — Slide 7 ("The
  Ask") rewritten to permitted-channel framing (no investor
  language).
- `features/ai-design-support/DesignBriefPitchCard.tsx` — card id
  + description reframed away from "investor-facing pitch."
- `features/landing/sections/HeroBoxBreak.tsx` — landing copy
  "CSRA operators" → "regenerative-ag operators".
- `features/navigation/taxonomy.ts` — desc string reframed.
- `features/dashboard/pages/PhasingDashboard.tsx`,
  `features/economics/EconomicsPanel.tsx`,
  `features/land-os/AdaptiveDecisionRail.tsx` — comments / placeholder
  body strings reframed.
- `components/panels/HydrologyRightPanel.tsx` — `csraSuitability`
  → `communitySuitability` (replace_all); the metric measures
  community demographics, not capital-partner readiness, so it
  aligns with the existing scoring section name in
  `computeCommunitySuitability`.
- `lib/formatRange.ts` — JSDoc reference reframed.

### packages/shared
- `featureManifest.ts` — three manifest entries reframed (keys + labels).
- `scoring/computeScores.ts` — comments in `computeCommunitySuitability`.

### apps/api
- `services/pdf/templates/educationalBooklet.ts` — "Community-Supported
  Regenerative Agriculture (CSRA) project" → "community-rooted
  regenerative-agriculture project."
- `services/pdf/templates/capitalPartnerSummary.ts` — explicit fiqh
  disclaimer retained: "not as a return on advance purchase" — this is
  a covenant statement, not a CSRA reference.
- `db/migrations/023_rename_investor_summary_to_capital_partner_summary.sql`
  — new migration. Migration `010_ai_outputs.sql` is left untouched
  per append-only history convention.

### Docs / CONTEXT
- `apps/web/src/features/economic-modeling/CONTEXT.md` (3 reframes).
- `apps/web/src/features/timeline-phasing/CONTEXT.md` (2 reframes).
- `apps/web/src/features/reporting-export/CONTEXT.md` (2 reframes).
- `docs/ui-ux-upgrade-brief.md` — persona + Stage 5 line reframed.

### Memory
- `~/.claude/projects/.../memory/user_profile.md` — the stale
  "Preferred term … CSRA" line replaced with the post-2026-05-04
  vocabulary block.

## What was deliberately not touched

- **Audit / historical artifacts** — `ATLAS_DEEP_AUDIT*.md`,
  `design-system/.../accessibility-audit.md`, `graphify-out/*`. These
  are frozen records of past state; rewriting them would falsify the
  audit trail.
- **`apps/api/src/db/migrations/010_ai_outputs.sql`** — append-only
  migration history. Migration 023 documents the rename forward.
- **The fiqh disclaimer in `capitalPartnerSummary.ts:237`** — phrase
  "not as a return on advance purchase" is the *covenant statement
  itself*, not a CSRA usage.

## Verification

- `grep -rEi "investor|CSRA|advance purchase|member share"` across
  `apps/web/src`, `apps/api/src`, `packages/shared/src` — only legitimate
  residuals remain (migration 023, append-only migration 010, and the
  fiqh disclaimer line).
- `pnpm tsc --noEmit -p apps/web/tsconfig.json` — clean.
- `pnpm tsc --noEmit -p apps/api/tsconfig.json` — clean.
- `pnpm tsc --noEmit -p packages/shared/tsconfig.json` — clean.

## Follow-ups (this ADR closes Phase 1 only)

The audit plan ([before-we-proceed-with-mutable-beaver.md]) has three
remaining phases — they do not block this rename and are tracked
separately:

- **Phase 2 (P1 coherence)** — manifest truth-up §10/§15/§22/§23;
  finish inline-edit + drag generalization to water + guild; archive
  `apps/atlas-ui` out of `pnpm-workspace.yaml`.
- **Phase 3 (P2 a11y)** — replace 10 native `title=` sites with
  `<DelayedTooltip>`; add focus-trap to `SlideUpPanel` +
  `RailPanelShell`.
- **Phase 4 (P2 content)** — source-backfill the 128 null-citation
  rows in `regionalCosts/US_MIDWEST.ts` and `CA_ONTARIO.ts`.

## References

- Global covenant clause:
  `~/.claude/CLAUDE.md` — "CSRA model erased 2026-05-04 on fiqh grounds"
- Audit plan:
  `~/.claude/plans/before-we-proceed-with-mutable-beaver.md`
- Companion migration:
  `apps/api/src/db/migrations/023_rename_investor_summary_to_capital_partner_summary.sql`
