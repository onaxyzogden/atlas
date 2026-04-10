declare module 'shapefile' {
  interface Source {
    read(): Promise<{ done: boolean; value?: GeoJSON.Feature }>;
  }
  function open(shp: ArrayBuffer | string, dbf?: ArrayBuffer | string): Promise<Source>;
}
