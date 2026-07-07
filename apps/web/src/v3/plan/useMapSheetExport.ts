/**
 * useMapSheetExport — the captured-map PDF export state machine, extracted so
 * both the legacy floating `MapSheetExportControl` and the DesignToolRail
 * export button share one async path. Captures the live MapLibre canvas,
 * assembles the per-type payload via the pure (unit-tested) builders, and POSTs
 * via `api.exports.generate`. Open/close of the trigger UI stays with the
 * consumer (the rail coordinates it with its Layers popover).
 */

import { useCallback, useState } from "react";
import type { maplibregl } from "../../lib/maplibre.js";
import { api } from "../../lib/apiClient.js";
import {
  useServerProjectId,
  NOT_SYNCED_EXPORT_TITLE,
} from "../../hooks/useServerProjectId.js";
import { useZoneStore } from "../../store/zoneStore.js";
import { usePolycultureStore } from "../../store/polycultureStore.js";
import { useCropStore } from "../../store/cropStore.js";
import { captureMapImage } from "./captureMapImage.js";
import {
  buildMapSheetPayload,
  buildPlantingPlanPayload,
  buildPlantingSchedule,
  type SheetExportType,
} from "./MapSheetExportControl.js";

export interface UseMapSheetExport {
  generatingType: SheetExportType | null;
  error: string | null;
  downloadUrl: string | null;
  handleExport: (type: SheetExportType) => Promise<void>;
  /** False while the project is local-only (no serverId yet) — the exports
   *  API addresses the SERVER UUID, so consumers disable their trigger. */
  canExport: boolean;
}

export function useMapSheetExport(
  map: maplibregl.Map,
  projectId: string,
): UseMapSheetExport {
  // The rail passes the LOCAL project id; the exports API wants the SERVER
  // UUID (H4, deep-audit 2026-07-03). Null → not yet synced → cannot export.
  const serverProjectId = useServerProjectId(projectId);
  const zones = useZoneStore((s) => s.zones).filter((z) => z.projectId === projectId);
  const guilds = usePolycultureStore((s) => s.guilds).filter((g) => g.projectId === projectId);
  const cropAreas = useCropStore((s) => s.cropAreas).filter((c) => c.projectId === projectId);

  const [generatingType, setGeneratingType] = useState<SheetExportType | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = useCallback(
    async (type: SheetExportType) => {
      if (serverProjectId === null) {
        setError(NOT_SYNCED_EXPORT_TITLE);
        return;
      }
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
        const { data } = await api.exports.generate(serverProjectId, {
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
    [map, serverProjectId, zones, guilds, cropAreas],
  );

  return {
    generatingType,
    error,
    downloadUrl,
    handleExport,
    canExport: serverProjectId !== null,
  };
}
