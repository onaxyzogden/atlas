<#
    gaez-ingest-preflight.ps1 -- Operator preflight for the GAEZ v4 ingest pipeline.

    Verifies everything the ingest pipeline needs BEFORE you waste time on
    downloads + GDAL compute:

      1. GDAL is installed and on PATH
      2. data/gaez/raw/ + data/gaez/cog/ exist
      3. Any files already present in raw/ match the expected naming scheme
         (crop x waterSupply x inputLevel x variable) -- bad names are the #1
         ingest failure mode
      4. Prints a checklist of the 96 exact filenames the API expects so you
         can tick them off against the FAO portal download queue

    Usage (from repo root):
      pwsh apps/api/scripts/gaez-ingest-preflight.ps1

    Exit codes:
      0 -- ready to run `pnpm --filter @ogden/api run ingest:gaez`
      1 -- blockers present (GDAL missing, directories uncreatable, bad names)
#>

[CmdletBinding()]
param(
    [switch]$CreateDirs,
    [switch]$PrintChecklist
)

$ErrorActionPreference = 'Stop'
$script:HasError = $false

function Write-OK($msg)   { Write-Host "  [OK]    $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  [WARN]  $msg" -ForegroundColor Yellow }
function Write-Fail($msg) { Write-Host "  [FAIL]  $msg" -ForegroundColor Red; $script:HasError = $true }
function Write-Info($msg) { Write-Host "  [INFO]  $msg" -ForegroundColor Cyan }

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..' | Join-Path -ChildPath '..' | Join-Path -ChildPath '..')
$apiRoot  = Join-Path $repoRoot 'apps\api'
$rawDir   = Join-Path $apiRoot 'data\gaez\raw'
$cogDir   = Join-Path $apiRoot 'data\gaez\cog'

Write-Host ""
Write-Host "GAEZ v4 Ingest -- Preflight" -ForegroundColor White
Write-Host "==========================="
Write-Host "Repo root: $repoRoot"
Write-Host "Raw dir:   $rawDir"
Write-Host "COG dir:   $cogDir"
Write-Host ""

# --- 1. GDAL ---------------------------------------------------------------
Write-Host "[1/4] GDAL install"

# 1a. Fast path: gdal_translate already on PATH
$gdal = Get-Command gdal_translate -ErrorAction SilentlyContinue
if ($gdal) {
    $verOut = & gdal_translate --version 2>&1
    Write-OK "gdal_translate found on PATH: $verOut"
} else {
    # 1b. Slow path: scan standard OSGeo4W / QGIS install locations. OSGeo4W's
    # per-user installer drops into %LOCALAPPDATA%\Programs\OSGeo4W without
    # touching PATH, so "installed" + "discoverable" are not the same thing.
    $candidates = @(
        'C:\OSGeo4W\bin\gdal_translate.exe',
        'C:\OSGeo4W64\bin\gdal_translate.exe',
        'C:\Program Files\OSGeo4W\bin\gdal_translate.exe',
        'C:\Program Files (x86)\OSGeo4W\bin\gdal_translate.exe',
        (Join-Path $env:LOCALAPPDATA 'Programs\OSGeo4W\bin\gdal_translate.exe'),
        (Join-Path $env:LOCALAPPDATA 'Programs\OSGeo4W64\bin\gdal_translate.exe')
    )
    # Also check the registry for OSGeo4W install locations (catches custom paths)
    $regKeys = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall'
    )
    foreach ($key in $regKeys) {
        if (-not (Test-Path $key)) { continue }
        Get-ChildItem $key -ErrorAction SilentlyContinue | ForEach-Object {
            $props = Get-ItemProperty $_.PSPath -ErrorAction SilentlyContinue
            if ($props.DisplayName -match 'osgeo|gdal' -and $props.InstallLocation) {
                $candidates += (Join-Path $props.InstallLocation 'bin\gdal_translate.exe')
            }
        }
    }
    $found = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1

    if ($found) {
        $verOut = & $found --version 2>&1
        Write-Warn "gdal_translate NOT on PATH, but a GDAL install exists:"
        Write-Info "  $found"
        Write-Info "  $verOut"
        Write-Info "The Node ingest script uses spawnSync('gdal_translate', ...) which needs it"
        Write-Info "on PATH. Fix in either of these ways:"
        Write-Info ""
        $binDir = Split-Path $found -Parent
        Write-Info "  (a) Persist to user PATH (restart shells after):"
        Write-Info ('      $u = [Environment]::GetEnvironmentVariable("PATH","User"); ' +
                    '[Environment]::SetEnvironmentVariable("PATH", "$u;' + $binDir + '", "User")')
        Write-Info ""
        Write-Info "  (b) Set GDAL_BIN env var so convert-gaez-to-cog.ts can find it:"
        Write-Info ('      $env:GDAL_BIN = "' + $binDir + '"')
        # Don't Fail -- operator can set GDAL_BIN and proceed.
    } else {
        Write-Fail "gdal_translate not on PATH and no OSGeo4W/GDAL install detected"
        Write-Info "Install options (Windows):"
        Write-Info "  - OSGeo4W:  https://trac.osgeo.org/osgeo4w/  (recommended)"
        Write-Info "  - QGIS:     https://qgis.org/en/site/forusers/download.html (OSGeo4W Shell)"
        Write-Info "  - Conda:    conda install -c conda-forge gdal"
        Write-Info "After install, open a new shell and confirm: gdal_translate --version"
    }
}

