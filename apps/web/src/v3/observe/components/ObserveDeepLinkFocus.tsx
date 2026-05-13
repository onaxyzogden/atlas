/**
 * ObserveDeepLinkFocus — consumes the `focusKind` / `focusId` /
 * `focusLng` / `focusLat` search params written by
 * `<ObserveLinkPopover>` on the Plan stage and:
 *   1. opens the read-only `<AnnotationDetailPanel>` for the record,
 *   2. flies the Observe map to the popover's anchor,
 *   3. drops a short-lived `<SpotlightPulse>` to draw the eye,
 *   4. strips the search params (replace:true) so refresh / back-nav
 *      doesn't re-fire the handoff.
 *
 * Mounted inside `DiagnoseMap`'s render-prop in `ObserveLayout` so the
 * live `map` instance is in scope.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import type { Map as MaplibreMap } from 'maplibre-gl';
import { useAnnotationDetailStore } from '../../../store/annotationDetailStore.js';
import type { AnnotationKind } from './draw/annotationFieldSchemas.js';
import { getAnnotationRow } from './AnnotationRegistry.js';
import SpotlightPulse from '../../components/overlays/SpotlightPulse.js';
import type { ObserveModule } from '../types.js';

interface Props {
  map: MaplibreMap;
  activeModule: ObserveModule | null;
  projectId: string | null;
}

export default function ObserveDeepLinkFocus({ map, activeModule, projectId }: Props) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as {
    focusKind?: string;
    focusId?: string;
    focusLng?: number | string;
    focusLat?: number | string;
  };
  const openAnnotationDetail = useAnnotationDetailStore((s) => s.open);
  const [pulse, setPulse] = useState<{ point: [number, number]; key: number } | null>(null);

  useEffect(() => {
    const { focusKind, focusId, focusLng, focusLat } = search;
    if (!focusKind || !focusId) return;
    if (!getAnnotationRow(focusKind as AnnotationKind, focusId)) return;

    openAnnotationDetail({ kind: focusKind as AnnotationKind, id: focusId });

    const lng = typeof focusLng === 'string' ? Number(focusLng) : focusLng;
    const lat = typeof focusLat === 'string' ? Number(focusLat) : focusLat;
    if (
      typeof lng === 'number' &&
      typeof lat === 'number' &&
      Number.isFinite(lng) &&
      Number.isFinite(lat)
    ) {
      map.flyTo({ center: [lng, lat], zoom: 17, essential: true });
      setPulse({ point: [lng, lat], key: Date.now() });
    }

    if (projectId && activeModule) {
      navigate({
        to: '/v3/project/$projectId/observe/$module',
        params: { projectId, module: activeModule },
        search: {},
        replace: true,
      });
    }
  }, [search, map, openAnnotationDetail, navigate, projectId, activeModule]);

  return pulse ? <SpotlightPulse key={pulse.key} map={map} point={pulse.point} /> : null;
}
