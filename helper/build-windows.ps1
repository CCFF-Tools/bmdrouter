$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
$DistRoot = Join-Path $RepoRoot 'dist'
$PackageRoot = Join-Path $DistRoot 'Video-Router-Matrix-Windows'
$NodeVersion = '24.19.0'
$ExpectedHash = '57f71ab3652e797d84acddc79c81cc9ff1c6ddb2a1974cdb83f00fee9bff4c73'
$RuntimeZip = Join-Path $DistRoot "node-v$NodeVersion-win-x64.zip"
New-Item -ItemType Directory -Force -Path $DistRoot | Out-Null
if (Test-Path $PackageRoot) { Remove-Item -Recurse -Force $PackageRoot }
New-Item -ItemType Directory -Force -Path "$PackageRoot\runtime", "$PackageRoot\helper" | Out-Null
Invoke-WebRequest "https://nodejs.org/dist/v$NodeVersion/node-v$NodeVersion-win-x64.zip" -OutFile $RuntimeZip
if ((Get-FileHash $RuntimeZip -Algorithm SHA256).Hash.ToLowerInvariant() -ne $ExpectedHash) { throw 'Node runtime checksum mismatch.' }
$RuntimeExtract = Join-Path $DistRoot 'node-runtime'
Expand-Archive -Path $RuntimeZip -DestinationPath $RuntimeExtract -Force
Copy-Item "$RuntimeExtract\node-v$NodeVersion-win-x64\node.exe" "$PackageRoot\runtime\node.exe"
Copy-Item "$RuntimeExtract\node-v$NodeVersion-win-x64\LICENSE" "$PackageRoot\runtime\LICENSE.txt"
foreach ($File in @('index.html','style.css','app.js','model.js','matrix.js','theme.js','file-controls.js','videohub-files.js','helper-controls.js','package.json')) {
  Copy-Item (Join-Path $RepoRoot $File) $PackageRoot
}
foreach ($File in @('main.js','server.js','protocol.js','control.js','discovery.js')) {
  Copy-Item (Join-Path $PSScriptRoot $File) "$PackageRoot\helper"
}
Copy-Item (Join-Path $PSScriptRoot 'Start Video Router Matrix.cmd') $PackageRoot
Copy-Item (Join-Path $RepoRoot 'docs\windows-helper.md') "$PackageRoot\READ ME.txt"
$ZipPath = Join-Path $DistRoot 'Video-Router-Matrix-Windows-x64.zip'
Compress-Archive -Path $PackageRoot -DestinationPath $ZipPath -Force
$Hash = (Get-FileHash $ZipPath -Algorithm SHA256).Hash.ToLowerInvariant()
"$Hash  Video-Router-Matrix-Windows-x64.zip" | Set-Content "$ZipPath.sha256" -Encoding ascii
Write-Host "Created $ZipPath"
