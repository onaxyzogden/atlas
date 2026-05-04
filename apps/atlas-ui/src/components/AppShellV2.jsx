import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "@tanstack/react-router";
import { Icon } from "../icons.js";
import { IconButton, Tooltip } from "./primitives/index.js";
import { useKeyboard } from "../hooks/useKeyboard.js";

// AppShellV2 — unified atlas-ui shell.
//
// Layout (CSS grid):
//   [sidebar] [main]                  → contained
//   [sidebar] [main] [optional right] → contained + rightPanel
//   [sidebar] [main, full-bleed]      → fullscreen (no main padding; map-friendly)
//
// Slots:
//   - <AppShell.TopbarSlot> portal target lets pages inject contextual actions
//     into the topbar without prop-drilling. Mount inside the page tree.
//
// navConfig shape (progressive disclosure-friendly):
//   [{ key, label, to, icon, group?, children?: navConfig }]

const TopbarPortalContext = createContext(null);

export function AppShellV2({
  navConfig = [],
  brand = "atlas",
  topbarChildren,
  rightPanel,
  layout = "contained",
  collapsible = true,
  defaultCollapsed = false,
  children,
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const topbarSlotRef = useRef(null);
  const [topbarSlotEl, setTopbarSlotEl] = useState(null);

  useEffect(() => {
    setTopbarSlotEl(topbarSlotRef.current);
  }, []);

  const portalApi = useMemo(() => ({ element: topbarSlotEl }), [topbarSlotEl]);

  const gridClass = `appshell appshell--${layout} ${collapsed ? "appshell--collapsed" : ""}`.trim();

  return (
    <TopbarPortalContext.Provider value={portalApi}>
      <div className={gridClass}>
        <Sidebar
          navConfig={navConfig}
          brand={brand}
          collapsed={collapsed}
          onToggle={collapsible ? () => setCollapsed((c) => !c) : null}
        />
        <header className="appshell__topbar" role="banner">
          <div ref={topbarSlotRef} className="appshell__topbar-slot">
            {topbarChildren}
          </div>
        </header>
        <main className="appshell__main" role="main">
          {children}
        </main>
        {rightPanel ? (
          <aside className="appshell__right" aria-label="Side panel">
            {rightPanel}
          </aside>
        ) : null}
      </div>
    </TopbarPortalContext.Provider>
  );
}

// Page-level helper to inject topbar content via portal.
export function TopbarSlot({ children }) {
  const ctx = useContext(TopbarPortalContext);
  if (!ctx?.element) return null;
  return createPortal(children, ctx.element);
}

AppShellV2.TopbarSlot = TopbarSlot;

function Sidebar({ navConfig, brand, collapsed, onToggle }) {
  return (
    <nav className="appshell__sidebar" aria-label="Primary">
      <div className="appshell__brand">
        <span className="appshell__brand-mark" aria-hidden="true">◐</span>
        {!collapsed ? <span className="appshell__brand-name">{brand}</span> : null}
        {onToggle ? (
          <Tooltip content={collapsed ? "Expand" : "Collapse"} side="right">
            <IconButton
              label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              size="sm"
              onClick={onToggle}
              className="appshell__collapse"
            >
              <Icon.chevronRight style={{ transform: collapsed ? "none" : "rotate(180deg)" }} />
            </IconButton>
          </Tooltip>
        ) : null}
      </div>
      <ul className="appshell__nav">
        {navConfig.map((item) => (
          <NavItem key={item.key ?? item.to ?? item.label} item={item} collapsed={collapsed} />
        ))}
      </ul>
    </nav>
  );
}

function NavItem({ item, collapsed, depth = 0 }) {
  const location = useLocation();
  const groupId = useId();
  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const isActiveSelf = item.to && location.pathname === item.to;
  const isActiveDescendant =
    hasChildren && item.children.some((c) => c.to && location.pathname.startsWith(c.to));
  const [open, setOpen] = useState(isActiveDescendant || depth === 0);

  useEffect(() => {
    if (isActiveDescendant) setOpen(true);
  }, [isActiveDescendant]);

  const IconCmp = item.icon ? Icon[item.icon] : null;

  if (hasChildren) {
    return (
      <li className="appshell__nav-group">
        <button
          type="button"
          className={`appshell__nav-link appshell__nav-link--group ${open ? "is-open" : ""}`}
          aria-expanded={open}
          aria-controls={groupId}
          onClick={() => setOpen((v) => !v)}
        >
          {IconCmp ? <IconCmp aria-hidden="true" /> : <span className="appshell__nav-bullet" aria-hidden="true" />}
          {!collapsed ? <span className="appshell__nav-label">{item.label}</span> : null}
          {!collapsed ? (
            <Icon.chevronRight
              aria-hidden="true"
              className="appshell__nav-caret"
              style={{ transform: open ? "rotate(90deg)" : "none" }}
            />
          ) : null}
        </button>
        {open && !collapsed ? (
          <ul id={groupId} className="appshell__nav-children">
            {item.children.map((c) => (
              <NavItem key={c.key ?? c.to ?? c.label} item={c} collapsed={collapsed} depth={depth + 1} />
            ))}
          </ul>
        ) : null}
      </li>
    );
  }

  const link = (
    <Link
      to={item.to}
      className={`appshell__nav-link ${isActiveSelf ? "is-active" : ""}`}
      aria-current={isActiveSelf ? "page" : undefined}
    >
      {IconCmp ? <IconCmp aria-hidden="true" /> : <span className="appshell__nav-bullet" aria-hidden="true" />}
      {!collapsed ? <span className="appshell__nav-label">{item.label}</span> : null}
    </Link>
  );

  return (
    <li className="appshell__nav-item">
      {collapsed ? <Tooltip content={item.label} side="right">{link}</Tooltip> : link}
    </li>
  );
}

// Convenience: bind mod+k to a callback (SearchPalette wires this in a later step).
export function useShellShortcuts({ onPalette } = {}) {
  useKeyboard("mod+k", (e) => {
    if (!onPalette) return;
    e.preventDefault();
    onPalette();
  }, [onPalette]);
}
