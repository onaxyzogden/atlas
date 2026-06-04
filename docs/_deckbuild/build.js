const pptxgen = require("pptxgenjs");

// ---- Palette: Forest & Moss (land / regenerative theme) ----
const INK    = "1C3320"; // deep forest (dark backgrounds)
const FOREST = "2C5F2D"; // primary green
const MOSS   = "7FA653"; // supporting moss
const MOSSLT = "97BC62"; // light moss
const GOLD   = "C28E0E"; // warm accent (stats / emphasis)
const PAPER  = "FFFFFF"; // content background
const MUTE   = "5B6B5C"; // muted body
const LIGHT  = "E8EFE3"; // pale moss tint (cards)
const CREAMTX= "EAF0E4"; // light text on dark

const FH = "Georgia";    // header font
const FB = "Calibri";    // body font

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";       // 13.3 x 7.5
pres.author = "OGDEN / OLOS";
pres.title  = "OLOS — Consultation Deck";
const W = 13.3, H = 7.5;

const shadow = () => ({ type: "outer", color: "000000", blur: 7, offset: 3, angle: 135, opacity: 0.16 });

// kicker label (small caps-y eyebrow)
function kicker(slide, txt, x, y, color) {
  slide.addText(txt.toUpperCase(), { x, y, w: 8, h: 0.3, margin: 0,
    fontFace: FB, fontSize: 12, bold: true, color: color || GOLD, charSpacing: 3 });
}

// numbered chip in a circle
function numCircle(slide, n, x, y, d, fill, txtcolor) {
  slide.addShape(pres.shapes.OVAL, { x, y, w: d, h: d, fill: { color: fill }, line: { type: "none" } });
  slide.addText(String(n), { x, y, w: d, h: d, margin: 0, align: "center", valign: "middle",
    fontFace: FH, fontSize: 16, bold: true, color: txtcolor || PAPER });
}

// content slide title block
function head(slide, kick, title) {
  kicker(slide, kick, 0.7, 0.55);
  slide.addText(title, { x: 0.7, y: 0.85, w: 12, h: 0.9, margin: 0,
    fontFace: FH, fontSize: 32, bold: true, color: INK });
}

// ===================================================================
// SLIDE 1 — Title
// ===================================================================
let s = pres.addSlide();
s.background = { color: INK };
// motif: stacked translucent "land strata" bands bottom-right
s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 6.55, w: W, h: 0.95, fill: { color: FOREST } });
s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 6.55, w: W, h: 0.12, fill: { color: GOLD } });
s.addText("OGDEN LAND OS", { x: 0.8, y: 1.9, w: 10, h: 0.4, margin: 0,
  fontFace: FB, fontSize: 16, bold: true, color: MOSSLT, charSpacing: 5 });
s.addText("OLOS", { x: 0.75, y: 2.25, w: 11, h: 1.7, margin: 0,
  fontFace: FH, fontSize: 96, bold: true, color: PAPER });
s.addText("A geospatial land-intelligence platform for land design.", {
  x: 0.8, y: 4.15, w: 11.5, h: 0.6, margin: 0, fontFace: FB, fontSize: 22, color: CREAMTX });
s.addText("“A tool for seeing land whole — and building it wisely.”", {
  x: 0.8, y: 4.85, w: 11.5, h: 0.5, margin: 0, fontFace: FH, fontSize: 18, italic: true, color: MOSSLT });
s.addText("Consultation brief  ·  project planning, development & management", {
  x: 0.8, y: 6.72, w: 11.5, h: 0.6, margin: 0, fontFace: FB, fontSize: 13, color: CREAMTX });

// ===================================================================
// SLIDE 2 — The problem
// ===================================================================
s = pres.addSlide();
s.background = { color: PAPER };
head(s, "The problem", "Land design today is fragmented");
const probs = [
  ["Siloed tools", "GIS for mapping, spreadsheets for budgets, separate software for layouts, paper for field notes."],
  ["Lost context", "Nothing carries the site itself across the journey — context drops at every handoff."],
  ["Broken thread", "Assess → design → build → monitor are disconnected, so insight never compounds."],
];
let py = 2.05;
probs.forEach((p, i) => {
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: py, w: 7.7, h: 1.25, fill: { color: LIGHT }, line: { type: "none" } });
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: py, w: 0.09, h: 1.25, fill: { color: FOREST } });
  numCircle(s, i + 1, 1.0, py + 0.34, 0.58, FOREST);
  s.addText(p[0], { x: 1.85, y: py + 0.18, w: 6.3, h: 0.4, margin: 0, fontFace: FH, fontSize: 18, bold: true, color: INK });
  s.addText(p[1], { x: 1.85, y: py + 0.58, w: 6.4, h: 0.6, margin: 0, fontFace: FB, fontSize: 13.5, color: MUTE });
  py += 1.5;
});
// right rail: the OLOS answer
s.addShape(pres.shapes.RECTANGLE, { x: 8.85, y: 2.05, w: 3.75, h: 4.2, fill: { color: INK }, shadow: shadow() });
s.addShape(pres.shapes.RECTANGLE, { x: 8.85, y: 2.05, w: 3.75, h: 0.12, fill: { color: GOLD } });
s.addText("OLOS keeps one\ncontinuous thread", { x: 9.15, y: 2.9, w: 3.2, h: 1.0, margin: 0,
  fontFace: FH, fontSize: 22, bold: true, color: PAPER, lineSpacingMultiple: 1.0 });
