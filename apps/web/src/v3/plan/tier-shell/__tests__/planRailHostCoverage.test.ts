/**
 * planRailHostCoverage -- guards the Plan objective-tools rail against surfacing
 * armable-but-inert tools. The Plan rail reuses Act's tool catalog, but the Plan
 * center canvas (VisionLayoutCanvas) only mounts a SUBSET of Act's draw hosts, so
 * a rail tile can light up gold yet draw nothing if its target host is absent.
 * Two invariants pin the fix:
 *
 *  1. Every `map`-arm tool in the shared catalog resolves to a `mapToolId` whose
 *     prefix has a draw host mounted in VisionLayoutCanvas. If a new map tool
 *     lands under an un-hosted prefix it would be inert on the Plan rail -- this
 *     test fails first, forcing either a host or an explicit exclusion.
 *  2. `resolvePlanTools` strips `log`-arm tools (field logs are an Act-execution
 *     concern with no Plan-canvas host), so harvest / water / livestock never
 *     reach the Plan rail.
 *
 * Host prefixes map to the draw hosts in
 * apps/web/src/v3/plan/canvas/VisionLayoutCanvas.tsx:
 *   plan.*                  -> PlanDrawHost(variant="vision") / DesignElementDrawHost / BeV2ExistingTool
 *   observe.*               -> ObserveDrawHost
 *   act.terrain.slope-*     -> SlopeSurveyDrawHost      (gated by slopeActive)
 *   act.ecology.veg-survey  -> VegetationSurveyDrawHost (gated by surveyActive)
 */

import { describe, it, expect } from 'vitest';
import { PLAN_TOOL_CATALOG, resolvePlanTools } from '../planToolCatalog.js';

/** activeTool prefixes consumed by a draw host inside VisionLayoutCanvas. */
const PLAN_CANVAS_HOST_PREFIXES = [
  'plan.',
  'observe.',
  'act.terrain.slope-',
  'act.ecology.veg-survey',
] as const;

const hasPlanCanvasHost = (mapToolId: string): boolean =>
  PLAN_CANVAS_HOST_PREFIXES.some((prefix) => mapToolId.startsWith(prefix));

describe('planRailHostCoverage -- every map tool has a Plan-canvas host', () => {
  it('every map-arm catalog tool resolves to a hosted mapToolId', () => {
    const orphans: string[] = [];
    for (const tool of Object.values(PLAN_TOOL_CATALOG)) {
      if (tool.arm.kind !== 'map') continue;
      if (!hasPlanCanvasHost(tool.arm.mapToolId)) {
        orphans.push(`${tool.id} -> ${tool.arm.mapToolId}`);
      }
    }
    // An orphan here is a map tool that would arm on the Plan rail but draw
    // nothing (no host in VisionLayoutCanvas consumes its activeTool prefix).
    expect(orphans).toEqual([]);
  });
});

describe('planRailHostCoverage -- field logs are stripped from the Plan rail', () => {
  // Mirrors the s6-integration-design stratum default in objectiveActTools.ts:
  // it interleaves map/design tools with the harvest / livestock field logs.
  // The Plan rail must keep the former and drop the latter. (Hardcoded rather
  // than imported to decouple this guard from the shared-relationships file's
  // active churn -- only the log-vs-non-log split matters here.)
  const S6_DEFAULT_IDS = [
    'crops',
    'orchards',
    'paddocks',
    'beds',
    'compost',
    'harvest',
    'livestock',
    'flow-connector',
  ];

  it('resolvePlanTools emits no log-arm tools', () => {
    const tools = resolvePlanTools(S6_DEFAULT_IDS);
    expect(tools.every((tool) => tool.arm.kind !== 'log')).toBe(true);
  });

  it('drops the harvest and livestock field-log tiles specifically', () => {
    const ids = resolvePlanTools(S6_DEFAULT_IDS).map((tool) => tool.id);
    expect(ids).not.toContain('harvest');
    expect(ids).not.toContain('livestock');
  });

  it('keeps the non-log tools from the same id set (no objective emptied)', () => {
    const ids = resolvePlanTools(S6_DEFAULT_IDS).map((tool) => tool.id);
    expect(ids).toContain('flow-connector');
    expect(ids.length).toBeGreaterThan(0);
  });
});
