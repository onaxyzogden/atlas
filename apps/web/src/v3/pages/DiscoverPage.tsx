/**
 * /v3/project/:projectId/discover — Candidate Property Board.
 *
 * Phase 6.1 (per `.claude/plans/few-concerns-shiny-quokka.md`): the
 * filter chips now actually filter the grid (RULE 1 lifted) and the
 * Compare Selected CTA opens a side-by-side comparison modal. Result
 * count and tray remain in sync as filters narrow.
 */

import { useMemo, useState } from "react";
import PageHeader from "../components/PageHeader.js";
import FiltersBar, { type FilterState } from "../components/FiltersBar.js";
import CandidateCard from "../components/CandidateCard.js";
import CompareTray from "../components/CompareTray.js";
import CompareModal from "../components/CompareModal.js";
import { MOCK_CANDIDATES } from "../data/mockCandidates.js";
import { applyCandidateFilters } from "../data/candidateFilter.js";
import { useDiscoverSelection } from "../data/discoverStore.js";
import css from "./DiscoverPage.module.css";

export default function DiscoverPage() {
  const selected = useDiscoverSelection((s) => s.selected);
  const toggle = useDiscoverSelection((s) => s.toggle);
  const clear = useDiscoverSelection((s) => s.clear);

  const [filters, setFilters] = useState<FilterState>({});
  const [moreOpen, setMoreOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const filtered = useMemo(
    () => applyCandidateFilters(MOCK_CANDIDATES, filters),
    [filters],
  );

  const selectedCandidates = MOCK_CANDIDATES.filter((c) => selected.has(c.id));

  return (
    <div className={css.page}>
      <PageHeader
        eyebrow="Discover"
        title="Candidate Property Board"
        subtitle="Discover and compare land opportunities that align with your vision and operational needs."
        actions={<button type="button" className={css.helpLink}>How scoring works →</button>}
      />

      <FiltersBar
        resultCount={filtered.length}
        active={filters}
        onChange={setFilters}
        moreOpen={moreOpen}
        onToggleMore={() => setMoreOpen((v) => !v)}
      />

      {filtered.length === 0 ? (
        <div className={css.emptyState}>
          <p>No properties match the current filters.</p>
          <button type="button" className={css.helpLink} onClick={() => setFilters({})}>
            Clear filters
          </button>
        </div>
      ) : (
        <div className={css.grid}>
          {filtered.map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              selected={selected.has(c.id)}
              onToggleSelect={toggle}
              onOpen={() => {}}
            />
          ))}
        </div>
      )}

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
    </div>
  );
}