s.addText("Same land. Same data. Same plan — followed from first survey to long-term stewardship.", {
  x: 9.15, y: 4.05, w: 3.2, h: 1.7, margin: 0, fontFace: FB, fontSize: 15, color: CREAMTX, lineSpacingMultiple: 1.2 });

// ===================================================================
// SLIDE 3 — Who it's for
// ===================================================================
s = pres.addSlide();
s.background = { color: PAPER };
head(s, "Who it's for", "Stewardship-conscious land designers");
const users = [
  "Regenerative agriculture", "Permaculture design", "Conservation projects",
  "Intentional communities", "Homesteads", "Agritourism & retreat centers",
];
const colW = 3.85, gap = 0.18, gx0 = 0.7, gy0 = 2.15, cardH = 1.35;
users.forEach((u, i) => {
  const r = Math.floor(i / 3), c = i % 3;
  const x = gx0 + c * (colW + gap), y = gy0 + r * (cardH + gap);
  s.addShape(pres.shapes.RECTANGLE, { x, y, w: colW, h: cardH, fill: { color: LIGHT }, line: { type: "none" }, shadow: shadow() });
  s.addShape(pres.shapes.OVAL, { x: x + 0.28, y: y + 0.42, w: 0.5, h: 0.5, fill: { color: FOREST } });
  s.addText(String(i + 1), { x: x + 0.28, y: y + 0.42, w: 0.5, h: 0.5, margin: 0, align: "center", valign: "middle", fontFace: FH, fontSize: 15, bold: true, color: PAPER });
  s.addText(u, { x: x + 0.95, y: y + 0.2, w: colW - 1.1, h: cardH - 0.4, margin: 0, valign: "middle", fontFace: FH, fontSize: 16.5, bold: true, color: INK });
});
s.addText("Each project type foregrounds the factors that matter most — without ever hiding the rest.", {
  x: 0.7, y: 5.95, w: 11.9, h: 0.5, margin: 0, fontFace: FB, fontSize: 15, italic: true, color: MUTE });

// ===================================================================
// SLIDE 4 — Big idea: universal domains
// ===================================================================
s = pres.addSlide();
s.background = { color: PAPER };
head(s, "The big idea — 1 of 2", "Universal domains of stewardship");
s.addText("Every land project is understood through the same recurring areas. The land imposes these — they are fields of stewardship, not software modules.", {
  x: 0.7, y: 1.82, w: 11.9, h: 0.6, margin: 0, fontFace: FB, fontSize: 14.5, color: MUTE, lineSpacingMultiple: 1.1 });
const domains = ["Water","Soil","Topography","Climate","Ecology","Plants","Animals","Infrastructure","Access","Energy & flows","People & governance","Economics","Risk & compliance","Monitoring","Vision","Land base"];
const dcols = 4, dw = 2.92, dgap = 0.12, dx0 = 0.7, dy0 = 2.7, dh = 0.72;
domains.forEach((d, i) => {
  const r = Math.floor(i / dcols), c = i % dcols;
  const x = dx0 + c * (dw + dgap), y = dy0 + r * (dh + dgap);
  const dark = (r % 2 === 0);
  s.addShape(pres.shapes.RECTANGLE, { x, y, w: dw, h: dh, fill: { color: dark ? FOREST : LIGHT }, line: { type: "none" } });
  s.addText(d, { x: x + 0.18, y, w: dw - 0.3, h: dh, margin: 0, valign: "middle", fontFace: FB, fontSize: 14, bold: true, color: dark ? PAPER : INK });
});

