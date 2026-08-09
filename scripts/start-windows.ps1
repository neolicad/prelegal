# Build and run the Prelegal container on Windows.
$ErrorActionPreference = "Stop"

Set-Location (Join-Path $PSScriptRoot "..")

docker build -t prelegal .
docker rm -f prelegal 2>$null | Out-Null

$envArgs = @()
if (Test-Path ".env") {
    $envArgs = @("--env-file", ".env")
}

docker run -d --name prelegal -p 8000:8000 @envArgs prelegal

Write-Host "Prelegal is running at http://localhost:8000"
