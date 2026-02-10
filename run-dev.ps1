<#
run-dev.ps1 - Start the full dev stack for this project on Windows

Usage:
  .\run-dev.ps1            # Full run: docker up, install deps, migrate+seed, open dev servers
  .\run-dev.ps1 -SkipInstall -SkipMigrate  # Fast start: skip installing & DB migrations

Notes:
  - Run from the repository root.
  - If blocked by ExecutionPolicy, run: powershell -ExecutionPolicy Bypass -File .\run-dev.ps1
#>

param(
    [switch]$SkipInstall,
    [switch]$SkipMigrate,
    [switch]$Stop,
    [switch]$SetEnv
) 

function Test-Cmd($name){
    return (Get-Command $name -ErrorAction SilentlyContinue) -ne $null
}

Write-Host "== Running dev stack helper script =="

# Check prerequisites
if (-not (Test-Cmd docker)){
    Write-Error "Docker is not installed or not in PATH. Please install Docker Desktop and try again."; exit 1
}

# Ensure Docker daemon is reachable
try{ docker info >$null 2>&1 } catch { Write-Error "Docker is installed but not running. Start Docker Desktop and try again."; exit 1 }

# Early stop option to tear down Docker services
if ($Stop) {
    Write-Host "Stopping Docker services..."
    if (Test-Cmd docker-compose) {
        docker-compose down
    } else {
        docker compose down
    }
    Write-Host "Docker services stopped."
    exit 0
}

# Check for node / npm availability
if (-not (Test-Cmd node) -or -not (Test-Cmd npm)) {
    Write-Warning "Node.js or npm not found in PATH. Front-end and back-end dev servers won't be started by this script."
} 

# Bring up Postgres + Redis
if (Test-Cmd docker-compose) {
    docker-compose up -d
} else {
    # Fall back to the newer docker compose command
    docker compose up -d
}

# Ensure back-end .env exists
if (-not (Test-Path .\back-end\.env)){
    if (Test-Path .\back-end\.env.example){
        Copy-Item .\back-end\.env.example .\back-end\.env
        Write-Host "Copied back-end/.env from .env.example"
    } else {
        Write-Warning "No .env.example found in back-end/; make sure you set environment variables manually."
    }
} else { Write-Host "back-end/.env already exists" }

# Install node deps (unless skipped)
if (-not $SkipInstall){
    $folders = @('back-end','front-end','cli-client')
    foreach ($f in $folders){
        if (Test-Path (Join-Path $f 'package.json')){
            if (-not (Test-Path (Join-Path $f 'node_modules'))){
                Write-Host "Installing npm packages in $f..."
                Push-Location $f
                npm install
                Pop-Location
            } else { Write-Host "Skipping install in $f (node_modules found)" }
        }
    }
} else { Write-Host "Skipping npm install as requested (-SkipInstall)" }

# Run Prisma migrations & seed (unless skipped)
if (-not $SkipMigrate){
    Push-Location .\back-end
    Write-Host "Running Prisma migrations..."
    npm run prisma:migrate
    Write-Host "Seeding database..."
    npm run prisma:seed
    Pop-Location
} else { Write-Host "Skipping migrations and seed as requested (-SkipMigrate)" }

# Start dev servers in separate PowerShell windows
if ($env:PORT) {
    $backendPort = [int]$env:PORT
} else {
    $backendPort = 4000
}
Write-Host "Starting back-end dev server in new PowerShell window on PORT=$backendPort"
$backArgs = @('-NoExit', '-Command', "`$env:PORT=$backendPort; npm run dev")
Start-Process powershell -ArgumentList $backArgs -WorkingDirectory (Resolve-Path .\back-end)

# Prepare front-end API URL
$defaultApiUrl = "http://localhost:$backendPort/api/v1"

# Optionally write project-local front-end env file
if ($SetEnv) {
    try {
        $envFilePath = Join-Path (Resolve-Path .\front-end) '.env.local'
        Set-Content -Path $envFilePath -Value "NEXT_PUBLIC_API_URL=$defaultApiUrl"
        Write-Host "Wrote front-end env file: $envFilePath"
    } catch {
        Write-Warning "Failed to write front-end env file: $_"
    }
}

# Start front-end (if npm available)
if (Test-Cmd npm) {
    $frontArgs = @('-NoExit','-Command', "`$env:NEXT_PUBLIC_API_URL='$defaultApiUrl'; npm run dev")
    Write-Host "Starting front-end dev server in new PowerShell window (NEXT_PUBLIC_API_URL=$defaultApiUrl)"
    Start-Process powershell -ArgumentList $frontArgs -WorkingDirectory (Resolve-Path .\front-end)
} else {
    Write-Warning "Skipping starting front-end: npm not found"
}

Write-Host "== Done. Front-end: http://localhost:3000  |  Back-end: http://localhost:$backendPort (unless you changed PORT) =="
Write-Host "To stop Docker services: docker-compose down (or 'docker compose down')"

# Random push to trigger workflow run