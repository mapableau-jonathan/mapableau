# Quick start script for development
# This starts Next.js on port 3000 for testing

Write-Host "Starting MapAble development server..." -ForegroundColor Green

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

# Check for .env.local
if (-not (Test-Path ".env.local")) {
    Write-Host "Creating .env.local from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.local"
        Write-Host "WARNING: Please edit .env.local with your actual values!" -ForegroundColor Red
    }
}

# Set minimum required env vars for testing
$env:NEXTAUTH_URL = "http://localhost:3000"
$env:NEXTAUTH_SECRET = "dev-secret-key-change-in-production"

# Start dev server
Write-Host "Starting Next.js dev server on http://localhost:3000..." -ForegroundColor Cyan
pnpm dev
