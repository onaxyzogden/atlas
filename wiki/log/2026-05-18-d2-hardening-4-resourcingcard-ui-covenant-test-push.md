# 2026-05-18 — D2 hardening §4: ResourcingCard UI covenant test + push


**Branch.** `feat/atlas-permaculture`. Pushed `d99b0620..ffbdf987`
(`ffbdf987`), divergence `0 0`.

Closes the last unpinned D2 hardening item from the D2 spec
([[../superpowers/specs/2026-05-18-d2-resourcing-design]])
§"Targeted hardening" #4: a new happy-dom render test
`apps/web/src/features/act/__tests__/ResourcingCard.test.tsx` (3 cases) —
the card mounts without throwing, badges over-capacity for a seeded
over-cap crew member, and asserts **no cost/currency string** in the
rendered DOM (the covenant boundary now pinned at the UI layer, not only
the engine; "Budget" excluded from the forbidden set — the lede's D3
pointer is not a cost value). Engine hardening §1–3 was committed
out-of-band as `f56e4c92` (identical content; this session's `git add` of
that path was a clean no-op). All D2 suites green: shared
`resourcingConflicts` 13/13, apps/web D2 group 11/11; `@ogden/shared`
tsc exit 0. Earlier this session the divergence (local +10 / remote +3,
duplicate syncManifest work) was resolved by an out-of-band rebase to
`249dad54`; both subsequent commits fast-forwarded. Covenant/scope
unchanged; D3 untouched. Explicit-path staging only.
