# Stop and remove the Prelegal container on Windows.
docker container inspect prelegal *> $null

if ($LASTEXITCODE -eq 0) {
    docker rm -f prelegal | Out-Null
    Write-Host "Prelegal stopped"
} else {
    Write-Host "Prelegal is not running"
}
