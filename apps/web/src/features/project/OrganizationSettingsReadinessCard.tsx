/**
 * §26 OrganizationSettingsReadinessCard — workspace-wide org-settings coherence audit.
 *
 * Sibling of §26 `WorkspaceManagementReadinessCard`, `UserManagementReadinessCard`,
 * `AuditLogCard`, and `MetadataManagementCard`. Where workspace-management verdicts
 * the *count and status mix* of projects in this workspace, this card verdicts the
 * *coherence of org-level settings across them*: are units consistent across
 * projects, is the country/jurisdiction set narrow enough that grounding tooling
 * has fully-wired data, do projects share enough metadata coverage (vision,
 * conservation auth, address) to roll up cleanly into org-level reporting.
 *
 * Pure derivation — reads `useProjectStore.projects` aggregate. No fetch, no
 * shared math, no map overlays.
 *
 * Closes manifest §26 `organization-settings` (P1) partial -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useProjectStore } from '../../store/projectStore.js';
import css from './OrganizationSettingsReadinessCard.module.css';

interface Props {
  project: LocalProject;
}

type Verdict = 'aligned' | 'lean' | 'inconsistent' | 'fragmented' | 'empty';

const VERDICT_LABEL: Record<Verdict, string> = {
  aligned: 'Settings aligned',
  lean: 'Adequate but lean',
  inconsistent: 'Mixed unit system',
  fragmented: 'Settings fragmented',
  empty: 'Workspace empty',
};

const VERDICT_BLURB: Record<Verdict, string> = {
  aligned: 'Single unit system, narrow jurisdiction, strong metadata coverage across projects.',
  lean: 'Settings coherent but coverage is thin — fill more vision / address / authority fields.',
  inconsistent: 'Projects mix metric and imperial — exports and rollups will look wrong-units.',
  fragmented: 'Settings spread across many countries with low coverage — org reporting will be noisy.',
  empty: 'No projects loaded — open a project to populate org-level coverage.',
};

const FULLY_WIRED_COUNTRIES = new Set(['US', 'CA']);

const COVERAGE_GOOD = 0.75;
const COVERAGE_FAIR = 0.4;

function verdictClass(v: Verdict): string {
  if (v === 'aligned') return css.verdictGood ?? '';
  if (v === 'lean') return css.verdictMixed ?? '';
  if (v === 'inconsistent' || v === 'fragmented') return css.verdictWarn ?? '';
  return css.verdictEmpty ?? '';
}

function strFilled(s: string | null | undefined): boolean {
  return !!s && s.trim() !== '';
}

function pctTone(filled: number, total: number): { fill: string; pct: string } {
  if (total === 0) {
    return { fill: css.rowBarFillPoor ?? '', pct: css.pctPoor ?? '' };
  }
  const r = filled / total;
  if (r >= COVERAGE_GOOD) return { fill: css.rowBarFillGood ?? '', pct: css.pctGood ?? '' };
  if (r >= COVERAGE_FAIR) return { fill: css.rowBarFillFair ?? '', pct: css.pctFair ?? '' };
  return { fill: css.rowBarFillPoor ?? '', pct: css.pctPoor ?? '' };
}

interface CoverageRow {
  id: string;
  label: string;
  filled: number;
  total: number;
}

export default function OrganizationSettingsReadinessCard({ project }: Props): JSX.Element {
  const projects = useProjectStore((s) => s.projects);

  const audit = useMemo(() => {
    const total = projects.length;

    let metricCount = 0;
    let imperialCount = 0;
    const countryCounts = new Map<string, number>();
    let fullyWiredCount = 0;
    let visionFilled = 0;
    let addressFilled = 0;
    let provinceFilled = 0;
    let conservationFilled = 0;
    let parcelBoundaryFilled = 0;
    let descriptionFilled = 0;

    for (const p of projects) {
      if (p.units === 'metric') metricCount += 1;
      else if (p.units === 'imperial') imperialCount += 1;

      const country = p.country || '—';
      countryCounts.set(country, (countryCounts.get(country) ?? 0) + 1);
      if (FULLY_WIRED_COUNTRIES.has(country)) fullyWiredCount += 1;

      if (strFilled(p.visionStatement)) visionFilled += 1;
      if (strFilled(p.address)) addressFilled += 1;
      if (strFilled(p.provinceState)) provinceFilled += 1;
      if (strFilled(p.conservationAuthId)) conservationFilled += 1;
      if (p.hasParcelBoundary) parcelBoundaryFilled += 1;
      if (strFilled(p.description)) descriptionFilled += 1;
    }

    const distinctCountries = countryCounts.size;
    const unitsMixed = metricCount > 0 && imperialCount > 0;
    const countries = Array.from(countryCounts.entries())
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count);

    const coverageRows: CoverageRow[] = [
      { id: 'vision', label: 'Vision statement', filled: visionFilled, total },
      { id: 'address', label: 'Site address', filled: addressFilled, total },
      { id: 'province', label: 'Province / state', filled: provinceFilled, total },
      { id: 'boundary', label: 'Parcel boundary', filled: parcelBoundaryFilled, total },
      { id: 'description', label: 'Description', filled: descriptionFilled, total },
      { id: 'conservation', label: 'Conservation auth', filled: conservationFilled, total },
    ];

    const avgCoverage =
      total === 0
        ? 0
        : coverageRows.reduce((acc, r) => acc + r.filled / r.total, 0) / coverageRows.length;

    let verdict: Verdict;
    if (total === 0) verdict = 'empty';
    else if (unitsMixed) verdict = 'inconsistent';
    else if (distinctCountries >= 3 && avgCoverage < COVERAGE_FAIR) verdict = 'fragmented';
    else if (avgCoverage >= COVERAGE_GOOD && distinctCountries <= 2) verdict = 'aligned';
    else verdict = 'lean';

    return {
      total,
      metricCount,
      imperialCount,
      unitsMixed,
      countries,
      distinctCountries,
      fullyWiredCount,
      avgCoverage,
      coverageRows,
      verdict,
    };
  }, [projects]);

  const isFullyWired = FULLY_WIRED_COUNTRIES.has(project.country);

  return (
    <section className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Organization Settings Readiness
            <span className={css.badge}>AUDIT</span>
          </h3>
          <p className={css.cardHint}>
            Verdicts the workspace containing <em>{project.name}</em> on org-level coherence:
            unit-system consistency, jurisdiction spread, and shared-metadata coverage across
            projects. The settings themselves live on each project's intake — this is a workspace
            roll-up the steward checks before exporting org-level reports.
          </p>
        </div>
        <div className={`${css.verdictPill} ${verdictClass(audit.verdict)}`}>
          <span className={css.verdictLabel}>{VERDICT_LABEL[audit.verdict]}</span>
          <span className={css.verdictBlurb}>{VERDICT_BLURB[audit.verdict]}</span>
        </div>
      </header>

      {audit.total === 0 ? (
        <p className={css.empty}>
          No projects loaded in this workspace. Open or create a project to populate org-level
          coverage.
        </p>
      ) : (
        <>
          <div className={css.statsRow}>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.total}</span>
              <span className={css.statLabel}>Projects</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.distinctCountries}</span>
              <span className={css.statLabel}>Countries</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{audit.fullyWiredCount}</span>
              <span className={css.statLabel}>Fully-wired</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>
                {audit.unitsMixed ? 'mixed' : audit.metricCount > 0 ? 'metric' : 'imperial'}
              </span>
              <span className={css.statLabel}>Unit system</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{Math.round(audit.avgCoverage * 100)}%</span>
              <span className={css.statLabel}>Avg coverage</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{isFullyWired ? 'yes' : 'no'}</span>
              <span className={css.statLabel}>This wired</span>
            </div>
          </div>

          <div className={css.block}>
            <h4 className={css.blockTitle}>Unit system across workspace</h4>
            <div className={css.unitsRow}>
              <span className={css.unitChip}>
                Metric <span className={css.unitChipCount}>{audit.metricCount}</span>
              </span>
              <span className={css.unitChip}>
                Imperial <span className={css.unitChipCount}>{audit.imperialCount}</span>
              </span>
            </div>
          </div>

          {audit.countries.length > 0 && (
            <div className={css.block}>
              <h4 className={css.blockTitle}>Jurisdiction spread</h4>
              <div className={css.unitsRow}>
                {audit.countries.map((c) => (
                  <span key={c.code} className={css.unitChip}>
                    {c.code === '—' ? 'Unset' : c.code}
                    {FULLY_WIRED_COUNTRIES.has(c.code) ? ' ·wired' : ''}{' '}
                    <span className={css.unitChipCount}>{c.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className={css.block}>
            <h4 className={css.blockTitle}>Shared-metadata coverage (workspace-wide)</h4>
            <ul className={css.coverageList}>
              {audit.coverageRows.map((r) => {
                const pct = r.total === 0 ? 0 : Math.round((r.filled / r.total) * 100);
                const tone = pctTone(r.filled, r.total);
                return (
                  <li key={r.id} className={css.coverageRow}>
                    <span className={css.rowLabel}>{r.label}</span>
                    <span className={css.rowCount}>
                      {r.filled}/{r.total}
                    </span>
                    <span
                      className={`${css.rowBar} ${r.filled === 0 ? css.barEmpty ?? '' : ''}`}
                      aria-hidden="true"
                    >
                      <span
                        className={tone.fill}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className={`${css.pctBadge} ${tone.pct}`}>{pct}%</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {(audit.unitsMixed ||
            audit.distinctCountries >= 3 ||
            audit.avgCoverage < COVERAGE_FAIR ||
            audit.fullyWiredCount === 0) && (
            <div className={`${css.block} ${css.warnBlock}`}>
              <h4 className={css.blockTitle}>Settings flags</h4>
              <ul className={css.flagList}>
                {audit.unitsMixed && (
                  <li className={css.flagRow}>
                    <span className={css.flagBadge}>!</span>
                    Unit system is mixed ({audit.metricCount} metric, {audit.imperialCount}{' '}
                    imperial) — exports and cross-project rollups will display in inconsistent
                    units. Standardize at the project level.
                  </li>
                )}
                {audit.distinctCountries >= 3 && (
                  <li className={css.flagRow}>
                    <span className={css.flagBadge}>?</span>
                    Workspace spans {audit.distinctCountries} countries — only US and CA have
                    fully-wired grounding tooling. Other jurisdictions fall back to global Sprint
                    BG datasets.
                  </li>
                )}
                {audit.fullyWiredCount === 0 && audit.total > 0 && (
                  <li className={css.flagRow}>
                    <span className={css.flagBadge}>·</span>
                    No projects in fully-wired jurisdictions (US / CA) — all rely on global
                    fallback data. Expect coarser parcel / soils / climate inputs.
                  </li>
                )}
                {audit.avgCoverage < COVERAGE_FAIR && (
                  <li className={css.flagRow}>
                    <span className={css.flagBadge}>·</span>
                    Average shared-metadata coverage is{' '}
                    {Math.round(audit.avgCoverage * 100)}% — vision / address / boundary fields are
                    largely unset. Org-level reports will read thin.
                  </li>
                )}
              </ul>
            </div>
          )}

          <p className={css.footnote}>
            <em>Verdict thresholds:</em> aligned = single unit system, ≤2 countries, avg coverage
            ≥{Math.round(COVERAGE_GOOD * 100)}%; inconsistent = both metric and imperial present;
            fragmented = ≥3 countries with avg coverage &lt;{Math.round(COVERAGE_FAIR * 100)}%.
            Coverage tones: ≥{Math.round(COVERAGE_GOOD * 100)}% sage, ≥
            {Math.round(COVERAGE_FAIR * 100)}% amber, otherwise clay.
          </p>
        </>
      )}
    </section>
  );
}
