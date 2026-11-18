# Renata Quiz kiosk launcher (runs hidden, no console windows).
# Starts the bundled server, opens Chrome/Edge full-screen, reopens the browser if it is closed.
# Stop with Stop-Kiosk.bat.   Test in a normal window:  Start-Kiosk.bat windowed
param([string]$Mode = '')

$ErrorActionPreference = 'Stop'
$root     = $PSScriptRoot
$dataDir  = Join-Path $root 'data'
$logFile  = Join-Path $dataDir 'launcher.log'
$stopFlag = Join-Path $dataDir 'stop.flag'
$nodeExe  = Join-Path $root 'runtime\node.exe'
$appDir   = Join-Path $root 'app'
$windowed = ($Mode -eq 'windowed')

New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
Remove-Item $stopFlag -Force -ErrorAction SilentlyContinue

function Log($m) { try { Add-Content -Path $logFile -Value ("{0}  {1}" -f (Get-Date -Format s), $m) } catch {} }
function Fail($m) {
  Log "ERROR: $m"
  Add-Type -AssemblyName System.Windows.Forms
  [void][System.Windows.Forms.MessageBox]::Show($m + "`n`nDetails: $logFile", 'Renata Quiz', 'OK', 'Error')
  exit 1
}

# only one copy at a time
$created = $false
$mutex = New-Object System.Threading.Mutex($true, 'RenataQuizKioskPs', [ref]$created)
if (-not $created) { exit 0 }

if (-not (Test-Path $nodeExe) -or -not (Test-Path (Join-Path $appDir 'server.js'))) {
  Fail 'Missing runtime\node.exe or app\server.js. Keep the whole RenataQuiz folder together.'
}

# pick a free port
$port = 0
foreach ($p in 3000..3020) {
  # busy if anything (IPv4 or IPv6, e.g. a dev server) already answers on that port
  $busy = $false
  foreach ($addr in '127.0.0.1', '::1') {
    try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect($addr, $p); $c.Close(); $busy = $true } catch {}
  }
  if ($busy) { continue }
  try {
    $l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $p)
    $l.Start(); $l.Stop(); $port = $p; break
  } catch {}
}
if ($port -eq 0) { Fail 'Ports 3000-3020 are all busy.' }

# server (hidden), output goes to data\server.log / server-error.log
$env:PORT = "$port"
$env:HOSTNAME = '127.0.0.1'
$env:NODE_ENV = 'production'
$env:NEXT_TELEMETRY_DISABLED = '1'
$env:XLSX_PATH = Join-Path $dataDir 'participants.xlsx'
try {
  $srv = Start-Process -FilePath $nodeExe -ArgumentList 'server.js' -WorkingDirectory $appDir -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput (Join-Path $dataDir 'server.log') -RedirectStandardError (Join-Path $dataDir 'server-error.log')
} catch { Fail "Could not start the server: $($_.Exception.Message)" }
Log "server started, pid $($srv.Id), port $port, excel: $env:XLSX_PATH"

# wait until the server answers
$ready = $false
for ($i = 0; $i -lt 160 -and -not $srv.HasExited; $i++) {
  try { $c = New-Object System.Net.Sockets.TcpClient; $c.Connect('127.0.0.1', $port); $c.Close(); $ready = $true; break }
  catch { Start-Sleep -Milliseconds 250 }
}
if (-not $ready) { try { $srv.Kill() } catch {}; Fail 'The quiz server did not start.' }

function Stop-Server { try { if (-not $srv.HasExited) { $srv.Kill() } } catch {} }

# find Chrome / Edge
$browser = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LocalAppData\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1
if (-not $browser) { Stop-Server; Fail 'Chrome or Edge was not found on this PC.' }

$url = "http://localhost:$port/"
$profDir = Join-Path $dataDir 'browser-profile'
$modeFlag = if ($windowed) { '--new-window' } else { '--kiosk' }
$flags = @(
  $modeFlag, "--user-data-dir=`"$profDir`"", '--no-first-run', '--no-default-browser-check', '--disable-infobars',
  '--disable-session-crashed-bubble', '--noerrdialogs', '--disable-pinch', '--overscroll-history-navigation=0',
  '--autoplay-policy=no-user-gesture-required', '--disable-features=Translate,TranslateUI',
  '--check-for-update-interval=31536000', "`"$url`""
)
Log "browser: $browser ($modeFlag)"
$br = Start-Process -FilePath $browser -ArgumentList $flags -PassThru

while (-not $srv.HasExited) {
  if (Test-Path $stopFlag) { Log 'stop requested'; break }
  if ($br.HasExited) {
    if ($windowed) { break }
    Log 'browser exited, reopening'
    Start-Sleep -Seconds 1
    $br = Start-Process -FilePath $browser -ArgumentList $flags -PassThru
  }
  Start-Sleep -Seconds 1
}
Stop-Server
Log 'stopped'
