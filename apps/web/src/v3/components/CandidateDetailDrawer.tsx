/**
 * CandidateDetailDrawer — slide-in side panel triggered by clicking a card on
 * the /v3/project landing page. Shows full candidate/project detail and
 * exposes an explicit "Open project" CTA.
 *
 * Real projects (id prefixed `local:`) navigate to /v3/project/$projectId.
 * Mock candidates have the CTA disabled — they are samples, not openable.
 */

import { useNavigate } from "@tanstack/react-router";
import type { Candidate } from "../types.js";
import { isLocalCandidateId, localCandidateIdToProjectId } from "../data/projectToCandidate.js";
import css from "./CandidateDetailDrawer.module.css";

export interface CandidateDetailDrawerProps {
  candidate: Candidate | null;
  onClose: () => void;
}

export default function CandidateDetailDrawer({
  candidate,
  onClose,
}: CandidateDetailDrawerProps) {
  const navigate = useNavigate();

  if (!candidate) return null;

  const isLocal = isLocalCandidateId(candidate.id);
  const evaluated = candidate.fitScore != null;

  const handleOpen = () => {
    if (!isLocal) return;
    const projectId = localCandidateIdToProjectId(candidate.id);
    navigate({ to: "/v3/project/$projectId", params: { projectId } });
  };

  return (
    <>
      <div className={css.scrim} onClick={onClose} aria-hidden="true" />
      <aside
        className={css.drawer}
        role="dialog"
        aria-modal="true"
        aria-label={`${candidate.name} details`}
      >
        <header className={css.header}>
          <div>
            <h2 className={css.title}>{candidate.name}</h2>
            <p className={css.region}>{candidate.region}</p>
          </div>
          <button type="button" className={css.closeBtn} onClick={onClose} aria-label="Close details">
            ×
          </button>
        </header>

        <div className={css.body}>
          <section className={css.section}>
            <h3 className={css.sectionLabel}>Overview</h3>
            <dl className={css.dl}>
              <div className={css.dlRow}>
                <dt>Acreage</dt>
                <dd>{candidate.acreage.toLocaleString()} {candidate.acreageUnit}</dd>
              </div>
              {candidate.priceUsd > 0 && (
                <div className={css.dlRow}>
                  <dt>Price</dt>
                  <dd>${candidate.priceUsd.toLocaleString()}</dd>
                </div>
              )}
              <div className={css.dlRow}>
                <dt>Status</dt>
                <dd>{candidate.verdictLabel}</dd>
              </div>
            </dl>
          </section>

          {evaluated ? (
            <>
              <section className={css.section}>
                <h3 className={css.sectionLabel}>Fit</h3>
                <p className={css.fitScore}>{candidate.fitScore} / 100</p>
                <ul className={css.subList}>
                  <li><span>Water</span><span>{candidate.subScores.water}</span></li>
                  <li><span>Access</span><span>{candidate.subScores.access}</span></li>
                  <li><span>Infrastructure</span><span>{candidate.subScores.infrastructure ?? "—"}</span></li>
                </ul>
              </section>
              <section className={css.section}>
                <h3 className={css.sectionLabel}>Top Blocker</h3>
                <p>{candidate.topBlocker.title}</p>
              </section>
              {candidate.fitTags.length > 0 && (
                <section className={css.section}>
                  <h3 className={css.sectionLabel}>Fit Tags</h3>
                  <div className={css.tags}>
                    {candidate.fitTags.map((t) => (
                      <span key={t} className={css.tag}>{t}</span>
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <section className={css.section}>
              <p className={css.notEvaluated}>
                Not yet evaluated — open the project to begin diagnosis.
              </p>
            </section>
          )}
        </div>

        <footer className={css.footer}>
          <button
            type="button"
            className={css.primaryBtn}
            onClick={handleOpen}
            disabled={!isLocal}
            title={isLocal ? "Open this project" : "Sample candidate — cannot open"}
          >
            {isLocal ? "Open project →" : "Sample — cannot open"}
          </button>
        </footer>
      </aside>
    </>
  );
}
