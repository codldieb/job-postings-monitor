# Runs the daily job posting check against a running local server.
# Schedule this script in Windows Task Scheduler to run once per day.

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

if (Test-Path ".env") {
  Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#=]+?)\s*=\s*(.+?)\s*$') {
      [System.Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
    }
  }
}

if (-not $env:CRON_SECRET) {
  Write-Error "CRON_SECRET is not set. Copy .env.example to .env and configure it."
}

if (-not $env:APP_URL) {
  $env:APP_URL = "http://localhost:3000"
}

node scripts/run-check.mjs
