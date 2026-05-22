/**
 * MapSheetExportControl — Plan-stage floating control that captures the live
 * design map and POSTs one of four captured-map PDF exports via a dropdown
 * picker:
 *   - master_plan    — full sheet: map + legend + zone roster + inventory
 *   - base_map_sheet  — thin: bare site map (PDC Week 2)
 *   - zone_map_sheet  — thin: map + zone-category legend (PDC Week 4)
 *   - planting_plan   — map + legend + merged species schedule (PDC Weeks 7–8)
 *
 * Mounted inside the DesignMap render-prop so it holds the live MapLibre
 * instance. Captures the canvas (captureMapImage), assembles the payload per
 * export type (buildMapSheetPayload / buildPlantingPlanPayload), and fires via
 * the same `api.exports.generate` path the ReportingPanel uses. The thin
 * base/zone server templates ignore `mapSheet.zones`, so only `master_plan`
 * carries it; `planting_plan` carries a schedule merged from guilds + crops.
 */

import { useCallback, useState } from "react";
import type { maplibregl } from "../../lib/maplibre.js";
import type { PlantingScheduleRow } from "@ogden/shared";
import { api } from "../../lib/apiClient.js";
import {
  useZoneStore,
  ZONE_CATEGORY_CONFIG,
  type LandZone,
} from "../../store/zoneStore.js";
import { usePolycultureStore, type Guild } from "../../store/polycultureStore.js";
import { useCropStore, type CropArea, type CropAreaType } from "../../store/cropStore.js";
import { findEntry } from "../../data/plantCatalog.js";
import { captureMapImage } from "./captureMapImage.js";
import { MapControlPopover } from "../../components/ui/MapControlPopover.js";
import { group, warning } from "../../lib/tokens.js";

export type MapSheetType = "master_plan" | "base_map_sheet" | "zone_map_sheet";
export type SheetExportType = MapSheetType | "planting_plan";
type Captured = Awaited<ReturnType<typeof captureMapImage>>;

interface MapSheetExportControlProps {
  map: maplibregl.Map;
  projectId: string;
}

export const SHEET_EXPORTS: { type: SheetExportType; label: string }[] = [
  { type: "master_plan", label: "Master Plan" },
  { type: "base_map_sheet", label: "Base Map" },
  { type: "zone_map_sheet", label: "Zone Map" },
  { type: "planting_plan", label: "Planting Plan" },
];

export const SHEET_LABEL: Record<SheetExportType, string> = {
  master_plan: "Master Plan",
  base_map_sheet: "Base Map",
  zone_map_sheet: "Zone Map",
  planting_plan: "Planting Plan",
};

/** Crop-area type → food-forest layer for the planting schedule. */
const CROP_TYPE_LAYER: Record<CropAreaType, string> = {
  orchard: "canopy",
  food_forest: "canopy",
  silvopasture: "canopy",
  windbreak: "canopy",
  shelterbelt: "canopy",
  nursery: "shrub",
  row_crop: "herbaceous",
  garden_bed: "herbaceous",
  market_garden: "herbaceous",
  pollinator_strip: "herbaceous",
};

function buildLegend(zones: LandZone[]) {
  const seen = new Set<string>();
  const legend: { label: string; color: string; kind: "fill" }[] = [];
  for (const z of zones) {
    if (seen.has(z.category)) continue;
    seen.add(z.category);
    const cfg = ZONE_CATEGORY_CONFIG[z.category];
    legend.push({ label: cfg?.label ?? z.category, color: z.color, kind: "fill" });
  }
  return legend;
}

/**
 * Shape the export payload per sheet type. Pure — no map/DOM access — so the
 * per-type branching is unit-testable. The thin base/zone templates render
 * image + optional legend + optional narrative only (they ignore zones[]):
 *   - base_map_sheet → image only
 *   - zone_map_sheet → image + legend
 *   - master_plan    → image + legend + full zone roster
 */
export function buildMapSheetPayload(
  type: MapSheetType,
  captured: Captured,
  zones: LandZone[],
) {
  const img = {
    dataUrl: captured.dataUrl,
    caption: `${SHEET_LABEL[type]} · ${new Date().toLocaleDateString()}`,
    widthPx: captured.widthPx,
    heightPx: captured.heightPx,
  };

  if (type === "base_map_sheet") {
    return { mapSheet: { mapImages: [img] } };
  }

  const legend = buildLegend(zones);
  if (type === "zone_map_sheet") {
    return { mapSheet: { mapImages: [img], legend } };
  }

  return {
    mapSheet: {
      mapImages: [img],
      legend,
      zones: zones.map((z) => ({
        id: z.id,
        name: z.name,
        category: z.category,
        primaryUse: z.primaryUse || undefined,
        areaM2: z.areaM2,
        permacultureZone: z.permacultureZone,
        phaseTag: z.phase,
      })),
    },
  };
}

/**
 * Merge a planting schedule from both design sources. Pure — no map/DOM —
 * so it is unit-testable. Guilds contribute one row per distinct member
 * species (anchor included, counted); crop areas contribute one row per
 * listed species. Catalog lookups resolve common/latin names + spacing;
 * unknown crop strings pass through as raw text.
 */
