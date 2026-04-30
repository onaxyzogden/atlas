// Re-export wheelHoverStore from @ogden/ui-components to maintain singleton instance
// across the package boundary. This ensures hover state sync between the wheel component
// and any other consumers (e.g., LevelNavigator in future integrations).
export { useWheelHoverStore as default } from '@ogden/ui-components';
export { useWheelHoverStore } from '@ogden/ui-components';
