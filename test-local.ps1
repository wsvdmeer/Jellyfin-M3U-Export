# Quick Test Script for Windows PowerShell
# Run this on your Windows machine before transferring to server

Write-Host "🔍 Pre-deployment checks..." -ForegroundColor Cyan

# Check if .env exists
if (Test-Path .env) {
    Write-Host "✓ .env file exists" -ForegroundColor Green
    
    $envContent = Get-Content .env -Raw
    if ($envContent -match "your_jellyfin_api_key_here|your_jellyseerr_api_key_here") {
        Write-Host "⚠️  Warning: .env still has placeholder values" -ForegroundColor Yellow
        Write-Host "   Please update with your actual API keys" -ForegroundColor Yellow
    }
}
else {
    Write-Host "⚠️  .env file not found" -ForegroundColor Yellow
    Write-Host "   Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "   Please edit .env with your API keys" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📦 Files ready to transfer:" -ForegroundColor Cyan
Get-ChildItem -Recurse -File | Where-Object { 
    $_.FullName -notmatch "node_modules|\.git|dist" 
} | Select-Object -First 20 | ForEach-Object {
    Write-Host "   - $($_.FullName.Replace($PWD.Path, '.'))" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🚀 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Update .env with your API keys" -ForegroundColor White
Write-Host "   2. Transfer files to your media server:" -ForegroundColor White
Write-Host "      scp -r . user@your-server:/opt/jellyfin-m3u-export" -ForegroundColor Gray
Write-Host "   3. SSH into your server:" -ForegroundColor White
Write-Host "      ssh user@your-server" -ForegroundColor Gray
Write-Host "   4. Navigate to the directory:" -ForegroundColor White
Write-Host "      cd /opt/jellyfin-m3u-export" -ForegroundColor Gray
Write-Host "   5. Run: docker-compose up" -ForegroundColor White
Write-Host ""
Write-Host "📖 See TESTING.md for detailed instructions" -ForegroundColor Cyan
