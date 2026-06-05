# 2026-05-06 — wholesale scoped port)


Closed the open styling follow-up from the morning's Phase B ADR. Inspection
of the working tree showed that a prior session had already authored a
brace-walking CSS transformer at `scripts/scope-observe-styles.mjs` and
generated `apps/web/src/v3/observe/styles/observe-port.css` from the OLOS
reference `C:/Users/MY OWN AXIS/Documents/OGDEN Land Operating System/src/styles.css`
— the work was sitting uncommitted and undocumented.

**What the transformer does:**
- Prefixes every top-level rule selector with `.observe-port` (4,091 rules
  in the output).
- Recurses into `@media` / `@supports` blocks; nested rules get the same
  prefix.
- Rewrites the leading `:root` block as `.observe-port` so `--olos-*` tokens
  scope to the wrapper.
- Strips 3 declarations (`font-family`, `color`, `background`) from the
  rewritten root that would otherwise leak via cascade onto the wrapper
  itself.
- Drops 3 rule blocks with selectors `*` / `html` / `body` (atlas owns the
  document root).
- Preserves the leading Google Fonts `@import` (Cormorant Garamond + Inter)
  untouched.

**Wiring:** [ModuleSlideUp.tsx:34](apps/web/src/v3/observe/components/ModuleSlideUp.tsx)
imports `observe-port.css` once; the sheet root carries `className={`${css.sheet} observe-port`}`.

**Verification:** Dev preview confirms full OLOS visual fidelity (Cormorant
Garamond display, gold/green accents, dark forest-green canvas) inside the
sheet for Topography dashboard, Terrain Detail, and SWOT Synthesis
dashboard. No leakage to atlas chrome (top app shell, decision rail, bottom
tile rail) outside the sheet. Typecheck running concurrently.

**ADR closure:** [wiki/decisions/2026-05-06-atlas-observe-port-styling.md](wiki/decisions/2026-05-06-atlas-observe-port-styling.md)
status updated from "accepted (with open follow-up on styling)" to
"accepted — closed (option 1 selected and shipped same day)".

**Known follow-up:** Token reconciliation between OLOS and atlas is
deferred. Option 3 (progressive token-swap from `--olos-*` to atlas
equivalents) remains available if visual consistency between Observe and
Plan/Act becomes a goal in later phases.
