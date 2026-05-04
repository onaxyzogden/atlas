/**
 * @vitest-environment happy-dom
 *
 * DiagnoseCategoryDrawer smoke test:
 *   - Renders the category title, status pill, and the three narrative sections.
 *   - Renders supporting metrics and scoped insights.
 *   - ESC closes the drawer.
 *   - Backdrop click closes the drawer.
 *   - Close button click closes the drawer.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DiagnoseCategoryDrawer from "../DiagnoseCategoryDrawer.js";
import type { CategoryDetail, DiagnoseCategory, Insight } from "../../types.js";

const category: DiagnoseCategory = {
  id: "water",
  title: "Water",
  status: "at-risk",
  statusLabel: "At Risk",
  summary: "summary",
  meaning: "meaning",
  metric: { label: "Well yield", value: "4 gpm" },
};

const detail: CategoryDetail = {
  whatsHappening: "A seasonal stream and one well at 4 gpm.",
  whatsWrong: "Yield is half the herd requirement.",
  whatNext: "Deepen well or add storage.",
  metrics: [
    { label: "Well yield", value: "4 gpm", hint: "tested Mar 2026" },
    { label: "Required", value: "8 gpm" },
  ],
  mapHint: "Stream sits along the east boundary.",
};

const insights: Insight[] = [
  {
    id: "r1",
    kind: "risk",
    title: "Insufficient yield",
    detail: "Well yields half what the herd needs.",
    categoryIds: ["water"],
  },
];

describe("DiagnoseCategoryDrawer", () => {
  it("renders the category header, sections, metrics, and insights", () => {
    render(
      <DiagnoseCategoryDrawer
        category={category}
        detail={detail}
        insights={insights}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("dialog", { name: /Water detail/ })).toBeTruthy();
    expect(screen.getByText("Water")).toBeTruthy();
    expect(screen.getByText("At Risk")).toBeTruthy();

    expect(screen.getByText("What's happening")).toBeTruthy();
    expect(screen.getByText(detail.whatsHappening)).toBeTruthy();
    expect(screen.getByText("What's wrong")).toBeTruthy();
    expect(screen.getByText(detail.whatsWrong)).toBeTruthy();
    expect(screen.getByText("What next")).toBeTruthy();
    expect(screen.getByText(detail.whatNext)).toBeTruthy();

    expect(screen.getByText("Well yield")).toBeTruthy();
    expect(screen.getByText("4 gpm")).toBeTruthy();
    expect(screen.getByText("tested Mar 2026")).toBeTruthy();

    expect(screen.getByText("Insufficient yield")).toBeTruthy();
    expect(screen.getByText(/east boundary/)).toBeTruthy();
  });

  it("closes on ESC", () => {
    const onClose = vi.fn();
    render(
      <DiagnoseCategoryDrawer
        category={category}
        detail={detail}
        insights={insights}
        onClose={onClose}
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on backdrop click", () => {
    const onClose = vi.fn();
    const { container } = render(
      <DiagnoseCategoryDrawer
        category={category}
        detail={detail}
        insights={insights}
        onClose={onClose}
      />,
    );
    const scrim = container.firstChild as HTMLElement;
    fireEvent.click(scrim);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicking inside the panel does not close", () => {
    const onClose = vi.fn();
    render(
      <DiagnoseCategoryDrawer
        category={category}
        detail={detail}
        insights={insights}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByText("Water"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("close button calls onClose", () => {
    const onClose = vi.fn();
    render(
      <DiagnoseCategoryDrawer
        category={category}
        detail={detail}
        insights={insights}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByLabelText("Close drill-down"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
