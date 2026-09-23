param(
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateSet('probe-ring-whep.mjs', 'verify-ring-api.mjs', 'capture-ring-whep.mjs')]
    [string]$Script
)

$ErrorActionPreference = 'Stop'
$secureToken = Read-Host 'Paste the short-lived Ring Playground token' -AsSecureString
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
$plainToken = $null
try {
    $plainToken = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    if ([string]::IsNullOrWhiteSpace($plainToken)) { throw 'No token entered.' }
    $env:RING_ACCESS_TOKEN = $plainToken
    $scriptPath = Join-Path $PSScriptRoot $Script
    $logDirectory = Join-Path $PSScriptRoot 'logs'
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    $logPath = Join-Path $logDirectory ("{0}-{1}.log" -f $Script.Replace('.mjs', ''), (Get-Date -Format 'yyyyMMdd-HHmmss'))
    # Windows PowerShell turns native stderr into ErrorRecord; with Stop it aborts
    # this pipeline before the status-only output can be sanitized and logged.
    $ErrorActionPreference = 'Continue'
    try {
        $safeLines = @(& node $scriptPath 2>&1 | ForEach-Object { ([string]$_).Replace($plainToken, '[REDACTED]') })
        $nodeExitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = 'Stop'
    }
    $safeLines | Set-Content -LiteralPath $logPath -Encoding UTF8
    $safeLines | ForEach-Object { Write-Output $_ }
    Write-Output "Sanitized log: $logPath"
    if ($plainToken.Length -ge 6) {
        $repoRoot = Split-Path $PSScriptRoot -Parent
        $tokenPrefix = $plainToken.Substring(0, 6)
        $tokenPrefix | git -C $repoRoot grep -q -F -f -
        $trackedMatch = $LASTEXITCODE -eq 0
        $historyMatch = [bool](git -C $repoRoot log -p --all | Select-String -SimpleMatch -Quiet -Pattern $tokenPrefix)
        Write-Output ("Token-prefix leak scan: tracked={0}; history={1}" -f $(if ($trackedMatch) { 'MATCH' } else { 'clear' }), $(if ($historyMatch) { 'MATCH' } else { 'clear' }))
    }
    exit $nodeExitCode
}
finally {
    Remove-Item Env:RING_ACCESS_TOKEN -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    $plainToken = $null
}
