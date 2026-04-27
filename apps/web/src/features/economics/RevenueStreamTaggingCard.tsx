/**
 * §22 RevenueStreamTaggingCard — revenue-stream tagging + enterprise mapping audit.
 *
 * Groups every detected revenue stream by its enterprise tag, surfaces
 * concentration risk, and flags the gap between detected enterprises
 * (from the financial engine) and the project-intent expectations
 * (from `project.projectType`). Pure derivation from `useFinancialModel`,
 * no writes.
 *
 * Closes manifest §22 `revenue-stream-tagging-enterprise-mapping`
 * (P2) partial -> done.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { useFinancialModel } from '../financial/hooks/useFinancialModel.js';
import type { EnterpriseType, RevenueStream } from '../financial/engine/types.js';
import { formatKRange } from '../../lib/formatRange.js';
import css from './RevenueStreamTaggingCard.module.css';

interface Props {
  project: LocalProject;
}

const ENTERPRISE_LABEL: Record<EnterpriseType, string> = {
  livestock: 'Livestock',
  orchard: 'Orchard',
  market_garden: 'Market garden',
  retreat: 'Retreat',
  education: 'Education',
  agritourism: 'Agritourism',
  carbon: 'Carbon credits',
  grants: 'Grants',
};

const ENTERPRISE_BLURB: Record<EnterpriseType, string> = {
  livestock: 'Animal-product sales (meat, dairy, eggs, fibre).',
  orchard: 'Tree-crop and food-forest yields.',
  market_garden: 'Annual vegetables, herbs, cut flowers.',
  retreat: 'Lodging fees, multi-day stays.',
  education: 'Class fees, courses, certifications.',
  agritourism: 'Tours, events, single-day visits.',
  carbon: 'Carbon-sequestration credit sales.',
  grants: 'Cost-share, agricultural and conservation grants.',
};

type ProjectType = NonNullable<LocalProject['projectType']>;

const EXPECTED_BY_TYPE: Partial<Record<ProjectType, EnterpriseType[]>> = {
  regenerative_farm: ['livestock', 'market_garden', 'orchard'],
  retreat_center:    ['retreat', 'agritourism'],
  homestead:         ['market_garden', 'orchard'],
  educational_farm:  ['education', 'market_garden', 'agritourism'],
  conservation:      ['carbon', 'grants'],
  multi_enterprise:  ['livestock', 'market_garden', 'orchard', 'retreat', 'education'],
  moontrance:        ['retreat', 'education', 'agritourism'],
};

interface TagRow {
  tag: EnterpriseType;
  streams: RevenueStream[];
  totalMid: number;
  totalLow: number;
  totalHigh: number;
  share: number;
  isExpected: boolean;
}

interface MissingExpected {
  tag: EnterpriseType;
  reason: 'no-stream' | 'expected-by-intent';
}

const CONCENTRATION_HIGH = 0.8;
const CONCENTRATION_LOW = 0.6;

function buildTagRows(
  streams: RevenueStream[],
  expected: Set<EnterpriseType>,
  totalMid: number,
): TagRow[] {
  const grouped = new Map<EnterpriseType, RevenueStream[]>();
  for (const s of streams) {
    const list = grouped.get(s.enterprise) ?? [];
    list.push(s);
    grouped.set(s.enterprise, list);
  }
  const rows: TagRow[] = [];
  for (const [tag, list] of grouped.entries()) {
    const mid = list.reduce((sum, s) => sum + s.annualRevenue.mid, 0);
    const low = list.reduce((sum, s) => sum + s.annualRevenue.low, 0);
    const high = list.reduce((sum, s) => sum + s.annualRevenue.high, 0);
    rows.push({
      tag,
      streams: list,
      totalMid: mid,
      totalLow: low,
      totalHigh: high,
      share: totalMid > 0 ? mid / totalMid : 0,
      isExpected: expected.has(tag),
    });
  }
  rows.sort((a, b) => b.totalMid - a.totalMid);
  return rows;
}

type Verdict = 'diversified' | 'concentrated' | 'thin' | 'gaps' | 'empty';

interface VerdictResult {
  verdict: Verdict;
  label: string;
  blurb: string;
}

function deriveVerdict(
  tagRows: TagRow[],
  missing: MissingExpected[],
  detectedNoStream: EnterpriseType[],
): VerdictResult {
  if (tagRows.length === 0) {
    return {
      verdict: 'empty',
      label: 'No streams',
      blurb: 'Place enterprise features to surface revenue tags.',
    };
  }
  const top = tagRows[0];
  if (detectedNoStream.length > 0) {
    return {
      verdict: 'gaps',
      label: 'Tagging gaps',
      blurb: `${detectedNoStream.length} detected enterprise${detectedNoStream.length === 1 ? '' : 's'} carries no revenue stream.`,
    };
  }
  if (top && top.share >= CONCENTRATION_HIGH) {
    return {
      verdict: 'concentrated',
      label: 'Concentrated',
      blurb: `${ENTERPRISE_LABEL[top.tag]} carries ${Math.round(top.share * 100)}% of revenue at maturity.`,
    };
  }
  if (tagRows.length <= 2 || missing.length >= 2) {
    return {
      verdict: 'thin',
      label: 'Thin mix',
      blurb: missing.length > 0
        ? `${missing.length} project-intent stream${missing.length === 1 ? '' : 's'} missing.`
        : 'Mix is concentrated in one or two tags.',
    };
  }
  return {
    verdict: 'diversified',
    label: 'Diversified',
    blurb: 'Multiple tags carry revenue with no single dominant stream.',
  };
}

export default function RevenueStreamTaggingCard({ project }: Props) {
  const model = useFinancialModel(project.id);

  const data = useMemo(() => {
    if (!model) return null;
    const streams = model.revenueStreams;
    const detected: EnterpriseType[] = model.enterprises;
    const projectType = (project.projectType ?? null) as ProjectType | null;
    const expectedList = projectType ? (EXPECTED_BY_TYPE[projectType] ?? []) : [];
    const expectedSet = new Set<EnterpriseType>(expectedList);

    const totalMid = streams.reduce((sum, s) => sum + s.annualRevenue.mid, 0);
    const tagRows = buildTagRows(streams, expectedSet, totalMid);
    const taggedSet = new Set(tagRows.map((r) => r.tag));

    const detectedNoStream = detected.filter((e) => !taggedSet.has(e));
    const missingExpected: MissingExpected[] = [];
    for (const tag of expectedList) {
      if (!taggedSet.has(tag)) {
        missingExpected.push({
          tag,
          reason: detected.includes(tag) ? 'no-stream' : 'expected-by-intent',
        });
      }
    }

    const verdict = deriveVerdict(tagRows, missingExpected, detectedNoStream);
    return {
      streams,
      tagRows,
      detected,
      detectedNoStream,
      missingExpected,
      expectedList,
      projectType,
      totalMid,
      verdict,
    };
  }, [model, project.projectType, project.id]);

  if (!model || !data) {
    return (
      <div className={css.card}>
        <header className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>
              Revenue stream tagging &amp; enterprise mapping
              <span className={css.badge}>AUDIT</span>
            </h3>
            <p className={css.cardHint}>
              Place zones, structures, paddocks, or crop areas on the map
              to surface revenue tags. Each detected enterprise should
              carry at least one tagged revenue stream — this card flags
              the ones that don't.
            </p>
          </div>
        </header>
        <p className={css.empty}>
          Financial model not yet computed. Add features to the project
          map and the audit will appear here.
        </p>
      </div>
    );
  }

  const { tagRows, detectedNoStream, missingExpected, expectedList, projectType, totalMid, verdict } = data;

  const verdictClass =
    verdict.verdict === 'diversified' ? css.verdictGood ?? ''
    : verdict.verdict === 'concentrated' ? css.verdictWork ?? ''
    : verdict.verdict === 'thin' ? css.verdictFair ?? ''
    : verdict.verdict === 'gaps' ? css.verdictWork ?? ''
    : css.verdictBlock ?? '';

  return (
    <div className={css.card}>
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>
            Revenue stream tagging &amp; enterprise mapping
            <span className={css.badge}>AUDIT</span>
          </h3>
          <p className={css.cardHint}>
            Groups detected revenue streams by enterprise tag (livestock,
            orchard, market garden, retreat, education, agritourism,
            carbon, grants), measures concentration, and cross-references
            against what the project intent (<em>{projectType ?? 'unset'}</em>)
            implies. <em>Concentration</em> ≥80% on a single tag is the
            warning band; <em>Tagging gap</em> means an enterprise was
            detected on the map but generated no priced stream.
          </p>
        </div>
        <div className={`${css.verdictPill} ${verdictClass}`}>
          <span className={css.verdictLabel}>{verdict.label}</span>
          <span className={css.verdictBlurb}>{verdict.blurb}</span>
        </div>
      </header>

      {tagRows.length === 0 ? (
        <p className={css.empty}>
          No revenue streams detected yet. Add a retreat zone with cabins,
          a paddock with livestock, an orchard or market garden — the
          financial engine will surface tagged streams once at least one
          enterprise is identifiable.
        </p>
      ) : (
        <>
          <div className={css.statsRow}>
            <div className={css.stat}>
              <span className={css.statValue}>{tagRows.length}</span>
              <span className={css.statLabel}>Tags</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{data.streams.length}</span>
              <span className={css.statLabel}>Streams</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{detectedNoStream.length}</span>
              <span className={css.statLabel}>Untagged enterprises</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>{missingExpected.length}</span>
              <span className={css.statLabel}>Intent gaps</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>
                {tagRows[0] ? `${Math.round(tagRows[0].share * 100)}%` : '—'}
              </span>
              <span className={css.statLabel}>Top-tag share</span>
            </div>
            <div className={css.stat}>
              <span className={css.statValue}>${Math.round(totalMid / 1000)}K</span>
              <span className={css.statLabel}>Mid total /yr</span>
            </div>
          </div>

          <ul className={css.tagList}>
            {tagRows.map((row) => {
              const concentrationClass =
                row.share >= CONCENTRATION_HIGH ? css.shareHigh ?? ''
                : row.share >= CONCENTRATION_LOW ? css.shareMid ?? ''
                : css.shareLow ?? '';
              return (
                <li key={row.tag} className={css.tagRow}>
                  <div className={css.tagHead}>
                    <span className={css.tagLabel}>{ENTERPRISE_LABEL[row.tag]}</span>
                    {row.isExpected && (
                      <span className={css.expectedPill}>Project-intent fit</span>
                    )}
                    <span className={`${css.sharePill} ${concentrationClass}`}>
                      {Math.round(row.share * 100)}%
                    </span>
                  </div>
                  <div className={css.tagMeta}>
                    {row.streams.length} stream{row.streams.length === 1 ? '' : 's'}
                    {' · '}
                    {formatKRange(row.totalLow, row.totalHigh, '/yr')}
                  </div>
                  <div className={css.tagHint}>{ENTERPRISE_BLURB[row.tag]}</div>
                  <ul className={css.streamList}>
                    {row.streams.map((s) => (
                      <li key={s.id} className={css.streamRow}>
                        <span className={css.streamName}>{s.name}</span>
                        <span className={css.streamMeta}>
                          {formatKRange(s.annualRevenue.low, s.annualRevenue.high, '/yr')}
                          {' · '}
                          <span className={css.confidenceTag}>{s.confidence}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>

          {(detectedNoStream.length > 0 || missingExpected.length > 0) && (
            <div className={css.gapsBlock}>
              <div className={css.gapsTitle}>Open gaps</div>
              {detectedNoStream.length > 0 && (
                <div className={css.gapGroup}>
                  <div className={css.gapGroupLabel}>Detected on map, no priced stream</div>
                  <div className={css.gapChips}>
                    {detectedNoStream.map((e) => (
                      <span key={e} className={`${css.gapChip} ${css.gapChipWarn}`}>
                        {ENTERPRISE_LABEL[e]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {missingExpected.length > 0 && (
                <div className={css.gapGroup}>
                  <div className={css.gapGroupLabel}>
                    Project-intent <em>{projectType ?? '—'}</em> implies but absent
                  </div>
                  <div className={css.gapChips}>
                    {missingExpected.map((m) => (
                      <span
                        key={m.tag}
                        className={`${css.gapChip} ${m.reason === 'no-stream' ? css.gapChipWarn : css.gapChipMuted}`}
                        title={m.reason === 'no-stream' ? 'Detected but unpriced' : 'Not detected on map'}
                      >
                        {ENTERPRISE_LABEL[m.tag]}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <p className={css.footnote}>
            <em>Why this matters:</em> a regenerative project is graded
            by the diversity of its income, not the size of any one
            enterprise. {expectedList.length === 0
              ? 'Set a project type in the intake step to enable intent-fit checks.'
              : `For a ${projectType} the expected revenue tags are: ${expectedList.map((e) => ENTERPRISE_LABEL[e]).join(', ')}.`}
            {' '}A high top-tag share isn't always wrong — but it's the
            single biggest fragility in a 10-year cashflow.
          </p>
        </>
      )}
    </div>
  );
}