# --- 2. Directories --------------------------------------------------------
Write-Host ""
Write-Host "[2/4] Data directories"
foreach ($dir in @($rawDir, $cogDir)) {
    if (Test-Path $dir) {
        Write-OK "$dir exists"
    } elseif ($CreateDirs) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
        Write-OK "Created $dir"
    } else {
        Write-Warn "$dir missing (re-run with -CreateDirs to create)"
    }
}

# --- 3. Naming-scheme validation on any existing raw files -----------------
Write-Host ""
Write-Host "[3/4] Raw file name validation"

$validCrops        = @('wheat','maize','rice','soybean','potato','cassava','sorghum','millet','barley','oat','rye','sweet_potato')
$validWaterSupply  = @('rainfed','irrigated')
$validInputLevel   = @('low','high')
$validVariable     = @('suitability','yield')

function Test-GaezName($bareName) {
    $n = $bareName.ToLower()
    $matchedVar = $null
    foreach ($v in $validVariable) { if ($n.EndsWith("_$v")) { $matchedVar = $v; break } }
    if (-not $matchedVar) { return $null }
    $head = $n.Substring(0, $n.Length - $matchedVar.Length - 1)

    $matchedLvl = $null
    foreach ($l in $validInputLevel) { if ($head.EndsWith("_$l")) { $matchedLvl = $l; break } }
    if (-not $matchedLvl) { return $null }
    $head2 = $head.Substring(0, $head.Length - $matchedLvl.Length - 1)

    $matchedWs = $null
    foreach ($w in $validWaterSupply) { if ($head2.EndsWith("_$w")) { $matchedWs = $w; break } }
    if (-not $matchedWs) { return $null }
    $cropStr = $head2.Substring(0, $head2.Length - $matchedWs.Length - 1)

    if ($validCrops -notcontains $cropStr) { return $null }
    return @{ crop=$cropStr; waterSupply=$matchedWs; inputLevel=$matchedLvl; variable=$matchedVar }
}

if (Test-Path $rawDir) {
    $rawFiles = Get-ChildItem -Path $rawDir -Filter *.tif -ErrorAction SilentlyContinue
    if ($rawFiles.Count -eq 0) {
        Write-Warn "0 .tif files in raw/ -- download from https://gaez.fao.org/Gaez4/download per ingest-gaez.md section 2"
    } else {
        $good = 0; $bad = @()
        foreach ($f in $rawFiles) {
            $bare = [System.IO.Path]::GetFileNameWithoutExtension($f.Name)
            if (Test-GaezName $bare) { $good++ } else { $bad += $f.Name }
        }
        Write-OK "$good / $($rawFiles.Count) raw file(s) match the naming scheme"
        if ($bad.Count -gt 0) {
            Write-Fail "$($bad.Count) file(s) will be SKIPPED by convert-gaez-to-cog.ts:"
            foreach ($b in $bad) { Write-Host "           - $b" -ForegroundColor Red }
            Write-Info "Expected pattern: {crop}_{waterSupply}_{inputLevel}_{variable}.tif"
            Write-Info "  crop:         $($validCrops -join ', ')"
            Write-Info "  waterSupply:  $($validWaterSupply -join ', ')"
            Write-Info "  inputLevel:   $($validInputLevel -join ', ')"
            Write-Info "  variable:     $($validVariable -join ', ')"
        }
    }
} else {
    Write-Warn "raw/ not found -- skipping name validation"
}

# --- 4. Expected-filename checklist (96 total) -----------------------------
Write-Host ""
Write-Host "[4/4] Download checklist (96 files)"
$expected = @()
foreach ($c in $validCrops) {
    foreach ($w in $validWaterSupply) {
        foreach ($l in $validInputLevel) {
            foreach ($v in $validVariable) {
                $expected += "${c}_${w}_${l}_${v}.tif"
            }
        }
    }
}

if (Test-Path $rawDir) {
    $present = Get-ChildItem -Path $rawDir -Filter *.tif -ErrorAction SilentlyContinue | ForEach-Object { $_.Name.ToLower() }
    $missing = $expected | Where-Object { $present -notcontains $_.ToLower() }
    Write-OK "Expected: $($expected.Count) | Present: $($expected.Count - $missing.Count) | Missing: $($missing.Count)"
    if ($PrintChecklist) {
        Write-Host ""
        Write-Host "Missing files:" -ForegroundColor Yellow
        foreach ($m in $missing) { Write-Host "  [ ] $m" }
    } elseif ($missing.Count -gt 0 -and $missing.Count -le 10) {
        Write-Host ""
        Write-Host "Missing files:" -ForegroundColor Yellow
        foreach ($m in $missing) { Write-Host "  [ ] $m" }
    } elseif ($missing.Count -gt 10) {
        Write-Info "Run with -PrintChecklist to see all $($missing.Count) missing filenames."
    }
} else {
    Write-Info "Expect to download $($expected.Count) files total. Run with -PrintChecklist after creating raw/ to see the full list."
}

Write-Host ""
Write-Host "==========================="
if ($script:HasError) {
    Write-Host "Preflight FAILED. Fix blockers above before running ingest." -ForegroundColor Red
    exit 1
} else {
    Write-Host "Preflight OK. Run:" -ForegroundColor Green
    Write-Host "  pnpm --filter @ogden/api run ingest:gaez" -ForegroundColor White
    exit 0
}
