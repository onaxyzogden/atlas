/**
 * PLAN-stage feature exports.
 *
 * Stage 2 of the regenerative-design 3-stage cycle (Observe → Plan → Act).
 * The Plan Hub is the landing surface; subsequent phases ship the eight
 * spec modules as `dashboardOnly: true` NavItems registered in
 * `features/navigation/taxonomy.ts` with `stage3: 'plan'`.
 */

export { default as PlanHub } from './PlanHub.js';
