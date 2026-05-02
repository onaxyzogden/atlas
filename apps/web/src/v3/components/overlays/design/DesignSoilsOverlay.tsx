/**
 * DesignSoilsOverlay — soils legend chip from `useSiteDataStore`.
 *
 * Phase 5.1 PR2. The free MapTiler/OpenMapTiles layers don't carry soils
 * polygons, and SSURGO/LIO vector tiles aren't on the v3 budget yet, so
 * this overlay surfaces the *summary* fields (predominant texture,
 * drainage class, pH, hydrologic group) from the existing layer fetcher
 * as a small legend chip in the bottom-left of the canvas. Toggleable
 * via the chip on `DesignPage`.
 */

import type { MockLayerResult } from "@ogden/shared/scoring";
import { useSiteDataStore } from "../../../../store/siteDataStore.js";
import css from "./DesignLegendChip.module.css";

export interface DesignSoilsOverlayProps {
  visible: boolean;
  projectId: string;
}

interface SoilsSummary {
  predominant_texture?: string;
  drainage_class?: string;
  ph_range?: string;
  hydrologic_group?: string;
  organic_matter_pct?: number | null;
}

function pickSoils(layers: MockLayerResult[] | undefined): SoilsSummary | null {
  if (!layers) return null;
  const row = layers.find((l) => l.layerType === "soils");
  return (row?.summary as SoilsSummary | undefined) ?? null;
}

export default function DesignSoilsOverlay({ visible, projectId }: DesignSoilsOverlayProps) {
  const layers = useSiteDataStore((s) => s.dataByProject[projectId]?.layers);
  if (!visible) return null;
  const soils = pickSoils(layers);

  return (
    <div className={`${css.chip} ${css.chipLeft}`} aria-label="Soils summary">
      <div className={css.title}>Soils</div>
      {!soils ? (
        <div className={css.empty}>No soils layer loaded.</div>
      ) : (
        <>
          {soils.predominant_texture && (
            <div className={css.row}>
              <span className={css.label}>Texture</span>
              <span className={css.value}>{soils.predominant_texture}</span>
            </div>
          )}
          {soils.drainage_class && (
            <div className={css.row}>
              <span className={css.label}>Drainage</span>
              <span className={css.value}>{soils.drainage_class}</span>
            </div>
          )}
          {soils.ph_range && (
            <div className={css.row}>
              <span className={css.label}>pH</span>
              <span className={css.value}>{soils.ph_range}</span>
            </div>
          )}
          {soils.hydrologic_group && (
            <div className={css.row}>
              <span className={css.label}>Hydrologic group</span>
              <span className={css.value}>{soils.hydrologic_group}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
