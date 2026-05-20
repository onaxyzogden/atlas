# 2026-05-10 — Module 7 sizing slice: shared per-project inputs


**Motive.** Audit of the three Product Chain diagnostic cards
(`SlaughterThroughputCard`, `ColdChainCoverageCard`,
`MarketDistributionCard`) surfaced two real gaps. (1) Card inputs lived
in `useState` and reset whenever the slide-up closed — nothing tuned
persisted. (2) Each card held its own copy of op-size inputs, so a
steward bumping Annual head in the throughput card left the other two
cards silently showing the old peak-week pack number.

**Change.** Added `AgribusinessSizing` interface + `sizingByProject`
slice + `getSizing` / `setSizing` actions to `agribusinessStore.ts`.
Persist version 1 → 2. All three cards rewired:

- Throughput card writes annualHead / dressedKg / processingDays through
  to `setSizing`.
- Cold-chain card derives peak-week pack from sizing (`(head × kg) ÷
  (days/5)`) and shows it as a read-only "(from sizing)" field; pack
  density becomes the only editable knob and writes through.
- Market card derives weekly product from sizing (same formula);
  detour multiplier + avg speed write through.

**Verification.** `npm run typecheck` clean. Preview eval round-trip:
Annual head set to 5000 in card 1 → Cold-chain peak-week pack shows
`1125 (from sizing)`, Market weekly product shows `1125 (from sizing)`.
`5000 × 1.8 ÷ (40/5) = 1125` — matches.

**Decision record.** Addendum appended to
[wiki/decisions/2026-05-10-atlas-plan-module7-broiler-product-map.md](decisions/2026-05-10-atlas-plan-module7-broiler-product-map.md).
