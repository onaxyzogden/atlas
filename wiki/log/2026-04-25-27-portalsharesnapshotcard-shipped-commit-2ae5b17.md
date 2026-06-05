# 2026-04-25 — §27 PortalShareSnapshotCard shipped (commit `2ae5b17`)


Steward-side preview card for the public-portal share payload, mounted on
`PortalConfigPanel` between the Visible Sections selector and the Donations
block. Pure derivation from `usePortalStore` plus the active cartographic
preset key in localStorage (`atlas:cartographic-style-preset`, set by §23
CartographicStylePresetsCard) — no portal-store writes, no shared-package
math.

**Renders:** publish state badge + canonical share URL block (slug + token
state), audience-facing payload list (hero/mission/sections/contact),
visible-section chip cluster, data-masking treatment block (full / curated /
minimal with tone-coded copy), branded palette swatch row mirroring the
active cartographic preset, and a copy-share-payload-as-JSON button for
hand-off to PR / press / a board.

**Files (3):**
- `apps/web/src/features/portal/PortalShareSnapshotCard.tsx` (new, 292 lines)
- `apps/web/src/features/portal/PortalShareSnapshotCard.module.css` (new, 285 lines)
- `apps/web/src/features/portal/PortalConfigPanel.tsx` (mount)

Manifest `public-landing-page` (§27) had already been flipped `partial → done`
in the prior parallel-session commit window; no manifest delta in this commit.
Type-check clean for the new files; unrelated parallel-session WIP errors do
not touch portal/.
