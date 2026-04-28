/**
 * @vitest-environment happy-dom
 *
 * V3LifecycleSidebar render smoke + P0 utility wiring.
 *
 * Verifies the Phase B redesign:
 *   - Phase group labels (Understand · Design · Live)
 *   - Renamed stage labels (Observe / Test / Steward / Evaluate)
 *   - P0 utilities surface real affordances:
 *       Ethics & Principles → real link to /v3/project/$projectId/reference/ethics
 *       Matrix Toggles      → button that opens the popover
 *   - P1 utilities render disabled.
 *
 * Router and store are mocked — the test isolates sidebar rendering.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode } & Record<string, unknown>) => (
    <a href={typeof to === "string" ? to : "#"} {...rest}>
      {children}
    </a>
  ),
  useParams: () => ({ projectId: "mtc" }),
}));

vi.mock("../../../store/matrixTogglesStore.js", () => {
  // All three overlays on so the badge counts 3.
  const state = { topography: true, sectors: true, zones: true };
  return {
    useMatrixTogglesStore: (selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state,
  };
});

import V3LifecycleSidebar from "../V3LifecycleSidebar.js";

describe("V3LifecycleSidebar (Phase B)", () => {
  beforeEach(() => {
    // Each render gets a fresh component tree — popover state resets.
  });

  it("renders the three permaculture phase groups", () => {
    render(<V3LifecycleSidebar activeStage="home" />);
    expect(screen.getByText("Understand")).toBeTruthy();
    // "Design" appears as both a group label and a stage label — assert ≥2.
    expect(screen.getAllByText("Design").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Live")).toBeTruthy();
  });

  it("renames stages per the Permaculture Scholar dialogue", () => {
    render(<V3LifecycleSidebar activeStage="home" />);
    expect(screen.getByText("Observe")).toBeTruthy();
    expect(screen.getByText("Test")).toBeTruthy();
    expect(screen.getByText(/Steward/)).toBeTruthy();
    expect(screen.getByText("Evaluate")).toBeTruthy();
  });

  it("Ethics & Principles is a real link nested under the project layout", () => {
    render(<V3LifecycleSidebar activeStage="home" />);
    const link = screen.getByText("Ethics & Principles").closest("a");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe("/v3/project/$projectId/reference/ethics");
  });

  it("Matrix Toggles button opens the popover on click", () => {
    render(<V3LifecycleSidebar activeStage="home" />);
    const btn = screen.getByText(/Matrix Toggles/).closest("button");
    expect(btn).toBeTruthy();
    expect(btn?.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn!);
    expect(btn?.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("Matrix Toggles label shows the active count badge when overlays are on", () => {
    render(<V3LifecycleSidebar activeStage="home" />);
    // Mock store has all three overlays on → count=3
    const btn = screen.getByText(/Matrix Toggles/).closest("button")!;
    expect(btn.textContent).toMatch(/3/);
  });

  it("renders P1 utilities as disabled buttons", () => {
    render(<V3LifecycleSidebar activeStage="home" />);
    const plants = screen.getByText("Plant Database").closest("button");
    const climate = screen.getByText("Climate Tools").closest("button");
    expect(plants?.hasAttribute("disabled")).toBe(true);
    expect(climate?.hasAttribute("disabled")).toBe(true);
  });
});
