# Wiki Schema & Conventions

This wiki is the authoritative accumulated-context source for the OGDEN Atlas project.
It is maintained by Claude Code across sessions and version-controlled with the repo.

## Directory Structure

```
wiki/
  index.md          — catalog of all pages (read first every session)
  log.md            — reverse-chronological index of per-day log entries
  log/              — one file per session-end entry (YYYY-MM-DD-slug.md)
  SCHEMA.md         — this file: conventions and workflows
  entities/         — projects, modules, systems, tools
  concepts/         — frameworks, patterns, principles
  decisions/        — architectural decision records (ADRs)
```

See [concepts/parallel-session-coordination.md](concepts/parallel-session-coordination.md)
for why `log/` is a directory of per-day files rather than a monolith.

## Page Conventions

### Entity Pages (`entities/`)
Describe a concrete component of the system: a package, service, module, or tool.

```markdown
# Entity Name
**Type:** module | package | service | tool | infrastructure
**Status:** active | deprecated | stub | planned
**Path:** relative path from repo root

## Purpose
One paragraph.

## Key Files
Bulleted list of important files with one-line descriptions.

## API / Interface
Public exports, routes, or store shape.

## Dependencies
What this entity depends on and what depends on it.

## Current State
What works, what doesn't, known gaps.

## Notes
Anything not covered above.
```

### Concept Pages (`concepts/`)
Describe a pattern, principle, or framework used across the codebase.

```markdown
# Concept Name

## Summary
1-3 sentences.

## How It Works
Detailed explanation.

## Where It's Used
List of entities/files that implement this concept.

## Constraints
Rules or invariants to respect.
```

### Log Entries (`log/`)
File naming: `YYYY-MM-DD-slug.md` (slug = heading title kebab-cased,
≤60 chars; on same-day collisions append `-2`, `-3`, …).

No frontmatter. The file is just the entry body with an H1 heading:

```markdown
# YYYY-MM-DD — Title

Body narrative — branch, scope, what shipped, links to ADRs, etc.
No fixed template beyond the heading; mirror existing entries.
```

`wiki/log.md` is the reverse-chronological **index** of these files
(one line per entry). The index is regenerable; the per-file entries
are authoritative. See
[concepts/parallel-session-coordination.md](concepts/parallel-session-coordination.md).

### Decision Records (`decisions/`)
File naming: `YYYY-MM-DD-slug.md`

```markdown
# ADR: Title
**Date:** YYYY-MM-DD
**Status:** accepted | superseded | deprecated
**Context:** Why this decision was needed.
**Decision:** What was decided.
**Consequences:** What follows from this decision.
```

## Workflows

### Session Start
1. Read `wiki/index.md`
2. Read relevant entity pages for the session's domain
3. Read recent entries in `wiki/log.md`

### Session End
1. Update affected entity pages
2. File any new ADRs
3. Write a new entry under `wiki/log/YYYY-MM-DD-slug.md` and add a
   one-line index entry at the top of `wiki/log.md`. Never edit a
   peer session's existing entry file.
4. Update `wiki/index.md` if new pages were created

### Compaction Boundary
Same as session end — ensures continuity across context window resets.
