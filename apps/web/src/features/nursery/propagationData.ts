/**
 * Propagation catalog — germination temps, stratification, timing per species.
 *
 * Keyed by species IDs from plantSpeciesData.ts. Used by nurseryAnalysis.ts
 * to compute germination calendars and readiness tracking.
 */

import type { PropagationMethod } from '../../store/nurseryStore.js';

export interface PropagationInfo {
  speciesId: string;
  commonName: string;
  germinationTempC: { min: number; optimal: number; max: number };
  stratificationDays: number;
  daysToGermination: [number, number];
  daysToTransplantReady: number;
  propagationMethods: PropagationMethod[];
  seedSavingWindow: 'early_summer' | 'late_summer' | 'fall';
}

export const PROPAGATION_CATALOG: PropagationInfo[] = [
  {
    speciesId: 'hybrid_chestnut',
    commonName: 'Hybrid Chestnut',
    germinationTempC: { min: 4, optimal: 15, max: 25 },
    stratificationDays: 90,
    daysToGermination: [14, 28],
    daysToTransplantReady: 365,
    propagationMethods: ['seed', 'graft'],
    seedSavingWindow: 'fall',
  },
  {
    speciesId: 'black_walnut',
    commonName: 'Black Walnut',
    germinationTempC: { min: 4, optimal: 15, max: 22 },
    stratificationDays: 120,
    daysToGermination: [21, 42],
    daysToTransplantReady: 365,
    propagationMethods: ['seed'],
    seedSavingWindow: 'fall',
  },
  {
    speciesId: 'hazelnut',
    commonName: 'Hazelnut',
    germinationTempC: { min: 4, optimal: 12, max: 20 },
    stratificationDays: 90,
    daysToGermination: [14, 35],
    daysToTransplantReady: 270,
    propagationMethods: ['seed', 'cutting'],
    seedSavingWindow: 'fall',
  },
  {
    speciesId: 'apple',
    commonName: 'Apple',
    germinationTempC: { min: 4, optimal: 15, max: 25 },
    stratificationDays: 60,
    daysToGermination: [14, 30],
    daysToTransplantReady: 365,
    propagationMethods: ['seed', 'graft'],
    seedSavingWindow: 'fall',
  },
  {
    speciesId: 'pear',
    commonName: 'Pear',
    germinationTempC: { min: 4, optimal: 15, max: 25 },
    stratificationDays: 60,
    daysToGermination: [14, 30],
    daysToTransplantReady: 365,
    propagationMethods: ['seed', 'graft'],
    seedSavingWindow: 'fall',
  },
  {
    speciesId: 'peach',
    commonName: 'Peach',
    germinationTempC: { min: 5, optimal: 18, max: 28 },
    stratificationDays: 90,
    daysToGermination: [21, 42],
    daysToTransplantReady: 300,
    propagationMethods: ['seed', 'graft'],
    seedSavingWindow: 'late_summer',
  },
  {
    speciesId: 'cherry',
    commonName: 'Sweet Cherry',
    germinationTempC: { min: 4, optimal: 15, max: 25 },
    stratificationDays: 90,
    daysToGermination: [21, 42],
    daysToTransplantReady: 365,
    propagationMethods: ['seed', 'graft'],
    seedSavingWindow: 'late_summer',
  },
  {
    speciesId: 'elderberry',
    commonName: 'Elderberry',
    germinationTempC: { min: 10, optimal: 20, max: 30 },
    stratificationDays: 60,
    daysToGermination: [14, 28],
    daysToTransplantReady: 180,
    propagationMethods: ['seed', 'cutting', 'division'],
    seedSavingWindow: 'late_summer',
  },
  {
    speciesId: 'blueberry',
    commonName: 'Blueberry',
    germinationTempC: { min: 10, optimal: 22, max: 28 },
    stratificationDays: 90,
    daysToGermination: [30, 60],
    daysToTransplantReady: 365,
    propagationMethods: ['seed', 'cutting'],
    seedSavingWindow: 'late_summer',
  },
  {
    speciesId: 'currant',
    commonName: 'Red/Black Currant',
    germinationTempC: { min: 5, optimal: 15, max: 22 },
    stratificationDays: 60,
    daysToGermination: [14, 28],
    daysToTransplantReady: 240,
    propagationMethods: ['cutting', 'division'],
    seedSavingWindow: 'late_summer',
  },
  {
    speciesId: 'gooseberry',
    commonName: 'Gooseberry',
    germinationTempC: { min: 5, optimal: 15, max: 22 },
    stratificationDays: 60,
    daysToGermination: [14, 28],
    daysToTransplantReady: 240,
    propagationMethods: ['cutting', 'division'],
    seedSavingWindow: 'late_summer',
  },
  {
    speciesId: 'grape',
    commonName: 'Grape',
    germinationTempC: { min: 10, optimal: 20, max: 30 },
    stratificationDays: 90,
    daysToGermination: [14, 28],
    daysToTransplantReady: 365,
    propagationMethods: ['cutting'],
    seedSavingWindow: 'fall',
  },
  {
    speciesId: 'hardy_kiwi',
    commonName: 'Hardy Kiwi',
    germinationTempC: { min: 10, optimal: 20, max: 28 },
    stratificationDays: 60,
    daysToGermination: [14, 28],
    daysToTransplantReady: 365,
    propagationMethods: ['seed', 'cutting'],
    seedSavingWindow: 'fall',
  },
  {
    speciesId: 'strawberry',
    commonName: 'Strawberry',
    germinationTempC: { min: 10, optimal: 18, max: 25 },
    stratificationDays: 30,
    daysToGermination: [7, 21],
    daysToTransplantReady: 120,
    propagationMethods: ['seed', 'division'],
    seedSavingWindow: 'early_summer',
  },
  {
    speciesId: 'comfrey',
    commonName: 'Comfrey',
    germinationTempC: { min: 10, optimal: 18, max: 25 },
    stratificationDays: 0,
    daysToGermination: [7, 14],
    daysToTransplantReady: 90,
    propagationMethods: ['division', 'cutting'],
    seedSavingWindow: 'late_summer',
  },
  {
    speciesId: 'persimmon',
    commonName: 'American Persimmon',
    germinationTempC: { min: 4, optimal: 15, max: 25 },
    stratificationDays: 90,
    daysToGermination: [21, 42],
    daysToTransplantReady: 365,
    propagationMethods: ['seed', 'graft'],
    seedSavingWindow: 'fall',
  },
  {
    speciesId: 'pawpaw',
    commonName: 'Pawpaw',
    germinationTempC: { min: 4, optimal: 15, max: 22 },
    stratificationDays: 90,
    daysToGermination: [30, 60],
    daysToTransplantReady: 365,
    propagationMethods: ['seed'],
    seedSavingWindow: 'fall',
  },
  {
    speciesId: 'pecan',
    commonName: 'Pecan',
    germinationTempC: { min: 5, optimal: 18, max: 28 },
    stratificationDays: 90,
    daysToGermination: [21, 42],
    daysToTransplantReady: 365,
    propagationMethods: ['seed', 'graft'],
    seedSavingWindow: 'fall',
  },
];

export const PROPAGATION_BY_SPECIES: Record<string, PropagationInfo> = Object.fromEntries(
  PROPAGATION_CATALOG.map((p) => [p.speciesId, p]),
);
