# Database Setup Script for STÜBER
# This script creates the database and runs the schema/seed files

Write-Host "Setting up STÜBER database..." -ForegroundColor Green

# Check if psql is available
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlPath) {
    Write-Host "Error: psql command not found. Please ensure PostgreSQL is installed and in your PATH." -ForegroundColor Red
    exit 1
}

# Prompt for database password
$dbPassword = Read-Host "Enter PostgreSQL password for user 'postgres' (or press Enter if no password)" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword))

# Set PGPASSWORD environment variable if password provided
if ($dbPasswordPlain) {
    $env:PGPASSWORD = $dbPasswordPlain
}

Write-Host "`nStep 1: Creating database 'stuber'..." -ForegroundColor Yellow
$createDb = psql -U postgres -c "CREATE DATABASE stuber;" 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Database created successfully!" -ForegroundColor Green
} else {
    if ($createDb -match "already exists") {
        Write-Host "Database already exists, continuing..." -ForegroundColor Yellow
    } else {
        Write-Host "Error creating database: $createDb" -ForegroundColor Red
        Write-Host "You may need to create it manually: psql -U postgres -c 'CREATE DATABASE stuber;'" -ForegroundColor Yellow
    }
}

Write-Host "`nStep 2: Running schema.sql..." -ForegroundColor Yellow
$schemaResult = psql -U postgres -d stuber -f schema.sql 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Schema created successfully!" -ForegroundColor Green
} else {
    Write-Host "Error running schema: $schemaResult" -ForegroundColor Red
}

Write-Host "`nStep 3: Running seed.sql..." -ForegroundColor Yellow
$seedResult = psql -U postgres -d stuber -f seed.sql 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "Seed data inserted successfully!" -ForegroundColor Green
} else {
    Write-Host "Error running seed: $seedResult" -ForegroundColor Red
}

# Clear password from environment
$env:PGPASSWORD = $null

Write-Host "`nDatabase setup complete!" -ForegroundColor Green
Write-Host "You can now start the backend server." -ForegroundColor Cyan
