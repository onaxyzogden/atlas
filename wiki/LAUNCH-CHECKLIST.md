# Launch Checklist — Pre-Commercial Blockers

Canonical list of items that must be resolved before Atlas can be offered as a
paid / commercial product. Items here are accepted-and-deferred, not
oversights — they are tracked to prevent quiet violation at launch.

## Legal

- [ ] **CC BY-NC-SA 3.0 IGO legal review — FAO GAEZ v4 data**
  FAO GAEZ v4 Theme 4 agro-climatic suitability rasters (self-hosted
  Sprint BV, 2026-04-20) are licensed under CC BY-NC-SA 3.0 IGO. The
  **non-commercial** clause is incompatible with any paid SaaS /
  commercial offering. Before launch, Atlas must either:
  (a) negotiate a commercial license directly from FAO,
  (b) remove GAEZ-derived layers from the commercial product,
  (c) isolate GAEZ inside a non-commercial subsystem / free tier,
  or (d) swap GAEZ suitability for an equivalent non-NC data source.
  Source: [wiki/decisions/2026-04-20-gaez-self-hosting.md](decisions/2026-04-20-gaez-self-hosting.md).
  **Sprint CC (2026-04-21) update:** `/api/v1/gaez/raster/*` is now auth-gated
  behind `fastify.authenticate` as defense-in-depth — the raster COG bytes are
  no longer served to anonymous clients. This does **not** resolve the NC
  clause (any logged-in user can still retrieve the bytes; the gate only
  removes the passive-scrape surface). The license decision above remains
  the launch blocker.

## Operational

- [ ] **Caveat-disclosure plumbing across scoring panels.**
  `EcologicalDashboard.tsx:200-250` renders only the first `caveats[]`
  entry; `HydrologyPanel`, `EconomicsPanel`, and `RegulatoryPanel`
  likely mirror this pattern (not audited). Add a "Why this matters"
  collapsed disclosure listing the full `caveats[]` array per scoring
  surface so users see the full reasoning, not just the first caveat.
  Source: [decisions/2026-04-25-pre-flight-audit.md](decisions/2026-04-25-pre-flight-audit.md).

- [ ] **Citation backfill on regional cost rows.**
  `packages/shared/src/regionalCosts/US_MIDWEST.ts` and
  `regionalCosts/CA_ONTARIO.ts` carry ~10 rows each with
  `citation: null, confidence: 'low'` (habitation, food_production,
  commons, spiritual, education, retreat, water_retention,
  infrastructure zones, plus `post_rail` fencing). Financial outputs
  that hit these rows are unbacked. Either source citations, hide
  cost outputs whose rows are `confidence: 'low'`, or surface a
  banner. Source:
  [decisions/2026-04-22-regional-cost-dataset.md](decisions/2026-04-22-regional-cost-dataset.md)
  + [decisions/2026-04-25-pre-flight-audit.md](decisions/2026-04-25-pre-flight-audit.md).

- [ ] **Map-overlay chrome migration to `MapControlPopover`.**
  10 overlays still ship hand-rolled `backdropFilter` chrome:
  `AgroforestryOverlay`, `BiodiversityCorridorOverlay`,
  `CrossSectionTool`, `MeasureTools`, `MicroclimateOverlay`,
  `MulchCompostCovercropOverlay`, `RestorationPriorityOverlay`,
  `ViewshedOverlay`, `HistoricalImageryControl`, `OsmVectorOverlay`,
  `SplitScreenCompare`, `WindbreakOverlay`. Migrate to
  `<MapControlPopover variant="panel"|"dropdown">` per
  [decisions/2026-04-24-map-control-popover-and-mapzindex.md](decisions/2026-04-24-map-control-popover-and-mapzindex.md).

- [ ] **`SlideUpPanel` / `RailPanelShell` focus-trap audit.**
  `Modal.tsx` is correct. `SlideUpPanel.tsx` and `RailPanelShell.tsx`
  focus-trap behavior unverified — accessibility blocker for any
  modal-equivalent surface. Add focus trap or document the absence.

## Compliance

_(Future sprints append blockers here.)_

## Post-Protocol Aspirations (Phase E + F follow-ups)

Atlas passes the **Apricot-Lane Validation Protocol at 4/4** as of Phase E
([decisions/2026-05-21-atlas-phase-e-tier2-evidence-and-protocol-rerun.md](decisions/2026-05-21-atlas-phase-e-tier2-evidence-and-protocol-rerun.md)).
The items below are **not pre-commercial blockers** — they are accepted
post-protocol aspirations tracked for transparency. Phase F lands the
first four; the remainder are deferred.

