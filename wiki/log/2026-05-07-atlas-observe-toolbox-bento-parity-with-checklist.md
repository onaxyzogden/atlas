# 2026-05-07 — Atlas OBSERVE toolbox bento parity with checklist


**Branch:** `feat/atlas-permaculture` · **Type:** style/cosmetic

User asked to "place [the OBSERVE left-rail toolbox] in a bento box (similar to the checklist)." The two rails carried different bento patterns — checklist wrapped its inner cards in an outer panel surface (`.checklistBox` with `--radius-lg`, soft shadow, hairline border), while the toolbox left its outer container transparent and gave each `.group` its own heavy surface card. Restyled `apps/web/src/v3/observe/tools/ObserveTools.module.css` so `.toolbox` now carries the panel surface (`color-mix surface 96%`, `--radius-lg`, `0 1px 2px` shadow, 12px padding) and `.group` becomes a quieter inset card on `--color-bg` with `--radius-md` and a plain hairline border. Behaviour preserved verbatim: saturation drain on inactive cards, per-module `--group-dot` accent, `.groupActive` ring, hover tinting, themed scrollbar. Single CSS module touched; no JSX, tokens, or layout grid changes. `vite build` clean (30.86s).
