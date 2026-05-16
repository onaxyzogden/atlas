# ADR: 7-Stage Lifecycle Is Being Retired — 3-Item Nav Is the Forward IA

**Date:** 2026-05-16
**Status:** accepted

**Context:**
A `/graphify update` incremental re-extraction of the atlas corpus (graph grew
2,867 → 7,642 nodes) surfaced a top "surprising connection": the node
`3-item nav does not match 7-stage lifecycle` (from
[docs/ux-walkthrough-regen-farm.md](../../docs/ux-walkthrough-regen-farm.md))
is `semantically_similar_to` the
[Atlas Sidebar — Permaculture-Grounded IA Synthesis](../concepts/atlas-sidebar-permaculture.md)
concept page. graphify presented this as an unresolved IA tension. On review,
Yousef stated the resolution directly: **the 7-stage lifecycle is outdated and
will be retired eventually.** The mismatch is therefore an already-decided
deprecation, not an open design question.

**Decision:**
The seven-stage lifecycle axis (Discover/Observe → Diagnose → Design →
Prove/Test → Build → Operate/Steward → Report/Evaluate) is **deprecated**. The
3-item navigation is the forward-looking information architecture. Where the
3-item nav and the 7-stage lifecycle disagree, the 7-stage lifecycle is the
side that gives way — the nav is not to be conformed back to the seven stages.

The [Atlas Sidebar — Permaculture-Grounded IA Synthesis](../concepts/atlas-sidebar-permaculture.md)
concept page is retained as historical context (per wiki no-delete rule) but
its active-spec recommendations (rename 4 of 7 verbs, Steward-as-loop,
grouping the seven into three phases) are **superseded by this ADR** for
forward IA work. The Permaculture-Scholar rationale it captures remains a valid
input for whatever the 3-item nav's permaculture grounding becomes.

**Consequences:**
- Do not treat "the nav doesn't match the 7 stages" as a bug; do not propose
  conforming the nav to the lifecycle.
- 7-stage-lifecycle references in code/docs/wiki are legacy artifacts pending
  cleanup, not a spec to satisfy.
- graphify `query`/`path`/surprising-connections will keep returning 7-stage
  nodes (the source docs were just re-extracted) until the underlying files —
  `docs/ux-walkthrough-regen-farm.md`, the sidebar concept page, and related
  ADRs — are retired or annotated. A follow-up `/graphify update` after those
  files change will clear them.
- The formal cut of the 7-stage lifecycle (route slugs, `LIFECYCLE_STAGES`,
  sidebar component) is a future session; this ADR records the direction so
  intervening work does not invest in the deprecated model.