// ===================================================================
// SLIDE 5 — Big idea: Observe -> Plan -> Act
// ===================================================================
s = pres.addSlide();
s.background = { color: PAPER };
head(s, "The big idea — 2 of 2", "One domain, three verbs");
s.addText("The domain stays constant across the lifecycle; only the verb changes.", {
  x: 0.7, y: 1.82, w: 11.9, h: 0.4, margin: 0, fontFace: FB, fontSize: 15, italic: true, color: MUTE });
const stages = [
  ["OBSERVE", "Document what is happening", "Map runoff, wells, flood risk"],
  ["PLAN", "Decide what should happen", "Decide ponds, swales, irrigation"],
  ["ACT", "Execute, verify, maintain", "Build swales, install tanks, monitor"],
];
const sw = 3.7, sgap = 0.55, sx0 = 0.95, sy = 2.55, sh = 2.55;
stages.forEach((st, i) => {
  const x = sx0 + i * (sw + sgap);
  s.addShape(pres.shapes.RECTANGLE, { x, y: sy, w: sw, h: sh, fill: { color: INK }, shadow: shadow() });
  s.addShape(pres.shapes.RECTANGLE, { x, y: sy, w: sw, h: 0.1, fill: { color: GOLD } });
  s.addText(st[0], { x: x + 0.3, y: sy + 0.35, w: sw - 0.6, h: 0.55, margin: 0, fontFace: FH, fontSize: 24, bold: true, color: PAPER });
  s.addText(st[1], { x: x + 0.3, y: sy + 1.0, w: sw - 0.6, h: 0.55, margin: 0, fontFace: FB, fontSize: 14.5, color: CREAMTX });
  s.addText([{ text: "Water · ", options: { bold: true, color: MOSSLT } }, { text: st[2], options: { color: CREAMTX } }],
    { x: x + 0.3, y: sy + 1.7, w: sw - 0.6, h: 0.7, margin: 0, fontFace: FB, fontSize: 12.5, italic: true });
  if (i < 2) s.addText("→", { x: x + sw + 0.04, y: sy + sh / 2 - 0.4, w: 0.5, h: 0.8, margin: 0, align: "center", valign: "middle", fontFace: FB, fontSize: 30, bold: true, color: MOSS });
});
s.addText("Observe → Plan → Act is the backbone of the whole app. Report is a sibling output, not a stage.", {
  x: 0.7, y: 5.5, w: 11.9, h: 0.5, margin: 0, fontFace: FB, fontSize: 14, color: MUTE, align: "center" });

// ===================================================================
// Helper for phase slides (two-column: big phase callout + bullets)
// ===================================================================
function phaseSlide(kick, title, tag, tagColor, bullets, caption) {
  const sl = pres.addSlide();
  sl.background = { color: PAPER };
  head(sl, kick, title);
  // left callout panel
  sl.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 2.1, w: 4.0, h: 4.1, fill: { color: INK }, shadow: shadow() });
  sl.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 2.1, w: 4.0, h: 0.12, fill: { color: tagColor } });
  sl.addText(tag, { x: 0.7, y: 2.7, w: 4.0, h: 1.4, margin: 0, align: "center", fontFace: FH, fontSize: 80, bold: true, color: PAPER });
  sl.addText(caption, { x: 1.0, y: 4.5, w: 3.4, h: 1.5, margin: 0, align: "center", fontFace: FB, fontSize: 15, color: CREAMTX, lineSpacingMultiple: 1.2 });
  // right bullets
  let by = 2.35;
  bullets.forEach((b) => {
    sl.addShape(pres.shapes.OVAL, { x: 5.2, y: by + 0.07, w: 0.22, h: 0.22, fill: { color: tagColor } });
    sl.addText(b, { x: 5.6, y: by - 0.05, w: 7.0, h: 0.7, margin: 0, fontFace: FB, fontSize: 16.5, color: INK, lineSpacingMultiple: 1.05 });
    by += 0.92;
  });
  return sl;
}

// SLIDE 6 — Phase 1
phaseSlide("What it does", "Phase 1 — Site Intelligence", "P1", MOSSLT,
  ["Interactive mapping fed by public GIS data",
   "Site assessment scoring",
   "Terrain & elevation analysis",
   "Climate, hydrology & ecological dashboards"],
  "Largely complete.\nBring a property in and see it whole.");

// SLIDE 7 — Phase 2
phaseSlide("What it does", "Phase 2 — Design Atlas", "P2", MOSS,
  ["Design and planting tools",
   "Nursery ledger and forest hub",
   "Phasing and labor planning",
   "Economic and financial modeling"],
  "In progress.\nTurn assessment into a costed, actionable design.");

