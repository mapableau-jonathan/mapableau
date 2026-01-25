# PowerShell script to start MapAble on IIS
# Run this script as Administrator

Write-Host "Starting MapAble on IIS..." -ForegroundColor Green

# Step 1: Check if Node.js is installed
Write-Host "`n[1/5] Checking Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js version: $nodeVersion" -ForegroundColor Green

# Step 2: Check if pnpm is installed
Write-Host "`n[2/5] Checking pnpm..." -ForegroundColor Yellow
$pnpmVersion = pnpm --version 2>$null
if (-not $pnpmVersion) {
    Write-Host "Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
}
Write-Host "pnpm version: $pnpmVersion" -ForegroundColor Green

# Step 3: Install dependencies and build
Write-Host "`n[3/5] Installing dependencies and building..." -ForegroundColor Yellow
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

# Check for .env.local
if (-not (Test-Path ".env.local")) {
    Write-Host "WARNING: .env.local not found. Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.local"
        Write-Host "Please edit .env.local with your actual values!" -ForegroundColor Yellow
    }
}

# Install dependencies
Write-Host "Running pnpm install..." -ForegroundColor Cyan
pnpm install

# Build the project
Write-Host "Building project..." -ForegroundColor Cyan
$env:SKIP_ENV_VALIDATION = "true"
pnpm build

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}

# Step 4: Start Next.js on port 3000
Write-Host "`n[4/5] Starting Next.js server on port 3000..." -ForegroundColor Yellow

# Check if port 3000 is already in use
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "Port 3000 is already in use. Stopping existing process..." -ForegroundColor Yellow
    $process = Get-Process -Id $port3000.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $process.Id -Force
        Start-Sleep -Seconds 2
    }
}

# Set environment variables
$env:PORT = "3000"
$env:NODE_ENV = "production"
$env:NEXTAUTH_URL = "http://localhost"

# Start Next.js in background
Write-Host "Starting Next.js server..." -ForegroundColor Cyan
$job = Start-Job -ScriptBlock {
    Set-Location $using:projectPath
    $env:PORT = "3000"
    $env:NODE_ENV = "production"
    $env:NEXTAUTH_URL = "http://localhost"
    pnpm start
}

Start-Sleep -Seconds 5

# Check if server started
$testConnection = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue
if ($testConnection.TcpTestSucceeded) {
    Write-Host "Next.js server is running on http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "WARNING: Could not verify server on port 3000" -ForegroundColor Yellow
    Write-Host "Check the job output: Receive-Job -Id $($job.Id)" -ForegroundColor Yellow
}

# Step 5: Configure IIS
Write-Host "`n[5/5] Configuring IIS..." -ForegroundColor Yellow

# Create IIS directory
$iisPath = "C:\inetpub\mapableau"
if (-not (Test-Path $iisPath)) {
    New-Item -ItemType Directory -Path $iisPath -Force | Out-Null
    Write-Host "Created IIS directory: $iisPath" -ForegroundColor Green
}

# Create web.config
$webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyToNext" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:3000/{R:1}" />
        </rule>
      </rules>
    </rewrite>
    <httpProtocol>
      <customHeaders>
        <add name="X-Forwarded-Proto" value="http" />
        <add name="X-Forwarded-Host" value="localhost" />
      </customHeaders>
    </httpProtocol>
  </system.webServer>
</configuration>
"@

$webConfigPath = Join-Path $iisPath "web.config"
$webConfig | Out-File -FilePath $webConfigPath -Encoding UTF8
Write-Host "Created web.config at: $webConfigPath" -ForegroundColor Green

Write-Host "`n=== Setup Complete ===" -ForegroundColor Green
Write-Host "Next.js is running on: http://localhost:3000" -ForegroundColor Cyan
Write-Host "IIS should proxy: http://localhost/ -> http://localhost:3000" -ForegroundColor Cyan
Write-Host "`nIMPORTANT: You need to:" -ForegroundColor Yellow
Write-Host "1. Open IIS Manager" -ForegroundColor White
Write-Host "2. Set Default Web Site (or your site) physical path to: $iisPath" -ForegroundColor White
Write-Host "3. Ensure binding is set to port 80" -ForegroundColor White
Write-Host "4. Enable ARR Proxy (Server -> Application Request Routing -> Server Proxy Settings -> Enable Proxy)" -ForegroundColor White
Write-Host "`nTo view Next.js logs: Receive-Job -Id $($job.Id)" -ForegroundColor Cyan
Write-Host "To stop Next.js: Stop-Job -Id $($job.Id); Remove-Job -Id $($job.Id)" -ForegroundColor Cyan
