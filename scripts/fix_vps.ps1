
Write-Host "--- FENCE TRADING VPS AUTO-FIX ---" -ForegroundColor Cyan

# 1. GIT RESET
Write-Host "1. Resetting Codebase..." -ForegroundColor Yellow
git fetch --all
git reset --hard origin/main

# 2. PM2 STOP
Write-Host "2. Stopping Processes..." -ForegroundColor Yellow
pm2 delete all

# 3. CLEANUP
Write-Host "3. Cleaning up old files..." -ForegroundColor Yellow
# Unblock DB
Remove-Item signals.db -Force -ErrorAction SilentlyContinue
# Remove bad env
Remove-Item fenceWeb.env -Force -ErrorAction SilentlyContinue
# Remove potentially corrupted node_modules (CRITICAL FOR CLEAN BUILD)
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# 4. ENV SETUP
Write-Host "4. Setting up Environment..." -ForegroundColor Yellow
$token = Read-Host "Please paste your DISCORD_BOT_TOKEN (Right-click to paste)"
if ($token -eq "") {
    Write-Error "Token cannot be empty!"
    exit
}
$envContent = "DISCORD_BOT_TOKEN=$token"
# FORCE UTF-8 NO BOM
$utf8 = New-Object System.Text.UTF8Encoding $False
[System.IO.File]::WriteAllText("$PWD\fenceWeb.env", $envContent, $utf8)
Write-Host "Env file created." -ForegroundColor Green

# 5. INSTALL & BUILD
Write-Host "5. Installing Dependencies..." -ForegroundColor Yellow
npm install
npm list react

Write-Host "6. Building Website..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host "Build Successful!" -ForegroundColor Green
    # 6. START
    pm2 start ecosystem.config.js
    pm2 save
    pm2 logs --lines 20
} else {
    Write-Error "Build FAILED. Please show this error to the developer."
}
