import type { Project } from "../../types.js";
import css from "./railPanel.module.css";

export default function DiscoverRail({ project }: { project: Project }) {
  return (
    <div className={css.panel}>
      <section className={css.section}>
        <span className={css.sectionLabel}>Filters Applied</span>
        <div className={css.card}>
          <span className={css.cardSub}>Acreage 50–200 ha · Use: Education + Conservation</span>
        </div>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>Shortlist</span>
        <div className={css.card}>
          <span className={css.cardValue}>{project.name}</span>
          <span className={css.cardSub}>{project.location.region} · {project.location.acreage} {project.location.acreageUnit}</span>
        </div>
      </section>

      <section className={css.section}>
        <span className={css.sectionLabel}>What to Look For</span>
        <ul className={css.list}>
          <li className={css.listItem}><span className={css.dot} /><span>Water access on-parcel</span></li>
          <li className={css.listItem}><span className={css.dot} /><span>Workable regulatory footprint</span></li>
          <li className={css.listItem}><span className={css.dot} /><span>Road access &amp; utility hookup</span></li>
        </ul>
      </section>

      <button type="button" className={css.cta}>Compare Selected</button>
    </div>
  );
}
