import { useState } from "react";
import {
  AppShell,
  SearchPalette,
  TopbarSlot,
  useShellShortcuts,
  Button,
  IconButton,
} from "../components/index.js";
import { Icon } from "../icons.js";
import { observeNav } from "../data/navConfig.js";

export function DevShellPage() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [layout, setLayout] = useState("contained");
  const [showRight, setShowRight] = useState(true);

  useShellShortcuts({ onPalette: () => setPaletteOpen(true) });

  const rightPanel = showRight ? (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
      <h3 style={{ margin: 0, fontFamily: "var(--olos-font-display)" }}>Side panel</h3>
      <p style={{ color: "var(--olos-text-label)", fontSize: "var(--text-sm)" }}>
        Optional 320px panel for context, filters, or insights.
      </p>
    </div>
  ) : null;

  return (
    <>
      <AppShell
        navConfig={observeNav}
        brand="atlas"
        layout={layout}
        rightPanel={rightPanel}
        topbarChildren={
          <>
            <strong style={{ fontFamily: "var(--olos-font-display)", fontSize: "var(--text-lg)" }}>
              /dev/shell
            </strong>
            <span style={{ color: "var(--olos-text-label)", fontSize: "var(--text-sm)" }}>
              AppShell showcase
            </span>
            <span style={{ flex: 1 }} />
            <Button variant="ghost" size="sm" onClick={() => setPaletteOpen(true)}>
              <Icon.search /> Search <kbd style={{ marginLeft: 6, padding: "1px 6px", border: "1px solid var(--olos-line-soft)", borderRadius: "var(--radius-xs)", fontSize: "var(--text-xs)" }}>⌘K</kbd>
            </Button>
            <IconButton label="Settings"><Icon.settings /></IconButton>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
          <section>
            <h1 style={{ fontFamily: "var(--olos-font-display)", margin: 0 }}>
              Unified shell preview
            </h1>
            <p style={{ color: "var(--olos-text-label)" }}>
              Sidebar nav uses progressive-disclosure groups. Press <kbd>⌘K</kbd> /
              <kbd>Ctrl+K</kbd> to open the search palette. Resize tests responsive
              breakpoints; "fullscreen" layout removes main padding for map views.
            </p>
          </section>

          <section style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
            <Button variant={layout === "contained" ? "primary" : "secondary"} onClick={() => setLayout("contained")}>
              Contained layout
            </Button>
            <Button variant={layout === "fullscreen" ? "primary" : "secondary"} onClick={() => setLayout("fullscreen")}>
              Fullscreen layout
            </Button>
            <Button variant="ghost" onClick={() => setShowRight((s) => !s)}>
              {showRight ? "Hide" : "Show"} right panel
            </Button>
          </section>

          <DemoCards />

          <PortalDemo />
        </div>
      </AppShell>

      <SearchPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}

function DemoCards() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-4)" }}>
      {["Tokens", "Primitives", "Shell", "Feedback"].map((label, i) => (
        <div
          key={label}
          style={{
            padding: "var(--space-5)",
            background: "var(--elev-2-bg)",
            border: "var(--elev-2-border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <small style={{ color: "var(--olos-text-label)" }}>Phase {i + 1}</small>
          <h3 style={{ margin: "var(--space-2) 0 0", fontFamily: "var(--olos-font-display)" }}>{label}</h3>
        </div>
      ))}
    </div>
  );
}

function PortalDemo() {
  return (
    <section
      style={{
        padding: "var(--space-5)",
        background: "var(--elev-1-bg)",
        border: "var(--elev-1-border)",
        borderRadius: "var(--radius-md)",
      }}
    >
      <h3 style={{ margin: 0, fontFamily: "var(--olos-font-display)" }}>TopbarSlot portal</h3>
      <p style={{ color: "var(--olos-text-label)" }}>
        Pages can inject contextual actions into the topbar from anywhere in their tree:
      </p>
      <TopbarSlot>
        <span
          style={{
            marginLeft: "var(--space-3)",
            padding: "2px 8px",
            background: "rgba(165,199,54,0.12)",
            border: "1px solid rgba(165,199,54,0.24)",
            borderRadius: "var(--radius-xs)",
            fontSize: "var(--text-xs)",
          }}
        >
          via portal
        </span>
      </TopbarSlot>
    </section>
  );
}
