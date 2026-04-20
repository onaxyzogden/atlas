/**
 * Sprint BJ — dev-only render profiler.
 *
 * Wraps React's built-in <Profiler> and logs `actualDuration` only when it
 * exceeds one 60 fps frame (16 ms). Gated behind `import.meta.env.DEV` so
 * production builds tree-shake the whole module.
 *
 * Usage:
 *   <SectionProfiler id="site-intel-scores">
 *     {...heavy JSX...}
 *   </SectionProfiler>
 *
 * Telemetry feeds the follow-on sprint that will extract the heavy
 * SiteIntelligencePanel sections into memoized sub-components.
 */

import { Profiler, type ProfilerOnRenderCallback, type ReactNode } from 'react';

const THRESHOLD_MS = 16; // one 60 fps frame

const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
  if (actualDuration > THRESHOLD_MS) {
    // eslint-disable-next-line no-console
    console.info(`[perf] ${id} ${phase} ${actualDuration.toFixed(1)}ms`);
  }
};

export function SectionProfiler({ id, children }: { id: string; children: ReactNode }) {
  if (!import.meta.env.DEV) return <>{children}</>;
  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}
