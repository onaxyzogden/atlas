/**
 * baseLayout — shared HTML shell, design system CSS, and utility helpers
 * for all PDF export templates.
 *
 * Design system: Earth Green #15803D, Harvest Gold #CA8A04, Fira Code + Fira Sans
 */

// ─── Utility helpers ──────────────────────────────────────────────────────────

export function esc(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function fmtNumber(n: number | null | undefined, decimals = 0): string {
  if (n == null || isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function fmtDollars(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

export function fmtRange(range: { low: number; mid: number; high: number } | null | undefined): string {
  if (!range) return '—';
  return `${fmtDollars(range.low)} – ${fmtDollars(range.high)}`;
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function fmtPercent(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return '—';
  return `${n.toFixed(1)}%`;
}

export function scoreColor(score: number): string {
  if (score >= 75) return '#15803D';
  if (score >= 50) return '#CA8A04';
  if (score >= 25) return '#D97706';
  return '#DC2626';
}

// ─── Score gauge (inline SVG) ─────────────────────────────────────────────────

export function scoreGauge(score: number, label: string, size = 80): string {
  const radius = (size - 10) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);
  const cx = size / 2;
  const cy = size / 2;

  return `
    <div class="score-gauge">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#E5E7EB" stroke-width="6" />
        <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${color}" stroke-width="6"
          stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"
          stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})" />
        <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central"
          font-family="'Fira Code', monospace" font-size="18" font-weight="700" fill="${color}">
          ${Math.round(score)}
        </text>
      </svg>
      <div class="score-gauge-label">${esc(label)}</div>
    </div>`;
}

// ─── Severity badge ───────────────────────────────────────────────────────────

export function severityBadge(severity: string): string {
  const colors: Record<string, string> = {
    critical: '#DC2626', warning: '#D97706', info: '#2563EB',
  };
  const bg = colors[severity] ?? '#6B7280';
  return `<span class="badge" style="background:${bg};color:#fff">${esc(severity)}</span>`;
}

// ─── Not-available placeholder ────────────────────────────────────────────────

export function notAvailable(section: string): string {
  return `
    <div class="not-available">
      <p><strong>${esc(section)}</strong> — Data not yet available.</p>
      <p>This section will populate once the relevant data is collected.</p>
    </div>`;
}

// ─── Base layout wrapper ──────────────────────────────────────────────────────

export function baseLayout(title: string, projectName: string, body: string): string {
  const now = fmtDate(new Date());

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)} — ${esc(projectName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;600;700&family=Fira+Sans:ital,wght@0,300;0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />
  <style>
    /* ─── Design System Tokens ───────────────────────────────────── */
    :root {
      --earth-green: #15803D;
      --harvest-gold: #CA8A04;
      --bg-page: #F0FDF4;
      --bg-card: #FFFFFF;
      --text-primary: #14532D;
      --text-secondary: #4B5563;
      --text-muted: #9CA3AF;
      --border: #D1D5DB;
      --border-light: #E5E7EB;
      --danger: #DC2626;
      --warning: #D97706;
    }

    /* ─── Reset + Base ───────────────────────────────────────────── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Fira Sans', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: var(--text-primary);
      background: var(--bg-page);
    }

    /* ─── Page layout ────────────────────────────────────────────── */
    .page {
      max-width: 210mm;
      margin: 0 auto;
      padding: 0;
    }

    .cover {
      text-align: center;
      padding: 60px 40px;
      page-break-after: always;
    }

    .cover h1 {
      font-family: 'Fira Code', monospace;
      font-size: 28pt;
      color: var(--earth-green);
      margin-bottom: 8px;
    }

    .cover .subtitle {
      font-size: 14pt;
      color: var(--harvest-gold);
      font-weight: 600;
      margin-bottom: 24px;
    }

    .cover .project-name {
      font-size: 20pt;
      color: var(--text-primary);
      font-weight: 700;
      margin-bottom: 8px;
    }

    .cover .meta {
      font-size: 10pt;
      color: var(--text-secondary);
    }

    .cover .logo-mark {
      font-family: 'Fira Code', monospace;
      font-size: 14pt;
      letter-spacing: 4px;
      color: var(--earth-green);
      border: 2px solid var(--earth-green);
      display: inline-block;
      padding: 8px 24px;
      margin-bottom: 32px;
    }

    /* ─── Typography ─────────────────────────────────────────────── */
    h1, h2, h3, h4 {
      font-family: 'Fira Code', monospace;
      color: var(--earth-green);
    }

    h2 {
      font-size: 16pt;
      border-bottom: 2px solid var(--harvest-gold);
      padding-bottom: 6px;
      margin: 32px 0 16px;
    }

    h3 {
      font-size: 12pt;
      margin: 20px 0 10px;
    }

    h4 {
      font-size: 10pt;
      color: var(--harvest-gold);
      margin: 16px 0 8px;
    }

    p { margin: 0 0 10px; }

    /* ─── Cards ──────────────────────────────────────────────────── */
    .card {
      background: var(--bg-card);
      border: 1px solid var(--border-light);
      border-radius: 6px;
      padding: 16px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }

    .card-header {
      font-family: 'Fira Code', monospace;
      font-size: 10pt;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 6px;
    }

    .card-value {
      font-family: 'Fira Code', monospace;
      font-size: 20pt;
      font-weight: 700;
      color: var(--earth-green);
    }

    .card-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin: 16px 0;
    }

    .card-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      margin: 16px 0;
    }

    /* ─── Tables ─────────────────────────────────────────────────── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0;
      font-size: 9.5pt;
    }

    thead th {
      background: var(--earth-green);
      color: #fff;
      font-family: 'Fira Code', monospace;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 10px;
      text-align: left;
    }

    tbody td {
      padding: 7px 10px;
      border-bottom: 1px solid var(--border-light);
    }

    tbody tr:nth-child(even) { background: #F9FAFB; }

    .total-row td {
      font-weight: 700;
      border-top: 2px solid var(--earth-green);
      background: #ECFDF5;
    }

    /* ─── Score gauges ───────────────────────────────────────────── */
    .score-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: center;
      margin: 20px 0;
    }

    .score-gauge {
      text-align: center;
      width: 100px;
    }

    .score-gauge-label {
      font-size: 8pt;
      color: var(--text-secondary);
      margin-top: 4px;
    }

    /* ─── Badges ─────────────────────────────────────────────────── */
    .badge {
      display: inline-block;
      font-size: 7pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 2px 8px;
      border-radius: 3px;
    }

    .badge-phase {
      background: var(--harvest-gold);
      color: #fff;
    }

    .badge-type {
      background: var(--earth-green);
      color: #fff;
    }

    /* ─── Not-available block ────────────────────────────────────── */
    .not-available {
      background: #FEF3C7;
      border-left: 4px solid var(--harvest-gold);
      padding: 12px 16px;
      margin: 16px 0;
      border-radius: 0 4px 4px 0;
      font-size: 9.5pt;
      color: #92400E;
    }

    /* ─── Section divider ────────────────────────────────────────── */
    .section {
      page-break-inside: avoid;
      margin-bottom: 20px;
    }

    /* ─── Disclaimer ─────────────────────────────────────────────── */
    .disclaimer {
      background: #F9FAFB;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 12px 16px;
      font-size: 8pt;
      color: var(--text-secondary);
      margin-top: 24px;
    }

    /* ─── Footer ─────────────────────────────────────────────────── */
    .page-footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid var(--border-light);
      font-size: 8pt;
      color: var(--text-muted);
      text-align: center;
    }

    /* ─── Glossary ───────────────────────────────────────────────── */
    .glossary dt {
      font-family: 'Fira Code', monospace;
      font-weight: 600;
      color: var(--earth-green);
      margin-top: 8px;
    }

    .glossary dd {
      margin-left: 0;
      margin-bottom: 6px;
      font-size: 9.5pt;
      color: var(--text-secondary);
    }

    /* ─── Print overrides ────────────────────────────────────────── */
    @page {
      size: A4;
      margin: 20mm 15mm;
    }

    @media print {
      body { background: #fff; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="cover">
      <div class="logo-mark">OGDEN ATLAS</div>
      <div class="subtitle">${esc(title)}</div>
      <div class="project-name">${esc(projectName)}</div>
      <div class="meta">Generated ${now}</div>
    </div>
    ${body}
    <div class="page-footer">
      OGDEN Atlas &mdash; ${esc(title)} &mdash; Generated ${now}<br/>
      For planning purposes only. Professional verification recommended before implementation.
    </div>
  </div>
</body>
</html>`;
}
