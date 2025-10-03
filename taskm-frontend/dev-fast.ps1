# Clear Vite cache and start dev server optimized
Write-Host "Clearing Vite cache and optimizing startup..." -ForegroundColor Green

# Clear Vite cache
if (Test-Path "node_modules\.vite") {
    Remove-Item -Recurse -Force "node_modules\.vite"
    Write-Host "Vite cache cleared!" -ForegroundColor Yellow
}

# Clear dist folder
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
    Write-Host "Dist folder cleared!" -ForegroundColor Yellow
}

Write-Host "Starting development server..." -ForegroundColor Green
npm run dev