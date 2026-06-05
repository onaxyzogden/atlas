# Phase 3 Task 16 — Cold-visitor flow walk

Server: `vite preview` (post-prerender build) on `http://127.0.0.1:4173`.
Driver: Claude Preview MCP (Chromium).
Date: 2026-05-21.

## Pre-flight regression discovered + fixed

During the walk the body remained at `overflow: hidden, height: 100vh`
because the authed app shell's global rule in `src/app/index.css` was never
overridden for the public showcase routes. Document `scrollY` stayed locked at
0 even though `document.scrollHeight` was ~4900px.

**Fix applied in this Task 16 session** (and re-built + re-prerendered before
the flow walk continued):

1. `src/showcase/routes/showcase.tsx` and `showcase.$tier.tsx` — `useEffect`
   adds `body.classList.add('showcase-scroll')` on mount, removes on unmount.
2. `src/app/index.css` — new rule:
   ```css
   body.showcase-scroll { overflow: auto; height: auto; }
   body.showcase-scroll #root { height: auto; overflow: visible; }
   ```

After the fix, `body.classList` reports `showcase-scroll` on all 4 showcase
URLs, `bodyOverflow = auto`, `docH = 4873–4991` px, and `documentElement.
scrollTop` advances normally.

## Flow

### Step 1 — Cold visit `/showcase/three-streams`
- URL: `http://localhost:4173/showcase/three-streams`
- `<h1>`: "Three Streams Farm"
- Body length: ~907 chars
- Tier chooser: 3 links present (`dreaming` / `transitioning` / `stewarding`)
- Attribution footer: exact string
  *"Inspired by farms like Apricot Lane Farms and the rehabilitation arc shown
  in The Biggest Little Farm; Three Streams Farm is a fictional Ontario
  operation."*
- Console errors: none
- Screenshot captured: hero + first two tier cards visible above the fold.
- **PASS**

### Step 2 — Click "I am dreaming about my own land"
- URL: `http://localhost:4173/showcase/three-streams/dreaming`
- `<h1>`: "Three Streams Farm"
- Body length: ~6619 chars after hydration
- Scenes mounted (10):
  `hero`, `y0-baseline`, `y1-water-cover`, `y2-current`,
  `dreaming/vision`, `dreaming/first-steps`,
  `y5-projected`, `y8-projected`, `methodology`, `cta`
- Console errors: none
- **PASS**

### Step 3 — Scroll to `y2-current`
- `documentElement.scrollTop = 1700`
- `y2-current` enters viewport
- Header "Year 2 — The soil begins to breathe" visible
- Inline phrase "1.65% to 2.25%" rendered bold
- MetricChart (SVG line, Y0 → Y2) renders
- MapThumbnail with "Click to explore the map →" hint visible below chart
- Screenshot captured.
- **PASS**

### Step 4 — Click the visible MapThumbnail
- Before click: 3 `<button>` elements with text "Click to explore the map →"
  and 1 MapLibre canvas
- After click + 2.5s wait: 2 thumbnails remain, **2 MapLibre canvases** in
  DOM (the clicked thumbnail was replaced by a live `<ShowcaseMap>`).
- Console errors: none
- **PASS** (live MapLibre hydration confirmed)

### Step 5 — Scroll to bottom; verify CTA
- `documentElement.scrollTop = 4800` (max ~4527 — clamped)
- CTA section text:
  *"Talk to us about starting your own land journey"* +
  *"Low-pressure conversation about where you might begin."* +
  *"Book an intro call"* button
- Attribution footer + canon link both present after CTA
- Screenshot captured.
- **PASS**

### Step 6a — Cold visit `/showcase/three-streams/transitioning` (hero only)
- URL changes correctly
- `<h1>`: "Three Streams Farm"
- Scenes mounted (10) — includes the two tier-specific scenes:
  `transitioning/conversion-mechanics`, `transitioning/water-and-cover`
- `body.classList`: `showcase-scroll`
- Console errors: none
- **PASS**

### Step 6b — Cold visit `/showcase/three-streams/stewarding` (hero only)
- URL changes correctly
- `<h1>`: "Three Streams Farm"
- Scenes mounted (10) — includes the two tier-specific scenes:
  `stewarding/monitoring-instrumentation`, `stewarding/adaptive-stewardship`
- `body.classList`: `showcase-scroll`
- Console errors: none
- **PASS**

## SEO smoke (`curl -A "Slackbot"`)

```
curl -s -A "Slackbot" http://localhost:4173/showcase/three-streams/ \
  | grep -oc "Three Streams Farm|Sixteen Mile Creek|Apricot Lane"
3

curl -s -A "Slackbot" http://localhost:4173/showcase/three-streams/dreaming/ \
  | grep -oc "Three Streams Farm|Sixteen Mile Creek|Apricot Lane"
15
```

- Trailing-slash paths return the prerendered HTML (3 hits on hero, 15 on
  `/dreaming`). Hero copy, Sixteen Mile Creek, and Apricot Lane all present.
- Non-trailing-slash paths fall back to the SPA shell under `vite preview`
  (this is a `vite preview` artefact, not a production behavior — nginx /
  Cloudflare will rewrite). Production deployment must include the trailing
  slash or a server-side rewrite rule.
- **PASS** (with note above)

## Console summary

Across all 6 navigation steps + the SEO probes, `preview_console_logs --level
error` returned **"No console logs."** every time. No runtime errors emitted.

## Screenshots

Captured via MCP `preview_screenshot` — held in MCP session, not persisted
to disk. Verbal description above; screenshot evidence held in this Task 16
transcript only. (The MCP screenshot tool does not write to a known local
path; if persisted artefacts are required later, the screenshots can be
re-captured against the same dist + preview pair.)
