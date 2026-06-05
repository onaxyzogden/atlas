# 2026-05-11 — Mid-session file reverts: root cause identified


**Motive.** Two sessions in a row (map-UI consolidation + Draw-button
wiring) saw `ObserveLayout.tsx` and `PlanLayout.tsx` silently revert
to their pre-edit state mid-session, surfaced by Claude Code's
"X was modified, either by the user or by a linter" system reminder.
Investigated to stop the recurrence.

**Findings.**

- **Not a hook issue.** No git hooks (`.git/hooks/` is sample-only),
  no Husky, no `prepare` / `postinstall` scripts, no Claude Code
  project hooks, no `.vscode/settings.json`, no `.editorconfig`
  rewrite. Lone scheduled task is one-time for 2026-06-05 — not active.
- **19+ live `claude.exe` processes** on this machine
  (`Get-Process claude`); at least **6 concurrent Claude Code CLI
  sessions** for this Atlas project (jsonl files all mtime'd within
  seconds of each other).
- **Parallel sessions committed on the same branch.** Between this
  session's two map-UI commits, three commits from other sessions
  landed (`b06ee21` agribusiness Module 7, `2086855` dashboard retire,
  `88ded4c` / `d2bffcd` livestock plan editing).
- **Session `ecba4fb9` made 14 Edit/Write tool calls against
  `ObserveLayout.tsx` / `PlanLayout.tsx`** in its transcript — the
  only other live session that wrote to those exact files.

**Mechanism.** When two CLI sessions both Read the same file, each
holds a snapshot. The first to Edit writes new content. The second's
snapshot is now stale; its next Edit can land based on the stale
snapshot, effectively reverting the first session's work. Claude
Code's staleness detector fires the *"modified by user or linter"*
reminder when this happens — that's the symptom, not the cause.

**Fix (operational, not code).**

- **One session per working tree.** For parallel work, spawn each
  session in a `git worktree add` — `.claude/worktrees/` already
  exists for this. Close idle `claude.exe` processes you're not
  actively using.
- **Or**, if parallel sessions in one tree are unavoidable, list
  current sessions and their owned paths up front (e.g. in a
  conversation preamble) so they don't race on the same files.

**Recommended.** Option 1. Infrastructure (`.claude/worktrees/`) is
already there — just use it consistently.
