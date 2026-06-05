# 2026-05-20 — Parallel-session coordination protocol shipped (per-day log + pre-push hook + verified)

**Branch.** `feat/atlas-permaculture`. Closes the silent-drop loss
class triggered by the 2026-05-20 staleness-fix entry being rebased
away by the parallel session ([[2026-05-20-rotation-adherence-now-staleness-fix-vitest-coverage]]).
Four commits, all pushed via `--force-with-lease`. This is also the
first session-end entry written in the new per-day file format.

**Diagnosis.** Two Claude Code sessions concurrently force-push
`feat/atlas-permaculture`. Editing the monolithic `wiki/log.md`
on both sides means any rebase silently drops the loser's entry —
new files survive (the `useNow.ts` code fix did), but conflicting
edits to the same high-churn file get squashed. The fix code
survived; the wiki entry did not. Belt-and-braces remedy: written
protocol + structural fix (per-day files = no collision class) +
mechanical guard (pre-push hook).

**What shipped (four commits on top of `a5b1ac27`):**

- `1eb3e8f8` — `scripts/migrate-log.mjs` + 470 per-day files
  under `wiki/log/YYYY-MM-DD-slug.md` + rewritten `wiki/log.md`
  as reverse-chronological index. Heading regex tolerates date
  qualifiers (`(late)`, `(late-late²)`, `/ 2026-04-24`); 470/470
  match (verified via diff against committed monolith). Slug
  convention: kebab-case, ≤60 chars, numeric suffix on same-day
  collisions.
- `537d7e13` — `wiki/concepts/parallel-session-coordination.md`
  protocol page (Summary / How It Works / Where It's Used /
  Constraints). Pre-flight = `git fetch && git status -sb`;
  rebase rule = never delete `wiki/log/*.md`; push rule =
  `--force-with-lease` only, never `--force`; index is
  regenerable, per-file entries are authoritative.
- `43e2fce8` — `wiki/SCHEMA.md`: `log/` added to directory block,
  new Log Entries page convention (no frontmatter, `# YYYY-MM-DD
  — Title` H1), Session-End workflow rewritten to write a new
  `wiki/log/*.md` + one index line (never edit a peer's existing
  entry). `wiki/index.md`: link the new concept page.
- `c938ed65` — `scripts/git-hooks/pre-push` (POSIX) +
  `pre-push.ps1` (PowerShell fallback) +
  `scripts/git-hooks/install.mjs` (zero-dep `core.hooksPath`
  wiring, no husky). README: one-time
  `node scripts/git-hooks/install.mjs` step. Hook refuses any
  push whose `git diff --diff-filter=D --name-only
  $upstream...HEAD -- wiki/log/` is non-empty, with a per-file
  `git checkout $upstream -- <file>` remediation hint.

**Verification (end-to-end, this session):**

- `core.hooksPath` set: `scripts/git-hooks` ✅
- Negative test: empty-commit push to `throwaway/pre-push-smoke`
  succeeded silently (hook produced no output, exit 0) ✅
- Positive test: deleting
  `wiki/log/2026-05-20-rotation-adherence-now-staleness-fix-vitest-coverage.md`
  and pushing on an upstream-tracked branch was refused with the
  expected `pre-push: REFUSED` message + remediation hint + exit
  code 1 ✅
- `feat/atlas-permaculture` HEAD on origin: `c938ed65`, unchanged
  by smoke tests ✅
- `wiki/log/` count: 470 entries preserved ✅

**Gotchas surfaced and pinned in the plan:**

- The hook short-circuits when a branch has no upstream
  (first push of a new local branch — `git rev-parse @{u}` returns
  nothing). This is correct behaviour — there's no "deletion"
  relative to a non-existent upstream — but it means the positive
  test must push *twice*: once to establish upstream, once with
  the deletion. Initial smoke run missed this and gave a false-pass.
- `git push origin --delete <branch>` *does* invoke the pre-push
  hook, and the hook sees the local branch's still-present
  deletion commit. Cleanup requires resetting the throwaway
  branch to its upstream before issuing the delete. `--no-verify`
  was explicitly disallowed (project CLAUDE.md).
- Migration regex needed two relaxations: first to accept
  bracketed/slash qualifiers (`(late)`, `/ 2026-04-24`), then to
  allow hyphens inside qualifiers (`(late-late²)`). Final form:
  `^## (\d{4}-\d{2}-\d{2})([^\n]*?)?\s+[—–]\s+(.+)$` — em/en-dash
  separator only (we never use plain hyphen), qualifier is
  lazy-anything.

**Push protocol followed.** Each phase committed separately,
explicit-path `git add` (no `-A`/`.`), all four commits pushed in
one `git push --force-with-lease`. Worktree behind:2 (rebased
duplicates of my own `c4aec7b7` + `242494bf` from prior sessions)
was correctly subsumed by my 18 commits.

**Next-session ask.** Parallel session must run
`node scripts/git-hooks/install.mjs` once in their clone to
activate the guard there — they'll see the prompt in the README's
Getting Started block on next orient. Until they do, their pushes
are unguarded, but a deletion *of* a `wiki/log/*.md` file from
their side would still be blocked when it reaches my pushes.

**Out of scope (deferred).** CI-side log-deletion gate (GitHub
Actions); communicating the install step to the parallel session
beyond the README + concept-page entries they'll read on orient;
hook coverage extension to other branches (the per-day-log
convention is `feat/atlas-permaculture`-only).
