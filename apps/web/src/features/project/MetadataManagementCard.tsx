/**
 * §26 MetadataManagementCard — per-project metadata coverage audit.
 *
 * The intake wizard asks for a wide spread of structured metadata (project
 * basics, site context, legal description, field observations, vision) but
 * there's no single read-back surface that answers "what metadata is on this
 * project, what's missing, where does it live". This card groups the fields
 * into five operating buckets, reports filled-vs-empty per bucket, and rolls
 * up to a single readiness verdict so the steward knows whether the metadata
 * is rich enough to feed the Site Assessment / Design Brief PDFs.
 *
 * Pure derivation — reads `LocalProject` only. No new endpoint, no shared
 * math, no entity writes.
 */

import { useMemo } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import css from './MetadataManagementCard.module.css';

interface Props {
  project: LocalProject;
}

type BucketStatus = 'ready' | 'partial' | 'thin' | 'empty';

interface Field {
  label: string;
  filled: boolean;
  source: string;
}

interface Bucket {
  id: string;
  title: string;
  hint: string;
  filled: number;
  total: number;
  status: BucketStatus;
  fields: Field[];
}

const STATUS_LABEL: Record<BucketStatus, string> = {
  ready: 'Ready',
  partial: 'Partial',
  thin: 'Thin',
  empty: 'Empty',
};

function statusFromRatio(filled: number, total: number): BucketStatus {
  if (filled === 0) return 'empty';
  const r = filled / total;
  if (r >= 0.85) return 'ready';
  if (r >= 0.5) return 'partial';
  return 'thin';
}

function statusClass(s: BucketStatus): string {
  if (s === 'ready') return css.statusReady ?? '';
  if (s === 'partial') return css.statusPartial ?? '';
  if (s === 'thin') return css.statusThin ?? '';
  return css.statusEmpty ?? '';
}

function strFilled(s: string | null | undefined): boolean {
  return !!s && s.trim() !== '';
}