export function buildPlantingSchedule(
  guilds: Guild[],
  cropAreas: CropArea[],
): PlantingScheduleRow[] {
  const rows: PlantingScheduleRow[] = [];

  for (const g of guilds) {
    const bySpecies = new Map<string, { count: number; layer?: string }>();
    const all: { speciesId: string; layer?: string }[] = [
      { speciesId: g.anchorSpeciesId },
      ...g.members.map((m) => ({ speciesId: m.speciesId, layer: m.layer })),
    ];
    for (const m of all) {
      const prev = bySpecies.get(m.speciesId);
      if (prev) {
        prev.count += 1;
        if (!prev.layer && m.layer) prev.layer = m.layer;
      } else {
        bySpecies.set(m.speciesId, { count: 1, layer: m.layer });
      }
    }
    for (const [speciesId, info] of bySpecies) {
      const entry = findEntry(speciesId);
      rows.push({
        species: entry?.commonName ?? speciesId,
        latinName: entry?.latinName,
        layer: info.layer ?? entry?.layer,
        source: g.name,
        sourceKind: "guild",
        count: info.count,
        spacingM: entry?.spacingM?.inRow,
      });
    }
  }

  for (const c of cropAreas) {
    for (const s of c.species) {
      const entry = findEntry(s);
      rows.push({
        species: entry?.commonName ?? s,
        latinName: entry?.latinName,
        layer: entry?.layer ?? CROP_TYPE_LAYER[c.type],
        source: c.name,
        sourceKind: "crop_area",
        spacingM: c.treeSpacingM ?? undefined,
        areaM2: c.areaM2,
      });
    }
  }

  return rows;
}

/** Shape the planting-plan payload (captured map + legend + merged schedule). */
export function buildPlantingPlanPayload(
  captured: Captured,
  zones: LandZone[],
  schedule: PlantingScheduleRow[],
) {
  const img = {
    dataUrl: captured.dataUrl,
    caption: `${SHEET_LABEL.planting_plan} · ${new Date().toLocaleDateString()}`,
    widthPx: captured.widthPx,
    heightPx: captured.heightPx,
  };
  return {
    plantingPlan: {
      mapImages: [img],
      legend: buildLegend(zones),
      schedule,
    },
  };
}

export default function MapSheetExportControl({
  map,
  projectId,
}: MapSheetExportControlProps) {
  const zones = useZoneStore((s) => s.zones).filter((z) => z.projectId === projectId);
  const guilds = usePolycultureStore((s) => s.guilds).filter((g) => g.projectId === projectId);
  const cropAreas = useCropStore((s) => s.cropAreas).filter((c) => c.projectId === projectId);

  const [open, setOpen] = useState(false);
  const [generatingType, setGeneratingType] = useState<SheetExportType | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(
    async (type: SheetExportType) => {
      setOpen(false);
      setGeneratingType(type);
      setError(null);
      setDownloadUrl(null);
      try {
        const captured = await captureMapImage(map);
        const payload =
          type === "planting_plan"
            ? buildPlantingPlanPayload(
                captured,
                zones,
                buildPlantingSchedule(guilds, cropAreas),
              )
            : buildMapSheetPayload(type, captured, zones);
        const { data } = await api.exports.generate(projectId, {
          exportType: type,
          payload,
        });
        setDownloadUrl(data.storageUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Export failed");
      } finally {
        setGeneratingType(null);
      }
    },
    [map, projectId, zones, guilds, cropAreas],
  );

  const busy = generatingType !== null;

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: "flex-start",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "7px 14px",
          fontSize: 12,
          fontWeight: 600,
          border: "none",
          borderRadius: 8,
          background: group.reporting,
          color: "#fff",
          cursor: busy ? "not-allowed" : "pointer",
          opacity: busy ? 0.7 : 1,
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        }}
      >
        {busy ? `Exporting ${SHEET_LABEL[generatingType!]}…` : "Export sheet ▾"}
      </button>

      {open && !busy && (
        <MapControlPopover
          variant="dropdown"
          role="menu"
          aria-label="Choose map sheet to export"
          style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 150 }}
        >
          {SHEET_EXPORTS.map((sheet) => (
            <button
              key={sheet.type}
              type="button"
              role="menuitem"
              onClick={() => handleExport(sheet.type)}
              style={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                padding: "6px 10px",
                fontSize: 12,
                fontWeight: 600,
                border: "none",
                borderRadius: 6,
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {sheet.label}
            </button>
          ))}
        </MapControlPopover>
      )}

      {error && (
        <div
          style={{
            fontSize: 10,
            color: "#fff",
            background: "rgba(220,38,38,0.9)",
            padding: "4px 8px",
            borderRadius: 6,
            maxWidth: 240,
          }}
        >
          {error}
        </div>
      )}

      {downloadUrl && (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#fff",
            background: warning.DEFAULT,
            padding: "5px 12px",
            borderRadius: 6,
            textDecoration: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}
        >
          Download PDF
        </a>
      )}
    </div>
  );
}
