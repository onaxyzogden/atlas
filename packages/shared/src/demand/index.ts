/**
 * `@ogden/shared/demand` — per-type demand coefficient tables and rollup.
 *
 * Single source of truth for site water (gal/day, gal/yr) and electricity
 * (kWh/day, kWh/yr) demand derived from placed structures, utilities, and
 * crop areas. Replaces the previous mix of hardcoded class tables and
 * 22%-of-rainfall placeholders.
 */
export * from './structureDemand.js';
export * from './utilityDemand.js';
export * from './cropDemand.js';
export * from './livestockDemand.js';
export * from './rollup.js';
