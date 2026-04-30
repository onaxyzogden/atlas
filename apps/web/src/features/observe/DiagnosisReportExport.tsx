/**
 * DiagnosisReportExport — Phase 4f OBSERVE surface.
 *
 * Composes a Markdown OBSERVE-stage diagnosis report from every store the
 * Hub references: vision (steward + regional), siteData (climate, elevation,
 * soils), soilSampleStore (latest manual lab samples), and
 * siteAnnotationsStore (hazards, transects, sectors, ecology, swot).
 *
 * Two outputs:
 *   1. .md download (Blob + object URL, no extra deps).
 *   2. Print preview — `window.print()` after rendering the report into a
 *      print-styled container. Browsers offer "Save as PDF" from the print
 *      dialog so we ship without a PDF library for v1.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useVisionStore } from '../../store/visionStore.js';
import { useSiteDataStore, getLayerSummary } from '../../store/siteDataStore.js';
import { useSoilSampleStore } from '../../store/soilSampleStore.js';
import { useEcologyStore } from '../../store/ecologyStore.js';
import { useExternalForcesStore } from '../../store/externalForcesStore.js';
import { useSwotStore } from '../../store/swotStore.js';
import { useTopographyStore } from '../../store/topographyStore.js';
import styles from './SwotJournalCard.module.css';

interface Props {
  project: LocalProject;
  onSwitchToMap: () => void;
}

function fmt(n: number | null | undefined, suffix = '', digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return `${digits === 0 ? Math.round(n) : n.toFixed(digits)}${suffix}`;
}

export default function DiagnosisReportExport({ project }: Props) {
  // Subscribe-then-derive (ADR 2026-04-26-zustand-selector-stability):
  // selectors return raw store fields only; project-scoped slices are
  // computed in useMemo so identity is stable between renders.
  const visions = useVisionStore((s) => s.visions);
  const siteData = useSiteDataStore((s) => s.dataByProject[project.id]);
  const allSoilSamples = useSoilSampleStore((s) => s.samples);
  const allHazards = useExternalForcesStore((s) => s.hazards);
  const allTransects = useTopographyStore((s) => s.transects);
  const allSectors = useExternalForcesStore((s) => s.sectors);
  const allEcology = useEcologyStore((s) => s.ecology);
  const successionStageByProject = useEcologyStore((s) => s.successionStageByProject,
  );
  const allSwot = useSwotStore((s) => s.swot);

  const visionData = useMemo(
    () => visions.find((v) => v.projectId === project.id),
    [visions, project.id],
  );
  const soilSamples = useMemo(
    () => allSoilSamples.filter((x) => x.projectId === project.id),
    [allSoilSamples, project.id],
  );
  const hazards = useMemo(
    () => allHazards.filter((h) => h.projectId === project.id),
    [allHazards, project.id],
  );
  const transects = useMemo(
    () => allTransects.filter((t) => t.projectId === project.id),
    [allTransects, project.id],
  );
  const sectors = useMemo(
    () => allSectors.filter((x) => x.projectId === project.id),
    [allSectors, project.id],
  );
  const ecology = useMemo(
    () => allEcology.filter((o) => o.projectId === project.id),
    [allEcology, project.id],
  );
  const successionStage = successionStageByProject[project.id];
  const swot = useMemo(
    () => allSwot.filter((e) => e.projectId === project.id),
    [allSwot, project.id],
  );

  const markdown = useMemo(() => {
    const lines: string[] = [];
    const date = new Date().toISOString().slice(0, 10);

    lines.push(`# OBSERVE-Stage Diagnosis Report`);
    lines.push(`**Project:** ${project.name}`);
    lines.push(`**Generated:** ${date}`);
    lines.push(`**Principle:** P1 — Observe and Interact`);
    lines.push('');

    // Steward
    const steward = visionData?.steward;
    lines.push(`## 1. Human Context`);
    lines.push('');
    lines.push(`**Steward:** ${steward?.name ?? '—'}`);
    if (steward?.age) lines.push(`- Age: ${steward.age}`);
    if (steward?.occupation) lines.push(`- Occupation: ${steward.occupation}`);
    if (steward?.lifestyle) lines.push(`- Lifestyle: ${steward.lifestyle}`);
    if (steward?.maintenanceHrsInitial !== undefined)
      lines.push(`- Maintenance hrs/wk (initial): ${steward.maintenanceHrsInitial}`);
    if (steward?.maintenanceHrsOngoing !== undefined)
      lines.push(`- Maintenance hrs/wk (ongoing): ${steward.maintenanceHrsOngoing}`);
    if (steward?.budget) lines.push(`- Budget: ${steward.budget}`);
    if (steward?.skills?.length) lines.push(`- Skills: ${steward.skills.join(', ')}`);
    if (steward?.vision) {
      lines.push('');
      lines.push(`**Vision:**`);
      lines.push('');
      lines.push(`> ${steward.vision.replace(/\n/g, '\n> ')}`);
    }

    const regional = visionData?.regional;
    if (regional) {
      lines.push('');
      lines.push(`### Indigenous & Regional Context`);
      if (regional.indigenousNames?.length)
        lines.push(`- **Indigenous place-names:** ${regional.indigenousNames.join(', ')}`);
      if (regional.culturalChallenges?.length) {
        lines.push(`- **Cultural challenges:**`);
        for (const c of regional.culturalChallenges) lines.push(`  - ${c}`);
      }
      if (regional.culturalStrengths?.length) {
        lines.push(`- **Cultural strengths:**`);
        for (const c of regional.culturalStrengths) lines.push(`  - ${c}`);
      }
      if (regional.localNetwork?.length) {
        lines.push(`- **Local network:**`);
        for (const n of regional.localNetwork) {
          lines.push(`  - ${n.name} (${n.type})${n.contact ? ` — ${n.contact}` : ''}`);
        }
      }
    }

    // Macroclimate
    lines.push('');
    lines.push(`## 2. Macroclimate & Hazards`);
    lines.push('');
    const climate = siteData
      ? getLayerSummary<{
          hardinessZone?: string;
          annualPrecipMm?: number;
          growingSeasonDays?: number;
        }>(siteData, 'climate')
      : null;
    lines.push(`- Hardiness zone: ${climate?.hardinessZone ?? '—'}`);
    lines.push(`- Annual precipitation: ${fmt(climate?.annualPrecipMm, ' mm', 0)}`);
    lines.push(`- Growing season: ${fmt(climate?.growingSeasonDays, ' days', 0)}`);
    if (hazards.length) {
      lines.push('');
      lines.push(`### Logged hazards (${hazards.length})`);
      const sorted = hazards.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
      for (const h of sorted) {
        lines.push(
          `- **${h.date}** — ${h.type}${h.severity ? ` (${h.severity})` : ''}${
            h.description ? `: ${h.description}` : ''
          }`,
        );
      }
    }

    // Topography
    lines.push('');
    lines.push(`## 3. Topography & Base Map`);
    lines.push('');
    const elevation = siteData
      ? getLayerSummary<{
          meanSlopeDeg?: number;
          minElevationM?: number;
          maxElevationM?: number;
        }>(siteData, 'elevation')
      : null;
    lines.push(`- Mean slope: ${fmt(elevation?.meanSlopeDeg, '°', 1)}`);
    lines.push(
      `- Elevation range: ${
        elevation?.minElevationM !== undefined && elevation?.maxElevationM !== undefined
          ? `${Math.round(elevation.minElevationM)}–${Math.round(elevation.maxElevationM)} m`
          : '—'
      }`,
    );
    lines.push(`- A–B transects captured: ${transects.length}`);
    for (const t of transects) {
      lines.push(`  - ${t.name}: A(${t.pointA[1].toFixed(4)},${t.pointA[0].toFixed(4)}) → B(${t.pointB[1].toFixed(4)},${t.pointB[0].toFixed(4)})`);
    }

    // Diagnostics
    lines.push('');
    lines.push(`## 4. Earth, Water & Ecology Diagnostics`);
    lines.push('');
    if (soilSamples.length) {
      lines.push(`### Soil samples (${soilSamples.length})`);
      for (const s of soilSamples.slice(-5)) {
        lines.push(
          `- **${s.sampleDate}** ${s.label || '(unlabelled)'} — pH ${s.ph ?? '—'}, OM ${
            s.organicMatterPct ?? '—'
          }%, texture ${s.texture ?? '—'}`,
        );
      }
    } else {
      lines.push(`- No manual soil samples logged.`);
    }
    if (successionStage) {
      lines.push('');
      lines.push(`- Succession stage: ${successionStage}`);
    }
    if (ecology.length) {
      lines.push('');
      lines.push(`### Ecology observations (${ecology.length})`);
      for (const o of ecology) {
        lines.push(`- ${o.species} (${o.trophicLevel})${o.notes ? ` — ${o.notes}` : ''}`);
      }
    }

    // Sectors
    lines.push('');
    lines.push(`## 5. Sectors, Microclimates & Zones`);
    lines.push('');
    if (sectors.length) {
      for (const s of sectors) {
        lines.push(
          `- ${s.type} — ${s.bearingDeg}°, arc ${s.arcDeg}°${
            s.intensity ? ` (${s.intensity})` : ''
          }${s.notes ? ` — ${s.notes}` : ''}`,
        );
      }
    } else {
      lines.push(`- No sector arrows placed.`);
    }

    // SWOT
    lines.push('');
    lines.push(`## 6. SWOT Synthesis`);
    lines.push('');
    const buckets: Array<['S' | 'W' | 'O' | 'T', string]> = [
      ['S', 'Strengths'],
      ['W', 'Weaknesses'],
      ['O', 'Opportunities'],
      ['T', 'Threats'],
    ];
    for (const [key, label] of buckets) {
      const items = swot.filter((e) => e.bucket === key);
      lines.push(`### ${label} (${items.length})`);
      if (items.length) {
        for (const e of items) {
          lines.push(`- **${e.title}**${e.body ? ` — ${e.body}` : ''}`);
        }
      } else {
        lines.push(`_None recorded._`);
      }
      lines.push('');
    }

    lines.push('');
    lines.push(`---`);
    lines.push(`*Generated by Atlas — OBSERVE stage of the regenerative design cycle.*`);

    return lines.join('\n');
  }, [project, visionData, siteData, soilSamples, hazards, transects, sectors, ecology, successionStage, swot]);

  const [shown, setShown] = useState(false);

  function downloadMd() {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-diagnosis-${new Date()
      .toISOString()
      .slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function printReport() {
    setShown(true);
    // Allow render before invoking the print dialog.
    setTimeout(() => window.print(), 80);
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.heroTag}>Module 6 · Synthesis</span>
        <h1 className={styles.title}>Diagnosis Report Export</h1>
        <p className={styles.lede}>
          Composes a single Markdown report from every observation captured so
          far — steward, regional context, climate, hazards, topography, soils,
          ecology, sectors, and SWOT. Download as <code>.md</code> or print to
          PDF via your browser's print dialog.
        </p>
      </header>

      <div className={styles.actionBar}>
        <button type="button" className={styles.primaryBtn} onClick={downloadMd}>
          ⬇ Download Markdown
        </button>
        <button type="button" className={styles.primaryBtn} onClick={printReport}>
          🖨 Print / Save as PDF
        </button>
        <button type="button" className={styles.primaryBtn} onClick={() => setShown((v) => !v)}>
          {shown ? 'Hide preview' : 'Show preview'}
        </button>
      </div>

      {shown ? <pre className={styles.report}>{markdown}</pre> : null}
    </div>
  );
}
