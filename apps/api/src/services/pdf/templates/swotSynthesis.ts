/**
 * SWOT Synthesis Summary PDF — lighter narrative companion to the diagnosis report.
 * Hero, quadrant card with synopses, S+O / W+T equations, tag cloud.
 */

import type { ExportDataBag } from './index.js';
import { baseLayout, esc, notAvailable } from './baseLayout.js';

const BUCKET_LABELS: Record<string, string> = {
  S: 'Strengths',
  W: 'Weaknesses',
  O: 'Opportunities',
  T: 'Threats',
};

const BUCKET_COLORS: Record<string, string> = {
  S: '#15803D',
  W: '#6B7280',
  O: '#CA8A04',
  T: '#DC2626',
};

const BUCKET_NOTES: Record<string, string> = {
  S: 'Internal assets and positive factors you can build upon.',
  W: 'Internal limitations or gaps that may constrain success.',
  O: 'External conditions and trends that can be leveraged.',
  T: 'External risks or pressures that could impact outcomes.',
};

interface Entry {
  bucket: 'S' | 'W' | 'O' | 'T';
  title: string;
  tags?: string[] | undefined;
}

export function renderSwotSynthesis(data: ExportDataBag): string {
  const { project: p, payload } = data;
  const swot = payload?.swot;

  if (!swot || swot.entries.length === 0) {
    return baseLayout(
      'SWOT Synthesis Summary',
      p.name,
      notAvailable(
        'No SWOT entries to synthesise yet. Capture at least a few observations in the SWOT Journal to generate a synthesis.',
      ),
    );
  }

  const entries: Entry[] = swot.entries;
  const counts: Record<string, number> = { S: 0, W: 0, O: 0, T: 0 };
  for (const e of entries) counts[e.bucket] = (counts[e.bucket] ?? 0) + 1;

  // ─── Tag frequency (top 10) ───────────────────────────────────
  const tagFreq: Record<string, number> = {};
  for (const e of entries) for (const t of e.tags ?? []) tagFreq[t] = (tagFreq[t] ?? 0) + 1;
  const topTags = Object.entries(tagFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const maxFreq = topTags.length > 0 ? (topTags[0]?.[1] ?? 1) : 1;

  // ─── Hero ─────────────────────────────────────────────────────
  const hero = `
    <div class="card" style="background:linear-gradient(135deg,#ECFDF5 0%,#FEF3C7 100%);border:none;padding:28px;text-align:center">
      <h2 style="border:none;margin:0 0 8px;color:#14532D;font-size:18pt">Strategic synthesis</h2>
      <p style="font-size:11pt;color:#4B5563;max-width:480px;margin:0 auto">
        ${entries.length} observation${entries.length === 1 ? '' : 's'} across four lenses, distilled
        into design leverage points for ${esc(p.name)}.
      </p>
    </div>`;

  // ─── Quadrant card ────────────────────────────────────────────
  const quadrant = `
    <h2>Four lenses</h2>
    <div class="card-grid-2">
      ${(['S', 'W', 'O', 'T'] as const).map((b) => `
        <div class="card" style="border-left:4px solid ${BUCKET_COLORS[b]}">
          <div style="display:flex;align-items:baseline;justify-content:space-between">
            <h3 style="color:${BUCKET_COLORS[b]};margin:0">${esc(BUCKET_LABELS[b])}</h3>
            <span class="card-value" style="color:${BUCKET_COLORS[b]};font-size:18pt">${counts[b]}</span>
          </div>
          <p style="font-size:9.5pt;color:#4B5563;margin:8px 0 0">${esc(BUCKET_NOTES[b])}</p>
        </div>`).join('')}
    </div>`;

  // ─── Equations ────────────────────────────────────────────────
  const equations = `
    <h2>How the synthesis works</h2>
    <div class="card-grid-2">
      <div class="card" style="border-left:4px solid #15803D;background:#ECFDF5">
        <p style="font-family:'Fira Code',monospace;font-size:14pt;color:#15803D;margin-bottom:6px">
          <strong>S</strong> + <strong>O</strong> →
        </p>
        <p>Maximise opportunities using your strengths. Pair internal assets with external trends.</p>
      </div>
      <div class="card" style="border-left:4px solid #DC2626;background:#FEE2E2">
        <p style="font-family:'Fira Code',monospace;font-size:14pt;color:#DC2626;margin-bottom:6px">
          <strong>W</strong> + <strong>T</strong> →
        </p>
        <p>Mitigate threats by addressing weaknesses. Reduce internal exposure to external risks.</p>
      </div>
    </div>`;

  // ─── Tag cloud ────────────────────────────────────────────────
  const tagCloud = topTags.length === 0
    ? ''
    : `
      <h2>Recurring themes</h2>
      <p style="color:#4B5563;font-size:9.5pt">Tags that appear most often across journal entries — anchor points for design conversations.</p>
      <div style="display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 20px">
        ${topTags.map(([tag, freq]) => {
          const weight = 0.6 + (freq / maxFreq) * 0.4;
          const fontSize = 9 + (freq / maxFreq) * 5;
          return `<span style="background:#ECFDF5;color:#14532D;padding:4px 12px;border-radius:14px;font-size:${fontSize.toFixed(1)}pt;opacity:${weight.toFixed(2)};border:1px solid #15803D">${esc(tag)} <strong style="color:#15803D">×${freq}</strong></span>`;
        }).join('')}
      </div>`;

  const body = `
    ${hero}
    ${quadrant}
    ${equations}
    ${tagCloud}
    <div class="disclaimer">
      Synthesis summary distilled from ${entries.length} SWOT observation${entries.length === 1 ? '' : 's'}. For the full per-entry record, export the SWOT Journal; for prioritised findings and recommended-action pairings, export the SWOT Diagnosis Report.
    </div>`;

  return baseLayout('SWOT Synthesis Summary', p.name, body);
}
