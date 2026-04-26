/**
 * §20 ShareLinkReadinessCard — view-only shareable link preview +
 * pre-publish readiness audit.
 *
 * The PortalConfigPanel above already lets the steward toggle publish
 * state and edit hero copy. This card complements that with the
 * *outbound* concern: before you hand a link to a stakeholder, is the
 * link ready? Are the public-facing fields populated, is the slug
 * distinct enough to be shareable, are there enough placed entities to
 * make the portal feel finished? The card surfaces the canonical URL
 * with a copy button, a deterministic readiness checklist (with a
 * blocker / non-blocker / green tier), and an explicit "what this URL
 * does not require" note since a key §20 feature of the shareable link
 * is that recipients don't need an OGDEN account to view it.
 *
 * Closes manifest §20 `view-only-shareable-link` (P3) planned -> done.
 */

import { useMemo, useState } from 'react';
import type { LocalProject } from '../../store/projectStore.js';
import { usePortalStore } from '../../store/portalStore.js';
import { useStructureStore } from '../../store/structureStore.js';
import { useUtilityStore } from '../../store/utilityStore.js';
import { useCropStore } from '../../store/cropStore.js';
import { useLivestockStore } from '../../store/livestockStore.js';
import { useZoneStore } from '../../store/zoneStore.js';
import css from './ShareLinkReadinessCard.module.css';

interface Props {
  project: LocalProject;
}

type CheckLevel = 'blocker' | 'recommended' | 'nice';

interface ReadinessCheck {
  id: string;
  level: CheckLevel;
  label: string;
  passed: boolean;
  detail: string;
}

