# 2026-06-11 — Stratum traceability audit (report-only): S4+ → S1–S3 grounding

**Branch:** main. **Mode:** report-only by operator decision — no source/config/git-index changes; docs only.

## What happened

Operator asked: *does every design and decision from Stratum 4 onwards refer to a design and/or decision made in Stratum 1, 2, and/or 3?* Audited all **226 S4–S7 objectives** (212 across the 14 type catalogues, 10 universal, 4 skeleton) plus the enforcement layer, via three parallel exploration passes with firsthand re-verification of every negative claim. Full report: [STRATUM_TRACEABILITY_AUDIT_2026-06-11.md](../../STRATUM_TRACEABILITY_AUDIT_2026-06-11.md) (repo root, follows the deep-audit convention).

## Verdict

- **Structurally PASS:** every S4+ objective is gated on S1–S3 via the `STRATUM_PREREQS` spine (S4←s3-hydrology/s3-soil; S5←S4; S6←S5; S7←S6, transitively to S1). Zero `[]` opt-outs, zero dangling refs, universal-ids-only invariant holds; enforced by `spineGate.conformance.test.ts` + `buildActLockContext` redirects.
- **Content-level MIXED:** production catalogues (homestead, silvopasture, regenFarm, marketGarden, orchard, livestock, residential, offGrid) explicitly cite the upstream read/decision in S4+ checklist prose or `ckF` formula bindings; **agritourism (~19 of 22)** and **ecovillage (~16 of 20)** objectives lean on the transitive gate alone; conservation/wellness/education are moderate (philosophy gates + named-survey validation cites).
- **feedsInto channel ~unwired in universal.ts:** 31 S2–S3 checklist items declare `feedsInto: []`; strongest gap is `s5-access` (no tether to the S2 infrastructure read or S3 access patterns). The skeleton is the only layer that uses `feedsInto` properly (live as the level-3 legacy fallback only).
- **Amanah constraints DO trace:** S1 CSA/herd-share flags bind `mgd-s4-post-harvest-handling` and `lvs-s7-marketing` verbatim; `orch-sec-s6-harvest-pathway` requires a halal pathway — covenant decisions at the foundation correctly gate commercial decisions downstream ([[feedback-csa-in-catalogues]]).

## Corrections made during verification

Two explorer-agent claims were re-checked firsthand and corrected before publication: conservation is NOT reference-free (4/5 S4 objectives cite the CON-S1.5 intervention philosophy + a blanket S4–S5 philosophy gate), and agritourism/ecovillage are *sparse* (3–4 anchor cites each), not absent.

## Deferred remediation filed (not executed)

1. Wire universal `feedsInto` (S2/S3 reads → S4/S5 consumers) — **operator authoring decision**, the mapping encodes design judgment.
2. Global conformance test: overrides universal-ids-only + every S4+ objective reaches S1 transitively (closes the silent-permanent-lock latent risk for future authoring).
3. Author upstream cites for agritourism/ecovillage/education S5–S7 following the offGrid "Confirm X against Tier-N Y" pattern (source-doc fidelity rules apply).
4. Optional UI: "Informed by" chips from `feedsInto` once #1 lands.

Amanah: read-only audit + documentation — no ethical exposure.
