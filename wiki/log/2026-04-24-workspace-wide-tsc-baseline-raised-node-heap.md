# 2026-04-24 — Workspace-wide tsc baseline (raised Node heap)


Follow-up to the Lora-fallback removal commit (`ae78728`). The initial
post-sweep `tsc --noEmit` on `apps/web` OOM'd with a Node JS-heap
exhaustion — default V8 heap (~2 GB on this Windows 10 box) isn't enough
for the combined project-references graph.

### Verification
Ran with `NODE_OPTIONS=--max-old-space-size=8192`:
- `apps/web` `npx tsc --noEmit` — exit 0, clean.
- `packages/shared` `npx tsc --noEmit` — exit 0, clean.
- `apps/api` `npx tsc --noEmit` — exit 0, clean.

### Outcome
Type baseline confirmed clean across all three workspaces after the
Lora sweep. Future tsc runs on this box should set the 8 GB heap cap.
Consider adding an npm script (e.g. `typecheck`) that sets
`NODE_OPTIONS` so contributors don't hit the default-heap OOM.
