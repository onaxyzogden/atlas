/**
 * MapSheetExportControl — Plan-stage floating control that captures the live
 * design map and POSTs one of three captured-map PDF exports via a dropdown
 * picker:
 *   - master_plan    — full sheet: map + legend + zone roster + inventory
 *   - base_map_sheet  — thin: bare site map (PDC Week 2)
 *   - zone_map_sheet  — thin: map + zone-category legend (PDC Week 4)
 *
 * Mounted inside the DesignMap render-prop so it holds the live MapLibre
 * instance. Captures the canvas (captureMapImage), assembles the payload per
 * export type (buildMapSheetPayload), and fires via the same
 * `api.exports.generate` path the ReportingPanel uses. The thin base/zone
 * server templates ignore `mapSheet.zones`, so only `master_plan` carries it.
 */

import { useCallback, useState } from "react";
import type { maplibregl } from "../../lib/maplibre.js";
import { api } from "../../lib/apiClient.js";
import {
  useZoneStore,
  ZONE_CATEGORY_CONFIG,
  type LandZone,
} from "../../store/zoneStore.js";
import { captureMapImage } from "./captureMapImage.js";
import { MapControlPopover } from "../../components/ui/MapControlPopover.js";
import { group, warning } from "../../lib/tokens.js";

type SheetExportType = "master_plan" | "base_map_sheet" | "zone_map_sheet";
type Captured = Awaited<ReturnType<typeof captureMapImage>>;

interface MapSheetExportControlProps {
  map: maplibregl.Map;
  projectId: string;
}

const SHEET_EXPORTS: { type: SheetExportType; label: string }[] = [
  { type: "master_plan", label: "Master Plan" },
  { type: "base_map_sheet", label: "Base Map" },
  { type: "zone_map_sheet", label: "Zone Map" },
];

const SHEET_LABEL: Record<SheetExportType, string> = {
  master_plan: "Master Plan",
  base_map_sheet: "Base Map",
  zone_map_sheet: "Zone Map",
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
  type: SheetExportType,
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

export default function MapSheetExportControl({
  map,
  projectId,
}: MapSheetExportControlProps) {
  const zones = useZoneStore((s) => s.zones).filter((z) => z.projectId === projectId);

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
        const payload = buildMapSheetPayload(type, captured, zones);
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
    [map, projectId, zones],
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
