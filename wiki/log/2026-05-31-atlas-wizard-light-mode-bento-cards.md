# 2026-05-31 -- Wizard light-mode theming + bento section cards

**Branch:** `feat/atlas-permaculture` | **Commit:** `020dd913` (not pushed)
**Entity:** [[entities/web-app]]

## Objective

Make the project-creation wizard honor the app light/dark toggle (it was stuck
dark) and replace horizontal divider lines with bordered bento cards across every
section of every step.

## Root cause (light-mode bug)

Every `project-wizard/*.module.css` referenced an undefined legacy token namespace
(`--surface-*`, `--text-*`, `--border-*`, `--accent-*`) with hardcoded dark hex
fallbacks, plus bare dark literals (`rgba(14,20,19,a)` glass, `#0e1413` button
text, gold/amber tints, `rgba(232,225,208,a)` hover). With the tokens undefined,
CSS always fell back to the dark hex, so the wizard never flipped.

## Change 1 -- token migration (17 CSS modules)

Mapped all legacy/hardcoded values onto canonical `--color-*` tokens that flip per
`data-theme`: surfaces -> `--color-bg` / `--color-surface` / `--color-surface-raised`;
borders -> `--color-border(-subtle)`; text -> `--color-text(-muted)`; accents ->
`--color-gold-brand` / `--color-primary-hover` / `--color-warning` /
`--color-success` / `--color-error`; map glass -> `rgba(var(--color-map-panel-rgb), a)`;
gold/amber tints -> `rgba(var(--color-*-rgb), a)`; button text on gold ->
`--color-on-primary`; hover -> `--color-hover-overlay`. One inline style in
`WizardStepRouter.tsx` fixed too. `tokens.css` / `dark-mode.css` left untouched
(out of scope).

## Change 2 -- bento cards

Added a shared `.bento` card (border 1px `--color-border-subtle`, radius 12px, bg
`--color-surface`, padding 16px) to Steps 1-3; wrapped each section in its own card
(Step 1: name / country+address / units; Step 2: project-type grid / secondary
layers; Step 3: primary steward); dropped the unused Step 2 `.divider` rule;
converted the Step 3 invites group from a border-top divider into a full card.
`WizardTensionPanel` and the Completion `.nextUp` were already cards, left as-is.

## Verification

Typecheck clean (`TSC_EXIT=0`); grep `LEGACY=0` across all wizard CSS;
`CSS_BENTO=3`, `TSX_BENTO_USES=6`, Step2 divider=0, Step3 border-top=0. Guarded
staging committed ONLY the 21 project-wizard files (foreign WIP -- Diagnose/Design/
OperateMap, financial files, graphify-out -- correctly excluded).

## Note

Preview light/dark screenshots were NOT captured this session -- the tool-result
channel was severely degraded (sustained buffering/outage), so per project policy
this is recorded as unverified-by-screenshot rather than claimed. Visual
confirmation in both themes remains a follow-up.

## Deferred

- Light + dark preview screenshots of the wizard steps.
