$ErrorActionPreference = 'Stop'

$sourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$destination = Join-Path $HOME 'Desktop\PPDO'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = "$destination.backup-$stamp"

Write-Host 'PPDO clean replacement installer' -ForegroundColor Green
Write-Host "Source:      $sourceRoot"
Write-Host "Destination: $destination"

if (Test-Path $destination) {
    Write-Host "Existing project found. Creating backup:" -ForegroundColor Yellow
    Write-Host $backup
    Move-Item -Path $destination -Destination $backup
}

New-Item -ItemType Directory -Path $destination -Force | Out-Null
Copy-Item -Path (Join-Path $sourceRoot 'backend') -Destination $destination -Recurse
Copy-Item -Path (Join-Path $sourceRoot 'frontend') -Destination $destination -Recurse
Copy-Item -Path (Join-Path $sourceRoot 'README.md') -Destination $destination
Copy-Item -Path (Join-Path $sourceRoot 'CLOUDFLARE_DEPLOY.md') -Destination $destination

Write-Host ''
Write-Host 'Clean PPDO project installed.' -ForegroundColor Green
Write-Host "Backup: $backup"
Write-Host "New project: $destination"
Write-Host ''
Write-Host 'Next:'
Write-Host "cd `"$destination\frontend`""
Write-Host 'npm install'
Write-Host 'npm run dev'
