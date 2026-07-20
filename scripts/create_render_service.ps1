<#
create_render_service.ps1

Run this locally to create a Render Web Service for this repo.
You MUST run this on your machine — do NOT paste secrets into chat.

Usage (PowerShell):
  $env:RENDER_API_KEY="<your-key>"; .\scripts\create_render_service.ps1

What it does:
- Verifies git remote and branch
- Ensures the repo is pushed
- If `RENDER_API_KEY` is set, attempts to call the Render API to create
  a web service with sensible defaults. You will be shown the API response
  to confirm and complete any missing values.

Note: The Render API shape may change; review the JSON payload below
before running. This script is a convenience to run locally — it does not
send your secrets anywhere except to Render's API over HTTPS.
#>

Set-StrictMode -Version Latest

function ExitWith($msg, $code=1) {
    Write-Error $msg
    exit $code
}

# Ensure git status is clean and pushed
$branch = (git rev-parse --abbrev-ref HEAD) -replace '\r|\n',''
if (-not $branch) { ExitWith "Cannot determine git branch. Run from repo root." }

$remoteUrl = (git remote get-url origin) -replace '\r|\n',''
if (-not $remoteUrl) { ExitWith "No git remote 'origin' found. Push repo to GitHub first." }

Write-Host "On branch: $branch" -ForegroundColor Cyan
Write-Host "Remote: $remoteUrl" -ForegroundColor Cyan

Write-Host "Ensuring local changes are committed and pushed..."
git add -A
git commit -m "chore: prepare render deploy" --allow-empty | Out-Null
git push origin $branch

if (-not $env:RENDER_API_KEY) {
    Write-Host "No RENDER_API_KEY set. This script will prepare the commands for you." -ForegroundColor Yellow
    Write-Host "Run the following locally after setting RENDER_API_KEY and DATABASE_URL:" -ForegroundColor Green
    Write-Host "`$env:RENDER_API_KEY='<your-key>'; `$env:DATABASE_URL='postgres://user:pass@host:5432/db' ; .\scripts\create_render_service.ps1" -ForegroundColor White
    exit 0
}

# Build payload values
$serviceName = Read-Host -Prompt "Service name (default: ozark-app)"; if (-not $serviceName) { $serviceName = 'ozark-app' }
$repoFull = $remoteUrl
if ($repoFull -match '^git@github.com:(.+)\.git$') { $repoFull = $Matches[1] }
elseif ($repoFull -match '^https://github.com/(.+)\.git$') { $repoFull = $Matches[1] }

$body = @{
    name = $serviceName
    repo = $repoFull
    branch = $branch
    plan = 'free'
    env = 'node'
    buildCommand = 'npm install'
    startCommand = 'npm run migrate && npm start'
    healthCheckPath = '/health'
}

$envVars = @(
    @{ key = 'NODE_ENV'; value = 'production' },
    @{ key = 'DATABASE_URL'; value = $env:DATABASE_URL },
    @{ key = 'STRIPE_PAYMENT_LINK_URL'; value = '' },
    @{ key = 'POLSIA_ANALYTICS_SLUG'; value = '' },
    @{ key = 'EMAIL_FROM'; value = '' }
)

if ($env:SMTP_HOST) {
    $envVars += @{ key = 'SMTP_HOST'; value = $env:SMTP_HOST }
    if ($env:SMTP_PORT) { $envVars += @{ key = 'SMTP_PORT'; value = $env:SMTP_PORT } }
    if ($env:SMTP_USER) { $envVars += @{ key = 'SMTP_USER'; value = $env:SMTP_USER } }
    if ($env:SMTP_PASS) { $envVars += @{ key = 'SMTP_PASS'; value = $env:SMTP_PASS } }
}

$payload = @{ service = $body; envVars = $envVars }

Write-Host "Prepared service payload (review before sending):" -ForegroundColor Cyan
$payload | ConvertTo-Json -Depth 5 | Write-Host

$confirm = Read-Host -Prompt "Proceed to create service on Render? (y/N)"
if ($confirm -ne 'y') { Write-Host "Aborted by user."; exit 0 }

$apiUrl = 'https://api.render.com/v1/services'

$json = $payload | ConvertTo-Json -Depth 6

Write-Host "Creating service on Render..." -ForegroundColor Cyan

$resp = Invoke-RestMethod -Method Post -Uri $apiUrl -Headers @{ Authorization = "Bearer $($env:RENDER_API_KEY)"; 'Content-Type' = 'application/json' } -Body $json -ErrorAction Stop

Write-Host "Render API response:" -ForegroundColor Green
$resp | ConvertTo-Json -Depth 6 | Write-Host

Write-Host "If creation succeeded, visit your Render dashboard to verify build and set any secure secrets." -ForegroundColor Cyan
