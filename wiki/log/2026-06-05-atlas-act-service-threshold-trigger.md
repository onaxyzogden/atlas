# Log: Wire [service threshold] trigger recognition end-to-end

**Date:** 2026-06-05
**Branch:** feat/atlas-permaculture
**Commit:** e3d31167

## What was done

Made `u-s5-infrastructure-failure` (the `[service threshold]` universal protocol) fully functional in Act by fixing three gaps that silently prevented it from ever surfacing the TriggerRecognitionSheet.

### Gap 1 — Missing FEEDS_TO_MODULE entry

`apps/web/src/v3/act/data/protocolFeedsMap.ts` was missing `'Built Infrastructure': 'built-infrastructure'`. `pickTrigger()` in `ActTierExecutionPanel.tsx` matches active respond-tier protocols by checking `t.feeds.some(f => FEEDS_TO_MODULE[f] === domainId)`. Without this entry, the protocol was permanently invisible to trigger recognition regardless of its activation state.

### Gap 2 — Universal templates excluded from triggerTemplates memo

The `triggerTemplates` useMemo only called `templatesForEnterprises()`, which returns templates that have an `enterpriseScope` array. Universal templates have no `enterpriseScope` and return `false` for the `.some(...)` enterprise-scope check — so they were always excluded. Fixed by concatenating `UNIVERSAL_PROTOCOL_TEMPLATES` after the enterprise list and exporting it from the `@ogden/shared` barrel index.

### Gap 3 — TriggerRecognitionSheet passed base outputs

`ActTierExecutionPanel.tsx` was passing `outputs={outputs}` (base S6 protocol outputs — no per-template overrides) to `TriggerRecognitionSheet`. `useProtocolLibrary` already exposes `outputsFor(templateId)` which merges base + per-template overrides from the threshold editor store, but the destructure only pulled `outputs`. Fixed by also destructuring `outputsFor` and passing `outputsFor(pendingTrigger.id)` so `[service threshold]` arrives pre-populated from the threshold editor.

### Domain override reorder

Reordered the `s3-systems-baseline` entry in `objectiveObserveDomains.ts` to put `'built-infrastructure'` first. `getPrimaryDomainForObjective` returns `domains[0]`, which is what `pickTrigger()` tests against. The checklist c3 item ("Note existing infrastructure and utilities") is the defining output of this objective — `'built-infrastructure'` is semantically the primary domain.

## Files changed

| File | Change |
|---|---|
| `apps/web/src/v3/act/data/protocolFeedsMap.ts` | +1: `'Built Infrastructure': 'built-infrastructure'` |
| `apps/web/src/v3/act/tier-shell/ActTierExecutionPanel.tsx` | Include `UNIVERSAL_PROTOCOL_TEMPLATES` in triggerTemplates; destructure `outputsFor`; pass `outputsFor(pendingTrigger.id)` to TriggerRecognitionSheet |
| `apps/web/src/v3/act/tier-shell/__tests__/ActTierExecutionPanel.protocols.test.tsx` | New describe block: surfaces Infrastructure Failure trigger sheet on built-infrastructure objective |
| `packages/shared/src/index.ts` | Export `UNIVERSAL_PROTOCOL_TEMPLATES` from main barrel |
| `packages/shared/src/relationships/objectiveObserveDomains.ts` | Reorder `s3-systems-baseline` override: `built-infrastructure` first |

## Verification

- 6/6 tests pass (bounded vitest: `--pool=forks --testTimeout=20000`)
- `tsc --noEmit` exits 0
- Live: Infrastructure Failure card shows `data-protocol-status="active"` in S5 Protocol Layer after store activation. Full trigger-sheet path not demonstrable via MTC UI (MTC has no built-infrastructure enterprise objective in its Act view) — verified through test suite.