export default function MetadataManagementCard({ project }: Props) {
  const buckets = useMemo<Bucket[]>(() => {
    const meta = project.metadata;

    // ── Bucket 1: Project basics ──
    const basicsFields: Field[] = [
      { label: 'Name', filled: strFilled(project.name), source: 'project.name' },
      { label: 'Type', filled: strFilled(project.projectType), source: 'project.projectType' },
      { label: 'Country', filled: strFilled(project.country), source: 'project.country' },
      { label: 'Province / State', filled: strFilled(project.provinceState), source: 'project.provinceState' },
      { label: 'Address', filled: strFilled(project.address), source: 'project.address' },
      { label: 'Parcel ID', filled: strFilled(project.parcelId), source: 'project.parcelId' },
      { label: 'Acreage', filled: project.acreage != null && project.acreage > 0, source: 'project.acreage' },
      { label: 'Units', filled: !!project.units, source: 'project.units' },
    ];

    // ── Bucket 2: Site context (jsonb metadata) ──
    const contextFields: Field[] = [
      { label: 'Climate region', filled: strFilled(meta?.climateRegion), source: 'metadata.climateRegion' },
      { label: 'Bioregion', filled: strFilled(meta?.bioregion), source: 'metadata.bioregion' },
      { label: 'County', filled: strFilled(meta?.county), source: 'metadata.county' },
      { label: 'Map projection', filled: strFilled(meta?.mapProjection), source: 'metadata.mapProjection' },
    ];

    // ── Bucket 3: Legal & governance ──
    const legalFields: Field[] = [
      { label: 'Legal description', filled: strFilled(meta?.legalDescription), source: 'metadata.legalDescription' },
      { label: 'Owner notes', filled: strFilled(project.ownerNotes), source: 'project.ownerNotes' },
      { label: 'Zoning notes', filled: strFilled(project.zoningNotes), source: 'project.zoningNotes' },
      { label: 'Access notes', filled: strFilled(project.accessNotes), source: 'project.accessNotes' },
      { label: 'Water rights notes', filled: strFilled(project.waterRightsNotes), source: 'project.waterRightsNotes' },
    ];

    // ── Bucket 4: Field observations ──
    const soil = meta?.soilNotes;
    const obsFields: Field[] = [
      { label: 'Field observations', filled: strFilled(meta?.fieldObservations), source: 'metadata.fieldObservations' },
      { label: 'Restrictions / covenants', filled: strFilled(meta?.restrictionsCovenants), source: 'metadata.restrictionsCovenants' },
      { label: 'Soil pH', filled: strFilled(soil?.ph), source: 'metadata.soilNotes.ph' },
      { label: 'Organic matter', filled: strFilled(soil?.organicMatter), source: 'metadata.soilNotes.organicMatter' },
      { label: 'Compaction', filled: strFilled(soil?.compaction), source: 'metadata.soilNotes.compaction' },
      { label: 'Biological activity', filled: strFilled(soil?.biologicalActivity), source: 'metadata.soilNotes.biologicalActivity' },
    ];

    // ── Bucket 5: Vision & assets ──
    const visionFields: Field[] = [
      { label: 'Vision statement', filled: strFilled(project.visionStatement), source: 'project.visionStatement' },
      { label: 'Description', filled: strFilled(project.description), source: 'project.description' },
      { label: 'Parcel boundary', filled: project.hasParcelBoundary || !!project.parcelBoundaryGeojson, source: 'project.hasParcelBoundary' },
      { label: 'Attachments', filled: (project.attachments?.length ?? 0) > 0, source: 'project.attachments' },
    ];

    const make = (id: string, title: string, hint: string, fields: Field[]): Bucket => {
      const filled = fields.filter((f) => f.filled).length;
      return {
        id,
        title,
        hint,
        filled,
        total: fields.length,
        status: statusFromRatio(filled, fields.length),
        fields,
      };
    };

    return [
      make('basics', 'Project basics', 'Identity, location, scale — drives the overview chapter of every export.', basicsFields),
      make('context', 'Site context', 'Climate / bioregion / projection — feeds Site Assessment and orientation logic.', contextFields),
      make('legal', 'Legal & governance', 'Title, zoning, access, water rights — the operating envelope.', legalFields),
      make('observations', 'Field observations', 'Steward-recorded ground truth — feeds Design Brief and ecological cards.', obsFields),
      make('vision', 'Vision & assets', 'Story, boundary geometry, supporting files — what makes this design legible.', visionFields),
    ];
  }, [project]);

  const totalFilled = buckets.reduce((acc, b) => acc + b.filled, 0);
  const totalFields = buckets.reduce((acc, b) => acc + b.total, 0);
  const readyCount = buckets.filter((b) => b.status === 'ready').length;
  const emptyCount = buckets.filter((b) => b.status === 'empty').length;
  const verdict: BucketStatus = readyCount === buckets.length
    ? 'ready'
    : emptyCount === buckets.length
    ? 'empty'
    : emptyCount > buckets.length / 2
    ? 'thin'
    : 'partial';

  const completenessPct = totalFields > 0 ? Math.round((totalFilled / totalFields) * 100) : 0;

  return (
    <section className={css.card}>
      <div className={css.head}>
        <div>
          <h3 className={css.title}>Metadata management</h3>
          <p className={css.hint}>
            Five buckets cover everything the intake wizard captures plus assets attached after. Each bucket is independent — a project can be export-ready on basics and empty on observations.
          </p>
        </div>
        <span className={css.modeBadge}>AUDIT</span>
      </div>

      <div className={css.headlineRow}>
        <div className={css.headline}>
          <div className={css.headlineValue}>{completenessPct}%</div>
          <div className={css.headlineLabel}>Overall</div>
        </div>
        <div className={css.headline}>
          <div className={css.headlineValue}>{totalFilled}/{totalFields}</div>
          <div className={css.headlineLabel}>Fields filled</div>
        </div>
        <div className={css.headline}>
          <div className={css.headlineValue}>{readyCount}/{buckets.length}</div>
          <div className={css.headlineLabel}>Buckets ready</div>
        </div>
        <div className={css.headline}>
          <div className={css.headlineValue}>{emptyCount}</div>
          <div className={css.headlineLabel}>Buckets empty</div>
        </div>
      </div>

      <div className={`${css.verdictBanner} ${statusClass(verdict)}`}>
        <div className={css.verdictTitle}>
          {verdict === 'ready' && 'Metadata coverage is solid across all buckets.'}
          {verdict === 'partial' && `${readyCount} of ${buckets.length} buckets fully ready, the rest partial.`}
          {verdict === 'thin' && 'Most buckets have only a few fields filled.'}
          {verdict === 'empty' && 'Project has almost no metadata yet — start with the intake wizard.'}
        </div>
        <div className={css.verdictNote}>
          PDFs and dashboards still render — empty buckets fall back to placeholder text. This card flags which buckets the recipient may notice.
        </div>
      </div>

      <div className={css.bucketList}>
        {buckets.map((b) => (
          <div key={b.id} className={css.bucket}>
            <div className={css.bucketHead}>
              <div className={css.bucketTitleWrap}>
                <span className={css.bucketTitle}>{b.title}</span>
                <span className={css.bucketCount}>{b.filled} / {b.total} fields</span>
              </div>
              <span className={`${css.statusPill} ${statusClass(b.status)}`}>{STATUS_LABEL[b.status]}</span>
            </div>
            <div className={css.bucketHint}>{b.hint}</div>
            <div className={css.fieldGrid}>
              {b.fields.map((f, j) => (
                <div key={j} className={`${css.fieldRow} ${f.filled ? css.fieldFilled : css.fieldMissing}`}>
                  <span className={css.fieldDot} aria-hidden>{f.filled ? '✓' : '—'}</span>
                  <span className={css.fieldLabel}>{f.label}</span>
                  <span className={css.fieldSource}>{f.source}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={css.assumption}>
        Field source paths point at the actual storage location: top-level columns on <code>LocalProject</code> versus the long-tail <code>metadata</code> jsonb (<code>ProjectMetadata</code> in <code>packages/shared/src/schemas/project.schema.ts</code>). Soil sub-fields live under <code>metadata.soilNotes</code>. Attachment and parcel-boundary checks count presence, not size.
      </div>
    </section>
  );
}
