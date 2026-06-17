/**
 * ReceptionSurveyHosts -- mounts the map plumbing for ALL five reception
 * (Tier-2 Systems Reading) surveys on the Plan canvas, mirroring the way
 * VisionLayoutCanvas mounts the slope + vegetation survey hosts.
 *
 * For each registered survey it renders:
 *   - a <SurveyLayer> ALWAYS (drawn features stay visible regardless of which
 *     survey -- if any -- is in takeover, gated only by the shared
 *     `receptionSurvey` matrix toggle inside the layer);
 *   - a <SurveyDrawHost> ONLY when that survey's takeover is open for this
 *     project AND its objective is the one currently in view -- so the draw tool
 *     stays latent on every other objective's canvas (parity with slope/veg).
 *
 * One child component per entry isolates the per-bundle `active` subscription so
 * each store hook is called unconditionally (rules-of-hooks safe over the
 * fixed-length registry).
 */

import type { Map as MaplibreMap } from 'maplibre-gl';
import {
  RECEPTION_SURVEYS,
  type ReceptionSurveyEntry,
} from '../../../store/receptionSurveys.js';
import SurveyLayer from './SurveyLayer.js';
import SurveyDrawHost from './SurveyDrawHost.js';

interface HostProps {
  entry: ReceptionSurveyEntry;
  map: MaplibreMap;
  projectId: string;
  /** Plan objective currently in view -- the draw host only arms on its own. */
  sourceObjectiveId: string | null;
}

function ReceptionSurveyHost({
  entry,
  map,
  projectId,
  sourceObjectiveId,
}: HostProps) {
  const active = entry.bundle.useStore(
    (s) => s.active && s.activeProjectId === projectId,
  );
  const drawArmed = active && entry.objectiveId === sourceObjectiveId;
  return (
    <>
      <SurveyLayer bundle={entry.bundle} map={map} projectId={projectId} />
      {drawArmed ? (
        <SurveyDrawHost
          bundle={entry.bundle}
          map={map}
          projectId={projectId}
          sourceObjectiveId={entry.objectiveId}
        />
      ) : null}
    </>
  );
}

interface Props {
  map: MaplibreMap;
  projectId: string | null;
  /** Plan objective currently in view (provenance + draw-arm gate). */
  sourceObjectiveId?: string | null;
}

export default function ReceptionSurveyHosts({
  map,
  projectId,
  sourceObjectiveId,
}: Props) {
  if (!projectId) return null;
  return (
    <>
      {RECEPTION_SURVEYS.map((entry) => (
        <ReceptionSurveyHost
          key={entry.objectiveId}
          entry={entry}
          map={map}
          projectId={projectId}
          sourceObjectiveId={sourceObjectiveId ?? null}
        />
      ))}
    </>
  );
}
