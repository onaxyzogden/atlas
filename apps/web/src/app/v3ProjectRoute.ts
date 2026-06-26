// v3ProjectRoute — single source of truth for "is this a project sub-route, and
// which ceremony stage (if any) is active" used by AppShell to decide whether to
// render the project switcher. Extracted from AppShell so the matching is
// unit-testable (the switcher previously rendered ONLY on the four stage routes,
// so /home, /wizard, /protocols and /olos had no switcher — reachable only by
// deep link / back-button).

export const V3_PROJECT_STAGES = ['observe', 'plan', 'act', 'report'] as const;
export type V3Stage = (typeof V3_PROJECT_STAGES)[number];

// Match the project id + the first path segment under it. The segment set is
// broad on purpose (all real project sub-routes), so the switcher renders
// everywhere a project is in context — not just the four ceremony stages.
const V3_PROJ_RE =
  /^\/v3\/project\/([^/]+)\/(observe|plan|act|report|home|wizard|protocols|olos)/;

export interface V3ProjectRouteMatch {
  /** The project id from the path, or null when this isn't a project sub-route. */
  projectId: string | null;
  /** The active ceremony stage, or null for non-stage segments (home/wizard/…). */
  stage: V3Stage | null;
}

function isStage(segment: string): segment is V3Stage {
  return (V3_PROJECT_STAGES as readonly string[]).includes(segment);
}

/**
 * Parse a pathname into its project id + ceremony stage. Non-stage project
 * segments (home, wizard, protocols, olos) still yield a projectId so the
 * switcher renders, but leave `stage` null so its links fall back to /plan.
 */
export function matchV3ProjectRoute(pathname: string): V3ProjectRouteMatch {
  const m = V3_PROJ_RE.exec(pathname);
  if (!m) return { projectId: null, stage: null };
  // Both groups are guaranteed by a successful match, but the strict indexed
  // access type is `string | undefined` — normalize defensively.
  const projectId = m[1] ?? null;
  const segment = m[2];
  return { projectId, stage: segment && isStage(segment) ? segment : null };
}
