/**
 * SetBoundaryCTA — floating bento card shown on the OLOS map when the
 * project has neither a boundary polygon nor a center point. Prompts the
 * steward to set a project boundary so site-specific overlays can mount.
 *
 * Anchored bottom-right of the map host. Uses platform tokens (no local
 * theming) so it inherits the dark/light palette automatically.
 *
 * Target route: the per-project True North / Stage Zero setup surface,
 * which is the existing entry point for project location + vision data.
 * If a dedicated boundary editor lands later, swap the `to` target.
 */

import { Link } from '@tanstack/react-router';
import css from './SetBoundaryCTA.module.css';

export interface SetBoundaryCTAProps {
  projectId: string;
}

export default function SetBoundaryCTA({ projectId }: SetBoundaryCTAProps) {
  return (
    <aside className={css.cta} aria-label="Set project boundary">
      <h3 className={css.title}>No boundary set</h3>
      <p className={css.body}>
        Set a project boundary to enable site-specific overlays and
        location-aware tools.
      </p>
      <Link
        to="/v3/project/$projectId/true-north"
        params={{ projectId }}
        className={css.link}
      >
        Set boundary →
      </Link>
    </aside>
  );
}
