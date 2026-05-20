# 2026-05-12 — observe-port.css pruning audit + path C plan (not yet executed)


**Motive.** Open the deferred "`observe-port.css` cleanup" follow-up
from
[2026-05-11-atlas-observe-human-context-reskin](decisions/2026-05-11-atlas-observe-human-context-reskin.md).
Steward asked for a mechanical no-consumer sweep.

**Discovery — pruning is not mechanical.**

- `observe-port.css` is **generated**, not authored.
  [`scripts/scope-observe-styles.mjs`](../scripts/scope-observe-styles.mjs)
  reads from an OLOS reference repo at
  `C:/Users/MY OWN AXIS/Documents/OGDEN Land Operating System/src/styles.css`
  and rewrites every selector under `.observe-port`. Any in-place
  prune would be wiped on the next regeneration.
- The `.observe-port` wrapper class is still live: attached to the
  Observe slide-up sheet root at
  [`apps/web/src/v3/observe/components/ModuleSlideUp.tsx:136`](../apps/web/src/v3/observe/components/ModuleSlideUp.tsx).
- Two new audit scripts written:
  [`scripts/audit-observe-port.py`](../scripts/audit-observe-port.py)
  (defined vs. referenced) and
  [`scripts/map-observe-port-consumers.py`](../scripts/map-observe-port-consumers.py)
  (per-Observe-module consumer map).
- Audit result: **1045** classes defined, **154** referenced anywhere
  in `apps/web/src`, **891 orphan** (85%). The string-literal-scoped
  consumer scan returns **141** classes across 7 modules, but many
  are false positives — common English tokens like `.on`, `.red`,
  `.water`, `.gold`, `.high`, `.low` matching unrelated string
  contents. Real consumers cluster around dataviz patterns:
  `compass-*`, `matrix-*`, `moodboard-*`, `jar-*`, `hist-*`,
  `hotspot-*`, `sun-*`, `solar-*`, `slope-*`, `profile-*`,
  `elevation-*`, `aspect-*`, `capacity-orbit`,
  `hazard-hotspots-map`, `terrain-snapshot`.

**Three paths surfaced, steward selected (C).**

- (A) Prune the OLOS reference, regenerate — cross-repo, out of scope.
- (B) Hand-author `observe-port.css` from here on, lose the OLOS sync.
- (C) **(SELECTED)** Migrate the remaining real consumers into
  module-local `.module.css` files, then delete `observe-port.css`,
  the `.observe-port` wrapper class, and the generator script.

**Plan (not yet executed).** 8 phases, lightest to heaviest module:
built-environment → human-context → swot-synthesis → sectors-zones
→ earth-water-ecology → macroclimate-hazards → topography → finalize
(delete `observe-port.css` + wrapper + generator, update Observe
README). Per-phase gate: typecheck clean, grep confirms no
remaining bare `className=` for extracted classes outside the new
local module, preview screenshot matches pre-migration. Token block
(`--olos-*` CSS variables) decision deferred to phase 1 — likely
lift into a shared `observe-tokens.css` consumed by all module CSS
modules.

**Outcome of this session.** Audit + plan only. No `.css` or `.tsx`
edits this turn. Scripts committed for the next session to start
from.
