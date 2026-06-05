export type ShowcaseLayer = { layer_type: string; source_api: string; data_date: string; summary_data: Record<string, unknown> };
export type ShowcaseDesignFeature = { id: string; feature_type: 'zone'|'structure'|'path'; name: string; properties: Record<string, unknown>; geometry: GeoJSON.Geometry };
export type ShowcaseRegenerationEvent = { id: string; event_date: string; event_type: string; phase: string|null; observations: Record<string, unknown>; parent_event_id: string|null };
export type ShowcaseSpiritualZone = { id: string; name: string; properties: Record<string, unknown>; geometry: GeoJSON.Geometry };
export type ShowcaseRelationship = { from_output: string; to_input: string; ratio: number };
export type ShowcaseProject = {
  id: string; name: string; is_builtin: boolean; country: string; province_state: string;
  conservation_auth_id: string; acreage: number; bioregion: string; climate_region: string;
  parcel_boundary: GeoJSON.MultiPolygon; metadata: Record<string, unknown>;
};

export type ShowcaseSnapshot = {
  project: ShowcaseProject;
  layers: ShowcaseLayer[];
  designFeatures: ShowcaseDesignFeature[];
  regenerationEvents: ShowcaseRegenerationEvent[];
  spiritualZones: ShowcaseSpiritualZone[];
  relationships: ShowcaseRelationship[];
};

const SNAPSHOT_URL = '/showcase/three-streams.json';

export async function loadSnapshot(opts?: { fetchImpl?: typeof fetch }): Promise<ShowcaseSnapshot> {
  const f = opts?.fetchImpl ?? fetch;
  const res = await f(SNAPSHOT_URL);
  if (!res.ok) throw new Error(`Failed to load showcase snapshot: ${res.status}`);
  return (await res.json()) as ShowcaseSnapshot;
}
