# 2026-04-24 — §9 infrastructure-cost-placeholder-per-structure


Commit `45ca966`. `costEstimate` was populated silently at placement
(template midrange) with no user-facing edit path; stewards couldn't
override it without writing directly to localStorage. This adds a
proper numeric input to the StructurePropertiesModal between the
footprint summary and the labor/material row. Label shows the template
midrange so the steward knows what they're overriding; parser treats
blank / non-positive as `null` ("explicitly unset"), positive numbers
are rounded to whole dollars. `StructureModalSaveData` gains
`costEstimate?: number | null`; DesignToolsPanel plumbs both save
paths. Edit mode uses conditional spread so `undefined` is a no-op
while `null` round-trips normally.

The "infrastructure requirement summary" half of the same manifest
entry was already shipped via the template info-badge — flipping
`partial → done` records that both halves are now complete.

tsc clean on touched files. Pre-existing error count dropped to 9.

### Recommended next

- **§14 `seasonal-storage-water-budget`** — still the biggest un-opened
  feature on the P2 backlog; plan file in `~/.claude/plans/` has the
  full spec. Monthly inflow/demand + running balance + storage sizing.
- **§15 `infrastructure-corridor-routing`** — currently `planned`;
  paths already exist, so this might collapse into a manifest sweep
  similar to the §13 utility batch.
- **§17 regulatory batch audit** — scan status flags for implicitly
  shipped items.
