# 2026-05-10 — Observe inert-CTA second-tier sweep (7 more buttons deleted)


Follow-on to the first inert-CTA pass earlier today. Extended the
single rule ("if a CTA has no live target, delete it") from the
`green-button` primaries to the second-tier outlined/plain buttons
that had been noted as out-of-scope in the prior debrief.

7 buttons removed across 5 files:

- `TerrainDetail` — "Export terrain report" + "Compare layers" (whole
  `terrain-header-actions` wrapper gone).
- `EcologicalDetail` — header "Prioritize" chevron.
- `HydrologyDetail` — "View full report" + "Prioritize" heading
  buttons.
- `SwotDiagnosisReport` — "Export report" + "Share summary" (entire
  topbar `<nav>` removed; no backing export/share pipeline).
- `SwotJournal` — intro paragraph "Learn more" button.

Side cleanup: dropped `Download` + `Share2` + `Plus` from
`SwotDiagnosisReport.tsx`; dropped `Download` from
`TerrainDetail.tsx` (Layers retained — still used in icon mapping).

Explicit non-deletions: `SwotJournal` "Export journal" +
"Send to diagnosis report" stay — labels imply a concrete future
surface; flag for an Export-pipeline session rather than deletion.

Verification: tsc clean.

ADR: appended a "Second-tier sweep" subsection to
[2026-05-10 atlas-observe-inert-cta-audit](decisions/2026-05-10-atlas-observe-inert-cta-audit.md).
