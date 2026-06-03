$ErrorActionPreference = "Stop"

Write-Host "Echoes of Tomorrow - Containerized Setup"
Write-Host "========================================="
Write-Host ""

function Get-DockerComposeCommand {
    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        return @("docker-compose")
    }

    if (Get-Command docker -ErrorAction SilentlyContinue) {
        return @("docker", "compose")
    }

    return $null
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker not found. Please install Docker first:"
    Write-Host "https://docs.docker.com/get-docker/"
    exit 1
}

$composeCmd = Get-DockerComposeCommand
if (-not $composeCmd) {
    Write-Host "Docker Compose not found. Please install/update Docker:"
    Write-Host "https://docs.docker.com/compose/install/"
    exit 1
}

if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..."
    Copy-Item ".env.example" ".env"
}

New-Item -ItemType Directory -Path "data" -Force | Out-Null

Write-Host "Starting containers..."
if ($composeCmd.Count -eq 1) {
    & $composeCmd[0] up -d
} else {
    & $composeCmd[0] $composeCmd[1] up -d
}

Write-Host ""
Write-Host "Waiting for Ollama to be ready..."
Write-Host "(First run will download ~2GB model - this may take a few minutes)"
Write-Host ""

while ($true) {
    try {
        Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 2 | Out-Null
        break
    } catch {
        Write-Host -NoNewline "."
        Start-Sleep -Seconds 2
    }
}

Write-Host ""
Write-Host ""
Write-Host "Echoes of Tomorrow is ready!"
Write-Host ""
Write-Host "Open your browser: http://localhost:3000"
Write-Host ""
Write-Host "Status:"
Write-Host "  App:    http://localhost:3000"
Write-Host "  Ollama: http://localhost:11434"
Write-Host ""
Write-Host "To stop: .\stop.ps1"
Write-Host "To reset (removes saves): .\reset.ps1"
Write-Host ""

Start-Process "http://localhost:3000" | Out-Null
