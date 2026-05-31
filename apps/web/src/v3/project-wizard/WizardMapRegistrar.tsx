import { useEffect } from 'react';
import type { maplibregl } from '../../lib/maplibre.js';
import { useWizardMapStore } from './wizardMapStore.js';

interface WizardMapRegistrarProps {
  map: maplibregl.Map;
}

/**
 * WizardMapRegistrar - effect-only bridge. Mounted inside DiagnoseMap's
 * render-prop (the only scope that holds the live map handle), it publishes
 * that handle to wizardMapStore so sibling form panels - notably
 * WizardAddressSearch in the Step 1 form aside - can use it. Clears the handle
 * on unmount. Renders nothing.
 *
 * This indirection exists because DiagnoseMap is foreign WIP and must not be
 * edited to add a callback/context for sharing its map.
 */
export default function WizardMapRegistrar({ map }: WizardMapRegistrarProps) {
  const setMap = useWizardMapStore((s) => s.setMap);
  useEffect(() => {
    setMap(map);
    return () => setMap(null);
  }, [map, setMap]);
  return null;
}
