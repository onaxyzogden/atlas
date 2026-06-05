# Parallel Session Coordination

## Summary

Two Claude Code sessions concurrently develop the
`feat/atlas-permaculture` branch and force-push to the same remote.
Without coordination, a rebase by one session silently drops the
other's edits to high-churn files — most importantly `wiki/log.md`.
This page defines the protocol both sessions follow: rebase rules,
force-push rules, the per-day log layout that makes log collisions
mechanically impossible, and the pre-push hook that catches the
remaining failure mode.

The 2026-05-20 staleness-fix session lost its `wiki/log.md` entry to
a silent rebase under exactly this scenario. The entry was restored
manually; this page exists so it doesn't happen again.

## How It Works

### Pre-flight (every session start, before any commit)

1. `git fetch origin` — refresh the remote ref.
2. `git status -sb` — read the ahead/behind counts against
   `origin/<branch>`. If `behind` is non-zero, the parallel session
   has pushed since you last fetched.
3. If diverged: `git rebase origin/<branch>` before any new commit.
   Resolve conflicts in code files normally; for `wiki/log/*.md`
   files (per-day entries) there should never be a conflict because
   each session writes its own dated slug.

### Rebase rules

- **Never delete a `wiki/log/*.md` file during rebase.** Each file
  is a complete, self-contained entry owned by the session that
  wrote it. If a rebase tries to remove one (it shouldn't — they
  are append-only by design), restore it with
  `git checkout origin/<branch> -- wiki/log/<file>` before
  continuing.
- **Never edit a peer session's still-unpushed entry.** Wait for
  them to push; treat their unpushed work as out of bounds.
- The `wiki/log.md` index is regenerable. If a rebase scrambles its
  ordering, treat the per-file entries as canonical and rebuild the
  index lines manually (or via `scripts/migrate-log.mjs` — but the
  script is a one-shot, see [[2026-05-20-parallel-session-coordination-protocol]]).

### Push rules

- **Always `git push --force-with-lease`, never `git push --force`.**
  `--force-with-lease` refuses the push if the remote has moved since
  your last fetch; `--force` overwrites whatever is there. The lease
  variant is the safety net for the case where the parallel session
  pushed between your fetch and your push.
- If `--force-with-lease` is rejected: `git fetch`, rebase onto the
  newly-arrived remote, repeat. Do not escalate to `--force`.
- Never force-push to `main` or `master`. (Atlas main is protected
  but the rule stands.)

### Per-day log file convention

Each session-end entry is a separate file under `wiki/log/`:

```
wiki/log/YYYY-MM-DD-slug.md
```

- `slug` is the heading text kebab-cased (lowercase, alnum + hyphens,
  ≤60 chars). On same-day collisions append `-2`, `-3`, …
- File contents: `# YYYY-MM-DD — Title\n\n<body>` — no frontmatter,
  no fixed template beyond the heading.
- `wiki/log.md` becomes a reverse-chronological **index** of these
  files (one line per entry: `- [date — title](log/...md) — one-line
  hook`). The index is regenerable; the per-file entries are
  authoritative.

Because each session writes its own dated file, two sessions writing
session-end entries on the same day never collide on the same line of
the same file — they create two adjacent files.

## Where It's Used

- **Session-Start orient phase** — both sessions read the most recent
  entries from `wiki/log.md`'s index to pick up where the other left
  off ([wiki/SCHEMA.md](../SCHEMA.md) §Workflows).
- **Session-End workflow** — instead of appending to a monolithic
  `wiki/log.md`, write a new `wiki/log/YYYY-MM-DD-slug.md` and add
  one index line to `wiki/log.md` ([wiki/SCHEMA.md](../SCHEMA.md)
  §Session-End).
- **`scripts/git-hooks/pre-push`** — refuses any push that deletes a
  `wiki/log/*.md` file relative to `origin/<branch>`. This is the
  belt to the per-day-file braces: if a rebase ever does try to drop
  an entry, the push is blocked with a remediation hint.

## Constraints

- **Never delete a `wiki/log/*.md` file via rebase or merge.** They
  are append-only. If you discover one is missing in a rebase
  conflict, restore from `origin/<branch>` before continuing.
- **`--force-with-lease` only.** A plain `--force` defeats the
  protocol's only safety net.
- **The pre-push hook is the safety net, not the policy.** Both
  sessions must run `node scripts/git-hooks/install.mjs` once per
  clone to wire `core.hooksPath`. The hook catches accidental
  deletions; it does not authorise them.
- **Index ordering is human-readable, not load-bearing.** A rebase
  may briefly leave `wiki/log.md` lines out of strict date order.
  Content is preserved by the per-file design; the index can be
  re-sorted any time without losing data.
- **This protocol applies only to `feat/atlas-permaculture`** —
  the branch known to be concurrently force-pushed. Other branches
  follow normal git workflow.
