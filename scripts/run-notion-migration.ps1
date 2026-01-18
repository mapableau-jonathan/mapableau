# PowerShell script to run Notion migration
# Usage: .\scripts\run-notion-migration.ps1

if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL environment variable is not set" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Running Notion migration..." -ForegroundColor Cyan

# Extract connection details from DATABASE_URL if needed
# For Neon/PostgreSQL, you can use psql directly
$migrationFile = Join-Path $PSScriptRoot "run-notion-migration.sql"

# Try to use psql if available
if (Get-Command psql -ErrorAction SilentlyContinue) {
    psql $env:DATABASE_URL -f $migrationFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠️  psql not found. Please run the SQL file manually:" -ForegroundColor Yellow
    Write-Host "   $migrationFile" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or install PostgreSQL client tools and try again." -ForegroundColor Yellow
    exit 1
}