// ===================================================================
// SLIDE 8 — Phases 3 & 4
// ===================================================================
s = pres.addSlide();
s.background = { color: PAPER };
head(s, "What it does", "Phases 3 & 4");
const ph34 = [
  ["P3", "Collaboration + AI", "In progress", ["Real-time collaboration, comments, role-based access", "AI-assisted design and analysis (gated)"]],
  ["P4", "Public + Portal", "In progress", ["Public portal pages & narrative ‘story scenes’", "Interactive embedded maps"]],
];
ph34.forEach((p, i) => {
  const x = 0.7 + i * 6.15;
  s.addShape(pres.shapes.RECTANGLE, { x, y: 2.15, w: 5.75, h: 4.1, fill: { color: LIGHT }, line: { type: "none" }, shadow: shadow() });
  s.addShape(pres.shapes.RECTANGLE, { x, y: 2.15, w: 5.75, h: 0.12, fill: { color: FOREST } });
  s.addText(p[0], { x: x + 0.35, y: 2.45, w: 1.5, h: 0.9, margin: 0, fontFace: FH, fontSize: 44, bold: true, color: FOREST });
  s.addText(p[1], { x: x + 1.9, y: 2.52, w: 3.6, h: 0.5, margin: 0, fontFace: FH, fontSize: 20, bold: true, color: INK });
  s.addText(p[2].toUpperCase(), { x: x + 1.9, y: 3.0, w: 3.6, h: 0.35, margin: 0, fontFace: FB, fontSize: 11, bold: true, color: GOLD, charSpacing: 2 });
  let yy = 3.75;
  p[3].forEach((b) => {
    s.addShape(pres.shapes.OVAL, { x: x + 0.4, y: yy + 0.07, w: 0.2, h: 0.2, fill: { color: MOSS } });
    s.addText(b, { x: x + 0.75, y: yy - 0.08, w: 4.75, h: 0.8, margin: 0, fontFace: FB, fontSize: 14.5, color: INK, lineSpacingMultiple: 1.05 });
    yy += 0.95;
  });
});

// ===================================================================
// SLIDE 9 — Architecture & technology
// ===================================================================
s = pres.addSlide();
s.background = { color: PAPER };
head(s, "Under the hood", "Architecture & technology");
s.addText("A modern TypeScript monorepo (pnpm + Turborepo): web · api · shared.", {
  x: 0.7, y: 1.82, w: 11.9, h: 0.4, margin: 0, fontFace: FB, fontSize: 15, color: MUTE });
const stack = [
  ["Frontend", "React 18 · TypeScript · Vite · Zustand"],
  ["Maps", "MapLibre GL JS (2D) + CesiumJS (3D)"],
  ["Backend", "Fastify + Node.js"],
  ["Data", "PostgreSQL 16 + PostGIS · BullMQ + Redis · Supabase"],
];
let ay = 2.55;
stack.forEach((row) => {
  s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: ay, w: 2.7, h: 0.8, fill: { color: FOREST } });
  s.addText(row[0], { x: 0.7, y: ay, w: 2.7, h: 0.8, margin: 0, align: "center", valign: "middle", fontFace: FH, fontSize: 16, bold: true, color: PAPER });
  s.addShape(pres.shapes.RECTANGLE, { x: 3.4, y: ay, w: 9.2, h: 0.8, fill: { color: LIGHT } });
  s.addText(row[1], { x: 3.7, y: ay, w: 8.8, h: 0.8, margin: 0, valign: "middle", fontFace: FB, fontSize: 15.5, color: INK });
  ay += 0.92;
});
s.addText("Manifest-driven modules, phase-gated rollout. Data layer is country-agnostic; tuned first for Ontario, Canada.", {
  x: 0.7, y: 6.35, w: 11.9, h: 0.5, margin: 0, fontFace: FB, fontSize: 13.5, italic: true, color: MUTE });

