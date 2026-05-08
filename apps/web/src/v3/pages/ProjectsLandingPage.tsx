/**
 * /v3/project (no project ID) — Projects landing.
 *
 * When the user has no project selected we render the Property Candidates
 * format as the project list. Real projects from useProjectStore appear in
 * the "Your Projects" section as muted, "not evaluated" cards. Mock
 * candidates remain in a separate "Sample Candidates" section as a
 * reference / sample experience until backend candidate sourcing lands.
 *
 * Clicking any card opens a CandidateDetailDrawer; the drawer's "Open
 * project" CTA navigates to /v3/project/$projectId for real projects and
 * is disabled for mock samples.
 */

import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import PageHeader from "../components/PageHeader.js";
import FiltersBar, { type FilterState } from "../components/FiltersBar.js";
import CandidateCard from "../components/CandidateCard.js";
import CompareTray from "../components/CompareTray.js";
import CompareModal from "../components/CompareModal.js";
import CandidateDetailDrawer from "../components/CandidateDetailDrawer.js";
import { MOCK_CANDIDATES } from "../data/mockCandidates.js";
import { applyCandidateFilters } from "../data/candidateFilter.js";
import { useDiscoverSelection } from "../data/discoverStore.js";
import { localProjectToCandidate } from "../data/projectToCandidate.js";
import { useProjectStore } from "../../store/projectStore.js";
import type { Candidate } from "../types.js";
import css from "./DiscoverPage.module.css";
import landingCss from "./ProjectsLandingPage.module.css";

export default function ProjectsLandingPage() {
  const projects = useProjectStore((s) => s.projects);
  const navigate = useNavigate();

  const selected = useDiscoverSelection((s) => s.selected);
  const toggle = useDiscoverSelection((s) => s.toggle);
  const clear = useDiscoverSelection((s) => s.clear);

  const [filters, setFilters] = useState<FilterState>({});
  const [moreOpen, setMoreOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [openCandidateId, setOpenCandidateId] = useState<string | null>(null);

  const realCandidates = useMemo(
    () => projects.map(localProjectToCandidate),
    [projects],
  );

  const filteredReal = useMemo(
    () => applyCandidateFilters(realCandidates, filters),
    [realCandidates, filters],
  );
  const filteredMock = useMemo(
    () => applyCandidateFilters(MOCK_CANDIDATES, filters),
    [filters],
  );

  const allVisible: Candidate[] = [...filteredReal, ...filteredMock];
  const selectedCandidates = allVisible.filter((c) => selected.has(c.id));

  const openCandidate =
    allVisible.find((c) => c.id === openCandidateId) ??
    realCandidates.find((c) => c.id === openCandidateId) ??
    MOCK_CANDIDATES.find((c) => c.id === openCandidateId) ??
    null;

  return (
    <div className={css.page}>
      <PageHeader
        eyebrow="Projects"
        title="Property Candidates"
        subtitle="Your projects and sample candidates side-by-side. Open one to begin diagnosis, or compare opportunities that align with your vision."
        actions={
          <button
            type="button"
            className={css.addBtn}
            onClick={() => navigate({ to: "/new" })}
          >
            + New project
          </button>
        }
      />

      <FiltersBar
        resultCount={filteredReal.length + filteredMock.length}
        active={filters}
        onChange={setFilters}
        moreOpen={moreOpen}
        onToggleMore={() => setMoreOpen((v) => !v)}
      />

      <section className={landingCss.section}>
        <h2 className={landingCss.sectionHeader}>
          Your Projects
          <span className={landingCss.sectionCount}>{filteredReal.length}</span>
        </h2>
        {filteredReal.length === 0 ? (
          <div className={css.emptyState}>
            <p>
              {projects.length === 0
                ? "You haven't created any projects yet."
                : "No projects match the current filters."}
            </p>
            {projects.length === 0 ? (
              <button
                type="button"
                className={css.helpLink}
                onClick={() => navigate({ to: "/new" })}
              >
                + Create your first project
              </button>
            ) : (
              <button
                type="button"
                className={css.helpLink}
                onClick={() => setFilters({})}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className={css.grid}>
            {filteredReal.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                selected={selected.has(c.id)}
                onToggleSelect={toggle}
                onOpen={(id) => setOpenCandidateId(id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className={landingCss.section}>
        <h2 className={landingCss.sectionHeader}>
          Sample Candidates
          <span className={landingCss.sectionCount}>{filteredMock.length}</span>
        </h2>
        {filteredMock.length === 0 ? (
          <div className={css.emptyState}>
            <p>No sample candidates match the current filters.</p>
            <button
              type="button"
              className={css.helpLink}
              onClick={() => setFilters({})}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className={css.grid}>
            {filteredMock.map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                selected={selected.has(c.id)}
                onToggleSelect={toggle}
                onOpen={(id) => setOpenCandidateId(id)}
              />
            ))}
          </div>
        )}
      </section>

      <CompareTray
        selected={selectedCandidates}
        onRemove={toggle}
        onClear={clear}
        onCompare={() => setCompareOpen(true)}
      />

      {compareOpen && selectedCandidates.length >= 2 && (
        <CompareModal
          candidates={selectedCandidates}
          onClose={() => setCompareOpen(false)}
        />
      )}

      <CandidateDetailDrawer
        candidate={openCandidate}
        onClose={() => setOpenCandidateId(null)}
      />
    </div>
  );
}
