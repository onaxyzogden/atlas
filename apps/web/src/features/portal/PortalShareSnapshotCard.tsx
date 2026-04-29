/**
 * §27 PortalShareSnapshotCard — steward-side preview of the public-portal
 * snapshot.
 *
 * The PortalConfigPanel collects every input that drives the public
 * landing page (hero, mission, masking level, sections, donation, etc.),
 * but the steward has no compact summary of what the recipient of the
 * share-link will actually see — the rendering happens inside
 * `PublicPortalShell` at /portal/$slug.
 *
 * This card consolidates that information into one preview block:
 *   • Publish state + canonical share URL
 *   • Audience-facing payload (hero, mission, sections, contact)
 *   • Data-masking treatment summary
 *   • Branded palette swatches read from the active cartographic preset
 *     (localStorage `atlas:cartographic-style-preset` — falls back to
 *     "presentation" if absent), so the steward can confirm the visual
 *     identity threading through the portal matches the export theme.
 *   • Copy-share-payload-as-JSON button for hand-off to PR / press.
 *
 * Pure derivation — no portal-store writes. Everything here is the
 * snapshot view of state already on the panel.
 */
import { useEffect, useMemo, useState } from 'react';
import { usePortalStore, type PortalConfig, type PortalSection, type DataMaskingLevel } from '../../store/portalStore.js';
import type { LocalProject } from '../../store/projectStore.js';
import css from './PortalShareSnapshotCard.module.css';

interface Props {
  project: LocalProject;
}

const SECTION_LABELS: Record<PortalSection, string> = {
  hero: 'Hero Banner',
  mission: 'Mission Statement',
  map: 'Interactive Map',
  stageReveal: 'Phase Reveal Story',
  beforeAfter: 'Before / After Slider',
  guidedTour: 'Guided Tour',
  narrative: 'Narrative Sections',
  support: 'Get Involved / Donate',
  education: 'Educational Tour',
};

const MASKING_DESCR: Record<DataMaskingLevel, { tone: string; copy: string }> = {
  full: {
    tone: 'fair',
    copy: 'Public viewers see all zones, the parcel boundary, and full feature data. Use only when the location is already public.',
  },
  curated: {
    tone: 'good',
    copy: 'Zones are visible but the exact parcel boundary is hidden. Recommended default for outreach and stewardship pitches.',
  },
  minimal: {
    tone: 'good',
    copy: 'Approximate map location only — no boundaries or feature precision. Strongest privacy posture.',
  },
};

const PRESET_PALETTES: Record<string, { label: string; palette: { name: string; color: string }[] }> = {
  blueprint: {
    label: 'Blueprint',
    palette: [
      { name: 'Background', color: '#0e2438' },
      { name: 'Primary', color: '#7fcfd9' },
      { name: 'Secondary', color: '#3a7fa6' },
      { name: 'Accent', color: '#f5f5f5' },
      { name: 'Annotation', color: '#ffd966' },
    ],
  },
  sepia_field_map: {
    label: 'Sepia Field Map',
    palette: [
      { name: 'Background', color: '#f4ead0' },
      { name: 'Primary', color: '#5a4632' },
      { name: 'Secondary', color: '#8b6f4e' },
      { name: 'Accent', color: '#a85d2a' },
      { name: 'Annotation', color: '#3d2f20' },
    ],
  },
  presentation: {
    label: 'Presentation',
    palette: [
      { name: 'Background', color: '#1a1a1a' },
      { name: 'Primary', color: '#f3ecd7' },
      { name: 'Secondary', color: '#b4a58c' },
      { name: 'Accent', color: '#d4af5f' },
      { name: 'Annotation', color: '#96c8aa' },
    ],
  },
  audit: {
    label: 'Audit',
    palette: [
      { name: 'Background', color: '#f8f4ec' },
      { name: 'Compliant', color: '#7fa57a' },
      { name: 'Warning', color: '#d4a437' },
      { name: 'Hazard', color: '#c83a2a' },
      { name: 'Annotation', color: '#2a2418' },
    ],
  },
};

const PRESET_STORAGE_KEY = 'atlas:cartographic-style-preset';

