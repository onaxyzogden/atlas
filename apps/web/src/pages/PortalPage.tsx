/**
 * PortalPage — public-facing storytelling portal for a project.
 * Renders outside AppShell with its own layout (no header/sidebar).
 * Accessed via /portal/:slug
 */

import { useParams } from '@tanstack/react-router';
import { usePortalStore } from '../store/portalStore.js';
import { useProjectStore } from '../store/projectStore.js';
import PublicPortalShell from '../features/portal/PublicPortalShell.js';
import styles from './PortalPage.module.css';

/* ── SVG Icons ────────────────────────────────────────────────────────────── */

const CompassIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="2" fill="currentColor" />
    <path
      d="M20 28l2.5-7.5L30 18l-2.5 7.5L20 28z"
      fill="currentColor"
      opacity="0.35"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <line x1="24" y1="4" x2="24" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="24" y1="40" x2="24" y2="44" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="4" y1="24" x2="8" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="40" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="10" y="22" width="28" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M16 22v-6a8 8 0 1 1 16 0v6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <circle cx="24" cy="33" r="2.5" fill="currentColor" opacity="0.5" />
    <line x1="24" y1="35.5" x2="24" y2="38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10 3L5 8l5 5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ── Component ────────────────────────────────────────────────────────────── */

export default function PortalPage() {
  const { slug } = useParams({ from: '/portal/$slug' });
  const config = usePortalStore((s) => s.configs.find((c) => c.slug === slug));
  const project = useProjectStore((s) =>
    config ? s.projects.find((p) => p.id === config.projectId) : undefined,
  );

  /* ---- Not found ---- */
  if (!config || !project) {
    return (
      <div className={styles.errorPage}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon} aria-hidden="true">
            <CompassIcon />
          </div>
          <h1 className={styles.errorTitle}>Portal Not Found</h1>
          <p className={styles.errorDescription}>
            This project portal does not exist or has not been published yet.
          </p>
          <div className={styles.errorAction}>
            <a href="/" className={styles.ctaLink}>
              <ArrowLeftIcon />
              Return to Atlas
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Not published ---- */
  if (!config.isPublished) {
    return (
      <div className={styles.errorPage}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon} aria-hidden="true">
            <LockIcon />
          </div>
          <h1 className={styles.errorTitle}>Portal Not Yet Published</h1>
          <p className={styles.errorDescription}>
            The owner of this project has not published the public portal.
          </p>
          <div className={styles.errorAction}>
            <a href="/" className={styles.ctaLink}>
              <ArrowLeftIcon />
              Return to Atlas
            </a>
          </div>
        </div>
      </div>
    );
  }

  /* ---- Render portal ---- */
  return <PublicPortalShell config={config} project={project} />;
}
