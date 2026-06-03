$ErrorActionPreference = "Stop"

Write-Host "Stopping Echoes of Tomorrow..."

if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
    docker-compose down
} elseif (Get-Command docker -ErrorAction SilentlyContinue) {
    docker compose down
} else {
    Write-Host "Docker not found. Please install Docker first:"
    Write-Host "https://docs.docker.com/get-docker/"
    exit 1
}

Write-Host ""
Write-Host "Stopped!"
Write-Host ""
Write-Host "To start again: .\start.ps1"