export default function PortalShareSnapshotCard({ project }: Props) {
  const allConfigs = usePortalStore((s) => s.configs);
  const config = useMemo(
    () => allConfigs.find((c) => c.projectId === project.id),
    [allConfigs, project.id],
  );
  const [copied, setCopied] = useState(false);
  const [activePresetId, setActivePresetId] = useState<string>('presentation');

  // Restore active cartographic preset
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PRESET_STORAGE_KEY);
      if (stored && PRESET_PALETTES[stored]) {
        setActivePresetId(stored);
      }
    } catch {
      /* localStorage unavailable */
    }
  }, []);

  if (!config) {
    return (
      <div className={css.card}>
        <div className={css.cardHead}>
          <div>
            <h3 className={css.cardTitle}>Share Snapshot</h3>
            <p className={css.cardHint}>
              Save the portal configuration to surface a snapshot preview here.
            </p>
          </div>
          <span className={css.heuristicBadge}>SNAPSHOT</span>
        </div>
      </div>
    );
  }

  const shareUrl = config.shareToken
    ? `https://atlas.ogden.ag/portal/${config.shareToken}`
    : `${window.location.origin}/portal/${config.slug}`;

  const preset = PRESET_PALETTES[activePresetId] ?? PRESET_PALETTES.presentation!;

  const masking = MASKING_DESCR[config.dataMaskingLevel];

  const visibleSections = config.sections;
  const missionWords = config.missionStatement.trim().split(/\s+/).filter(Boolean).length;

  // Build the share payload — the public-facing object the recipient effectively gets
  const sharePayload = useMemo(() => buildSharePayload(project, config, activePresetId), [project, config, activePresetId]);

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(sharePayload, null, 2)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {/* ignore */});
  };

  return (
    <div className={css.card}>
      <div className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>Share Snapshot</h3>
          <p className={css.cardHint}>
            Steward-side preview of what the public-portal recipient receives. Confirms data masking, visible
            sections, branded palette, and the canonical share URL before you forward the link.
          </p>
        </div>
        <span className={`${css.heuristicBadge} ${config.isPublished ? css.badgeOn : css.badgeOff}`}>
          {config.isPublished ? '● Published' : '○ Draft'}
        </span>
      </div>

      {/* Share URL block */}
      <div className={css.shareBlock}>
        <div className={css.shareLabel}>Share URL</div>
        <div className={css.shareUrl}>{shareUrl}</div>
        <div className={css.shareMeta}>
          <span><strong>Slug:</strong> {config.slug || '—'}</span>
          {config.shareToken && <span><strong>Token:</strong> ✓ assigned</span>}
          {!config.shareToken && <span className={css.shareWarn}>Token not yet assigned (publish to mint)</span>}
        </div>
      </div>

      {/* Audience payload */}
      <div className={css.section}>
        <div className={css.sectionTitle}>Public payload</div>
        <ul className={css.payloadList}>
          <li className={css.payloadRow}>
            <span className={css.payloadKey}>Hero title</span>
            <span className={css.payloadVal}>{config.heroTitle.trim() || <em className={css.payloadEmpty}>not set</em>}</span>
          </li>
          <li className={css.payloadRow}>
            <span className={css.payloadKey}>Hero subtitle</span>
            <span className={css.payloadVal}>{config.heroSubtitle.trim() || <em className={css.payloadEmpty}>not set</em>}</span>
          </li>
          <li className={css.payloadRow}>
            <span className={css.payloadKey}>Mission statement</span>
            <span className={css.payloadVal}>
              {missionWords > 0 ? `${missionWords} words` : <em className={css.payloadEmpty}>empty</em>}
            </span>
          </li>
          <li className={css.payloadRow}>
            <span className={css.payloadKey}>Donation URL</span>
            <span className={css.payloadVal}>{config.donationUrl ? '✓ set' : <em className={css.payloadEmpty}>not set</em>}</span>
          </li>
          <li className={css.payloadRow}>
            <span className={css.payloadKey}>Inquiry email</span>
            <span className={css.payloadVal}>{config.inquiryEmail ? '✓ set' : <em className={css.payloadEmpty}>not set</em>}</span>
          </li>
        </ul>
      </div>

      {/* Visible sections */}
      <div className={css.section}>
        <div className={css.sectionTitle}>Visible sections ({visibleSections.length})</div>
        {visibleSections.length > 0 ? (
          <div className={css.sectionChips}>
            {visibleSections.map((sec) => (
              <span key={sec} className={css.chip}>{SECTION_LABELS[sec]}</span>
            ))}
          </div>
        ) : (
          <div className={css.payloadEmpty}>No sections enabled — the portal will render an empty shell.</div>
        )}
      </div>

      {/* Data masking */}
      <div className={css.section}>
        <div className={css.sectionTitle}>Data masking</div>
        <div className={`${css.maskBlock} ${css[`mask_${masking.tone}`]}`}>
          <div className={css.maskLevel}>
            <span className={css.maskLevelTag}>{config.dataMaskingLevel.toUpperCase()}</span>
          </div>
          <div className={css.maskCopy}>{masking.copy}</div>
        </div>
      </div>

      {/* Branded palette */}
      <div className={css.section}>
        <div className={css.sectionTitle}>
          Branded palette · <em className={css.presetName}>{preset.label}</em>
        </div>
        <div className={css.paletteRow} style={{ background: preset.palette[0]?.color }}>
          {preset.palette.slice(1).map((s) => (
            <div key={s.name} className={css.swatch} style={{ background: s.color }} title={`${s.name}: ${s.color}`} />
          ))}
        </div>
        <div className={css.paletteHint}>
          Palette mirrors the active Cartographic Style Preset. Change it from the Cartographic dashboard.
        </div>
      </div>

      {/* Copy payload */}
      <div className={css.actions}>
        <button type="button" className={css.copyBtn} onClick={handleCopyPayload}>
          {copied ? '✓ Copied' : 'Copy share payload (JSON)'}
        </button>
      </div>

      <p className={css.footnote}>
        The actual rendered portal lives at <em>/portal/{config.slug || '…'}</em>. This card is the steward-side
        snapshot — handy for sanity-checking before you forward the link to a board, funder, or visitor.
      </p>
    </div>
  );
}

function buildSharePayload(project: LocalProject, config: PortalConfig, presetId: string) {
  return {
    project: {
      id: project.id,
      name: project.name,
      acreage: project.acreage,
      type: project.projectType,
    },
    portal: {
      slug: config.slug,
      published: config.isPublished,
      shareToken: config.shareToken ?? null,
      hero: { title: config.heroTitle, subtitle: config.heroSubtitle },
      mission: config.missionStatement,
      sections: config.sections,
      maskingLevel: config.dataMaskingLevel,
      donationUrl: config.donationUrl,
      inquiryEmail: config.inquiryEmail,
    },
    branding: {
      cartographicPreset: presetId,
    },
  };
}
