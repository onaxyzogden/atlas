/**
 * Human Context Report PDF — Observe Module 1 export.
 *
 * Renders the steward survey snapshot (profile, capacity, archetype, skills),
 * the indigenous + regional context inventory (place-names, challenges,
 * strengths, local network), the vision package (statement, themes,
 * success metrics, principles, guiding values, constraints), phased
 * intent notes, milestones, and an overall module-health rollup.
 *
 * Eighth (final) Observe export following the locked 4-file recipe.
 */

import type { ExportDataBag } from './index.js';
import { baseLayout, esc, fmtDate, notAvailable } from './baseLayout.js';

interface HumanContextEntry {
  steward: {
    name?: string;
    age?: number;
    occupation?: string;
    lifestyle?: 'active' | 'sedentary';
    maintenanceHrsInitial?: number;
    maintenanceHrsOngoing?: number;
    budget?: string;
    skills?: string[];
    vision?: string;
    coreFunctions?: string[];
    experienceGoals?: string[];
    successMetrics?: string[];
    principles?: string[];
    guidingValues?: string[];
    constraints?: string[];
    moodboardImageCount?: number;
  };
  regional: {
    indigenousNames?: string[];
    culturalChallenges?: string[];
    culturalStrengths?: string[];
    localNetwork?: Array<{ id: string; name: string; type: string; contact?: string }>;
  };
  phaseNotes: Array<{ phaseKey: string; label: string; notes: string }>;
  milestones: Array<{ id: string; phaseId: string; note: string; targetDate: string | null }>;
  archetype: { name: string; blurb: string };
  totals: {
    overallPct: number;
    stewardPct: number;
    regionalPct: number;
    visionPct: number;
    totalHoursPerWeek: number;
    milestonesDefined: number;
    moodboardImageCount: number;
  };
}

function healthTone(pct: number): { label: 'Strong' | 'Forming' | 'Sparse'; color: string } {
  if (pct >= 70) return { label: 'Strong', color: '#15803D' };
  if (pct >= 30) return { label: 'Forming', color: '#CA8A04' };
  return { label: 'Sparse', color: '#DC2626' };
}