**Landed in Phase F:**

- [x] **Playwright Anti-GIS screenshot pass (F.1).**
  Programmatic Playwright driver at `apps/web/scripts/anti-gis-snapshot.ts`
  boots a 390×844 mobile viewport against the seeded Apricot-Lane fixture,
  asserts Verdict + first Next Best Action are above the fold, and writes
  a PNG to `apps/web/screenshots/anti-gis-apricot-lane.png`. Closes the E
  ADR deferred "Live Playwright Anti-GIS screenshot" item.

- [x] **Per-zone SOM trajectory (F.3).**
  `projectSomTrajectory` + `/api/v1/soil-regeneration/.../som-trajectory`
  now accept an optional `zones[]` payload and `?zoneId=<id>` GET filter
  alongside the existing whole-project rows. Schema (migration 031) already
  supported `(project_id, zone_id, year)`; no new migration. Web consumers
  unchanged in F.3 — UI surfacing of per-zone overlays is deferred.

- [x] **`evidence_audit_log` persistence (F.4).**
  Migration 033 + `POST /api/v1/projects/:id/evidence-audit/log` route
  + client-side SHA-256 hash + fire-and-forget emit hook. Initial
  adoption on `LandVerdictCard` only — every Evidence emission writes a
  row with a hash of its selector inputs. Identical inputs → identical
  hash (reproducibility anchor). Closes the E ADR deferred
  "`evidence_audit` server-side persistence" item.

**Deferred (post-Phase-F):**

- [x] **Roll `emitEvidenceAudit` out to the remaining Evidence panels
  (F.6 + F.7).** Landed across six per-panel commits — DecisionTriad
  (F.6), SiteSummaryNarrativeSection (F.7.1), WaterStorageCard (F.7.2),
  ThreeEthicsRollupCard (F.7.3), WaterRouterCard (F.7.4),
  CapitalPartnerSummaryExport (F.7.5). All 7 live Evidence consumers
  now persist to `evidence_audit_log`; the 8th selector
  (`intelligence-summary`) is orphaned (component decommissioned in
  Phase A.1) and excluded. See
  [[decisions/2026-05-21-atlas-phase-f-evidence-audit-rollout]].

- [ ] **Per-zone SOM trajectory web surfaces.**
  F.3 lands the API; chart overlays + scenario consumers still read
  whole-project rows only. Not gating.

- [x] **Tooltip Evidence retrofit (Phase H).** `HostUnionDrilldownCard`
  (right-click sticky detail card) now composes `<EvidenceSection>` and
  persists every distinct host-union snapshot to `evidence_audit_log`
  via a new 9th `PanelKey` `'host-canopy-union'`. The
  `HostCanopyUnionTooltip` hover peek (pointer-events: none) is
  intentionally left Evidence-free — the drilldown is the explicit
  persistent detail surface. ADR:
  [[decisions/2026-05-21-atlas-phase-h-tooltip-evidence-retrofit]].

- [ ] **PDF Evidence surface.** Static PDF lists assumptions truncated
  to 15; expanding requires a second page or a QR link back to the web
  modal.

- [ ] **i18n on Evidence strings.** English-only today; B4 Slice N
  pattern (`*Strings.ts` modules) is available later without redesign.

- [ ] **Per-fragment confidence ranges (low/mid/high band).**
  Evidence fragments use a single `confidence: 'low' | 'medium' | 'high'`
  pill; range-band variants would mirror D.7's `CostRange`.

- [x] **Server-side replay tool for `evidence_audit_log` (Phase G).**
  Given a `--all-since <ISO>` window, recompute every row's selector
  and assert byte-identical output against the stored `evidence_output`,
  and recompute `hashInputs(input_payload)` against the stored
  `input_hash`. Three failure modes caught: selector drift,
  hash-function drift, schema drift. Durability sweep, not gating.
  Landed: G.1 promoted selectors to `packages/shared/evidence`; G.2
  shipped `replayEvidenceAuditSince` + the `evidence:replay` CLI; G.3
  added a self-cleaning pgtest. See
  [[decisions/2026-05-21-atlas-phase-g-evidence-audit-replay]].

- [ ] **Playwright CI integration.** F.1 is a manual `pnpm` script;
  wiring it into CI requires a logged-in `storageState` fixture managed
  in the CI secret store.

