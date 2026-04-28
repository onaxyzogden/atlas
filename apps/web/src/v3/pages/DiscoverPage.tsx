/**
 * /v3/project/:projectId/discover — Candidate Property Board (Phase 4).
 *
 * Layout:
 *   [PageHeader]                title + Add Property action
 *   [FiltersBar]                chip filters + result count
 *   [Card grid]                 6 candidates, 1–3 columns responsive
 *   [CompareTray]               bottom drawer (sticky), shows when selected.size > 0
 *
 * RULE 1: filtering is mock-only — chips toggle UI state but the grid is
 * the full fixture list. Real filtering arrives in v3.1.
 */

import { useState } from "react";
import PageHeader from "../components/PageHeader.js";
import FiltersBar from "../components/FiltersBar.js";
import CandidateCard from "../components/CandidateCard.js";
import CompareTray from "../components/CompareTray.js";
import { MOCK_CANDIDATES } from "../data/mockCandidates.js";
import css from "./DiscoverPage.module.css";

const MAX_COMPARE = 4;

export default function DiscoverPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_COMPARE) {
        next.add(id);
      }
      return next;
    });
  };

  const selectedCandidates = MOCK_CANDIDATES.filter((c) => selected.has(c.id));

  return (
    <div className={css.page}>
      <PageHeader
        eyebrow="Discover"
        title="Candidate Property Board"
        subtitle="Survey and shortlist parcels that align with your vision. Each card shows a coarse verdict, top blocker, and the four core sub-scores."
        actions={<button type="button" className={css.addBtn}>+ Add Property</button>}
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
        onClear={() => setSelected(new Set())}
        onCompare={() => {}}
      />
    </div>
  );
}
