#!/bin/bash
# Database Setup Script for STÜBER
# This script creates the database and runs the schema/seed files

echo "Setting up STÜBER database..."

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "Error: psql command not found. Please ensure PostgreSQL is installed and in your PATH."
    exit 1
fi

echo ""
echo "Step 1: Creating database 'stuber'..."
psql -U postgres -c "CREATE DATABASE stuber;" 2>&1
if [ $? -eq 0 ]; then
    echo "Database created successfully!"
else
    echo "Note: Database may already exist, continuing..."
fi

echo ""
echo "Step 2: Running schema.sql..."
psql -U postgres -d stuber -f schema.sql
if [ $? -eq 0 ]; then
    echo "Schema created successfully!"
else
    echo "Error running schema"
    exit 1
fi

echo ""
echo "Step 3: Running seed.sql..."
psql -U postgres -d stuber -f seed.sql
if [ $? -eq 0 ]; then
    echo "Seed data inserted successfully!"
else
    echo "Error running seed"
    exit 1
fi

echo ""
echo "Database setup complete!"
echo "You can now start the backend server."
