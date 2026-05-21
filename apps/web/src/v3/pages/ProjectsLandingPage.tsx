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
 *
 * Non-builtin real projects get a kebab in the top-left corner of the
 * card with Archive + Delete actions. Archive flips the project's
 * status to 'archived' (visible at /archive). Delete is a hard cascade.
 */

import { useMemo, useState } from "react";
import { MoreVertical } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import PageHeader from "../components/PageHeader.js";
import FiltersBar, { type FilterState } from "../components/FiltersBar.js";
import CandidateCard from "../components/CandidateCard.js";
import CompareTray from "../components/CompareTray.js";
import CompareModal from "../components/CompareModal.js";
import CandidateDetailDrawer from "../components/CandidateDetailDrawer.js";
import { ConfirmDestructiveDialog } from "../../components/ui/ConfirmDestructiveDialog.js";
import { MOCK_CANDIDATES } from "../data/mockCandidates.js";
import { applyCandidateFilters } from "../data/candidateFilter.js";
import { useDiscoverSelection } from "../data/discoverStore.js";
import {
  localProjectToCandidate,
  LOCAL_CANDIDATE_PREFIX,
} from "../data/projectToCandidate.js";
import { useProjectStore } from "../../store/projectStore.js";
import type { Candidate } from "../types.js";
import css from "./DiscoverPage.module.css";
import landingCss from "./ProjectsLandingPage.module.css";

type DialogMode = null | { kind: "archive" | "delete"; projectId: string };

export default function ProjectsLandingPage() {
  const projects = useProjectStore((s) => s.projects);
  const archiveProject = useProjectStore((s) => s.archiveProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const navigate = useNavigate();

  const selected = useDiscoverSelection((s) => s.selected);
  const toggle = useDiscoverSelection((s) => s.toggle);
  const clear = useDiscoverSelection((s) => s.clear);

  const [filters, setFilters] = useState<FilterState>({});
  const [moreOpen, setMoreOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [openCandidateId, setOpenCandidateId] = useState<string | null>(null);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogMode>(null);

  const projectById = useMemo(() => {
    const m = new Map<string, (typeof projects)[number]>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const activeProjects = useMemo(
    () => projects.filter((p) => p.status !== "archived"),
    [projects],
  );

  const realCandidates = useMemo(
    () => activeProjects.map(localProjectToCandidate),
    [activeProjects],
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

  const dialogProject = dialog
    ? projectById.get(dialog.projectId) ?? null
    : null;

  return (
    <div className={`${landingCss.scrollHost} ${css.page}`}>
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
              {activeProjects.length === 0
                ? "You haven't created any projects yet."
                : "No projects match the current filters."}
            </p>
            {activeProjects.length === 0 ? (
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
            {filteredReal.map((c) => {
              const localId = c.id.startsWith(LOCAL_CANDIDATE_PREFIX)
                ? c.id.slice(LOCAL_CANDIDATE_PREFIX.length)
                : c.id;
              const project = projectById.get(localId);
              const canManage = project && !project.isBuiltin;
              return (
                <div key={c.id} className={landingCss.cardWrap}>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        className={landingCss.kebab}
                        aria-label={`Project actions for ${c.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuFor(
                            openMenuFor === localId ? null : localId,
                          );
                        }}
                      >
                        <MoreVertical size={16} aria-hidden />
                      </button>
                      {openMenuFor === localId && (
                        <div
                          className={landingCss.kebabMenu}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className={landingCss.kebabItem}
                            onClick={() => {
                              setOpenMenuFor(null);
                              setDialog({
                                kind: "archive",
                                projectId: localId,
                              });
                            }}
                          >
                            Archive project
                          </button>
                          <button
                            type="button"
                            className={`${landingCss.kebabItem} ${landingCss.kebabItemDanger}`}
                            onClick={() => {
                              setOpenMenuFor(null);
                              setDialog({
                                kind: "delete",
                                projectId: localId,
                              });
                            }}
                          >
                            Delete forever
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  <CandidateCard
                    candidate={c}
                    selected={selected.has(c.id)}
                    onToggleSelect={toggle}
                    onOpen={(id) => setOpenCandidateId(id)}
                  />
                </div>
              );
            })}
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

      {dialog?.kind === "archive" && dialogProject && (
        <ConfirmDestructiveDialog
          open
          tone="warn"
          title={`Archive ${dialogProject.name}?`}
          body={
            <>
              Archived projects are hidden from this list but stay restorable
              from <strong>/archive</strong>. Their data is preserved.
            </>
          }
          confirmLabel="Archive"
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            await archiveProject(dialogProject.id);
            setDialog(null);
          }}
        />
      )}

      {dialog?.kind === "delete" && dialogProject && (
        <ConfirmDestructiveDialog
          open
          tone="danger"
          title={`Delete ${dialogProject.name} forever?`}
          body={
            <>
              This permanently removes the project and all of its dependent
              data (designs, logs, attachments). This cannot be undone.
            </>
          }
          confirmLabel="Delete forever"
          typedConfirmation={dialogProject.name}
          onCancel={() => setDialog(null)}
          onConfirm={async () => {
            await deleteProject(dialogProject.id);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}
