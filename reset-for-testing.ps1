# EV Charger App - Reset Script (Windows PowerShell)
# Simulates a fresh clone for testing setup.ps1
# WARNING: This will delete all local data!

Write-Host "`n⚠️  This will reset everything to test the setup script!" -ForegroundColor Yellow
Write-Host "   - Stop all services"
Write-Host "   - Delete node_modules"
Write-Host "   - Delete .env files"
Write-Host "   - Delete Docker volumes (database data)"
Write-Host ""

$confirm = Read-Host "Are you sure? (y/N)"

if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cancelled."
    exit 0
}

Write-Host "Stopping Docker containers..." -ForegroundColor Yellow
docker compose down -v

Write-Host "Removing backend node_modules and .env..." -ForegroundColor Yellow
if (Test-Path "back-end\node_modules") { Remove-Item -Recurse -Force "back-end\node_modules" }
if (Test-Path "back-end\.env") { Remove-Item -Force "back-end\.env" }

Write-Host "Removing frontend node_modules and .env.local..." -ForegroundColor Yellow
if (Test-Path "front-end\node_modules") { Remove-Item -Recurse -Force "front-end\node_modules" }
if (Test-Path "front-end\.next") { Remove-Item -Recurse -Force "front-end\.next" }
if (Test-Path "front-end\.env.local") { Remove-Item -Force "front-end\.env.local" }

Write-Host "`n✅ Reset complete! Now run: .\setup.ps1" -ForegroundColor Green
