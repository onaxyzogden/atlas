import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const referenceDir = join(process.cwd(), "src", "assets", "reference");
const docsDir = join(process.cwd(), "docs");
const generatedCatalogPath = join(process.cwd(), "src", "screenCatalog.generated.js");

const files = readdirSync(referenceDir)
  .filter((file) => file.toLowerCase().endsWith(".png"))
  .sort((a, b) => a.localeCompare(b));

function pngSize(filePath) {
  const buffer = readFileSync(filePath);
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    return { width: null, height: null };
  }
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function titleCase(value) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function slugify(value) {
  return value
    .replace(/\.[^.]+$/, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/ChatGPT Image May \d+, 2026,? ?/i, "unclassified-")
    .replace(/\d{2}_\d{2}_\d{2}\s*(AM|PM)?/gi, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .toLowerCase();
}

function parseScreen(file) {
  const base = basename(file, ".png");
  const normalized = base.replace(/\s+/g, " ").trim();
  const upper = normalized.toUpperCase();
  const slug = slugify(file);

  let stage = "unknown";
  if (upper.includes("OBSERVE")) stage = "observe";
  if (upper.includes("PLAN")) stage = "plan";
  if (upper.includes("ACT")) stage = "act";

  const moduleMatch = upper.match(/(?:^|[_\s-])M(\d+)(?:[_\s-]|$)/);
  const module = moduleMatch ? Number(moduleMatch[1]) : null;

  let pageType = "detail page";
  if (upper.includes("HOMEPAGE")) pageType = "stage homepage";
  else if (upper.includes("DASHBOARD")) pageType = module ? "module dashboard" : "stage dashboard";
  else if (upper.includes("PAGECARD")) pageType = "module page card";
  else if (upper.includes("SURVEY")) pageType = "form";
  else if (upper.includes("LOG")) pageType = "log";
  else if (upper.includes("CHECKLIST")) pageType = "checklist";
  else if (upper.includes("TOOL") || upper.includes("EDITOR") || upper.includes("CALCULATOR") || upper.includes("MANAGER")) pageType = "tool";
  else if (upper.includes("DETAIL") || upper.includes("DIAG")) pageType = "diagnostic/detail";

  let complexity = "high";
  if (pageType === "stage homepage" || pageType === "module page card") complexity = "medium";
  if (pageType === "tool" || pageType === "diagnostic/detail") complexity = "very high";
  if (upper.includes("DASHBOARD") && module) complexity = "high";

  const needsRename = /ChatGPT Image| |\(|\)|,/.test(file) || file !== file.toLowerCase();
  const routeParts = [stage !== "unknown" ? stage : "screen"];
  if (module) routeParts.push(`m${module}`);
  routeParts.push(slug.replace(/^(olos-)?(observe|plan|act)-?/, "").replace(/^m\d-?/, "") || "page");

  return {
    id: slug,
    route: `/${routeParts.join("/")}`,
    title: titleCase(normalized),
    reference: file,
    stage,
    module,
    pageType,
    complexity,
    status: "inventory-only",
    needsRename,
    viewport: pngSize(join(referenceDir, file))
  };
}

const screens = files.map(parseScreen);
const byStage = screens.reduce((acc, screen) => {
  acc[screen.stage] = (acc[screen.stage] || 0) + 1;
  return acc;
}, {});

const byType = screens.reduce((acc, screen) => {
  acc[screen.pageType] = (acc[screen.pageType] || 0) + 1;
  return acc;
}, {});

const markdownRows = screens
  .map((screen) => {
    const size = screen.viewport.width ? `${screen.viewport.width} x ${screen.viewport.height}` : "unknown";
    const module = screen.module ? `M${screen.module}` : "-";
    const rename = screen.needsRename ? "yes" : "";
    return `| \`${screen.reference}\` | ${screen.stage} | ${module} | ${screen.pageType} | ${size} | ${screen.complexity} | ${rename} |`;
  })
  .join("\n");

const markdown = `# OLOS Full Reference Screen Inventory

Generated from \`src/assets/reference\`.

## Summary

- Total reference images: ${screens.length}
- Observe screens: ${byStage.observe || 0}
- Plan screens: ${byStage.plan || 0}
- Act screens: ${byStage.act || 0}
- Unknown/unclassified screens: ${byStage.unknown || 0}

## Page-Type Counts

${Object.entries(byType)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([type, count]) => `- ${type}: ${count}`)
  .join("\n")}

## Inventory

| Reference | Stage | Module | Type | Native Size | Complexity | Rename? |
| --- | --- | --- | --- | --- | --- | --- |
${markdownRows}

## Naming Notes

- Files marked \`Rename?\` should be normalized before implementation.
- Recommended format: \`olos-<stage>-m<module>-<page-name>.png\`.
- Keep full references in this folder and production crops under \`src/assets/generated/<screen-id>/\`.
`;

const json = {
  generatedAt: new Date().toISOString(),
  summary: {
    total: screens.length,
    byStage,
    byType
  },
  screens
};

const generatedCatalog = `// Generated by scripts/generate-screen-inventory.mjs.
// Do not hand-edit inventory entries here; update reference filenames and rerun the generator.
export const generatedScreenCatalog = ${JSON.stringify(screens, null, 2)};
`;

writeFileSync(join(docsDir, "screen-inventory.md"), markdown);
writeFileSync(join(docsDir, "screen-inventory.json"), `${JSON.stringify(json, null, 2)}\n`);
writeFileSync(generatedCatalogPath, generatedCatalog);

console.log(`Generated inventory for ${screens.length} reference images.`);
