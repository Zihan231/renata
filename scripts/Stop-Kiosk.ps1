# Stops the Renata Quiz kiosk: closes its browser window and shuts down its bundled server.
$root = $PSScriptRoot
New-Item -ItemType Directory -Force -Path (Join-Path $root 'data') | Out-Null
Set-Content -Path (Join-Path $root 'data\stop.flag') -Value 'stop'

$node = Join-Path $root 'runtime\node.exe'
Get-CimInstance Win32_Process | ForEach-Object {
  $hit = ($_.CommandLine -like '*data\browser-profile*') -or ($_.ExecutablePath -eq $node)
  if ($hit) { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}
