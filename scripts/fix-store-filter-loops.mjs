// One-shot codemod: hoist .filter() out of Zustand selectors into useMemo.
// Pattern (multiline OR single-line):
//   const NAME = useXStore((s) =>
//     s.FIELD.filter((P) => P.projectId === OWNER),
//   );
// Replacement:
//   const allFIELD = useXStore((s) => s.FIELD);
//   const NAME = useMemo(
//     () => allFIELD.filter((P) => P.projectId === OWNER),
//     [allFIELD, OWNER],
//   );

import { readFileSync, writeFileSync } from 'node:fs';

const FILES = [
  'apps/web/src/features/stewardship/PunchListCard.tsx',
  'apps/web/src/features/portal/InternalVsPublicViewCard.tsx',
  'apps/web/src/features/fieldwork/WalkChecklistCard.tsx',
  'apps/web/src/features/economics/RevenueRampProjectionCard.tsx',
  'apps/web/src/features/economics/OverbuiltForRevenueWarningCard.tsx',
  'apps/web/src/features/crops/ClimateShiftScenarioCard.tsx',
  'apps/web/src/features/ai-design-support/WhyHerePanelsCard.tsx',
  'apps/web/src/features/ai-design-support/PhasedBuildStrategyCard.tsx',
  'apps/web/src/features/ai-design-support/NeedsSiteVisitCard.tsx',
  'apps/web/src/features/ai-design-support/FeaturePlacementSuggestionsCard.tsx',
  'apps/web/src/features/ai-design-support/EducationalExplainerCard.tsx',
  'apps/web/src/features/ai-design-support/EcologicalRiskWarningsCard.tsx',
  'apps/web/src/features/ai-design-support/DesignBriefPitchCard.tsx',
  'apps/web/src/features/ai-design-support/AssumptionGapDetectorCard.tsx',
  'apps/web/src/features/ai-design-support/AlternativeLayoutRationaleCard.tsx',
];

const cap = (s) => s[0].toUpperCase() + s.slice(1);

// Captures both single-line and multiline selectors:
//   const NAME = useXStore((s) =>\n    s.FIELD.filter((P) => P.projectId === OWNER),\n  );
//   const NAME = useXStore((s) => s.FIELD.filter((P) => P.projectId === OWNER));
// Note: `(\s*)` for indent must not include `\n` — with CRLF endings and `m`
// flag, `^` can match between CR and LF, letting `\s*` consume `\n` and break
// per-line indentation. Use `[ \t]*` and a lookbehind for the line start.
const RE =
  /(?<=^|\r?\n)([ \t]*)const (\w+) = (use\w+Store)\(\((\w+)\) =>\s*\4\.(\w+)\.filter\(\((\w+)\) => \6\.projectId === ([\w.]+)\),?\s*\);?/g;

let totalFiles = 0;
let totalReplacements = 0;

for (const rel of FILES) {
  const src = readFileSync(rel, 'utf8');
  const eol = src.includes('\r\n') ? '\r\n' : '\n';
  let count = 0;
  const out = src.replace(
    RE,
    (_m, indent, name, hook, _selArg, field, predArg, owner) => {
      count++;
      const allName = `all${cap(field)}`;
      return (
        `${indent}const ${allName} = ${hook}((s) => s.${field});${eol}` +
        `${indent}const ${name} = useMemo(${eol}` +
        `${indent}  () => ${allName}.filter((${predArg}) => ${predArg}.projectId === ${owner}),${eol}` +
        `${indent}  [${allName}, ${owner}],${eol}` +
        `${indent});`
      );
    },
  );
  if (count > 0) {
    writeFileSync(rel, out);
    totalFiles++;
    totalReplacements += count;
    console.log(`  ${rel} - ${count} selector(s) hoisted`);
  } else {
    console.log(`  ${rel} - NO MATCH (manual review needed)`);
  }
}

console.log(`\nDone: ${totalReplacements} replacements across ${totalFiles} files.`);
