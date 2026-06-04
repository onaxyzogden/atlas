# OLOS — Consultation Deck (Gamma-ready outline)

> **How to use:** Go to gamma.app → New → **Paste in text** → paste everything
> below the line. Each `---` is a card/slide boundary. Gamma will design it.
> Keep "Card by card" mode so it respects the breaks. Companion to
> `olos-consultation-brief.md`.

---

# OLOS — OGDEN Land OS

A geospatial land-intelligence platform for land design.

*A tool for seeing land whole — and building it wisely.*

---

## The problem

Land design today is fragmented across siloed tools:

- GIS for mapping, spreadsheets for budgets, separate software for layouts, paper for field notes
- Nothing carries the *site itself* across the journey
- Context is lost at every handoff: assess → design → build → monitor

OLOS keeps one continuous thread: same land, same data, same plan — survey to stewardship.

---

## Who it's for

Stewardship-conscious land designers:

- Regenerative agriculture
- Permaculture design
- Conservation projects
- Intentional communities
- Homesteads
- Agritourism / retreat centers

Each project type foregrounds the factors that matter most — without hiding the rest.

---

## The big idea — universal domains

Every land project is understood through the same recurring areas of stewardship:

Water · Soil · Topography · Climate · Ecology · Plants · Animals · Infrastructure · Access · Energy & resource flows · People & governance · Economics · Risk & compliance · Monitoring · Vision · Land base

The land itself imposes these. They are fields of stewardship, not software modules.

---

## The big idea — one domain, three verbs

The domain stays constant across the lifecycle; only the verb changes.

| Stage | What the steward does | Example: Water |
|---|---|---|
| Observe | Document what is happening | Map runoff, wells, flood risk |
| Plan | Decide what should happen | Decide ponds, swales, irrigation |
| Act | Execute, verify, maintain | Build swales, install tanks, monitor |

**Observe → Plan → Act** is the backbone of the whole app. Report is a sibling output, not a stage.

---

## What it does — Phase 1: Site Intelligence

*(largely complete)*

- Interactive mapping fed by public GIS data
- Site assessment scoring
- Terrain / elevation, climate, hydrology, and ecological dashboards

The foundation: bring a property in and see it whole.

---

## What it does — Phase 2: Design Atlas

*(in progress)*

- Design and planting tools
- Nursery ledger and forest hub
- Phasing and labor planning
- Economic and financial modeling

Turning assessment into an actionable, costed design.

---

## What it does — Phases 3 & 4

**Phase 3 — Collaboration + AI** *(in progress)*
- Real-time collaboration, comments, role-based access
- AI-assisted design and analysis (gated)

**Phase 4 — Public + Portal** *(in progress)*
- Public portal pages, narrative "story scenes," embedded maps

---

## Architecture & technology

A modern TypeScript monorepo (pnpm + Turborepo): web · api · shared.

- **Frontend:** React 18 · TypeScript · Vite · Zustand
- **Maps:** MapLibre GL JS (2D) + CesiumJS (3D)
- **Backend:** Fastify + Node.js
- **Data:** PostgreSQL 16 + PostGIS · BullMQ + Redis · Supabase storage

Manifest-driven modules, phase-gated rollout. Data layer is country-agnostic; tuned first for Ontario, Canada.

---

## Where it stands

An advanced beta with an opinionated architecture and a phased roadmap.

- **Phase 1:** feature-complete, usable for real site analysis
- **Phase 2:** well along
- **Phase 3:** partial — collaboration scaffolded, AI gated
- **Phase 4:** mostly stubbed

Built by a very small team. Past prototype, not yet production-hardened: no external SSO yet; multi-tenant scaling unproven.

---

## Grounding ethos

OLOS is built on a stewardship ethic — software as a faithful steward of the user's relationship to their land.

That value shapes priorities: coherence, honesty about constraints, long-term care. The product itself is a general-purpose land design tool.

---

## What we're seeking from you

- **Roadmap & scope** — for a small team, what to finish, defer, or cut for a first pilot?
- **Path to production** — where to harden first (auth/SSO, multi-tenancy, reliability)?
- **Delivery & process** — managing four parallel phases without overcommitting
- **Validation** — structuring early pilots to learn fastest with least build
