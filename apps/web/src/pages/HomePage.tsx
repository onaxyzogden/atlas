/**
 * HomePage — project listing and welcome state.
 * Shows saved projects or an empty state guiding the user to create their first project.
 */

import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useProjectStore } from '../store/projectStore.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import styles from './HomePage.module.css';

const PROJECT_TYPE_LABELS: Record<string, string> = {
  regenerative_farm: 'Regenerative Farm',
  retreat_center: 'Retreat Center',
  homestead: 'Homestead',
  educational_farm: 'Educational Farm',
  conservation: 'Conservation',
  multi_enterprise: 'Multi-Enterprise',
  moontrance: 'OGDEN Template',
};

export default function HomePage() {
  const projects = useProjectStore((s) => s.projects);

  const [ready, setReady] = useState(() => useProjectStore.persist.hasHydrated?.() ?? true);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setReady(true), 150);
    try {
      const unsub = useProjectStore.persist.onFinishHydration?.(() => {
        setReady(true);
        clearTimeout(timer);
      });
      return () => { clearTimeout(timer); unsub?.(); };
    } catch {
      clearTimeout(timer);
      setReady(true);
    }
  }, [ready]);

  if (!ready) return null;

  if (projects.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyInner}>
          {/* Landscape icon */}
          <svg className={styles.emptyIcon} viewBox="0 0 72 72" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <rect x="8" y="12" width="56" height="48" rx="4" />
            <path d="M8 48l16-16 12 12 8-8 20 20" />
            <circle cx="24" cy="28" r="5" />
          </svg>

          <h1 className={styles.emptyTitle}>Welcome to OGDEN</h1>
          <p className={styles.emptyTagline}>
            A tool for seeing land whole — and building it wisely.
            <br />
            Start by creating your first property project.
          </p>

          <Link to="/new" style={{ textDecoration: 'none' }}>
            <Button variant="primary" size="lg">
              + New Project
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Your Projects</h1>
        </div>

        <div className={styles.grid}>
          {projects.map((p) => (
            <Link
              key={p.id}
              to="/project/$projectId"
              params={{ projectId: p.id }}
              className={styles.card}
            >
              <h3 className={styles.cardName}>{p.name}</h3>

              {p.projectType && (
                <Badge variant="default" size="sm">
                  {PROJECT_TYPE_LABELS[p.projectType] ?? p.projectType}
                </Badge>
              )}

              {p.description && (
                <p className={styles.cardDesc}>
                  {p.description.length > 120 ? p.description.slice(0, 120) + '\u2026' : p.description}
                </p>
              )}

              <div className={styles.cardMeta}>
                {p.address && <span>{p.address}</span>}
                <span className={styles.cardMetaRight}>
                  <span className={`${styles.boundaryDot} ${p.hasParcelBoundary ? styles.boundaryDotSet : styles.boundaryDotNone}`} />
                  {p.hasParcelBoundary ? 'Boundary set' : 'No boundary'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
