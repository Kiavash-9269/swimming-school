# Upload swimming-school from Windows to Ubuntu via SCP (OpenSSH).
# Run in PowerShell from the project root OR pass -LocalPath.
#
# Example:
#   .\deploy\ubuntu\upload.ps1 -Server user@YOUR_SERVER_IP
#   .\deploy\ubuntu\upload.ps1 -Server root@1.2.3.4 -RemotePath /var/www/swimming-school

param(
  [Parameter(Mandatory = $true)]
  [string]$Server,

  [string]$LocalPath = "",

  [string]$RemotePath = "/var/www/swimming-school",

  [switch]$IncludeNodeModules
)

$ErrorActionPreference = "Stop"

if (-not $LocalPath) {
  # Script lives in deploy/ubuntu → project root is two levels up
  $LocalPath = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
}

if (-not (Test-Path (Join-Path $LocalPath "backend"))) {
  throw "LocalPath does not look like the project root: $LocalPath"
}

if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
  throw "scp not found. Install OpenSSH Client (Windows Optional Features) or use Git Bash/WSL."
}

$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "swimming-school-$stamp.tar"
$tempDir = Join-Path $env:TEMP "swim-deploy-$stamp"
$archivePath = Join-Path $env:TEMP $archiveName

New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

Write-Host "==> Staging files (excluding node_modules, .git, dist, .env secrets by default)..."

$excludeDirs = @(
  "node_modules",
  ".git",
  "frontend\dist",
  "backend\coverage",
  "backend\.data",
  ".history"
)

# Copy with robocopy for reliable excludes on Windows
$roboArgs = @(
  $LocalPath, $tempDir, "/E", "/NFL", "/NDL", "/NJH", "/NJS", "/nc", "/ns", "/np",
  "/XD"
) + $excludeDirs

if (-not $IncludeNodeModules) {
  # already excluded
}

& robocopy @roboArgs | Out-Null
# robocopy exit codes 0-7 are success-ish
if ($LASTEXITCODE -ge 8) {
  throw "robocopy failed with exit code $LASTEXITCODE"
}

# Never upload local secrets
$envLocal = Join-Path $tempDir "backend\.env"
if (Test-Path $envLocal) { Remove-Item $envLocal -Force }

Write-Host "==> Creating archive $archivePath"
if (Test-Path $archivePath) { Remove-Item $archivePath -Force }

# Prefer tar (Windows 10+); fallback to Compress-Archive zip
$useTar = $true
try {
  tar -cf $archivePath -C $tempDir .
} catch {
  $useTar = $false
}

if (-not $useTar -or -not (Test-Path $archivePath)) {
  $zipPath = "$archivePath.zip"
  Compress-Archive -Path (Join-Path $tempDir "*") -DestinationPath $zipPath -Force
  $archivePath = $zipPath
  $archiveName = Split-Path $archivePath -Leaf
}

Write-Host "==> Ensuring remote directory exists"
ssh $Server "sudo mkdir -p $RemotePath && sudo chown -R `$(whoami):`$(whoami) /var/www"

Write-Host "==> Uploading $archiveName"
scp $archivePath "${Server}:/tmp/$archiveName"

Write-Host "==> Extracting on server to $RemotePath"
if ($archiveName -like "*.zip") {
  ssh $Server "sudo apt-get install -y unzip >/dev/null 2>&1; sudo rm -rf $RemotePath/*; sudo mkdir -p $RemotePath; sudo unzip -q /tmp/$archiveName -d $RemotePath; sudo chown -R `$(whoami):`$(whoami) $RemotePath; rm -f /tmp/$archiveName"
} else {
  ssh $Server "sudo mkdir -p $RemotePath; sudo tar -xf /tmp/$archiveName -C $RemotePath; sudo chown -R `$(whoami):`$(whoami) $RemotePath; rm -f /tmp/$archiveName"
}

Remove-Item -Recurse -Force $tempDir -ErrorAction SilentlyContinue
Remove-Item -Force $archivePath -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Upload complete."
Write-Host "SSH in and run:"
Write-Host "  ssh $Server"
Write-Host "  cd $RemotePath"
Write-Host "  sudo bash deploy/ubuntu/setup.sh --domain YOUR_DOMAIN"
Write-Host ""