function chips(items: string[] | undefined, emptyHint: string): string {
  if (!items || items.length === 0) {
    return `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic;margin:0">${esc(emptyHint)}</p>`;
  }
  return `<div style="display:flex;flex-wrap:wrap;gap:6px">
    ${items
      .map(
        (s) =>
          `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:9pt;background:#F0FDF4;color:#14532D;border:1px solid #BBF7D0">${esc(s)}</span>`,
      )
      .join('')}
  </div>`;
}

export function renderHumanContextReport(data: ExportDataBag): string {
  const { project: p, payload } = data;
  const hc = payload?.humanContext;

  if (!hc) {
    return baseLayout(
      'Human Context Report',
      p.name,
      notAvailable(
        'No steward, regional, or vision data has been captured yet. Use the Human Context module in the Observe stage to fill in the steward survey, indigenous & regional context, and vision detail.',
      ),
    );
  }

  const entry: HumanContextEntry = hc;
  const s = entry.steward;
  const r = entry.regional;
  const t = entry.totals;

  const overallTone = healthTone(t.overallPct);

  // ─── Hero ─────────────────────────────────────────────────────────
  const hero = `
    <div class="card" style="background:linear-gradient(135deg,#ECFDF5 0%,#FEF3C7 100%);border:none;padding:28px;text-align:center">
      <h2 style="border:none;margin:0 0 8px;color:#14532D;font-size:18pt">Human Context synthesis</h2>
      <p style="font-size:11pt;color:#4B5563;max-width:600px;margin:0 auto">
        Module health <strong style="color:${overallTone.color}">${overallTone.label}</strong> at
        <strong>${t.overallPct}%</strong> for ${esc(p.name)}.
        ${s.name ? `Steward: <strong>${esc(s.name)}</strong>${s.occupation ? `, ${esc(s.occupation)}` : ''}.` : 'Steward profile not yet captured.'}
        ${t.totalHoursPerWeek > 0 ? `Capacity ${t.totalHoursPerWeek} hrs/week.` : ''}
      </p>
    </div>`;

  // ─── KPI strip ────────────────────────────────────────────────────
  const kpiCard = (label: string, value: string, accent: string, note?: string) => `
    <div class="card" style="border-left:4px solid ${accent}">
      <div class="card-header">${esc(label)}</div>
      <div class="card-value" style="color:${accent}">${value}</div>
      ${note ? `<p style="font-size:9pt;color:#4B5563;margin:6px 0 0">${esc(note)}</p>` : ''}
    </div>`;

  const stewardTone = healthTone(t.stewardPct);
  const regionalTone = healthTone(t.regionalPct);
  const visionTone = healthTone(t.visionPct);

  const kpiStrip = `
    <h2>Module health</h2>
    <div class="card-grid">
      ${kpiCard('People & Capacity', `${t.stewardPct}%`, stewardTone.color, stewardTone.label)}
      ${kpiCard('Place & Culture', `${t.regionalPct}%`, regionalTone.color, regionalTone.label)}
      ${kpiCard('Vision & Purpose', `${t.visionPct}%`, visionTone.color, visionTone.label)}
      ${kpiCard(
        'Milestones',
        String(t.milestonesDefined),
        t.milestonesDefined > 0 ? '#15803D' : '#6B7280',
        t.milestonesDefined > 0 ? 'Defined' : 'None yet',
      )}
    </div>`;

  // ─── Steward profile ──────────────────────────────────────────────
  const stewardRows: Array<[string, string]> = [];
  if (s.name) stewardRows.push(['Name', s.name]);
  if (s.age != null) stewardRows.push(['Age', String(s.age)]);
  if (s.occupation) stewardRows.push(['Occupation', s.occupation]);
  if (s.lifestyle) stewardRows.push(['Lifestyle', s.lifestyle === 'active' ? 'Active' : 'Sedentary']);
  if (s.maintenanceHrsInitial != null)
    stewardRows.push(['Initial capacity', `${s.maintenanceHrsInitial} hrs/week`]);
  if (s.maintenanceHrsOngoing != null)
    stewardRows.push(['Ongoing capacity', `${s.maintenanceHrsOngoing} hrs/week`]);
  if (s.budget) stewardRows.push(['Budget', s.budget]);

  const stewardProfileTable =
    stewardRows.length === 0
      ? `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No steward fields captured yet — open the Steward Survey to fill in the basics.</p>`
      : `<table>
          <tbody>
            ${stewardRows
              .map(
                ([k, v]) => `
              <tr>
                <td style="width:160px;color:#6B7280;font-size:9.5pt">${esc(k)}</td>
                <td><strong>${esc(v)}</strong></td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  const archetypeCard = `
    <div class="card" style="background:#F0FDF4;border-left:4px solid #15803D">
      <div class="card-header">Steward archetype</div>
      <div class="card-value" style="color:#14532D;font-size:13pt">${esc(entry.archetype.name)}</div>
      <p style="font-size:9.5pt;color:#4B5563;margin:6px 0 0">${esc(entry.archetype.blurb)}</p>
    </div>`;

  const stewardSection = `
    <h2>Steward survey</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px">
      <div>${stewardProfileTable}</div>
      <div>${archetypeCard}</div>
    </div>
    <h3 style="font-size:11pt;margin:14px 0 6px;color:#14532D">Skills</h3>
    ${chips(s.skills, 'No skills captured yet.')}
  `;

  // ─── Regional + indigenous context ────────────────────────────────
  const networkTable =
    !r.localNetwork || r.localNetwork.length === 0
      ? `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No local contacts captured.</p>`
      : `<table>
          <thead>
            <tr>
              <th>Name</th>
              <th style="width:140px">Type</th>
              <th style="width:160px">Contact</th>
            </tr>
          </thead>
          <tbody>
            ${r.localNetwork
              .map(
                (c) => `
              <tr>
                <td><strong>${esc(c.name)}</strong></td>
                <td style="font-size:9pt;text-transform:capitalize">${esc(c.type)}</td>
                <td style="font-size:9pt;color:#4B5563">${c.contact ? esc(c.contact) : '<span style="color:#9CA3AF">—</span>'}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  const regionalSection = `
    <h2>Indigenous & regional context</h2>
    <h3 style="font-size:11pt;margin:8px 0 6px;color:#14532D">Indigenous place-names</h3>
    ${chips(r.indigenousNames, 'No place-names captured yet.')}
    <h3 style="font-size:11pt;margin:14px 0 6px;color:#14532D">Cultural strengths</h3>
    ${chips(r.culturalStrengths, 'No strengths captured yet.')}
    <h3 style="font-size:11pt;margin:14px 0 6px;color:#DC2626">Cultural challenges</h3>
    ${chips(r.culturalChallenges, 'No challenges captured yet.')}
    <h3 style="font-size:11pt;margin:14px 0 6px;color:#14532D">Local network</h3>
    ${networkTable}
  `;

  // ─── Vision package ───────────────────────────────────────────────
  const visionStatement = s.vision
    ? `<blockquote style="border-left:4px solid #CA8A04;padding:10px 14px;margin:0 0 12px;background:#FFFBEB;font-size:11pt;color:#14532D;font-style:italic">${esc(s.vision)}</blockquote>`
    : `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No vision statement captured yet.</p>`;

  const visionSection = `
    <h2>Vision detail</h2>
    ${visionStatement}
    <h3 style="font-size:11pt;margin:14px 0 6px;color:#14532D">Core functions</h3>
    ${chips(s.coreFunctions, 'No core functions captured yet.')}
    <h3 style="font-size:11pt;margin:14px 0 6px;color:#14532D">Experience goals</h3>
    ${chips(s.experienceGoals, 'No experience goals captured yet.')}
    <h3 style="font-size:11pt;margin:14px 0 6px;color:#14532D">Success metrics</h3>
    ${chips(s.successMetrics, 'No success metrics captured yet.')}
    <h3 style="font-size:11pt;margin:14px 0 6px;color:#14532D">Guiding principles</h3>
    ${chips(s.principles, 'No principles captured yet.')}
    <h3 style="font-size:11pt;margin:14px 0 6px;color:#14532D">Guiding values</h3>
    ${chips(s.guidingValues, 'No guiding values captured yet.')}
    <h3 style="font-size:11pt;margin:14px 0 6px;color:#DC2626">Constraints</h3>
    ${chips(s.constraints, 'No constraints captured yet.')}
  `;

  // ─── Phased intent ────────────────────────────────────────────────
  const phasedIntent =
    entry.phaseNotes.every((pn) => !pn.notes.trim())
      ? `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No phased notes captured yet — write a sentence for year 1, years 2–3, and years 4+.</p>`
      : `<table>
          <thead>
            <tr>
              <th style="width:140px">Phase</th>
              <th>Intent</th>
            </tr>
          </thead>
          <tbody>
            ${entry.phaseNotes
              .map(
                (pn) => `
              <tr>
                <td><strong>${esc(pn.label)}</strong></td>
                <td style="font-size:9.5pt;color:#4B5563">${pn.notes.trim() ? esc(pn.notes) : '<span style="color:#9CA3AF">— not captured</span>'}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  const phasedSection = `
    <h2>Phased intent</h2>
    ${phasedIntent}`;

  // ─── Milestones ───────────────────────────────────────────────────
  const milestonesTable =
    entry.milestones.length === 0
      ? `<p style="font-size:9.5pt;color:#9CA3AF;font-style:italic">No milestones defined yet.</p>`
      : `<table>
          <thead>
            <tr>
              <th>Milestone</th>
              <th style="width:120px">Phase</th>
              <th style="width:130px">Target date</th>
            </tr>
          </thead>
          <tbody>
            ${entry.milestones
              .map(
                (m) => `
              <tr>
                <td style="font-size:9.5pt">${esc(m.note)}</td>
                <td style="font-size:9pt;color:#4B5563">${esc(m.phaseId)}</td>
                <td style="font-size:9pt;color:#4B5563">${m.targetDate ? esc(fmtDate(m.targetDate)) : '<span style="color:#9CA3AF">—</span>'}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>`;

  const milestonesSection = `
    <h2>Milestones</h2>
    ${milestonesTable}`;

  // ─── Recommended actions (heuristic) ──────────────────────────────
  const actions: { title: string; note: string; priority: 'High' | 'Medium' | 'Low' }[] = [];

  if (t.stewardPct < 30) {
    actions.push({
      title: 'Fill in the steward survey',
      note: 'Capture the basics — name, occupation, available capacity, budget, and 3+ skills — so design can match the steward, not a generic owner.',
      priority: 'High',
    });
  }

  if ((r.localNetwork?.length ?? 0) === 0) {
    actions.push({
      title: 'Add a local network contact',
      note: 'Resilient designs lean on local relationships — add at least one nursery, extension office, or neighbouring farmer.',
      priority: 'Medium',
    });
  }

  if (!s.vision) {
    actions.push({
      title: 'Write a one-sentence vision statement',
      note: 'The vision statement anchors zone prioritization and capital-partner conversations downstream.',
      priority: 'High',
    });
  }

  if ((s.coreFunctions?.length ?? 0) === 0) {
    actions.push({
      title: 'Identify 3–5 core functions',
      note: 'Core functions become the design hypotheses — what the land must do for the steward.',
      priority: 'Medium',
    });
  }

  if ((r.culturalChallenges?.length ?? 0) > 0) {
    actions.push({
      title: 'Sequence cultural-challenge mitigations',
      note: `${r.culturalChallenges?.length ?? 0} cultural challenge${(r.culturalChallenges?.length ?? 0) === 1 ? '' : 's'} surfaced — address them in early design phases, not retrofits.`,
      priority: 'Medium',
    });
  }

  if (entry.phaseNotes.every((pn) => !pn.notes.trim())) {
    actions.push({
      title: 'Sketch the phased intent',
      note: 'Capture a sentence each for Year 1, Years 2–3, and Years 4+ so phasing has a written anchor.',
      priority: 'Medium',
    });
  }

  if (actions.length === 0) {
    actions.push({
      title: 'Move to Macroclimate & Hazards',
      note: 'Human context is well-grounded — proceed to climate, hazards, and topography to deepen the site picture.',
      priority: 'Low',
    });
  }

  const actionsSection = `
    <h2>Recommended actions</h2>
    <table>
      <thead>
        <tr>
          <th>Action</th>
          <th>Rationale</th>
          <th style="width:80px">Priority</th>
        </tr>
      </thead>
      <tbody>
        ${actions
          .map(
            (a) => `
          <tr>
            <td><strong>${esc(a.title)}</strong></td>
            <td style="font-size:9.5pt;color:#4B5563">${esc(a.note)}</td>
            <td><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:8.5pt;font-weight:600;color:white;background:${a.priority === 'High' ? '#DC2626' : a.priority === 'Medium' ? '#CA8A04' : '#0F766E'}">${a.priority}</span></td>
          </tr>`,
          )
          .join('')}
      </tbody>
    </table>`;

  const footer = `
    <p style="font-size:8.5pt;color:#9CA3AF;text-align:center;margin-top:24px">
      Generated ${esc(fmtDate(data.generatedAt))} · Atlas Human Context export
    </p>`;

  return baseLayout(
    'Human Context Report',
    p.name,
    `${hero}${kpiStrip}${stewardSection}${regionalSection}${visionSection}${phasedSection}${milestonesSection}${actionsSection}${footer}`,
  );
}
