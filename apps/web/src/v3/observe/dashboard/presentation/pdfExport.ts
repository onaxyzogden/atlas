/**
 * pdfExport — Phase 4 Slice 4.5 stub PDF generator (Observe Dashboard
 * Spec §6.1 "PDF export returns a downloadable file for at least one
 * domain").
 *
 * Per the locked Phase 4 decision: returns a hand-rolled single-page
 * PDF Blob with the project name, boundary summary, and snapshot
 * timestamp — no Puppeteer / server round-trip. The existing
 * `PdfExportService` (`apps/api/src/services/pdf/PdfExportService.ts`)
 * is the upgrade path; Phase 6 wires the share viewer's "Export PDF"
 * control to that pipeline once auth + storage are ready.
 *
 * The PDF wire-format below is the minimal viable subset of PDF 1.4
 * (catalog, single Pages, one Page, Helvetica font, one content
 * stream). Hand-rolled byte offsets keep the dep footprint zero.
 */

import type { LocalProject } from '../../../../store/projectStore.js';
import { formatParcelArea } from '../../../../lib/geo.js';

interface ExportInput {
  project: LocalProject;
  generatedAt?: Date | string;
}

interface ExportResult {
  blob: Blob;
  filename: string;
}

/** Escape PDF text-string runs per spec §7.9.2.2. */
function escapePdfString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function asciiSafe(value: string): string {
  // Hand-rolled PDF uses single-byte encoding (WinAnsi); strip anything
  // outside printable ASCII so non-Latin glyphs degrade gracefully.
  return value.replace(/[^\x20-\x7e]/g, '?');
}

function formatTimestamp(ts: Date | string | undefined): string {
  const d =
    ts instanceof Date
      ? ts
      : typeof ts === 'string'
        ? new Date(ts)
        : new Date();
  if (!Number.isFinite(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function buildContentStream(project: LocalProject, generatedAt: string): string {
  const lines: string[] = [];
  const projectName = asciiSafe(project.name ?? 'Untitled project');
  const acreage = project.acreage;
  const acreageLine =
    typeof acreage === 'number' && Number.isFinite(acreage)
      ? `Area: ${asciiSafe(formatParcelArea(acreage, project.units))}`
      : 'Area: not captured';
  const boundaryLine = project.hasParcelBoundary
    ? 'Boundary: captured'
    : 'Boundary: not captured';

  // Title
  lines.push('BT');
  lines.push('/F1 22 Tf');
  lines.push('72 740 Td');
  lines.push(`(${escapePdfString(projectName)}) Tj`);
  lines.push('ET');

  // Subtitle
  lines.push('BT');
  lines.push('/F1 12 Tf');
  lines.push('72 712 Td');
  lines.push('(Observe Presentation Snapshot) Tj');
  lines.push('ET');

  // Body lines
  const bodyLines = [
    boundaryLine,
    acreageLine,
    `Generated: ${asciiSafe(generatedAt)}`,
    '',
    'Sections included in this snapshot:',
    '  - Site overview',
    '  - Current conditions',
    '  - Ecological trajectory',
    '  - Evidence library',
    '',
    'Full interactive view is available in the Atlas Observe Dashboard.',
  ];
  let y = 680;
  for (const raw of bodyLines) {
    lines.push('BT');
    lines.push('/F1 11 Tf');
    lines.push(`72 ${y} Td`);
    lines.push(`(${escapePdfString(asciiSafe(raw))}) Tj`);
    lines.push('ET');
    y -= 16;
  }

  return lines.join('\n') + '\n';
}

export function exportPresentationToPdf(input: ExportInput): ExportResult {
  const generatedAt = formatTimestamp(input.generatedAt);
  const stream = buildContentStream(input.project, generatedAt);
  const streamBytes = new TextEncoder().encode(stream);

  // Build objects with offsets tracked byte-exact for the xref table.
  const header = '%PDF-1.4\n%\xC2\xA5\xC2\xB1\xC3\xAB\n';
  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `5 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}endstream\nendobj\n`,
  ];

  const headerBytes = new TextEncoder().encode(header);
  let cursor = headerBytes.length;
  const offsets: number[] = [];
  for (const obj of objects) {
    offsets.push(cursor);
    cursor += new TextEncoder().encode(obj).length;
  }
  const xrefOffset = cursor;

  const xrefRows = [
    'xref',
    '0 6',
    '0000000000 65535 f ',
    ...offsets.map(
      (offset) => `${offset.toString().padStart(10, '0')} 00000 n `,
    ),
  ];
  const xref = xrefRows.join('\n') + '\n';

  const trailer =
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  const body = objects.join('');
  const pdfText = header + body + xref + trailer;
  const blob = new Blob([new TextEncoder().encode(pdfText)], {
    type: 'application/pdf',
  });

  const slug = asciiSafe(input.project.name ?? 'project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const filename = `${slug || 'project'}-observe-presentation.pdf`;
  return { blob, filename };
}

/** Trigger a browser download for a generated PDF. Caller-owned URL revoke. */
export function downloadPresentationPdf(input: ExportInput): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const { blob, filename } = exportPresentationToPdf(input);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Defer revoke so Safari has a tick to fetch the blob.
  setTimeout(() => URL.revokeObjectURL(url), 250);
}
