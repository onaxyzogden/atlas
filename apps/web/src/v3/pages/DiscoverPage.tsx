/**
 * /v3/project/:projectId/discover — Candidate Property Board.
 * Pixel-aligned with the Property Candidates reference design.
 *
 * Layout:
 *   [PageHeader]                title + subtitle + "How scoring works" link
 *   [FiltersBar]                chip filters + result count + sort + view toggle
 *   [Card grid]                 6 candidates, 1–3 columns responsive
 *   [CompareTray]               bottom drawer (sticky), shown when selected.size > 0
 *
 * RULE 1: filtering is mock-only — chips toggle UI state but the grid is the
 * full fixture list. Selection is shared with DiscoverRail via the discover
 * store so the rail's Shortlisted panel and Compare CTA stay in sync.
 */

import PageHeader from "../components/PageHeader.js";
import FiltersBar from "../components/FiltersBar.js";
import CandidateCard from "../components/CandidateCard.js";
import CompareTray from "../components/CompareTray.js";
import { MOCK_CANDIDATES } from "../data/mockCandidates.js";
import { useDiscoverSelection } from "../data/discoverStore.js";
import css from "./DiscoverPage.module.css";

export default function DiscoverPage() {
  const selected = useDiscoverSelection((s) => s.selected);
  const toggle = useDiscoverSelection((s) => s.toggle);
  const clear = useDiscoverSelection((s) => s.clear);

  const selectedCandidates = MOCK_CANDIDATES.filter((c) => selected.has(c.id));

  return (
    <div className={css.page}>
      <PageHeader
        eyebrow="Discover"
        title="Candidate Property Board"
        subtitle="Discover and compare land opportunities that align with your vision and operational needs."
        actions={<button type="button" className={css.helpLink}>How scoring works →</button>}
      />

      <FiltersBar resultCount={MOCK_CANDIDATES.length} />

      <div className={css.grid}>
        {MOCK_CANDIDATES.map((c) => (
          <CandidateCard
            key={c.id}
            candidate={c}
            selected={selected.has(c.id)}
            onToggleSelect={toggle}
            onOpen={() => {}}
          />
        ))}
      </div>

      <CompareTray
        selected={selectedCandidates}
        onRemove={toggle}
        onClear={clear}
        onCompare={() => {}}
      />
    </div>
  );
}
