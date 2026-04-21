# GAEZ v4 Single-Raster Smoke Test

End-to-end validation of the GAEZ ingest + query pipeline against **one real
FAO GAEZ v4 raster**, without the 96-file download + ~6 GB disk cost. Catches
bugs that the fully-mocked unit tests cannot: real projection metadata, real
NoData encoding, actual `geotiff.js` byte-range behavior on a real COG.

**Audience:** operator (human). Claude cannot complete this alone -- step 1
requires clicking through the FAO license page, and step 2 requires an active
GDAL install that isn't yet on your machine.

---

## Prereqs

- GDAL installed and on PATH (`gdal_translate --version` works). Install via
  OSGeo4W (Windows), QGIS bundle, or `conda install -c conda-forge gdal`.
- `apps/api/data/gaez/raw/` exists (run `pwsh apps/api/scripts/gaez-ingest-preflight.ps1 -CreateDirs` if not).

---

## Step 1 -- Download the 2 smoke-test rasters

Pick the **maize_rainfed_high** pair (suitability + yield) because the smoke
test asserts a known positive yield at a known-productive point. Iowa
cropland (lat 42, lng -93.5) hits 8-12k kg/ha there in GAEZ v4, so a real
nonzero value is easy to eyeball.

**Primary path (Sprint BY):** the `download-gaez.ts` script resolves both
files via FAO's `res05` ArcGIS Image Service and streams direct S3 `.tif`s
into `data/gaez/raw/`:

```powershell
pnpm --filter @ogden/api run download:gaez -- --filter maize_rainfed_high
```

Expected output:

```
Planned: 2 raster(s) (filter: maize_rainfed_high)
Querying ImageServer for 2 (crop, variable) pair(s)...
Resolved: 2/2 files
[1/2] maize_rainfed_high_suitability.tif OK (0.6 MB in 1.2s)
[2/2] maize_rainfed_high_yield.tif OK (2.6 MB in 1.6s)
```

**Fallback (Data Viewer)** — only if the ImageServer is down:

1. Go to https://gaez.fao.org/ and open the **Data Viewer** (top nav).
2. Accept the **CC BY-NC-SA 3.0 IGO** license terms on first use.
3. Filter: Theme 4 / Historical (1981-2010) / Baseline / Maize / Rain-fed /
   High / `Average attainable yield of current cropland`.
4. Open the **Attribute Table** at the bottom of the map. Each row has a
   `download_url`. Click to download the `.tif`.
5. Rename to exactly `maize_rainfed_high_yield.tif` and drop into
   `apps/api/data/gaez/raw/`.
6. Repeat with Variable: `Suitability class` → save as
   `maize_rainfed_high_suitability.tif`.

---

## Step 2 -- Run ingest

```powershell
pwsh apps/api/scripts/gaez-ingest-preflight.ps1
# Expect: [OK] GDAL found, [OK] 2/2 raw files match naming, Missing: 94 (ok for smoke)

cd apps/api
pnpm tsx scripts/convert-gaez-to-cog.ts
```

Expected output:

```
Found 2 raw raster(s) in ...\data\gaez\raw
Converting maize_rainfed_high_suitability.tif -> COG...
Converting maize_rainfed_high_yield.tif -> COG...

-- Ingest summary --
  Converted:  2
  Reused:     0
  Skipped:    0
  Manifest:   ...\data\gaez\cog\gaez-manifest.json
  Crop keys:  1
```

Verify manifest:

```powershell
Get-Content apps/api/data/gaez/cog/gaez-manifest.json | ConvertFrom-Json | Select-Object -ExpandProperty entries
```

Should show one `maize_rainfed_high` entry with both `suitabilityFile` and
`yieldFile` populated.

---

## Step 3 -- Boot API + query

```powershell
cd apps/api
pnpm run dev
```

Expected log line within the first second:

```
GAEZ v4 raster service enabled (1 crop keys loaded from manifest)
```

(If instead you see `disabled (no manifest ...)`, the service didn't pick up
the manifest -- re-check `GAEZ_DATA_DIR` env var or that the manifest path is
`apps/api/data/gaez/cog/gaez-manifest.json`.)

In another terminal:

```powershell
# Iowa -- should hit real cropland data
Invoke-RestMethod "http://localhost:3001/api/v1/gaez/query?lat=42.0&lng=-93.5" | ConvertTo-Json -Depth 6
```

**Pass criteria:**
- `data.fetch_status` is `"complete"` (not `"unavailable"` or `"failed"`)
- `data.summary.crop_suitabilities` has exactly 1 entry (maize, rainfed_high)
- `data.summary.crop_suitabilities[0].attainable_yield_kg_ha` is a nonzero
  number, plausibly in the 3000-12000 range for Iowa
- `data.summary.crop_suitabilities[0].suitability_class` is one of
  `S1`, `S2`, `S3`, `N`, `NS`, or `WATER` (the mapping in
  `GaezRasterService.classifyCode`)
- `data.attribution` = `"FAO GAEZ v4 -- CC BY-NC-SA 3.0 IGO"`

Also try a water point (should return `WATER`):

```powershell
Invoke-RestMethod "http://localhost:3001/api/v1/gaez/query?lat=40.0&lng=-70.0" | ConvertTo-Json -Depth 6
```

**Pass criteria:**
- `data.summary.crop_suitabilities[0].suitability_class` is `WATER`
- `data.summary.crop_suitabilities[0].attainable_yield_kg_ha` is `null` or `0`

And a polar point (outside GAEZ coverage, should be `NS` or `UNKNOWN`):

```powershell
Invoke-RestMethod "http://localhost:3001/api/v1/gaez/query?lat=85.0&lng=0.0" | ConvertTo-Json -Depth 6
```

---

## Step 4 -- Report back

Copy the JSON output from the Iowa query into the session so Claude can
verify shape + sanity-check values against what the service-level tests
expect. If any of the pass criteria fail, that's real-data drift the mock
tests didn't catch -- file as a follow-up sprint against `GaezRasterService.ts`.

---

## Cleanup (optional)

The smoke-test COGs are left in `data/gaez/cog/` so you can continue
developing against them. To reset to "disabled" state:

```powershell
Remove-Item -Recurse apps/api/data/gaez/cog
Remove-Item -Recurse apps/api/data/gaez/raw
```

Both paths are in `.gitignore`, so nothing committable is affected.