// ===================================================================
// SLIDE 10 — Where it stands
// ===================================================================
s = pres.addSlide();
s.background = { color: PAPER };
head(s, "Honest read", "Where it stands");
const mat = [
  ["Phase 1", "Feature-complete · usable for real site analysis", 1.0, MOSSLT],
  ["Phase 2", "Well along · core design & modeling built", 0.7, MOSS],
  ["Phase 3", "Partial · collaboration scaffolded, AI gated", 0.4, FOREST],
  ["Phase 4", "Mostly stubbed", 0.15, "9AA89B"],
];
let my = 2.15;
const barX = 3.4, barW = 7.2;
mat.forEach((row) => {
  s.addText(row[0], { x: 0.7, y: my, w: 2.5, h: 0.6, margin: 0, valign: "middle", fontFace: FH, fontSize: 18, bold: true, color: INK });
  s.addShape(pres.shapes.RECTANGLE, { x: barX, y: my + 0.12, w: barW, h: 0.42, fill: { color: LIGHT } });
  s.addShape(pres.shapes.RECTANGLE, { x: barX, y: my + 0.12, w: barW * row[2], h: 0.42, fill: { color: row[3] } });
  s.addText(row[1], { x: barX, y: my + 0.62, w: barW + 1.5, h: 0.35, margin: 0, fontFace: FB, fontSize: 12.5, color: MUTE });
  my += 1.05;
});
s.addShape(pres.shapes.RECTANGLE, { x: 0.7, y: 6.45, w: 11.9, h: 0.7, fill: { color: INK } });
s.addText("Built by a very small team. Past prototype, not yet production-hardened — no external SSO yet; multi-tenant scaling unproven.", {
  x: 0.95, y: 6.45, w: 11.4, h: 0.7, margin: 0, valign: "middle", fontFace: FB, fontSize: 13.5, color: CREAMTX });

// ===================================================================
// SLIDE 11 — Grounding ethos
// ===================================================================
s = pres.addSlide();
s.background = { color: INK };
s.addShape(pres.shapes.RECTANGLE, { x: 0.9, y: 2.0, w: 0.14, h: 3.4, fill: { color: GOLD } });
kicker(s, "Grounding ethos", 1.3, 1.55, MOSSLT);
s.addText("Software as a faithful steward of the user's relationship to their land.", {
  x: 1.3, y: 2.15, w: 10.8, h: 1.8, margin: 0, fontFace: FH, fontSize: 32, bold: true, color: PAPER, lineSpacingMultiple: 1.1 });
s.addText("That value shapes priorities — coherence, honesty about the land's constraints, long-term care. The product itself is a general-purpose land design tool.", {
  x: 1.3, y: 4.25, w: 10.5, h: 1.2, margin: 0, fontFace: FB, fontSize: 17, color: CREAMTX, lineSpacingMultiple: 1.2 });

// ===================================================================
// SLIDE 12 — What we're seeking
// ===================================================================
s = pres.addSlide();
s.background = { color: PAPER };
head(s, "The ask", "What we're seeking from you");
const asks = [
  ["Roadmap & scope", "For a small team — what to finish, defer, or cut for a credible first pilot?"],
  ["Path to production", "Where to harden first: auth / SSO, multi-tenancy, reliability."],
  ["Delivery & process", "Managing four parallel phases without overcommitting."],
  ["Validation", "Structuring early pilots to learn fastest with the least build."],
];
asks.forEach((a, i) => {
  const r = Math.floor(i / 2), c = i % 2;
  const x = 0.7 + c * 6.15, y = 2.2 + r * 2.0;
  s.addShape(pres.shapes.RECTANGLE, { x, y, w: 5.75, h: 1.75, fill: { color: LIGHT }, line: { type: "none" }, shadow: shadow() });
  s.addShape(pres.shapes.RECTANGLE, { x, y, w: 0.09, h: 1.75, fill: { color: GOLD } });
  numCircle(s, i + 1, x + 0.32, y + 0.55, 0.6, FOREST);
  s.addText(a[0], { x: x + 1.15, y: y + 0.28, w: 4.4, h: 0.45, margin: 0, fontFace: FH, fontSize: 18, bold: true, color: INK });
  s.addText(a[1], { x: x + 1.15, y: y + 0.78, w: 4.45, h: 0.85, margin: 0, fontFace: FB, fontSize: 13.5, color: MUTE, lineSpacingMultiple: 1.1 });
});

// ===================================================================
// SLIDE 13 — Closing
// ===================================================================
s = pres.addSlide();
s.background = { color: INK };
s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 0, w: W, h: 0.14, fill: { color: GOLD } });
s.addText("OLOS", { x: 0.8, y: 2.5, w: 11, h: 1.4, margin: 0, fontFace: FH, fontSize: 72, bold: true, color: PAPER });
s.addText("Seeing land whole — and building it wisely.", {
  x: 0.85, y: 3.95, w: 11.5, h: 0.6, margin: 0, fontFace: FH, fontSize: 22, italic: true, color: MOSSLT });
s.addText("atlas.ogden.ag", { x: 0.85, y: 4.7, w: 11.5, h: 0.5, margin: 0, fontFace: FB, fontSize: 16, color: CREAMTX });
s.addShape(pres.shapes.RECTANGLE, { x: 0, y: 7.36, w: W, h: 0.14, fill: { color: FOREST } });

pres.writeFile({ fileName: "OLOS-Consultation-Deck.pptx" }).then((f) => console.log("WROTE " + f));
