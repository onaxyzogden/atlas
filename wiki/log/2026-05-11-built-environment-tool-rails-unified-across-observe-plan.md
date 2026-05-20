# 2026-05-11 — Built Environment tool rails unified across Observe + Plan


User flagged that the Observe `BUILT ENVIRONMENT` rail and the Plan
`STRUCTURES & SUBSYSTEMS` rail "should be the same." They drew from the
same `BUILT_ENVIRONMENT_KINDS` registry but diverged on header label,
two legacy Plan-only items (`Structure`, `Utility run`), and icon/label
casing. Unified by extracting a shared `BE_TOOL_ITEMS` list in
`apps/web/src/v3/_shared/builtEnvironmentTools.ts`, fixing the registry
directly (`septic.icon → Recycle`, `fence.icon → Fence`, three
Title-Case labels normalised to Sentence-case), deleting Observe's
bespoke icon override layer, dropping the two legacy Plan items (tool
components and dispatcher branches kept dormant), and renaming the
Plan module's full label to "Built Environment" (short label
"Structures" retained for bottom-bar real estate). Both rails now
render 31 identical tool items in identical order. tsc clean. ADR:
[2026-05-11-atlas-built-environment-rail-unification.md](decisions/2026-05-11-atlas-built-environment-rail-unification.md).
