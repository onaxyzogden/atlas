# ADR: Dashboard Sidebar Group Organization
**Date:** 2026-04-11
**Status:** accepted

## Context
Four implemented panels (EconomicsPanel, RegulatoryPanel, ScenarioPanel, InvestorSummaryExport) had no sidebar entries and were unreachable in the UI. They needed to be organized into logical groups.

## Decision
Added two new groups to DashboardSidebar:
- **Finance** (color `#7a9a8a`, teal-green): Economics, Scenarios, Investor Summary
- **Compliance** (color `#8a8a6a`, olive): Regulatory

Placed between Hydrology & Terrain and General groups.

DashboardRouter updated with lazy imports and switch cases for all four panels. InvestorSummaryExport's `onClose` prop mapped to `onSwitchToMap`.

## Consequences
- Finance and Compliance are now first-class dashboard domains
- Group ordering: Grazing → Forestry → Hydrology → Finance → Compliance → General
- New panels added to these domains should follow the same pattern (add to sidebar group + router case)
