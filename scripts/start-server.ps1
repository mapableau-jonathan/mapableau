# Start MapAble server with proper configuration
# This script ensures all required environment variables are set

Write-Host "Starting MapAble server..." -ForegroundColor Green

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

# Check if .env.local exists
if (-not (Test-Path ".env.local")) {
    Write-Host "⚠️  .env.local not found. Running fix-env script..." -ForegroundColor Yellow
    .\scripts\fix-env.ps1
}

# Load environment variables from .env.local
if (Test-Path ".env.local") {
    Get-Content ".env.local" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Set defaults if not set
if (-not $env:NEXTAUTH_URL) {
    $env:NEXTAUTH_URL = "http://localhost:3000"
}
if (-not $env:NEXTAUTH_SECRET) {
    $env:NEXTAUTH_SECRET = "dev-secret-key-change-in-production-" + (-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 16 | ForEach-Object {[char]$_}))
}
if (-not $env:SKIP_ENV_VALIDATION) {
    $env:SKIP_ENV_VALIDATION = "true"
}
if (-not $env:PORT) {
    $env:PORT = "3000"
}

Write-Host "`nEnvironment:" -ForegroundColor Cyan
Write-Host "  NEXTAUTH_URL: $env:NEXTAUTH_URL" -ForegroundColor White
Write-Host "  PORT: $env:PORT" -ForegroundColor White
Write-Host "  SKIP_ENV_VALIDATION: $env:SKIP_ENV_VALIDATION" -ForegroundColor White

# Check if build exists
if (-not (Test-Path ".next")) {
    Write-Host "`n⚠️  No build found. Building project..." -ForegroundColor Yellow
    Write-Host "This may take a few minutes..." -ForegroundColor Yellow
    
    $env:SKIP_ENV_VALIDATION = "true"
    pnpm build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Build failed! Check errors above." -ForegroundColor Red
        exit 1
    }
}

# Check if port is available
$portCheck = Get-NetTCPConnection -LocalPort $env:PORT -ErrorAction SilentlyContinue
if ($portCheck) {
    Write-Host "`n⚠️  Port $env:PORT is already in use!" -ForegroundColor Yellow
    $process = Get-Process -Id $portCheck.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "Process using port: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Yellow
        $response = Read-Host "Kill process and continue? (y/n)"
        if ($response -eq "y") {
            Stop-Process -Id $process.Id -Force
            Start-Sleep -Seconds 2
            Write-Host "Process killed." -ForegroundColor Green
        } else {
            Write-Host "Exiting. Please free port $env:PORT or change PORT environment variable." -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host "`n✅ Starting server on http://localhost:$env:PORT" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

# Start the server
pnpm start