export default function ShareLinkReadinessCard({ project }: Props) {
  const allConfigs = usePortalStore((s) => s.configs);
  const portalConfig = useMemo(
    () => allConfigs.find((c) => c.projectId === project.id),
    [allConfigs, project.id],
  );
  const allStructures = useStructureStore((s) => s.structures);
  const allUtilities = useUtilityStore((s) => s.utilities);
  const allCropAreas = useCropStore((s) => s.cropAreas);
  const allPaddocks = useLivestockStore((s) => s.paddocks);
  const allZones = useZoneStore((s) => s.zones);
  const structuresLen = useMemo(
    () => allStructures.filter((st) => st.projectId === project.id).length,
    [allStructures, project.id],
  );
  const utilitiesLen = useMemo(
    () => allUtilities.filter((u) => u.projectId === project.id).length,
    [allUtilities, project.id],
  );
  const cropsLen = useMemo(
    () => allCropAreas.filter((c) => c.projectId === project.id).length,
    [allCropAreas, project.id],
  );
  const paddocksLen = useMemo(
    () => allPaddocks.filter((p) => p.projectId === project.id).length,
    [allPaddocks, project.id],
  );
  const zonesLen = useMemo(
    () => allZones.filter((z) => z.projectId === project.id).length,
    [allZones, project.id],
  );

  const [copied, setCopied] = useState(false);

  const totalEntities = structuresLen + utilitiesLen + cropsLen + paddocksLen + zonesLen;

  const slug = portalConfig?.slug ?? '';
  const shareUrl = useMemo(() => {
    const origin =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'https://atlas.ogden.ag';
    if (portalConfig?.shareToken) {
      return `https://atlas.ogden.ag/portal/${portalConfig.shareToken}`;
    }
    return `${origin}/portal/${slug || project.id}`;
  }, [portalConfig?.shareToken, slug, project.id]);

  const isPublished = portalConfig?.isPublished ?? false;

  const checks = useMemo<ReadinessCheck[]>(() => {
    const out: ReadinessCheck[] = [];

    out.push({
      id: 'slug',
      level: 'blocker',
      label: 'Portal slug',
      passed: slug.length >= 3 && /^[a-z0-9-]+$/.test(slug),
      detail:
        slug.length >= 3 && /^[a-z0-9-]+$/.test(slug)
          ? `"${slug}" \u2014 kebab-case, ${slug.length} chars.`
          : `Slug "${slug || '(empty)'}" is too short or has invalid chars. Use lowercase letters, digits, hyphens.`,
    });

    out.push({
      id: 'vision',
      level: 'blocker',
      label: 'Vision statement',
      passed: !!project.visionStatement && project.visionStatement.trim().length >= 20,
      detail: project.visionStatement
        ? `${project.visionStatement.trim().length} chars on the project intake page.`
        : 'Add a vision statement on the project intake page \u2014 the public portal opens with it.',
    });

    out.push({
      id: 'hero',
      level: 'recommended',
      label: 'Hero title & subtitle',
      passed:
        !!portalConfig?.heroTitle &&
        portalConfig.heroTitle.trim().length > 0 &&
        !!portalConfig?.heroSubtitle &&
        portalConfig.heroSubtitle.trim().length > 0,
      detail:
        portalConfig?.heroTitle && portalConfig?.heroSubtitle
          ? 'Both set \u2014 portal banner has a hook.'
          : 'Edit "Hero" above to set the banner copy that visitors see first.',
    });

    out.push({
      id: 'mission',
      level: 'recommended',
      label: 'Mission statement',
      passed: !!portalConfig?.missionStatement && portalConfig.missionStatement.trim().length >= 40,
      detail: portalConfig?.missionStatement
        ? `${portalConfig.missionStatement.trim().length} chars set in portal config.`
        : 'Empty \u2014 a 2-3 sentence mission paragraph anchors the page.',
    });

    out.push({
      id: 'description',
      level: 'nice',
      label: 'Project description',
      passed: !!project.description && project.description.trim().length >= 30,
      detail: project.description
        ? `${project.description.trim().length} chars on the intake page.`
        : 'Optional, but a description gives the public view more context to read.',
    });

    out.push({
      id: 'entities',
      level: 'recommended',
      label: 'Placed entities',
      passed: totalEntities >= 5,
      detail:
        totalEntities >= 5
          ? `${totalEntities} elements placed across structures / utilities / crops / paddocks / zones.`
          : `${totalEntities} elements placed \u2014 a portal with fewer than 5 looks empty. Add structures or zones before sharing.`,
    });

    out.push({
      id: 'acreage',
      level: 'nice',
      label: 'Acreage on intake',
      passed: project.acreage != null && project.acreage > 0,
      detail:
        project.acreage != null
          ? `${project.acreage.toFixed(2)} ac \u2014 rounded to nearest 5 ac in the public view.`
          : 'No acreage on the intake page \u2014 the public view will hide the size field.',
    });

    out.push({
      id: 'inquiry',
      level: 'nice',
      label: 'Inquiry contact',
      passed: !!portalConfig?.inquiryEmail && /@/.test(portalConfig.inquiryEmail),
      detail: portalConfig?.inquiryEmail
        ? `${portalConfig.inquiryEmail} \u2014 visitors get a contact path.`
        : 'No inquiry email \u2014 visitors will have no way to reach out.',
    });

    out.push({
      id: 'published',
      level: 'blocker',
      label: 'Published',
      passed: isPublished,
      detail: isPublished
        ? 'Portal is published \u2014 the URL above will resolve for any visitor.'
        : 'Portal is not yet published. The URL above will 404 until you toggle Publish above.',
    });

    return out;
  }, [
    slug,
    project.visionStatement,
    project.description,
    project.acreage,
    portalConfig?.heroTitle,
    portalConfig?.heroSubtitle,
    portalConfig?.missionStatement,
    portalConfig?.inquiryEmail,
    totalEntities,
    isPublished,
  ]);

  const summary = useMemo(() => {
    const blockerFails = checks.filter((c) => c.level === 'blocker' && !c.passed).length;
    const recoFails = checks.filter((c) => c.level === 'recommended' && !c.passed).length;
    const niceFails = checks.filter((c) => c.level === 'nice' && !c.passed).length;
    const passed = checks.filter((c) => c.passed).length;
    let band: 'ready' | 'almost' | 'blocked';
    if (blockerFails > 0) band = 'blocked';
    else if (recoFails > 0) band = 'almost';
    else band = 'ready';
    return { blockerFails, recoFails, niceFails, passed, total: checks.length, band };
  }, [checks]);

  const handleCopy = () => {
    if (typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(shareUrl).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => {
        // ignore copy failures
      },
    );
  };

  const bandLabel: Record<typeof summary.band, string> = {
    ready: 'Ready to share',
    almost: 'Almost ready',
    blocked: 'Not ready',
  };

  return (
    <section className={css.card} aria-label="Share link readiness">
      <header className={css.cardHead}>
        <div>
          <h3 className={css.cardTitle}>View-only share link readiness</h3>
          <p className={css.cardHint}>
            The URL below is the canonical view-only share link for this
            project. Recipients don&apos;t need an OGDEN account, don&apos;t
            see internal notes, and can&apos;t edit anything. Run through the
            checklist before handing it out so the public-facing page
            doesn&apos;t look unfinished.
          </p>
        </div>
        <span className={`${css.bandBadge} ${css[`band_${summary.band}`] ?? ''}`}>
          {bandLabel[summary.band]}
        </span>
      </header>

      <div className={css.urlBlock}>
        <div className={css.urlRow}>
          <code className={css.urlText}>{shareUrl}</code>
          <button
            type="button"
            className={css.copyBtn}
            onClick={handleCopy}
            disabled={typeof navigator === 'undefined' || !navigator.clipboard}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
        {!isPublished && (
          <div className={css.urlHint}>
            Toggle <em>Publish</em> above to make this URL resolve. Until
            then it&apos;s a 404.
          </div>
        )}
      </div>

      <div className={css.summaryRow}>
        <div className={css.summaryBlock}>
          <span className={css.summaryValue}>
            {summary.passed}
            <span className={css.summaryDenom}>/{summary.total}</span>
          </span>
          <span className={css.summaryLabel}>Checks passed</span>
        </div>
        <div className={css.summaryBlock}>
          <span className={`${css.summaryValue} ${summary.blockerFails > 0 ? css.toneBlocker : ''}`}>
            {summary.blockerFails}
          </span>
          <span className={css.summaryLabel}>Blockers</span>
        </div>
        <div className={css.summaryBlock}>
          <span className={`${css.summaryValue} ${summary.recoFails > 0 ? css.toneReco : ''}`}>
            {summary.recoFails}
          </span>
          <span className={css.summaryLabel}>Recommended</span>
        </div>
        <div className={css.summaryBlock}>
          <span className={css.summaryValue}>{summary.niceFails}</span>
          <span className={css.summaryLabel}>Nice-to-have</span>
        </div>
      </div>

      <ul className={css.checkList}>
        {checks.map((c) => (
          <li
            key={c.id}
            className={`${css.checkRow} ${css[`level_${c.level}`] ?? ''} ${
              c.passed ? css.checkPassed : css.checkFailed
            }`}
          >
            <span className={css.checkIcon}>{c.passed ? '\u2713' : '!'}</span>
            <div className={css.checkBody}>
              <div className={css.checkHead}>
                <span className={css.checkLabel}>{c.label}</span>
                <span className={`${css.levelTag} ${css[`levelTag_${c.level}`] ?? ''}`}>
                  {c.level === 'blocker' ? 'Blocker' : c.level === 'recommended' ? 'Recommended' : 'Nice-to-have'}
                </span>
              </div>
              <div className={css.checkDetail}>{c.detail}</div>
            </div>
          </li>
        ))}
      </ul>

      <div className={css.calloutBlock}>
        <span className={css.calloutLabel}>What this link does not require:</span>
        <ul className={css.calloutList}>
          <li>An OGDEN account or sign-in.</li>
          <li>Email verification or a one-time code.</li>
          <li>Any specific browser or device &mdash; mobile-friendly by design.</li>
          <li>Any data the visitor must submit &mdash; strictly view-only.</li>
        </ul>
      </div>

      <p className={css.footnote}>
        <em>How readiness is computed:</em> deterministic. Blockers fail the
        whole card to <em>Not ready</em>; any recommended miss demotes to{' '}
        <em>Almost ready</em>; nice-to-have misses don&apos;t change the
        band. The actual share-token issuance is server-side; the URL above
        falls back to the local-slug form when no backend token is yet
        cached on this device.
      </p>
    </section>
  );
}
