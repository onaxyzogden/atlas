/**
 * MasterPlanExportButton — Plan-stage floating control that captures the
 * live design map and POSTs a `master_plan` PDF export.
 *
 * Mounted inside the DesignMap render-prop so it holds the live MapLibre
 * instance. It captures the canvas (captureMapImage), assembles the zone
 * roster + category legend from the zone store, and fires the export via
 * the same `api.exports.generate` path the ReportingPanel uses. The
 * gradeable annotated-map artifact for OSU PDC Weeks 2/4/9/10.
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
import { group, warning } from "../../lib/tokens.js";

interface MasterPlanExportButtonProps {
  map: maplibregl.Map;
  projectId: string;
}

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

export default function MasterPlanExportButton({
  map,
  projectId,
}: MasterPlanExportButtonProps) {
  const zones = useZoneStore((s) => s.zones).filter((z) => z.projectId === projectId);

  const [generating, setGenerating] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setDownloadUrl(null);
    try {
      const captured = await captureMapImage(map);
      const payload = {
        mapSheet: {
          mapImages: [
            {
              dataUrl: captured.dataUrl,
              caption: `Design map · ${new Date().toLocaleDateString()}`,
              widthPx: captured.widthPx,
              heightPx: captured.heightPx,
            },
          ],
          legend: buildLegend(zones),
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
      const { data } = await api.exports.generate(projectId, {
        exportType: "master_plan",
        payload,
      });
      setDownloadUrl(data.storageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setGenerating(false);
    }
  }, [map, projectId, zones]);

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
        onClick={handleExport}
        disabled={generating}
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
          cursor: generating ? "not-allowed" : "pointer",
          opacity: generating ? 0.7 : 1,
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        }}
      >
        {generating ? "Exporting…" : "Export master plan"}
      </button>
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
