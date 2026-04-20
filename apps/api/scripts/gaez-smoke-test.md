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

## Step 1 -- Download one raster

Pick a **yield raster** (not suitability) because the smoke test asserts a
known positive yield at a known-productive point. `maize_rainfed_high` is the
standard choice -- Iowa cropland (lat 42, lng -93.5) hits 8-10k kg/ha there
in GAEZ v4, so a real nonzero value is easy to eyeball.

1. Go to https://gaez.fao.org/Gaez4/download
2. Accept the **CC BY-NC-SA 3.0 IGO** license terms
3. Filter:
   - Theme: `Theme 4: Suitability and Attainable Yield`
   - Time period: `Historical (1981-2010)`
   - Climate: `Baseline`
   - Crop: `Maize`
   - Water supply: `Rain-fed`
   - Input level: `High`
   - Variable: `Average attainable yield of current cropland`
4. Download the GeoTIFF
5. Rename it to exactly: `maize_rainfed_high_yield.tif`
6. Drop it into `apps/api/data/gaez/raw/`

Also grab the matching suitability raster so `query()` has both variables to
report (the service treats missing variables as `UNKNOWN` class + `null`
yield -- still works, just a less rich summary):

7. Repeat Step 3 with Variable: `Suitability class`
8. Rename to `maize_rainfed_high_suitability.tif` and drop in `raw/`

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
