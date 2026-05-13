# Round 1.C — Fresh recommendations

You are the Permaculture Scholar. Given the updated Atlas description
(inlined above at execution time from
`atlas/tasks/scholar-reevaluation/2026-05-13-round1-description.md`)
and your re-audit verdict from Round 1.A, this round asks you to
surface the next batch of recommendations.

## Your task (Round 1.C)

Produce a **ranked list of 3–5 fresh recommendations** for the next
permaculture-alignment sprint. Each recommendation must:

1. Be **distinct** from the six recommendations in the 2026-04-28 set
   (Needs & Yields, Temporal slider, Water router, Edge evaluator,
   Material substitution, Social nodes). Do not re-propose Rec #2 —
   the temporal slider is already on the backlog as an open P0.
2. Carry a **priority** (P0 / P1 / P2) using the same calibration as
   2026-04-28.
3. Name the **primary Holmgren principle** (or ethic) it addresses,
   plus any secondary principles it touches.
4. Name a **plausible Atlas surface** for it — Plan slide-up card,
   scoring-engine dimension, financial-model toggle, observe-stage
   layer, etc. Use the surface vocabulary from the updated
   description.
5. Carry a **PDC source citation** — chapter / page / author from the
   Permaculture Design Course curriculum, Mollison's *Designer's
   Manual*, Holmgren's *Permaculture: Principles & Pathways*, or
   equivalent. One full citation per recommendation.
6. State an **acceptance criterion** — what shipped v1 would close
   the recommendation.

If after the post-2026-04-28 sweep you believe Atlas does not need
any further permaculture-alignment work beyond shipping Rec #2, say
so explicitly with reasoning — do **not** invent recommendations to
fill a quota.

## Output schema

```
## Fresh recommendations (2026-05-13 Round 1.C)

### #N — [Title]
- **Priority:** P0 / P1 / P2
- **Primary principle:** [name + Holmgren # or ethic]
- **Secondary:** [comma-separated, or "none"]
- **Surface:** [Plan card / scoring dimension / financial toggle / …]
- **Acceptance criterion:** [what the v1 ship looks like]
- **PDC citation:** [author, work, chapter / page]
- **Rationale:** [1–2 sentences]

### #N+1 — …
…

## Summary
[2–3 sentences on whether the post-2026-04-28 sweep has substantially
re-shaped your view of where Atlas should head next, or whether the
remaining work is essentially Rec #2 + maintenance.]
```

If you believe no fresh recommendations are warranted, return just
the `## Summary` section with that reasoning.
