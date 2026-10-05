# scripts/deploy_local.ps1
# Automates local testing of the CI/CD database migration pipeline.

# Get the directory of this script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Ensure we run in the terraform directory
Set-Location -Path "$ScriptDir\..\terraform"

Write-Host "1. Selecting dev workspace..." -ForegroundColor Cyan
terraform workspace select anika-fashion-ecom-dev

Write-Host "2. Applying Terraform configuration..." -ForegroundColor Cyan
terraform apply "-var-file=environments/dev.tfvars" -auto-approve

if ($LASTEXITCODE -ne 0) {
    Write-Error "Terraform apply failed!"
    exit $LASTEXITCODE
}

# 3. Extract database connection URL
Write-Host "3. Extracting Database Connection URL..." -ForegroundColor Cyan
$dbUrl = terraform output -raw db_url

if (-not $dbUrl -or $dbUrl -eq "<sensitive>") {
    # If the value is sensitive and outputs aren't decrypted, try getting it direct
    Write-Host "Refetching raw output value..."
    $dbUrl = terraform output -json | ConvertFrom-Json | Select-Object -ExpandProperty db_url | Select-Object -ExpandProperty value
}

if (-not $dbUrl) {
    Write-Error "Failed to retrieve db_url from Terraform outputs!"
    exit 1
}

# Resolve the correct connection pooler host dynamically using the Supabase API
$projectRef = terraform output -raw project_id
if (-not $projectRef) {
    $projectRef = terraform output -json | ConvertFrom-Json | Select-Object -ExpandProperty project_id | Select-Object -ExpandProperty value
}

$varsFile = "environments/dev.tfvars"
if (Test-Path $varsFile) {
    $vars = Get-Content -Raw -Path $varsFile
    $accessToken = ""
    if ($vars -match 'supabase_access_token\s*=\s*"([^"]+)"') {
        $accessToken = $Matches[1]
    }
    
    if ($accessToken -and $projectRef) {
        Write-Host "Fetching database pooler configuration from Supabase API..." -ForegroundColor Gray
        $headers = @{
            "Authorization" = "Bearer $accessToken"
        }
        try {
            $ProgressPreference = 'SilentlyContinue'
            $response = Invoke-RestMethod -Uri "https://api.supabase.com/v1/projects/$projectRef/config/database/pooler" -Headers $headers -Method Get
            $poolerHost = $response[0].db_host
            if ($poolerHost) {
                Write-Host "Resolved pooler host: $poolerHost" -ForegroundColor Gray
                # Extract password from direct dbUrl
                if ($dbUrl -match 'postgresql://postgres:(.*)@') {
                    $dbPass = $Matches[1]
                    $dbUrl = "postgresql://postgres.{0}:{1}@{2}:5432/postgres" -f $projectRef, $dbPass, $poolerHost
                }
            }
        } catch {
            Write-Warning "Failed to query Supabase API for pooler configuration: $_"
        }
    }
}

# 4. Push database migrations via Supabase CLI
Write-Host "4. Pushing database migrations via Supabase CLI..." -ForegroundColor Cyan
Set-Location -Path "$ScriptDir\.."
supabase db push --db-url $dbUrl

if ($LASTEXITCODE -ne 0) {
    Write-Error "Supabase database migrations failed!"
    exit $LASTEXITCODE
}

Write-Host "Local deployment test completed successfully!" -ForegroundColor Green
