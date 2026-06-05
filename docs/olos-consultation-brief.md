# OLOS — Consultation Brief

*A primer for project-planning, development, and management advisors.*
*Prepared for external consultation · no prior context assumed.*

---

## 1. What OLOS is

**OLOS (OGDEN Land OS) is a geospatial land-intelligence web application for
land design** — a tool for seeing a piece of land whole, and building it wisely.

A landowner, farm planner, or design practitioner brings a property into OLOS and
the application pulls in public geospatial data (elevation, soils, hydrology,
climate, land cover), lets them draw and edit directly on an interactive map,
scores the site across the factors that matter, and then carries that same site
coherently from initial assessment through design into on-the-ground execution and
monitoring. It is, in short, a single workspace for the entire life of a land
project rather than a collection of disconnected tools.

---

## 2. The problem it addresses

Land design today is **fragmented across siloed tools**. A practitioner juggles a
GIS package for mapping, spreadsheets for budgets and labor, separate design
software for layouts, and paper or photo notes from the field. Nothing carries the
*site itself* across the journey — so context is lost at every handoff between
assessing the land, designing it, building it, and monitoring how it performs.

OLOS exists to keep one continuous thread: the same land, the same data, the same
plan, followed from first survey to long-term stewardship.

---

## 3. Who it is for

Stewardship-conscious land designers and the projects they run:

- **Regenerative agriculture** operations
- **Permaculture** design practitioners
- **Conservation** projects
- **Intentional communities**
- **Homesteads**
- **Agritourism / retreat centers**

Each project type foregrounds the factors that matter most to it (a regenerative
farm leads with soil, water, plants, animals; a conservation project leads with
ecology, water, climate) — without ever hiding the rest.

---

## 4. The core model (the one big idea)

OLOS is organized around two interlocking ideas. Understanding these is enough to
understand the whole product.

**a. Universal domains of land stewardship.** Every land project, whatever its
type, is understood through the same recurring areas of stewardship — water, soil,
topography, climate, ecology, plants, animals, built infrastructure, access &
circulation, energy & resource flows, people & governance, economics, risk &
compliance, monitoring, and the project's own vision and land base. The land itself
imposes these; they are not software modules, they are real fields of stewardship.

**b. One domain, three verbs — the Observe → Plan → Act lifecycle.** The key
insight: *the domain stays constant across the lifecycle; only the verb changes.*
A project never stops caring about water — it just does something different with it
at each stage:

| Stage | What the steward does | Example: the Water domain |
|---|---|---|
| **Observe** | Document what is happening | Map runoff, wet/dry areas, wells, drainage, flood risk |
| **Plan** | Decide what should happen | Decide ponds, swales, roof catchment, irrigation, storage |
| **Act** | Execute, verify, and maintain | Build swales, install tanks, repair drainage, then monitor |

A **Report** surface presents the results but is a sibling output, not a fourth
stage. This Observe → Plan → Act spine is the backbone of the whole application.

> *Note for advisors:* the unified 16-domain framing is an adopted design direction
> (recorded as an architectural decision) that the codebase is migrating toward.
> Today the three stages still carry their own stage-local module sets; converging
> them onto the single universal-domain backbone is active, in-progress work.

---

## 5. What it does — capabilities by phase

OLOS is built in four phases, gated so capabilities roll out in sequence.

- **Phase 1 — Site Intelligence** *(largely complete)*: interactive mapping, site
  assessment scoring, terrain/elevation analysis, climate data, hydrology, and
  ecological dashboards, fed by public GIS data.
- **Phase 2 — Design Atlas** *(in progress)*: design and planting tools, nursery
  ledger, forest hub, phasing/labor planning, and economic & financial modeling.
- **Phase 3 — Collaboration + AI** *(in progress)*: real-time collaboration,
  comments, role-based access control, and AI-assisted design and analysis.
- **Phase 4 — Public + Portal** *(in progress)*: public portal pages, narrative
  "story scenes," and interactive embedded maps.

---

## 6. Architecture & technology

A modern TypeScript monorepo with a clear front/back/shared split.

| Layer | Technology |
|---|---|
| Repo | pnpm workspaces + Turborepo (`apps/web`, `apps/api`, `packages/shared`) |
| Frontend | React 18 · TypeScript · Vite · Zustand (state) |
| Map engine | MapLibre GL JS (2D) + CesiumJS (3D) |
| Backend | Fastify + Node.js |
| Database | PostgreSQL 16 + PostGIS 3.4 (geospatial) |
| Queue | BullMQ + Redis (background data pipelines, PDF rendering) |
| Auth / Storage | local JWT auth · Supabase (S3-compatible) storage |

The feature set is **manifest-driven**: a central registry defines the modules,
each tagged to a phase, and an environment flag gates which phases are live. This
lets capabilities ship incrementally without forking the codebase. The data layer
is **country-agnostic by design** — an adapter registry routes each map layer to
the correct national data source — though it is currently configured and tuned for
Ontario, Canada (Conservation Halton jurisdiction) as the first target region.

---

## 7. Where it stands (honest maturity read)

- **Phase 1** is feature-complete and usable for real site analysis.
- **Phase 2** is well along (core design, modeling, and ledger tools largely built).
- **Phase 3** is partial — collaboration infrastructure, comments, and access
  control are scaffolded; AI features are gated behind a flag, not default-on.
- **Phase 4** is mostly stubbed.

It is **actively developed by a very small team**, past the prototype stage but not
yet production-hardened: there is no external OAuth/SSO yet, and multi-tenant
scaling is unproven. It is best described as an advanced beta with a strong,
opinionated architecture and a clear phased roadmap.

---

## 8. Grounding ethos

OLOS is built on a stewardship ethic: the software is meant to act as a faithful
steward of the user's relationship to their land, not merely a feature set. That
value commitment shapes design priorities — coherence, honesty about the land's
constraints, long-term care — but the product itself is a general-purpose land
design tool.

---

## 9. What we would value from you

*(Edit this to match the specific guidance you want from the panel.)*

- **Roadmap sequencing & scope** — for a very small team, what should be finished,
  deferred, or cut to reach a credible first pilot?
- **Path to production** — where to harden first (auth/SSO, multi-tenancy,
  reliability) before real users depend on it.
- **Delivery & process** — how to plan and manage four parallel phases without
  overcommitting; what a realistic milestone cadence looks like.
- **Validation** — how to structure early pilots with real land stewards to learn
  fastest with the least build.
