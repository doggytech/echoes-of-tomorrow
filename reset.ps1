$ErrorActionPreference = "Stop"

Write-Host "Resetting Echoes of Tomorrow..."
Write-Host "This will stop containers and remove all saves + AI models."
Write-Host ""

$confirm = Read-Host "Are you sure? (y/N)"
if ($confirm -match "^[Yy]$") {
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        docker-compose down -v
    } elseif (Get-Command docker -ErrorAction SilentlyContinue) {
        docker compose down -v
    } else {
        Write-Host "Docker not found. Please install Docker first:"
        Write-Host "https://docs.docker.com/get-docker/"
        exit 1
    }

    Write-Host ""
    Write-Host "Reset complete!"
    Write-Host "Run .\start.ps1 to start fresh."
} else {
    Write-Host "Cancelled."
}
