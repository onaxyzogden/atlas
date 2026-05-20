# 2026-05-16 — Full syncService coverage → backlog (plan-mode session)


Plan-mode session to scope the deferred durable fix for P0-1 (multi-device
silent data loss) flagged in the pre-live-testing hardening debrief. Phase-1
exploration (3 Explore agents: syncService mechanism, full ~73-store
project-scoped/device-global inventory, backend Fastify routes/DB/Zod surface)
+ Phase-2 design (2 contrasting Plan agents: pragmatic generic-blob vs
correctness-first typed/conflict). User-confirmed scope via AskUserQuestion:
execution-ready plan · HYBRID storage · stale-write-reject-and-surface
conflict model. Approved plan written to the plan file
(`before-we-proceed-with-mutable-crystal.md`, 5 phases, file-path-specific).
Filed as backlog: new `concepts/full-syncservice-coverage-backlog.md` + index
pointer. NOT executed — ~128k-token multi-session build, not a testing-window
blocker (the `projectBundle.ts` hatch holds the line). No code changed this
session; prior hardening-pass changes remain uncommitted for user review.
