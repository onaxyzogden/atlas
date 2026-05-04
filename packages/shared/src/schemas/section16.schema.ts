import { z } from 'zod';
import { sectionResponse } from './sectionResponse.js';

// Section 16 — Simulation & Scenario Modeling
//
// Counts of saved scenarios and the timestamp of the last run.
// Per-scenario detail rides on the scenario detail endpoint.

export const SimulationScenariosSummary = z.object({
  scenarioCount: z.number().int().nonnegative(),
  lastRunAt: z.string().datetime().nullable(),
  scenarioKinds: z.array(z.string()),
});
export type SimulationScenariosSummary = z.infer<typeof SimulationScenariosSummary>;

export const SimulationScenariosResponse = sectionResponse(SimulationScenariosSummary);
export type SimulationScenariosResponse = z.infer<typeof SimulationScenariosResponse>;
