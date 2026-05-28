/**
 * EvidenceLibrarySection — Section 4 of Presentation Mode (OLOS Observe
 * Dashboard Spec §6.1). Flat gallery of every proof item captured
 * across all 16 domains. Same data shape the Domain Detail evidence
 * library renders, but un-paginated and un-filterable here — the share
 * surface is a scanning view, not a workbench.
 *
 * Source union: real `ObserveDataPoint`s + projected `ObserveFeedEntry`
 * rows (Phase 3 substrate). The dataPoint store is the primary; feed
 * entries are routed through `routeToDataPoint` so every captured proof
 * appears regardless of source.
 *
 * Photos render as thumbnails when `fileUri` resolves to a browser-
 * loadable URL (http, blob:, data:); IDB synthetic URIs render the
 * icon-box fallback (the share viewer can't reach the originating
 * device's IDB).
 */

import { useMemo } from 'react';
import { Camera, MapPin, Ruler, FileText, ClipboardList } from 'lucide-react';
import type {
  FieldActionProofItem,
  FieldActionProofType,
  ObserveDataPoint,
  UniversalDomain,
} from '@ogden/shared';
import { UNIVERSAL_DOMAINS, UNIVERSAL_DOMAIN_LABELS } from '@ogden/shared';
import { useObserveDataPointStore } from '../../../../store/observeDataPointStore.js';
import { useObserveFeedStore } from '../../../../store/observeFeedStore.js';
import { routeToDataPoint } from '../domain/routeToDataPoint.js';
import { resolveDomainByObjectiveId } from '../revision/resolveDomainForObjective.js';
import css from './SectionCommon.module.css';

interface Props {
  projectId: string;
}

const PROOF_TYPE_LABEL: Record<FieldActionProofType, string> = {
  photo: 'Photo',
  gps_point: 'GPS point',
  gps_trace: 'GPS trace',
  measurement: 'Measurement',
  logged_result: 'Logged result',
  note: 'Note',
  document: 'Document',
};

interface Row {
  proof: FieldActionProofItem;
  point: ObserveDataPoint;
}

function isThumbnailable(proof: FieldActionProofItem): boolean {
  if (proof.proofType !== 'photo') return false;
  if (!proof.fileUri) return false;
  return (
    proof.fileUri.startsWith('http') ||
    proof.fileUri.startsWith('blob:') ||
    proof.fileUri.startsWith('data:')
  );
}

function iconFor(type: FieldActionProofType) {
  const size = 22;
  switch (type) {
    case 'photo':
    case 'document':
      return <Camera size={size} aria-hidden="true" />;
    case 'gps_point':
    case 'gps_trace':
      return <MapPin size={size} aria-hidden="true" />;
    case 'measurement':
      return <Ruler size={size} aria-hidden="true" />;
    case 'logged_result':
      return <ClipboardList size={size} aria-hidden="true" />;
    case 'note':
    default:
      return <FileText size={size} aria-hidden="true" />;
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function EvidenceLibrarySection({ projectId }: Props) {
  const dataByProject = useObserveDataPointStore((s) => s.byProject);
  const feedByProject = useObserveFeedStore((s) => s.byProject);

  const rows = useMemo<Row[]>(() => {
    const data = dataByProject[projectId] ?? [];
    const feed = feedByProject[projectId] ?? [];

    const unionByDomain: ObserveDataPoint[] = [...data];
    for (const entry of feed) {
      const projection = routeToDataPoint(entry, resolveDomainByObjectiveId);
      if (projection) unionByDomain.push(projection);
    }

    const out: Row[] = [];
    for (const point of unionByDomain) {
      if (!UNIVERSAL_DOMAINS.includes(point.domainId as UniversalDomain)) {
        continue;
      }
      for (const proof of point.proofItems) {
        out.push({ proof, point });
      }
    }
    out.sort((a, b) => {
      const ams = Date.parse(a.proof.capturedAt);
      const bms = Date.parse(b.proof.capturedAt);
      if (!Number.isFinite(ams)) return 1;
      if (!Number.isFinite(bms)) return -1;
      return bms - ams;
    });
    return out;
  }, [dataByProject, feedByProject, projectId]);

  return (
    <section
      className={css.section}
      aria-labelledby="presentation-evidence-library"
    >
      <h2 id="presentation-evidence-library" className={css.heading}>
        Evidence library
      </h2>
      <p className={css.subheading}>
        Every captured photo, measurement, note, and trace across all
        domains. Sorted newest first.
      </p>
      {rows.length === 0 ? (
        <div className={css.empty}>No evidence captured yet.</div>
      ) : (
        <ul
          className={css.evidenceGrid}
          role="list"
          aria-label="Project evidence library"
        >
          {rows.map(({ proof, point }) => (
            <li key={proof.id} className={css.evidenceTile}>
              {isThumbnailable(proof) ? (
                <img
                  className={css.evidenceThumb}
                  src={proof.fileUri as string}
                  alt={
                    proof.noteText ?? PROOF_TYPE_LABEL[proof.proofType]
                  }
                  loading="lazy"
                />
              ) : (
                <div className={css.evidenceIconBox}>
                  {iconFor(proof.proofType)}
                </div>
              )}
              <div className={css.evidenceMeta}>
                <span className={css.evidenceLabel}>
                  {PROOF_TYPE_LABEL[proof.proofType]} -{' '}
                  {UNIVERSAL_DOMAIN_LABELS[point.domainId]}
                </span>
                <span className={css.evidenceDate}>
                  {formatDate(proof.capturedAt)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
