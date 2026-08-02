$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$files = [System.Collections.Generic.List[System.IO.FileInfo]]::new()

$directoryScopes = @(
    "contracts",
    "frontend\src",
    "frontend\e2e",
    "frontend\public",
    "scripts",
    "tests"
)

foreach ($scope in $directoryScopes) {
    $scopePath = Join-Path $projectRoot $scope
    Get-ChildItem -LiteralPath $scopePath -Recurse -File |
        Where-Object {
            $_.FullName -notmatch "[\\/](node_modules|dist|test-results|playwright-report|__pycache__)[\\/]" -and
            $_.Extension -ne ".pyc"
        } |
        ForEach-Object { $files.Add($_) }
}

$rootFiles = @(
    ".gitignore",
    "LICENSE",
    "README.md",
    "gltest.config.yaml",
    "frontend\.env.example",
    "frontend\.eslintrc.cjs",
    "frontend\index.html",
    "frontend\package.json",
    "frontend\package-lock.json",
    "frontend\playwright.config.ts",
    "frontend\tsconfig.json",
    "frontend\tsconfig.node.json",
    "frontend\vercel.json",
    "frontend\vite.config.ts"
)

foreach ($relativePath in $rootFiles) {
    $fullPath = Join-Path $projectRoot $relativePath
    if (Test-Path -LiteralPath $fullPath) {
        $files.Add((Get-Item -LiteralPath $fullPath))
    }
}

$hasher = [System.Security.Cryptography.IncrementalHash]::CreateHash(
    [System.Security.Cryptography.HashAlgorithmName]::SHA256
)
$utf8 = [System.Text.UTF8Encoding]::new($false)

$orderedFiles = $files |
    Sort-Object {
        $_.FullName.Substring($projectRoot.Length).TrimStart("\", "/").Replace("\", "/")
    } -Unique

foreach ($file in $orderedFiles) {
    $relativePath = $file.FullName.Substring($projectRoot.Length).TrimStart("\", "/").Replace("\", "/")
    $hasher.AppendData($utf8.GetBytes($relativePath + "`n"))
    $hasher.AppendData([System.IO.File]::ReadAllBytes($file.FullName))
    $hasher.AppendData([byte[]](0))
}

$digest = -join ($hasher.GetHashAndReset() | ForEach-Object { $_.ToString("x2") })
Write-Output $digest
