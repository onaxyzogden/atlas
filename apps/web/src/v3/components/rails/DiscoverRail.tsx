import type { Project } from "../../types.js";
import { MOCK_CANDIDATES } from "../../data/mockCandidates.js";
import { useDiscoverSelection, MAX_COMPARE } from "../../data/discoverStore.js";
import railCss from "./railPanel.module.css";
import css from "./DiscoverRail.module.css";

const FILTERS_APPLIED: { label: string; value: string }[] = [
  { label: "Location", value: "Eastern Ontario" },
  { label: "Acreage", value: "50 – 2,000+ ac" },
  { label: "Price", value: "Up to $3M" },
  { label: "Use Fit", value: "Pasture, Silvopasture, Education, Agritourism" },
  { label: "Water", value: "Minimum threshold" },
  { label: "Access", value: "Road within 2 km" },
  { label: "Zoning", value: "Agricultural or Rural" },
  { label: "Infrastructure", value: "Any" },
];

function scoreToneClass(v: number): string {
  if (v >= 80) return "shortlistScore";
  if (v >= 65) return "shortlistScoreWatch";
  if (v >= 50) return "shortlistScoreWarning";
  return "shortlistScoreBlocked";
}

export default function DiscoverRail({ project: _project }: { project: Project }) {
  const selected = useDiscoverSelection((s) => s.selected);
  const clear = useDiscoverSelection((s) => s.clear);

  const shortlist = MOCK_CANDIDATES.filter((c) => selected.has(c.id));
  const total = MOCK_CANDIDATES.length;
  const selectedCount = selected.size;

  return (
    <div className={railCss.panel}>
      <section className={railCss.section}>
        <div className={css.headerRow}>
          <span className={railCss.sectionLabel}>Shortlisted Properties</span>
          <span className={css.count}>{selectedCount} of {total}</span>
        </div>
        <div className={railCss.card}>
          {shortlist.length === 0 ? (
            <span className={css.empty}>Tick a card to add it to your shortlist.</span>
          ) : (
            shortlist.map((c) => {
              const fit = c.fitScore ?? 0;
              return (
                <div key={c.id} className={css.shortlistRow}>
                  <div className={css.shortlistMain}>
                    <span className={css.shortlistName}>{c.name}</span>
                    <span className={css.shortlistMeta}>{c.region}</span>
                  </div>
                  <div className={css.shortlistRight}>
                    <span className={css.shortlistAcres}>{c.acreage} ac</span>
                    <span className={`${css[scoreToneClass(fit)]}`}>{fit}</span>
                  </div>
                </div>
              );
            })
          )}
          {shortlist.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
              <button type="button" className={css.linkBtn} onClick={clear}>Clear shortlist</button>
            </div>
          )}
        </div>
      </section>

      <section className={railCss.section}>
        <div className={css.headerRow}>
          <span className={railCss.sectionLabel}>Filters Applied</span>
          <button type="button" className={css.linkBtn}>Clear all</button>
        </div>
        <div className={railCss.card}>
          {FILTERS_APPLIED.map((f) => (
            <div key={f.label} className={css.filterRow}>
              <span className={css.filterLabel}>{f.label}</span>
              <span className={css.filterValue}>{f.value}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 6 }}>
            <button type="button" className={css.linkBtn}>Edit filters</button>
          </div>
        </div>
      </section>

      <button type="button" className={railCss.cta} disabled={selectedCount < 2}>
        Compare Selected ({selectedCount})
      </button>
      <span className={css.compareSub}>Compare up to {MAX_COMPARE} properties</span>
    </div>
  );
}
