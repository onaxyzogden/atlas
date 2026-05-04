/**
 * DesignWetlandsOverlay — wetlands & flood-zone legend chip from
 * `useSiteDataStore`. Same pattern as `DesignSoilsOverlay`: NWI/FEMA and
 * Conservation-Authority polygons aren't on the v3 free-tile budget, so
 * we surface the *summary* values (flood zone, wetland %, riparian
 * buffer, regulated %) as a bottom-right legend chip.
 */

import type { MockLayerResult } from "@ogden/shared/scoring";
import { useSiteDataStore } from "../../../../store/siteDataStore.js";
import css from "./DesignLegendChip.module.css";

export interface DesignWetlandsOverlayProps {
  visible: boolean;
  projectId: string;
}

interface WetlandsSummary {
  flood_zone?: string;
  wetland_pct?: number;
  wetland_types?: string[];
  riparian_buffer_m?: number;
  regulated_area_pct?: number;
}

function pickWetlands(layers: MockLayerResult[] | undefined): WetlandsSummary | null {
  if (!layers) return null;
  const row = layers.find((l) => l.layerType === "wetlands_flood");
  return (row?.summary as WetlandsSummary | undefined) ?? null;
}

export default function DesignWetlandsOverlay({ visible, projectId }: DesignWetlandsOverlayProps) {
  const layers = useSiteDataStore((s) => s.dataByProject[projectId]?.layers);
  if (!visible) return null;
  const w = pickWetlands(layers);

  return (
    <div className={`${css.chip} ${css.chipRight}`} aria-label="Wetlands summary">
      <div className={css.title}>Wetlands &amp; Flood</div>
      {!w ? (
        <div className={css.empty}>No wetlands layer loaded.</div>
      ) : (
        <>
          {w.flood_zone && (
            <div className={css.row}>
              <span className={css.label}>Flood zone</span>
              <span className={css.value}>{w.flood_zone}</span>
            </div>
          )}
          {typeof w.wetland_pct === "number" && (
            <div className={css.row}>
              <span className={css.label}>Wetland</span>
              <span className={css.value}>{w.wetland_pct.toFixed(1)}%</span>
            </div>
          )}
          {typeof w.riparian_buffer_m === "number" && (
            <div className={css.row}>
              <span className={css.label}>Riparian buffer</span>
              <span className={css.value}>{w.riparian_buffer_m} m</span>
            </div>
          )}
          {typeof w.regulated_area_pct === "number" && (
            <div className={css.row}>
              <span className={css.label}>Regulated</span>
              <span className={css.value}>{w.regulated_area_pct.toFixed(1)}%</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
