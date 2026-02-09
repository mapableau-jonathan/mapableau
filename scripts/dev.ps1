# Start dev server (uses scripts/npm.ps1 so Node is on PATH).
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& "$scriptDir\npm.ps1" "run" "dev"
