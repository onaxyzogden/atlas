# SoilGrids v2.0 raster data

Clipped COGs for the map-side soil-properties overlay. Source: ISRIC SoilGrids v2.0 — CC BY 4.0.

## Layout

```
apps/api/data/soilgrids/
├── soilgrids-manifest.json   # checked into git (describes available rasters)
└── cog/                      # NOT in git (large binary files)
    ├── bedrock_depth.tif
    ├── ph_0_30cm.tif
    ├── organic_carbon_0_30cm.tif
    ├── clay_0_30cm.tif
    └── sand_0_30cm.tif
```

The API auto-detects the manifest at boot. If it's missing (or `cog/` is empty), the SoilGrids service logs `disabled` and `/api/v1/soilgrids/*` responds with 404.

## One-time ingest

Download the five global 250 m COGs from ISRIC's public S3, clip to the US + Canada bounding box, then re-COG:

```bash
# Example for BDRICM (depth to bedrock, cm):
gdal_translate \
  -projwin -168 72 -52 24 \
  -co COMPRESS=DEFLATE -co TILED=YES -co COPY_SRC_OVERVIEWS=YES \
  /vsicurl/https://files.isric.org/soilgrids/latest/data/BDRICM/BDRICM_M_250m_ll.tif \
  bedrock_depth.tif
```

Repeat for `phh2o_0-30cm_mean`, `soc_0-30cm_mean`, `clay_0-30cm_mean`, `sand_0-30cm_mean`. Then update `soilgrids-manifest.json` if filenames or ranges differ from the committed scaffold.

## Manifest schema

See `SoilManifestEntry` in `apps/api/src/services/soilgrids/SoilGridsRasterService.ts`.
