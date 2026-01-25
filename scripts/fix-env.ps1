# Fix environment variables for server startup
# This sets minimum required values for development

Write-Host "Fixing environment variables..." -ForegroundColor Green

$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectPath

$envFile = ".env.local"

# Generate a secure random secret
$secret = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})

# Read existing .env.local or create from .env.example
if (-not (Test-Path $envFile)) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" $envFile
        Write-Host "Created $envFile from .env.example" -ForegroundColor Yellow
    } else {
        New-Item -ItemType File -Path $envFile | Out-Null
        Write-Host "Created empty $envFile" -ForegroundColor Yellow
    }
}

# Read current content
$content = Get-Content $envFile -ErrorAction SilentlyContinue

# Update or add required variables
$updates = @{
    "NEXTAUTH_URL" = "http://localhost"
    "NEXTAUTH_SECRET" = $secret
    "DATABASE_URL" = "postgresql://user:password@localhost:5432/mapableau?schema=public"
    "NODE_ENV" = "development"
    "SKIP_ENV_VALIDATION" = "true"
}

$newContent = @()
$updated = @{}

foreach ($line in $content) {
    $matched = $false
    foreach ($key in $updates.Keys) {
        if ($line -match "^$key\s*=") {
            $newContent += "$key=`"$($updates[$key])`""
            $updated[$key] = $true
            $matched = $true
            break
        }
    }
    if (-not $matched) {
        $newContent += $line
    }
}

# Add missing variables
foreach ($key in $updates.Keys) {
    if (-not $updated[$key]) {
        $newContent += "$key=`"$($updates[$key])`""
    }
}

# Write back
$newContent | Out-File -FilePath $envFile -Encoding UTF8

Write-Host "`n✅ Environment variables fixed!" -ForegroundColor Green
Write-Host "`nUpdated variables:" -ForegroundColor Cyan
Write-Host "  NEXTAUTH_URL=http://localhost" -ForegroundColor White
Write-Host "  NEXTAUTH_SECRET=*** (32 char secret generated)" -ForegroundColor White
Write-Host "  DATABASE_URL=postgresql://... (default - update with your DB)" -ForegroundColor White
Write-Host "  SKIP_ENV_VALIDATION=true (for development)" -ForegroundColor White
Write-Host "`n⚠️  IMPORTANT: Update DATABASE_URL with your actual database connection string!" -ForegroundColor Yellow
Write-Host "`nYou can now run: pnpm build && pnpm start" -ForegroundColor Green
