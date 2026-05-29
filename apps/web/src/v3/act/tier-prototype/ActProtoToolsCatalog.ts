// ActProtoToolsCatalog.ts
//
// PROTOTYPE-ONLY catalogue of the bottom digital-tools rail, grouped into the
// four categories shown in the concept screenshot. Tools are visual stubs --
// clicking one only sets local selection state. Delete with the folder.

import {
  Mountain,
  Triangle,
  Waves,
  Compass,
  FlaskConical,
  Trees,
  Map as MapIcon,
  AlertTriangle,
  Route,
  Zap,
  Droplet,
  DoorOpen,
  Car,
  Fence,
  Building2,
  Warehouse,
  Home,
  Box,
  Droplets,
  Sprout,
  TreeDeciduous,
  Beef,
  LayoutGrid,
  Recycle,
  type LucideIcon,
} from 'lucide-react';

export interface ProtoTool {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface ProtoToolCategory {
  id: string;
  label: string;
  tools: ProtoTool[];
}

export const PROTO_TOOL_CATEGORIES: ProtoToolCategory[] = [
  {
    id: 'terrain-survey',
    label: 'Terrain & Survey',
    tools: [
      { id: 'contour', label: 'Contour lines', icon: Mountain },
      { id: 'slope', label: 'Slope analysis', icon: Triangle },
      { id: 'drainage', label: 'Drainage lines', icon: Waves },
      { id: 'aspect', label: 'Aspect map', icon: Compass },
      { id: 'soil', label: 'Soil sampling', icon: FlaskConical },
      { id: 'vegetation', label: 'Vegetation cover', icon: Trees },
      { id: 'dem', label: 'Topography DEM', icon: MapIcon },
      { id: 'erosion', label: 'Erosion risk', icon: AlertTriangle },
    ],
  },
  {
    id: 'access-utilities',
    label: 'Access & Utilities',
    tools: [
      { id: 'roads', label: 'Roads & paths', icon: Route },
      { id: 'power', label: 'Power lines', icon: Zap },
      { id: 'water-lines', label: 'Water lines', icon: Droplet },
      { id: 'gates', label: 'Gates', icon: DoorOpen },
      { id: 'parking', label: 'Parking', icon: Car },
      { id: 'fencing', label: 'Fencing', icon: Fence },
    ],
  },
  {
    id: 'structures',
    label: 'Structures',
    tools: [
      { id: 'buildings', label: 'Buildings', icon: Building2 },
      { id: 'barns', label: 'Barns', icon: Warehouse },
      { id: 'dwellings', label: 'Dwellings', icon: Home },
      { id: 'tanks', label: 'Tanks', icon: Box },
      { id: 'wells', label: 'Wells', icon: Droplets },
    ],
  },
  {
    id: 'production-systems',
    label: 'Production Systems',
    tools: [
      { id: 'crops', label: 'Crop areas', icon: Sprout },
      { id: 'orchards', label: 'Orchards', icon: TreeDeciduous },
      { id: 'paddocks', label: 'Paddocks', icon: Beef },
      { id: 'beds', label: 'Garden beds', icon: LayoutGrid },
      { id: 'compost', label: 'Compost', icon: Recycle },
    ],
  },
];
