# 2026-05-16 — `/graphify update` re-extraction + 7-stage-lifecycle retirement ADR


**Branch.** `feat/atlas-permaculture`.

**What.** Ran graphify's incremental pipeline (`/graphify update`) over
the atlas corpus. Hash-diff vs. `graphify-out/manifest.json` (last build
2026-04-21) re-extracted everything changed since then — far broader
than `git status` (commits + working tree since April). Full scope
(code + docs + images) per the approved plan.

- Graph grew **2,867 → 7,642 nodes**, **3,812 → 8,182 edges**,
  **1,880 communities**. AST extraction was free/deterministic; semantic
  subagents covered changed docs/images (token cost recorded as a
  rounded estimate — `tokens_estimated: true` — in `cost.json` run 3,
  since subagents do not self-report).
- Labelled the **top 60 communities** by size + god/surprise reference;
  the 1,820 long-tail communities remain `Community N` (pragmatic stop).
- `graph.html` regenerated on a **filtered subgraph** (dropped 957
  `public/cesium` vendor nodes, then capped to top 4,800 by degree)
  because the full 7,642 exceeds graphify's `MAX_NODES_FOR_VIZ = 5000`;
  `graph.json` retains all 7,642 nodes / 8,182 edges for GraphRAG.
- Regenerated `GRAPH_REPORT.md` (94% EXTRACTED / 6% INFERRED / 0%
  AMBIGUOUS). Keystone nodes: `fetchWithRetry()` (65 edges),
  `fetchAllLayersInternal()` (42), `panel.module.css .container` (40).
  Knowledge gaps: 347 isolated nodes (deferred Phase 2/3/4, Adapter
  Registry, MapboxGL engine).
- **Top surprising connection** flagged an IA tension:
  `3-item nav does not match 7-stage lifecycle`
  (`docs/ux-walkthrough-regen-farm.md`) `semantically_similar_to` the
  *Atlas Sidebar — Permaculture-Grounded IA* concept page. Yousef
  resolved it directly: the **seven-stage lifecycle is deprecated**; the
  3-item nav is the forward IA and is not to be conformed back to the
  seven stages. Recorded as an ADR; the sidebar concept page got a
  deprecation callout and an `index.md` annotation (page retained per
  no-delete rule, recommendations superseded for forward work).

See `decisions/2026-05-16-atlas-7-stage-lifecycle-retirement.md`.

**Verification.** `GRAPH_REPORT.md` header date = 2026-05-16; node/edge
counts moved off the 2,867/3,812 baseline; `cost.json` gained a 3rd run
entry; `manifest.json` tracks the full 2,583-file corpus; `graph.html`
renders the filtered graph. Extraction yielded >0 nodes (no hard stop).

**Not committed.** Per the standing precedent, the concurrent in-progress
out-of-band working-tree files (livestock cards / zones / concentric /
autoDesign / zonesOverlay / zoneSizeGuide and friends) remain
uncommitted — only the `graphify-out/` deliverables and the four wiki
pages (this entry, the new ADR, the deprecated sidebar concept, the
updated index) were staged this session. `.graphify_old.json` (6 MB
ephemeral merge backup) and `graphify-out/cache/*` are deliberately
excluded.
