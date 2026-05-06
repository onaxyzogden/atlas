/**
 * V3LifecycleSidebar — slimmed project chrome.
 *
 * Per-stage navigation list was removed when LevelNavigator (mounted inside
 * ObserveLayout) became the level switcher for the new 3-stage Observe / Plan
 * / Act model. The sidebar now hosts:
 *   - Project Home link
 *   - Reference utilities (Ethics & Principles, Matrix Toggles, disabled stubs)
 *
 * The 7-stage components and routes remain in the repo and are reachable via
 * direct URL — they are candidates for reuse inside Plan and Act surfaces in
 * Phase C. The original phase-grouped stage list (Understand / Design / Live)
 * is intentionally omitted here, not deleted; restore from git history if
 * Phase C reintroduces a per-stage sidebar.
 */

import { useState } from "react";
import { Link, useParams } from "@tanstack/react-router";
import { useMatrixTogglesStore } from "../../store/matrixTogglesStore.js";
import MatrixTogglesPopover from "./MatrixTogglesPopover.js";
import type { RailStage } from "./DecisionRail.js";
import css from "./V3LifecycleSidebar.module.css";

interface DisabledLink {
  id: string;
  label: string;
  description: string;
}

const DISABLED_LINKS: DisabledLink[] = [
  { id: "plants", label: "Plant Database", description: "Species lookup & guilds" },
  { id: "climate", label: "Climate Tools", description: "Hardiness · solar angle · weather" },
];

export interface V3LifecycleSidebarProps {
  activeStage: RailStage;
}

export default function V3LifecycleSidebar({ activeStage }: V3LifecycleSidebarProps) {
  const params = useParams({ strict: false }) as { projectId?: string };
  const projectId = params.projectId ?? "mtc";

  const [matrixOpen, setMatrixOpen] = useState(false);
  const matrixActiveCount = useMatrixTogglesStore(
    (s) => Number(s.topography) + Number(s.sectors) + Number(s.zones) + Number(s.wind),
  );

  return (
    <nav aria-label="Project chrome" className={css.sidebar}>
      <header className={css.header}>
        <span className={css.eyebrow}>Project</span>
      </header>

      <Link
        to="/v3/project/$projectId/home"
        params={{ projectId }}
        className={`${css.homeLink} ${activeStage === "home" ? css.active : ""}`}
      >
        Project Home
      </Link>

      <footer className={css.footer}>
        <span className={css.eyebrow}>Reference</span>
        <ul className={css.utilityList}>
          <li className={css.utilityItem}>
            <Link
              to="/v3/project/$projectId/reference/ethics"
              params={{ projectId }}
              className={css.utilityBtn}
              title="Earth Care · People Care · Fair Share"
            >
              <span className={css.utilityLabel}>Ethics &amp; Principles</span>
              <span className={css.utilityDesc}>
                Earth Care · People Care · Fair Share
              </span>
            </Link>
          </li>

          <li className={css.utilityItem}>
            <button
              type="button"
              className={css.utilityBtn}
              aria-expanded={matrixOpen}
              aria-haspopup="dialog"
              onClick={() => setMatrixOpen((open) => !open)}
              title="Topography · Sectors · Zones · Wind overlay"
            >
              <span className={css.utilityLabel}>
                Matrix Toggles
                {matrixActiveCount > 0 && (
                  <span className={css.utilityCount} aria-label={`${matrixActiveCount} active`}>
                    {matrixActiveCount}
                  </span>
                )}
              </span>
              <span className={css.utilityDesc}>
                Topography · Sectors · Zones · Wind overlay
              </span>
            </button>
          </li>

          {DISABLED_LINKS.map((link) => (
            <li key={link.id} className={css.utilityItem}>
              <button
                type="button"
                className={`${css.utilityBtn} ${css.utilityDisabled}`}
                disabled
                title="Coming soon"
              >
                <span className={css.utilityLabel}>{link.label}</span>
                <span className={css.utilityDesc}>Coming soon</span>
              </button>
            </li>
          ))}
        </ul>
        {matrixOpen && (
          <MatrixTogglesPopover onClose={() => setMatrixOpen(false)} />
        )}
      </footer>
    </nav>
  );
}
