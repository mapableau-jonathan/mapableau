# Run npm with Node.js on PATH. Use when npm is not recognized in your terminal.
# Usage: .\scripts\npm.ps1 install   or   .\scripts\npm.ps1 run dev

$nodePaths = @(
    "C:\nvm4w\nodejs",
    $env:NVM_HOME + "\current",
    $env:ProgramFiles + "\nodejs",
    ${env:ProgramFiles(x86)} + "\nodejs",
    $env:LOCALAPPDATA + "\Programs\node",
    $env:APPDATA + "\nvm\current"
)
# Add any path from User PATH that contains "node"
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath) {
    $nodePaths += $userPath -split ";" | Where-Object { $_ -match "node" -and $_.Trim() -ne "" }
}

$nodeDir = $null
foreach ($p in $nodePaths) {
    if ($p -and (Test-Path (Join-Path $p "node.exe"))) {
        $nodeDir = $p
        break
    }
}

if (-not $nodeDir) {
    Write-Error "Node.js not found. Checked: $($nodePaths -join ', '). Install from https://nodejs.org or ensure NVM_HOME is set."
    exit 1
}

$env:Path = "$nodeDir;" + $env:Path
& npm $args
