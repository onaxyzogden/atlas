/**
 * Feature mapping helpers — convert between DesignFeatureSummary (API wire format)
 * and local store types (LandZone, Structure).
 *
 * Extracted from syncService.ts so both syncService and wsService can import
 * without circular dependencies.
 */

import type { CreateDesignFeatureInput, DesignFeatureSummary } from '@ogden/shared';
import type { LandZone } from '../store/zoneStore.js';
import type { Structure } from '../store/structureStore.js';

export function zoneToDesignFeature(zone: LandZone, _projectServerId: string): CreateDesignFeatureInput {
  return {
    featureType: 'zone',
    subtype: zone.category,
    geometry: zone.geometry,
    label: zone.name,
    properties: {
      primaryUse: zone.primaryUse,
      secondaryUse: zone.secondaryUse,
      notes: zone.notes,
      areaM2: zone.areaM2,
      localId: zone.id,
      color: zone.color,
    },
    style: { color: zone.color },
    sortOrder: 0,
  };
}

export function structureToDesignFeature(structure: Structure, _projectServerId: string): CreateDesignFeatureInput {
  return {
    featureType: 'structure',
    subtype: structure.type,
    geometry: structure.geometry,
    label: structure.name,
    properties: {
      center: structure.center,
      rotationDeg: structure.rotationDeg,
      widthM: structure.widthM,
      depthM: structure.depthM,
      costEstimate: structure.costEstimate,
      infrastructureReqs: structure.infrastructureReqs,
      notes: structure.notes,
      localId: structure.id,
    },
    phaseTag: structure.phase || undefined,
    sortOrder: 0,
  };
}

export function designFeatureToZone(df: DesignFeatureSummary, projectLocalId: string): LandZone {
  const props = df.properties as Record<string, unknown>;
  return {
    id: (props.localId as string) || crypto.randomUUID(),
    projectId: projectLocalId,
    name: df.label ?? '',
    category: (df.subtype ?? 'habitation') as LandZone['category'],
    color: (props.color as string) ?? (df.style as Record<string, unknown>)?.color as string ?? '#888888',
    primaryUse: (props.primaryUse as string) ?? '',
    secondaryUse: (props.secondaryUse as string) ?? '',
    notes: (props.notes as string) ?? '',
    geometry: df.geometry as LandZone['geometry'],
    areaM2: (props.areaM2 as number) ?? 0,
    createdAt: df.createdAt,
    updatedAt: df.updatedAt,
    serverId: df.id,
  };
}

export function designFeatureToStructure(df: DesignFeatureSummary, projectLocalId: string): Structure {
  const props = df.properties as Record<string, unknown>;
  return {
    id: (props.localId as string) || crypto.randomUUID(),
    projectId: projectLocalId,
    name: df.label ?? '',
    type: (df.subtype ?? 'cabin') as Structure['type'],
    center: (props.center as [number, number]) ?? [0, 0],
    geometry: df.geometry as Structure['geometry'],
    rotationDeg: (props.rotationDeg as number) ?? 0,
    widthM: (props.widthM as number) ?? 0,
    depthM: (props.depthM as number) ?? 0,
    phase: df.phaseTag ?? '',
    costEstimate: (props.costEstimate as number | null) ?? null,
    infrastructureReqs: (props.infrastructureReqs as string[]) ?? [],
    notes: (props.notes as string) ?? '',
    createdAt: df.createdAt,
    updatedAt: df.updatedAt,
    serverId: df.id,
  };
}
