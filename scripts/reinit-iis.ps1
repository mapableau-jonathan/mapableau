# PowerShell script to reinitialize MapAble on IIS
# Run this script as Administrator
# This script will:
# 1. Stop existing Next.js processes
# 2. Clean build artifacts
# 3. Rebuild the application
# 4. Reconfigure IIS
# 5. Start Next.js server

param(
    [switch]$SkipBuild = $false,
    [switch]$SkipIISConfig = $false,
    [string]$IISPath = "C:\inetpub\mapableau",
    [int]$NextJSPort = 3000
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MapAble IIS Reinitialization" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get project root directory
$projectPath = Split-Path -Parent $PSScriptRoot
Set-Location $projectPath
Write-Host "Project path: $projectPath" -ForegroundColor Gray

# ============================================
# Phase 1: Prerequisites Check
# ============================================
Write-Host "`n[Phase 1/6] Checking Prerequisites..." -ForegroundColor Yellow

# Check Node.js
Write-Host "  Checking Node.js..." -ForegroundColor Cyan
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "  ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "  Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "  ✓ Node.js version: $nodeVersion" -ForegroundColor Green

# Check pnpm
Write-Host "  Checking pnpm..." -ForegroundColor Cyan
$pnpmVersion = pnpm --version 2>$null
if (-not $pnpmVersion) {
    Write-Host "  Installing pnpm..." -ForegroundColor Yellow
    npm install -g pnpm
    $pnpmVersion = pnpm --version
}
Write-Host "  ✓ pnpm version: $pnpmVersion" -ForegroundColor Green

# Check IIS
Write-Host "  Checking IIS..." -ForegroundColor Cyan
$iisStatus = Get-Service -Name W3SVC -ErrorAction SilentlyContinue
if (-not $iisStatus) {
    Write-Host "  WARNING: IIS (W3SVC) service not found" -ForegroundColor Yellow
    Write-Host "  IIS may not be installed. Continuing anyway..." -ForegroundColor Yellow
} else {
    Write-Host "  ✓ IIS service found" -ForegroundColor Green
}

# ============================================
# Phase 2: Cleanup - Stop Existing Services
# ============================================
Write-Host "`n[Phase 2/6] Cleaning Up Existing Services..." -ForegroundColor Yellow

# Stop processes on port 3000
Write-Host "  Stopping processes on port $NextJSPort..." -ForegroundColor Cyan
$connections = Get-NetTCPConnection -LocalPort $NextJSPort -ErrorAction SilentlyContinue
if ($connections) {
    foreach ($conn in $connections) {
        $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "    Stopping process: $($process.Name) (PID: $($process.Id))" -ForegroundColor Gray
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep -Seconds 2
    Write-Host "  ✓ Stopped processes on port $NextJSPort" -ForegroundColor Green
} else {
    Write-Host "  ✓ Port $NextJSPort is free" -ForegroundColor Green
}

# Stop any PowerShell jobs running Next.js
Write-Host "  Stopping background jobs..." -ForegroundColor Cyan
$jobs = Get-Job -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Running" }
if ($jobs) {
    $jobs | Stop-Job
    $jobs | Remove-Job
    Write-Host "  ✓ Stopped background jobs" -ForegroundColor Green
} else {
    Write-Host "  ✓ No background jobs found" -ForegroundColor Green
}

# Clean build artifacts
Write-Host "  Cleaning build artifacts..." -ForegroundColor Cyan
$nextDir = Join-Path $projectPath ".next"
if (Test-Path $nextDir) {
    Remove-Item -Path $nextDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Removed .next directory" -ForegroundColor Green
} else {
    Write-Host "  ✓ No .next directory to clean" -ForegroundColor Green
}

$cacheDir = Join-Path $projectPath "node_modules\.cache"
if (Test-Path $cacheDir) {
    Remove-Item -Path $cacheDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✓ Removed cache directory" -ForegroundColor Green
}

# ============================================
# Phase 3: Environment Setup
# ============================================
Write-Host "`n[Phase 3/6] Setting Up Environment..." -ForegroundColor Yellow

# Check for .env.local
$envLocalPath = Join-Path $projectPath ".env.local"
$envExamplePath = Join-Path $projectPath ".env.example"

if (-not (Test-Path $envLocalPath)) {
    Write-Host "  .env.local not found. Creating from .env.example..." -ForegroundColor Yellow
    if (Test-Path $envExamplePath) {
        Copy-Item $envExamplePath $envLocalPath
        Write-Host "  ✓ Created .env.local from .env.example" -ForegroundColor Green
        Write-Host "  ⚠ IMPORTANT: Edit .env.local with your actual values!" -ForegroundColor Yellow
    } else {
        Write-Host "  WARNING: .env.example not found. Creating minimal .env.local..." -ForegroundColor Yellow
        $minimalEnv = @"
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/mapableau?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost"
NEXTAUTH_SECRET=""
"@
        $minimalEnv | Out-File -FilePath $envLocalPath -Encoding UTF8
        Write-Host "  ✓ Created minimal .env.local" -ForegroundColor Green
    }
} else {
    Write-Host "  ✓ .env.local exists" -ForegroundColor Green
}

# Generate NEXTAUTH_SECRET if missing
$envContent = Get-Content $envLocalPath -Raw
if ($envContent -notmatch "NEXTAUTH_SECRET\s*=" -or $envContent -match "NEXTAUTH_SECRET\s*=\s*""") {
    Write-Host "  Generating NEXTAUTH_SECRET..." -ForegroundColor Cyan
    $secret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
    
    if ($envContent -match "NEXTAUTH_SECRET\s*=") {
        $envContent = $envContent -replace "NEXTAUTH_SECRET\s*=.*", "NEXTAUTH_SECRET=`"$secret`""
    } else {
        $envContent += "`nNEXTAUTH_SECRET=`"$secret`""
    }
    
    $envContent | Out-File -FilePath $envLocalPath -Encoding UTF8 -NoNewline
    Write-Host "  ✓ Generated and added NEXTAUTH_SECRET" -ForegroundColor Green
}

# Update NEXTAUTH_URL for IIS if needed
if ($envContent -match "NEXTAUTH_URL\s*=\s*""http://localhost:3000""") {
    Write-Host "  Updating NEXTAUTH_URL for IIS..." -ForegroundColor Cyan
    $envContent = $envContent -replace "NEXTAUTH_URL\s*=\s*""http://localhost:3000""", "NEXTAUTH_URL=`"http://localhost`""
    $envContent | Out-File -FilePath $envLocalPath -Encoding UTF8 -NoNewline
    Write-Host "  ✓ Updated NEXTAUTH_URL to http://localhost" -ForegroundColor Green
}

# ============================================
# Phase 4: Build Application
# ============================================
if (-not $SkipBuild) {
    Write-Host "`n[Phase 4/6] Building Application..." -ForegroundColor Yellow
    
    # Install dependencies
    Write-Host "  Installing dependencies..." -ForegroundColor Cyan
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: pnpm install failed!" -ForegroundColor Red
        exit 1
    }
    Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
    
    # Build application
    Write-Host "  Building application..." -ForegroundColor Cyan
    $env:SKIP_ENV_VALIDATION = "true"
    $env:NODE_ENV = "production"
    pnpm build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Build failed!" -ForegroundColor Red
        Write-Host "  Try running: pnpm type-check" -ForegroundColor Yellow
        Write-Host "  Or: pnpm lint" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "  ✓ Build completed successfully" -ForegroundColor Green
} else {
    Write-Host "`n[Phase 4/6] Skipping Build (--SkipBuild flag)" -ForegroundColor Yellow
}

# ============================================
# Phase 5: IIS Configuration
# ============================================
if (-not $SkipIISConfig) {
    Write-Host "`n[Phase 5/6] Configuring IIS..." -ForegroundColor Yellow
    
    # Create IIS directory
    Write-Host "  Creating IIS directory: $IISPath" -ForegroundColor Cyan
    if (-not (Test-Path $IISPath)) {
        New-Item -ItemType Directory -Path $IISPath -Force | Out-Null
        Write-Host "  ✓ Created IIS directory" -ForegroundColor Green
    } else {
        Write-Host "  ✓ IIS directory exists" -ForegroundColor Green
    }
    
    # Create web.config
    Write-Host "  Creating web.config..." -ForegroundColor Cyan
    $webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <rule name="ReverseProxyToNext" stopProcessing="true">
          <match url="(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:$NextJSPort/{R:1}" />
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
    
    $webConfigPath = Join-Path $IISPath "web.config"
    $webConfig | Out-File -FilePath $webConfigPath -Encoding UTF8
    Write-Host "  ✓ Created web.config at: $webConfigPath" -ForegroundColor Green
    
    # Restart IIS
    Write-Host "  Restarting IIS..." -ForegroundColor Cyan
    try {
        iisreset /noforce
        Write-Host "  ✓ IIS restarted" -ForegroundColor Green
    } catch {
        Write-Host "  WARNING: Could not restart IIS. You may need to run as Administrator." -ForegroundColor Yellow
        Write-Host "  Manual step: Run 'iisreset' as Administrator" -ForegroundColor Yellow
    }
    
    Write-Host "`n  ⚠ MANUAL STEPS REQUIRED:" -ForegroundColor Yellow
    Write-Host "  1. Open IIS Manager" -ForegroundColor White
    Write-Host "  2. Set Default Web Site physical path to: $IISPath" -ForegroundColor White
    Write-Host "  3. Ensure binding is set to port 80" -ForegroundColor White
    Write-Host "  4. Enable ARR Proxy:" -ForegroundColor White
    Write-Host "     - Click server name (top level)" -ForegroundColor Gray
    Write-Host "     - Application Request Routing → Server Proxy Settings" -ForegroundColor Gray
    Write-Host "     - Check 'Enable Proxy'" -ForegroundColor Gray
    Write-Host "     - Click Apply" -ForegroundColor Gray
} else {
    Write-Host "`n[Phase 5/6] Skipping IIS Configuration (--SkipIISConfig flag)" -ForegroundColor Yellow
}

# ============================================
# Phase 6: Start Next.js Server
# ============================================
Write-Host "`n[Phase 6/6] Starting Next.js Server..." -ForegroundColor Yellow

# Set environment variables
$env:PORT = "$NextJSPort"
$env:NODE_ENV = "production"
$env:NEXTAUTH_URL = "http://localhost"

# Start Next.js in background job
Write-Host "  Starting Next.js server on port $NextJSPort..." -ForegroundColor Cyan
$job = Start-Job -ScriptBlock {
    param($projectPath, $port, $nextAuthUrl)
    Set-Location $projectPath
    $env:PORT = $port
    $env:NODE_ENV = "production"
    $env:NEXTAUTH_URL = $nextAuthUrl
    pnpm start
} -ArgumentList $projectPath, $NextJSPort, "http://localhost"

# Wait for server to start
Write-Host "  Waiting for server to start..." -ForegroundColor Cyan
$maxWait = 30
$waited = 0
$serverReady = $false

while ($waited -lt $maxWait -and -not $serverReady) {
    Start-Sleep -Seconds 2
    $waited += 2
    $testConnection = Test-NetConnection -ComputerName localhost -Port $NextJSPort -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
    if ($testConnection.TcpTestSucceeded) {
        $serverReady = $true
        break
    }
}

if ($serverReady) {
    Write-Host "  ✓ Next.js server is running on http://localhost:$NextJSPort" -ForegroundColor Green
} else {
    Write-Host "  ⚠ WARNING: Could not verify server on port $NextJSPort" -ForegroundColor Yellow
    Write-Host "  Check job output: Receive-Job -Id $($job.Id)" -ForegroundColor Yellow
    Write-Host "  Job ID: $($job.Id)" -ForegroundColor Gray
}

# ============================================
# Summary
# ============================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Reinitialization Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next.js Server:" -ForegroundColor Cyan
Write-Host "  Direct: http://localhost:$NextJSPort" -ForegroundColor White
Write-Host "  Through IIS: http://localhost/" -ForegroundColor White
Write-Host ""
Write-Host "Job Management:" -ForegroundColor Cyan
Write-Host "  View logs: Receive-Job -Id $($job.Id)" -ForegroundColor White
Write-Host "  Stop server: Stop-Job -Id $($job.Id); Remove-Job -Id $($job.Id)" -ForegroundColor White
Write-Host ""
Write-Host "IIS Configuration:" -ForegroundColor Cyan
Write-Host "  Physical Path: $IISPath" -ForegroundColor White
Write-Host "  web.config: $webConfigPath" -ForegroundColor White
Write-Host ""
if (-not $SkipIISConfig) {
    Write-Host "⚠ Remember to complete manual IIS steps above!" -ForegroundColor Yellow
}
Write-Host ""
