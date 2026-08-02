# Reproducible Contract Linter Script
$ErrorActionPreference = "Stop"
$env:PYTHONIOENCODING = "utf-8"

$taskCacheBase = if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA "GenLayer" } else { Join-Path $env:USERPROFILE ".cache" }
$cacheDir = if ($env:GENVMROOT) { $env:GENVMROOT } else { Join-Path $taskCacheBase "genvmroot\retraction-dependency" }
$env:GENVMROOT = $cacheDir

if (-not (Test-Path $cacheDir)) {
    Write-Host "Setting up GenVM linter assets at $cacheDir..."
    genvm-lint setup
}

Write-Host "Running genvm-lint check on contracts\retraction_dependency.py..."
genvm-lint check contracts\retraction_dependency.py
