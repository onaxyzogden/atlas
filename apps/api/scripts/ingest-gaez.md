# GAEZ v4 Ingest — Operator Guide

This document describes the one-time manual process to download FAO GAEZ v4
raster data and convert it into Cloud Optimized GeoTIFFs (COGs) suitable for
byte-range reads by the Atlas API.

GAEZ v4 does **not** expose a public REST endpoint. The portal requires
click-through acceptance of the **CC BY-NC-SA 3.0 IGO** license. Atlas cannot
automate this step — you must download the rasters manually.

---

## 1. Prerequisites

- A working **GDAL** installation (`gdal_translate` on `PATH`). On Windows,
  install via OSGeo4W, or use the QGIS bundle's OSGeo4W Shell.
- Roughly **6 GB** of free disk for the raw download + COG output.
- An internet connection — individual GAEZ rasters are 50–200 MB each.

Verify GDAL:

```powershell
gdal_translate --version
# Expected: GDAL 3.x.x, released YYYY/MM/DD
```

---

## 2. What to Download (Curated Subset)

Atlas ingests **Theme 4 — Suitability and Attainable Yield**,
current-climate baseline (1981–2010), at **5 arc-minute (~9 km)** resolution.

For each of the 12 priority crops below, download **4 variants**:

- `rainfed_low` — Rain-fed, low input / subsistence
- `rainfed_high` — Rain-fed, high input
- `irrigated_low` — Irrigated, low input
- `irrigated_high` — Irrigated, high input

**Priority crops (12):**

1. Wheat
2. Maize
3. Rice (wetland)
4. Soybean
5. Potato
6. Cassava
7. Sorghum
8. Pearl millet
9. Barley
10. Oat
11. Rye
12. Sweet potato

Total files: **12 crops × 4 mgmt × 2 variables (suitability-class + attainable-yield) = 96 rasters**.

### Portal Navigation

1. Go to [gaez.fao.org/Gaez4/download](https://gaez.fao.org/Gaez4/download)
2. Accept the license terms
3. Filter:
   - **Theme** → `Theme 4: Suitability and Attainable Yield`
   - **Time period** → `Historical (1981-2010)`
   - **Climate** → `Baseline`
   - **Crop** → (one of the 12 above)
   - **Water supply** → `Rain-fed` or `Irrigation`
   - **Input level** → `Low` or `High`
4. Download both variables for the selected filters:
   - `Suitability class` (categorical, 1–9 scale)
   - `Average attainable yield of current cropland` (kg/ha/yr)

### Naming Convention

Save downloaded files into `apps/api/data/gaez/raw/` using **this exact naming
scheme** so the conversion script can parse them:

```
{crop}_{waterSupply}_{inputLevel}_{variable}.tif
```

Examples:

```
wheat_rainfed_low_suitability.tif
wheat_rainfed_low_yield.tif
wheat_rainfed_high_suitability.tif
wheat_rainfed_high_yield.tif
wheat_irrigated_low_suitability.tif
...
maize_rainfed_low_suitability.tif
...
```

Valid values:

| Field | Values |
|---|---|
| `crop` | `wheat`, `maize`, `rice`, `soybean`, `potato`, `cassava`, `sorghum`, `millet`, `barley`, `oat`, `rye`, `sweet_potato` |
| `waterSupply` | `rainfed`, `irrigated` |
| `inputLevel` | `low`, `high` |
| `variable` | `suitability`, `yield` |

---

## 3. Convert to COG

Once `apps/api/data/gaez/raw/` contains the renamed rasters, run:

```powershell
# From the repo root
pnpm --filter @ogden/api run ingest:gaez
```

Or invoke directly:

```powershell
cd apps/api
pnpm tsx scripts/convert-gaez-to-cog.ts
```

The script:

1. Scans `data/gaez/raw/` for `.tif` files matching the naming scheme
2. Runs `gdal_translate -of COG -co COMPRESS=DEFLATE -co PREDICTOR=2 ...`
   on each, writing output to `data/gaez/cog/`
3. Emits `data/gaez/cog/gaez-manifest.json` with the full catalog

Expected runtime: **5–15 minutes** for 96 rasters depending on CPU.

---

## 4. Verify

After conversion, confirm:

```powershell
# COG validity check (optional, requires rio-cogeo)
python -m rio_cogeo validate apps/api/data/gaez/cog/wheat_rainfed_high_yield.tif

# File count
Get-ChildItem apps/api/data/gaez/cog/*.tif | Measure-Object
# Expected: 96 files
```

Start the API:

```powershell
pnpm --filter @ogden/api dev
```

Test a point query (Iowa cropland):

```powershell
curl "http://localhost:3001/api/v1/gaez/query?lat=42.0&lng=-93.5"
```

Expected response shape:

```json
{
  "data": {
    "fetch_status": "complete",
    "confidence": "medium",
    "source_api": "FAO GAEZ v4 (self-hosted)",
    "attribution": "FAO GAEZ v4 — CC BY-NC-SA 3.0 IGO",
    "summary": {
      "best_crop": "maize",
      "primary_suitability_class": "S1",
      "attainable_yield_kg_ha_best": 9200,
      "top_3_crops": [...],
      "crop_suitabilities": [...]
    }
  },
  "error": null
}
```

---

## 5. Production Deployment (S3)

For production, upload the COG directory to S3:

```powershell
aws s3 sync apps/api/data/gaez/cog/ s3://ogden-atlas-geodata/gaez/v4/
```

Set env var:

```
GAEZ_S3_PREFIX=s3://ogden-atlas-geodata/gaez/v4/
```

The API transparently switches to S3 signed-URL byte-range reads. Local FS
reads are used when `GAEZ_S3_PREFIX` is unset.

---

## 6. License & Attribution

**Required attribution** (already baked into the API response):

> FAO GAEZ v4 — CC BY-NC-SA 3.0 IGO

Full license: https://creativecommons.org/licenses/by-nc-sa/3.0/igo/

> ⚠️ **Non-Commercial clause:** the `NC` in `CC BY-NC-SA 3.0 IGO` restricts
> commercial use. Atlas's deployment posture (pre-launch, research/planning
> tool) is currently compatible with this license. **Legal review required
> before any commercial deployment.** See
> `wiki/decisions/2026-04-20-gaez-self-hosting.md` for the deferred review.

---

## 7. Expanding the Subset Later

To add more crops or climate scenarios:

1. Download additional rasters following the naming scheme in §2
2. Re-run `convert-gaez-to-cog.ts` (idempotent — skips existing COGs)
3. The manifest regenerates automatically
4. No API code changes required — the service reads manifest dynamically
