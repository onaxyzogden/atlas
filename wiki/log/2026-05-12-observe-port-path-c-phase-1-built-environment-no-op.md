# 2026-05-12 — observe-port path C, phase 1 (built-environment): no-op


**Motive.** Begin phase 1 of the
[2026-05-12 observe-port pruning plan](#2026-05-12--observe-port-css-pruning-audit--path-c-plan-not-yet-executed)
— migrate the built-environment module off `observe-port.css` into a
module-local CSS module.

**Finding — built-environment is already migrated.**
[`BuiltEnvironmentDashboard.tsx`](../apps/web/src/v3/observe/modules/built-environment/BuiltEnvironmentDashboard.tsx)
uses only `card.*` (stageCard) and `obsx.*` (observeExtras) CSS
modules. Zero bare `className="..."` strings. The 13 classes the
prior audit flagged as "consumed" by built-environment were all
false positives — string tokens like `'sprout'` inside the ICON_MAP
keys, not CSS class references. The Panel wrapper is a 9-line
re-export with no styling.

**Implication for the rest of the plan.** The string-literal
consumer scan in
[`scripts/map-observe-port-consumers.py`](../scripts/map-observe-port-consumers.py)
matches any identifier-shaped token inside any quoted string —
which overcounts dramatically for common-English class names like
`.on`, `.red`, `.water`, `.gold`. Before phase 2 (human-context) it
is worth tightening the scanner to look only at `className=` /
`clsx(...)` / `classnames(...)` references, so the per-module
real-consumer count is honest. Otherwise we waste cycles confirming
false positives on each module.

**Cascade still live.** Built-environment renders inside the
`.observe-port` wrapper sheet, so the global token block + any
implicit cascading still applies. That removal is a phase-8
concern, not phase-1.

**Outcome.** No CSS or TSX edits in built-environment. Audit
tightening deferred. Plan unchanged: continue lightest-to-heaviest,
skipping built-environment.
