/**
 * @vitest-environment happy-dom
 *
 * V3LifecycleSidebar render smoke.
 *
 * Verifies the current Observe/Plan/Act IA:
 *   - Project Home link nested under the project layout
 *   - Three stage groups (Observe · Plan · Act) with their descriptions
 *   - Active stage is expanded by default; collapsed siblings show their
 *     header but no module list
 *   - Ethics & Principles utility link points at the project-scoped route
 *   - Disabled P1 utilities (Plant Database · Climate Tools) render as
 *     real disabled buttons
 *
 * Router and store are mocked — the test isolates sidebar rendering.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Lucide-react 1.8.0's Icon component spreads `[undefined]` into <svg>
// children, which trips React 18's strict child reconciliation under
// happy-dom. Replace every icon factory with a stub <span>; the test only
// cares about labels/aria, not the SVG paths. We use a Proxy so any icon
// imported anywhere in the dependency graph (act/types.ts, plan/types.ts
// etc.) resolves to the same stub.
vi.mock("lucide-react", () => {
  const Stub = ({ ...rest }: Record<string, unknown>) => (
    <span data-icon="stub" {...(rest as Record<string, never>)} />
  );
  return new Proxy(
    { default: Stub },
    {
      get: (target, prop) => {
        if (prop in target) return (target as Record<string | symbol, unknown>)[prop];
        if (typeof prop === "string") return Stub;
        return undefined;
      },
    },
  );
});

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    params: _params,
    ...rest
  }: {
    to: string;
    children: React.ReactNode;
    params?: Record<string, string>;
  } & Record<string, unknown>) => (
    <a href={typeof to === "string" ? to : "#"} {...rest}>
      {children}
    </a>
  ),
  useParams: () => ({ projectId: "mtc" }),
  useRouterState: <T,>(opts?: {
    select?: (s: { location: { pathname: string } }) => T;
  }) => {
    const state = { location: { pathname: "/v3/project/mtc/observe" } };
    return opts?.select ? opts.select(state) : (state as unknown as T);
  },
  useNavigate: () => () => {},
}));

import V3LifecycleSidebar from "../V3LifecycleSidebar.js";

describe("V3LifecycleSidebar", () => {
  it("renders Project Home link under the project layout", () => {
    render(<V3LifecycleSidebar activeStage="home" />);
    const link = screen.getByText("Project Home").closest("a");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe("/v3/project/$projectId/home");
  });

  it("renders the three stage groups (Observe · Plan · Act)", () => {
    render(<V3LifecycleSidebar activeStage="home" />);
    expect(screen.getByText("Observe")).toBeTruthy();
    expect(screen.getByText("Plan")).toBeTruthy();
    expect(screen.getByText("Act")).toBeTruthy();
    // Stage descriptions verify the group headers, not just stray labels.
    expect(screen.getByText("Read the land")).toBeTruthy();
    expect(screen.getByText("Design the land")).toBeTruthy();
    expect(screen.getByText("Build & operate")).toBeTruthy();
  });

  it("Ethics & Principles is a real link nested under the project layout", () => {
    render(<V3LifecycleSidebar activeStage="home" />);
    const link = screen.getByText("Ethics & Principles").closest("a");
    expect(link).toBeTruthy();
    expect(link?.getAttribute("href")).toBe(
      "/v3/project/$projectId/reference/ethics",
    );
  });

  it("renders P1 utilities (Plant Database · Climate Tools) as disabled buttons", () => {
    render(<V3LifecycleSidebar activeStage="home" />);
    const plants = screen.getByText("Plant Database").closest("button");
    const climate = screen.getByText("Climate Tools").closest("button");
    expect(plants?.hasAttribute("disabled")).toBe(true);
    expect(climate?.hasAttribute("disabled")).toBe(true);
  });

  it("expands the active stage group by default", () => {
    render(<V3LifecycleSidebar activeStage="observe" />);
    // The Observe header button reports aria-expanded=true; Plan/Act are false.
    const observeBtn = screen.getByText("Observe").closest("button");
    const planBtn = screen.getByText("Plan").closest("button");
    const actBtn = screen.getByText("Act").closest("button");
    expect(observeBtn?.getAttribute("aria-expanded")).toBe("true");
    expect(planBtn?.getAttribute("aria-expanded")).toBe("false");
    expect(actBtn?.getAttribute("aria-expanded")).toBe("false");
  });
});
